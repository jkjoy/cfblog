import { Hono } from 'hono';
import type { AppEnv, Comment, JWTPayload, User } from '../types';
import { authMiddleware, optionalAuthMiddleware } from '../auth';
import {
  getSiteSettings,
  formatCommentResponse,
  buildPaginationHeaders,
  createWPError,
  sendWebhook
} from '../utils';
import { sendCommentNotifications } from '../mail';

const comments = new Hono<AppEnv>();

interface CommentWithPost extends Comment {
  post_slug: string;
  post_title: string | null;
}

interface ParentCommentRecord {
  id: number;
  post_id: number;
  author_name: string;
  author_email: string;
  content: string;
}

interface PostRecord {
  id: number;
  slug: string;
  title: string;
  comment_status: string;
}

// GET /wp/v2/comments - List comments
comments.get('/', optionalAuthMiddleware, async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const user = c.get('user') as JWTPayload | undefined;
    const isAdmin = !!user && ['administrator', 'editor'].includes(user.role);

    const page = parseInt(c.req.query('page') || '1');
    const perPage = parseInt(c.req.query('per_page') || '10');
    const postId = c.req.query('post');
    const parent = c.req.query('parent');
    const author = c.req.query('author');
    const authorEmail = c.req.query('author_email');
    const status = c.req.query('status') || (isAdmin ? 'all' : 'approved');
    const orderby = c.req.query('orderby') || 'date_gmt';
    const order = c.req.query('order') || 'desc';
    const offset = (page - 1) * perPage;

    // Build query
    let query = `
      SELECT c.*, p.slug as post_slug, p.title as post_title
      FROM comments c
      LEFT JOIN posts p ON c.post_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Only show approved comments to non-admins
    if (!isAdmin) {
      query += ` AND c.status = 'approved'`;
    } else if (status !== 'all') {
      query += ` AND c.status = ?`;
      params.push(status);
    }

    if (postId) {
      query += ` AND c.post_id = ?`;
      params.push(parseInt(postId));
    }

    if (parent !== undefined) {
      query += ` AND c.parent_id = ?`;
      params.push(parseInt(parent));
    }

    if (author) {
      query += ` AND c.user_id = ?`;
      params.push(parseInt(author));
    }

    if (authorEmail) {
      query += ` AND c.author_email = ?`;
      params.push(authorEmail);
    }

    // Order
    const orderMap: Record<string, string> = {
      date: 'c.created_at',
      date_gmt: 'c.created_at',
      id: 'c.id',
      author_name: 'c.author_name',
      post: 'c.post_id'
    };
    const orderColumn = orderMap[orderby] || 'c.created_at';
    query += ` ORDER BY ${orderColumn} ${order.toUpperCase()} LIMIT ? OFFSET ?`;
    params.push(perPage, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all<CommentWithPost>();

    // Get total count
    let countQuery = `SELECT COUNT(*) as count FROM comments c WHERE 1=1`;
    const countParams: any[] = [];

    if (!isAdmin) {
      countQuery += ` AND c.status = 'approved'`;
    } else if (status !== 'all') {
      countQuery += ` AND c.status = ?`;
      countParams.push(status);
    }

    if (postId) {
      countQuery += ` AND c.post_id = ?`;
      countParams.push(parseInt(postId));
    }

    if (parent !== undefined) {
      countQuery += ` AND c.parent_id = ?`;
      countParams.push(parseInt(parent));
    }

    if (author) {
      countQuery += ` AND c.user_id = ?`;
      countParams.push(parseInt(author));
    }

    if (authorEmail) {
      countQuery += ` AND c.author_email = ?`;
      countParams.push(authorEmail);
    }

    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first<{ count: number }>();
    const totalItems = countResult?.count || 0;

    // Format comments
    const formattedComments = await Promise.all(
      result.results.map(async (comment) => {
        return formatCommentResponse(
          comment,
          baseUrl,
          comment.post_slug,
          isAdmin,
          comment.post_title ?? undefined
        );
      })
    );

    // Add pagination headers
    const headers = buildPaginationHeaders(
      page,
      perPage,
      totalItems,
      `${baseUrl}/wp-json/wp/v2/comments`
    );

    return c.json(formattedComments, 200, headers);
  } catch (error: any) {
    return createWPError('rest_internal_error', error.message, 500);
  }
});

// GET /wp/v2/comments/:id - Get single comment
comments.get('/:id', optionalAuthMiddleware, async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const user = c.get('user') as JWTPayload | undefined;
    const isAdmin = !!user && ['administrator', 'editor'].includes(user.role);

    const id = parseInt(c.req.param('id'));

    const comment = await c.env.DB.prepare(`
      SELECT c.*, p.slug as post_slug, p.title as post_title
      FROM comments c
      LEFT JOIN posts p ON c.post_id = p.id
      WHERE c.id = ?
    `).bind(id).first<CommentWithPost>();

    if (!comment) {
      return createWPError('rest_comment_invalid_id', 'Invalid comment ID.', 404);
    }

    // Only show non-approved comments to admins
    if (!isAdmin && comment.status !== 'approved') {
      return createWPError('rest_comment_invalid_id', 'Invalid comment ID.', 404);
    }

    const formattedComment = await formatCommentResponse(
      comment,
      baseUrl,
      comment.post_slug,
      isAdmin,
      comment.post_title ?? undefined
    );

    return c.json(formattedComment);
  } catch (error: any) {
    return createWPError('rest_internal_error', error.message, 500);
  }
});

// POST /wp/v2/comments - Create comment
comments.post('/', optionalAuthMiddleware, async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const body = await c.req.json();
    let { post, parent, author, author_name, author_email, author_url, content } = body;
    let postId = Number(post || 0);
    const parentId = Number(parent || 0);
    let parentCommentRecord: ParentCommentRecord | null = null;

    // If post is not provided but parent is, get post_id from parent comment
    if (!postId && parentId) {
      parentCommentRecord = await c.env.DB.prepare(
        'SELECT id, post_id, author_name, author_email, content FROM comments WHERE id = ?'
      )
        .bind(parentId)
        .first<ParentCommentRecord>();

      if (parentCommentRecord) {
        postId = Number(parentCommentRecord.post_id);
      }
    }

    // Validate required fields
    if (!postId) {
      return createWPError('rest_missing_callback_param', 'Missing parameter(s): post', 400);
    }

    if (!content || !String(content).trim()) {
      return createWPError('rest_missing_callback_param', 'Missing parameter(s): content', 400);
    }

    // Check if authenticated
    let userId: number | null = null;
    let commentAuthorName = author_name;
    let commentAuthorEmail = author_email;
    let commentAuthorUrl = author_url;

    try {
      const user = c.get('user') as JWTPayload | undefined;
      if (user) {
        userId = user.userId;
        // Get user details from database
        const userRecord = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
          .bind(userId)
          .first<User>();
        if (userRecord) {
          commentAuthorName = userRecord.display_name || userRecord.username;
          commentAuthorEmail = userRecord.email;
        }
      }
    } catch (e) {
      // Not authenticated
    }

    // If not authenticated, require author_name and author_email
    if (!userId) {
      if (!author_name || !author_email) {
        return createWPError(
          'rest_missing_callback_param',
          'Missing parameter(s): author_name, author_email',
          400
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(author_email)) {
        return createWPError('rest_invalid_param', 'Invalid author_email.', 400);
      }
    }

    // Verify post exists and comments are open
    const postRecord = await c.env.DB.prepare(
      'SELECT id, slug, title, comment_status FROM posts WHERE id = ? AND post_type = ?'
    )
      .bind(postId, 'post')
      .first<PostRecord>();

    if (!postRecord) {
      return createWPError('rest_comment_invalid_post_id', 'Invalid post ID.', 404);
    }

    if (postRecord.comment_status === 'closed') {
      return createWPError('rest_comment_closed', 'Comments are closed for this post.', 403);
    }

    // Verify parent comment exists if provided
    if (parentId) {
      if (!parentCommentRecord) {
        parentCommentRecord = await c.env.DB.prepare(
          'SELECT id, post_id, author_name, author_email, content FROM comments WHERE id = ?'
        )
          .bind(parentId)
          .first<ParentCommentRecord>();
      }

      if (!parentCommentRecord || Number(parentCommentRecord.post_id) !== postId) {
        return createWPError('rest_comment_invalid_parent', 'Invalid parent comment ID.', 400);
      }
    }

    // Get IP from request
    const authorIp = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || '';

    const now = new Date().toISOString();

    // Determine comment status (can add moderation logic here)
    const commentStatus = 'approved'; // For now, auto-approve all comments

    // Insert comment
    const result = await c.env.DB.prepare(`
      INSERT INTO comments (
        post_id, parent_id, author_name, author_email, author_url,
        author_ip, content, status, user_id, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      postId,
      parentId,
      commentAuthorName,
      commentAuthorEmail,
      commentAuthorUrl || '',
      authorIp,
      String(content).trim(),
      commentStatus,
      userId,
      now
    ).run();

    const commentId = result.meta.last_row_id;

    // Update comment count
    await c.env.DB.prepare('UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?')
      .bind(postId)
      .run();

    // Get the created comment
    const newComment = await c.env.DB.prepare(`
      SELECT c.*, p.slug as post_slug, p.title as post_title
      FROM comments c
      LEFT JOIN posts p ON c.post_id = p.id
      WHERE c.id = ?
    `).bind(commentId).first<CommentWithPost>();

    if (!newComment) {
      return createWPError('rest_comment_invalid_id', 'Invalid comment ID.', 404);
    }

    const formattedComment = await formatCommentResponse(
      newComment,
      baseUrl,
      newComment.post_slug,
      false,
      newComment.post_title ?? undefined
    );

    // Trigger webhook for comment creation
    await sendWebhook(c.env, 'comment.created', formattedComment);

    c.executionCtx.waitUntil(
      sendCommentNotifications(c.env, {
        comment: newComment,
        parentComment: parentCommentRecord,
        post: {
          id: postId,
          slug: newComment.post_slug,
          title: newComment.post_title || postRecord.title
        },
        commentLink: formattedComment.link
      })
    );

    return c.json(formattedComment, 201);
  } catch (error: any) {
    return createWPError('rest_internal_error', error.message, 500);
  }
});

// PUT /wp/v2/comments/:id - Update comment
comments.put('/:id', authMiddleware, async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const user = c.get('user');
    const isAdmin = ['administrator', 'editor'].includes(user.role);

    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const { status, content, author_name, author_email, author_url, author_ip } = body;

    // Check if comment exists
    const existingComment = await c.env.DB.prepare('SELECT * FROM comments WHERE id = ?')
      .bind(id)
      .first<Comment>();

    if (!existingComment) {
      return createWPError('rest_comment_invalid_id', 'Invalid comment ID.', 404);
    }

    // Only admins can update comments
    if (!isAdmin) {
      return createWPError(
        'rest_cannot_edit',
        'Sorry, you are not allowed to edit this comment.',
        403
      );
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (content !== undefined) {
      updates.push('content = ?');
      params.push(content);
    }

    if (author_name !== undefined) {
      updates.push('author_name = ?');
      params.push(author_name);
    }

    if (author_email !== undefined) {
      updates.push('author_email = ?');
      params.push(author_email);
    }

    if (author_url !== undefined) {
      updates.push('author_url = ?');
      params.push(author_url);
    }

    if (author_ip !== undefined) {
      updates.push('author_ip = ?');
      params.push(author_ip);
    }

    if (updates.length === 0) {
      // No updates, return existing comment
      // Get comment with post info
      const commentWithPost = await c.env.DB.prepare(`
        SELECT c.*, p.slug as post_slug, p.title as post_title
        FROM comments c
        LEFT JOIN posts p ON c.post_id = p.id
        WHERE c.id = ?
      `).bind(id).first<CommentWithPost>();

      if (!commentWithPost) {
        return createWPError('rest_comment_invalid_id', 'Invalid comment ID.', 404);
      }

      const formattedComment = await formatCommentResponse(
        commentWithPost,
        baseUrl,
        commentWithPost.post_slug,
        isAdmin,
        commentWithPost.post_title ?? undefined
      );
      return c.json(formattedComment);
    }

    const updateQuery = `UPDATE comments SET ${updates.join(', ')} WHERE id = ?`;
    params.push(id);

    await c.env.DB.prepare(updateQuery).bind(...params).run();

    // Get updated comment
    const updatedComment = await c.env.DB.prepare(`
      SELECT c.*, p.slug as post_slug, p.title as post_title
      FROM comments c
      LEFT JOIN posts p ON c.post_id = p.id
      WHERE c.id = ?
    `).bind(id).first<CommentWithPost>();

    if (!updatedComment) {
      return createWPError('rest_comment_invalid_id', 'Invalid comment ID.', 404);
    }

    const formattedComment = await formatCommentResponse(
      updatedComment,
      baseUrl,
      updatedComment.post_slug,
      isAdmin,
      updatedComment.post_title ?? undefined
    );

    // Trigger webhook for comment update
    await sendWebhook(c.env, 'comment.updated', formattedComment);

    return c.json(formattedComment);
  } catch (error: any) {
    return createWPError('rest_internal_error', error.message, 500);
  }
});

// DELETE /wp/v2/comments/:id - Delete comment
comments.delete('/:id', authMiddleware, async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const user = c.get('user');
    const isAdmin = ['administrator', 'editor'].includes(user.role);

    const id = parseInt(c.req.param('id'));
    const force = c.req.query('force') === 'true';

    // Check if comment exists
    const comment = await c.env.DB.prepare(`
      SELECT c.*, p.slug as post_slug, p.title as post_title
      FROM comments c
      LEFT JOIN posts p ON c.post_id = p.id
      WHERE c.id = ?
    `).bind(id).first<CommentWithPost>();

    if (!comment) {
      return createWPError('rest_comment_invalid_id', 'Invalid comment ID.', 404);
    }

    // Only admins can delete comments
    if (!isAdmin) {
      return createWPError(
        'rest_cannot_delete',
        'Sorry, you are not allowed to delete this comment.',
        403
      );
    }

    if (force) {
      // Permanently delete
      await c.env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(id).run();

      // Update comment count
      await c.env.DB.prepare('UPDATE posts SET comment_count = comment_count - 1 WHERE id = ?')
        .bind(comment.post_id)
        .run();

      const formattedComment = await formatCommentResponse(
        comment,
        baseUrl,
        comment.post_slug,
        isAdmin,
        comment.post_title ?? undefined
      );

      // Trigger webhook for comment deletion
      await sendWebhook(c.env, 'comment.deleted', formattedComment);

      return c.json({ deleted: true, previous: formattedComment });
    } else {
      // Move to trash
      await c.env.DB.prepare('UPDATE comments SET status = ? WHERE id = ?')
        .bind('trash', id)
        .run();

      const trashedComment = await c.env.DB.prepare(`
        SELECT c.*, p.slug as post_slug, p.title as post_title
        FROM comments c
        LEFT JOIN posts p ON c.post_id = p.id
        WHERE c.id = ?
      `).bind(id).first<CommentWithPost>();

      if (!trashedComment) {
        return createWPError('rest_comment_invalid_id', 'Invalid comment ID.', 404);
      }

      const formattedComment = await formatCommentResponse(
        trashedComment,
        baseUrl,
        trashedComment.post_slug,
        isAdmin,
        trashedComment.post_title ?? undefined
      );

      // Trigger webhook for comment update
      await sendWebhook(c.env, 'comment.updated', formattedComment);

      return c.json(formattedComment);
    }
  } catch (error: any) {
    return createWPError('rest_internal_error', error.message, 500);
  }
});

export default comments;
