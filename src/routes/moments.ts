import { Hono } from 'hono';
import type { AppEnv, Env, JWTPayload } from '../types';
import { buildPaginationHeaders, createWPError, getSiteSettings } from '../utils';
import { authMiddleware, optionalAuthMiddleware } from '../auth';

const moments = new Hono<AppEnv>();

function getBaseUrl(value: unknown): string {
  return String(value || 'http://localhost:8787').replace(/\/$/, '');
}

function formatMomentResponse(moment: any, author: any, baseUrl: string) {
  const mediaUrls = moment.media_urls ? JSON.parse(moment.media_urls) : [];

  return {
    id: moment.id,
    content: {
      rendered: moment.content,
      raw: moment.content,
    },
    author: author.id,
    author_name: author.display_name || author.username,
    author_avatar:
      author.avatar_url || `https://cn.cravatar.com/avatar/${moment.author_id}?d=mp`,
    status: moment.status,
    media_urls: mediaUrls,
    view_count: moment.view_count || 0,
    like_count: moment.like_count || 0,
    comment_count: moment.comment_count || 0,
    date: moment.created_at,
    date_gmt: moment.created_at,
    modified: moment.updated_at,
    modified_gmt: moment.updated_at,
    _links: {
      self: [{ href: `${baseUrl}/wp-json/wp/v2/moments/${moment.id}` }],
      author: [{ href: `${baseUrl}/wp-json/wp/v2/users/${author.id}` }],
      comments: [{ href: `${baseUrl}/wp-json/wp/v2/moments/${moment.id}/comments` }],
    },
  };
}

function formatMomentCommentResponse(comment: any, baseUrl: string, isAdmin = false) {
  const response: any = {
    id: comment.id,
    moment: comment.moment_id,
    parent: comment.parent_id || 0,
    author: comment.user_id || 0,
    author_name: comment.author_name,
    author_url: comment.author_url || '',
    date: comment.created_at,
    date_gmt: comment.created_at,
    content: {
      rendered: comment.content,
    },
    link: `${baseUrl}/talking#moment-comment-${comment.id}`,
    status: comment.status,
    type: 'moment_comment',
  };

  if (comment.moment_preview) {
    response.post_title = `[动态] ${comment.moment_preview}`;
  }

  if (isAdmin) {
    response.author_email = comment.author_email || '';
    response.author_ip = comment.author_ip || '';
  }

  return response;
}

async function ensureMomentCommentTables(env: Env): Promise<void> {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS moment_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      moment_id INTEGER NOT NULL,
      parent_id INTEGER DEFAULT 0,
      author_name TEXT NOT NULL,
      author_email TEXT NOT NULL,
      author_url TEXT,
      author_ip TEXT,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'approved' CHECK(status IN ('approved', 'pending', 'spam', 'trash')),
      user_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (moment_id) REFERENCES moments(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `).run();

  await env.DB.prepare(
    'CREATE INDEX IF NOT EXISTS idx_moment_comments_moment ON moment_comments(moment_id)',
  ).run();
  await env.DB.prepare(
    'CREATE INDEX IF NOT EXISTS idx_moment_comments_parent ON moment_comments(parent_id)',
  ).run();
  await env.DB.prepare(
    'CREATE INDEX IF NOT EXISTS idx_moment_comments_status ON moment_comments(status)',
  ).run();
}

function getClientIp(c: any): string {
  return (
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for') ||
    c.req.header('x-real-ip') ||
    ''
  )
    .split(',')[0]
    .trim();
}

async function getMomentOr404(env: Env, id: number): Promise<any | null> {
  return env.DB.prepare('SELECT * FROM moments WHERE id = ?').bind(id).first();
}

// GET /wp/v2/moments - List moments
moments.get('/', optionalAuthMiddleware, async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = getBaseUrl(settings?.site_url);

    const page = parseInt(c.req.query('page') || '1');
    const perPage = parseInt(c.req.query('per_page') || '10');
    const status = c.req.query('status') || 'publish';
    const author = c.req.query('author');
    const order = c.req.query('order') || 'desc';

    const offset = (page - 1) * perPage;

    let query = 'SELECT * FROM moments WHERE 1=1';
    const params: any[] = [];

    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (author) {
      query += ' AND author_id = ?';
      params.push(parseInt(author));
    }

    query += ` ORDER BY created_at ${order.toUpperCase()} LIMIT ? OFFSET ?`;
    params.push(perPage, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all();

    let countQuery = 'SELECT COUNT(*) as total FROM moments WHERE 1=1';
    const countParams: any[] = [];
    if (status && status !== 'all') {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    if (author) {
      countQuery += ' AND author_id = ?';
      countParams.push(parseInt(author));
    }
    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first();
    const total = (countResult as any)?.total || 0;

    const formattedMoments = await Promise.all(
      result.results.map(async (moment: any) => {
        const authorRecord = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
          .bind(moment.author_id)
          .first();
        return formatMomentResponse(moment, authorRecord, baseUrl);
      }),
    );

    const headers = buildPaginationHeaders(
      page,
      perPage,
      total,
      `${baseUrl}/wp-json/wp/v2/moments`,
    );

    return c.json(formattedMoments, 200, headers);
  } catch (error) {
    console.error('Error fetching moments:', error);
    return createWPError('fetch_error', 'Failed to fetch moments', 500);
  }
});

// GET /wp/v2/moments/comments/all - Admin list all moment comments
moments.get('/comments/all', authMiddleware, async (c) => {
  try {
    await ensureMomentCommentTables(c.env);

    const user = (c as any).get('user') as JWTPayload;
    const isAdmin = ['administrator', 'editor'].includes(user.role);
    if (!isAdmin) {
      return createWPError('forbidden', 'You do not have permission to view moment comments', 403);
    }

    const settings = await getSiteSettings(c.env);
    const baseUrl = getBaseUrl(settings?.site_url);
    const page = parseInt(c.req.query('page') || '1');
    const perPage = parseInt(c.req.query('per_page') || '50');
    const status = c.req.query('status') || 'all';
    const offset = (page - 1) * perPage;

    let query = `
      SELECT mc.*, SUBSTR(REPLACE(REPLACE(m.content, CHAR(10), ' '), CHAR(13), ' '), 1, 60) AS moment_preview
      FROM moment_comments mc
      LEFT JOIN moments m ON m.id = mc.moment_id
      WHERE 1 = 1
    `;
    const params: any[] = [];

    if (status !== 'all') {
      query += ' AND mc.status = ?';
      params.push(status);
    }

    query += ' ORDER BY mc.created_at DESC LIMIT ? OFFSET ?';
    params.push(perPage, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all<any>();

    let countQuery = 'SELECT COUNT(*) AS total FROM moment_comments WHERE 1 = 1';
    const countParams: any[] = [];
    if (status !== 'all') {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    const countResult = await c.env.DB.prepare(countQuery)
      .bind(...countParams)
      .first<{ total: number }>();

    const total = Number(countResult?.total || 0);
    const headers = buildPaginationHeaders(
      page,
      perPage,
      total,
      `${baseUrl}/wp-json/wp/v2/moments/comments/all`,
    );

    return c.json(
      (result.results || []).map((item) => formatMomentCommentResponse(item, baseUrl, true)),
      200,
      headers,
    );
  } catch (error) {
    console.error('Error fetching all moment comments:', error);
    return createWPError('fetch_error', 'Failed to fetch all moment comments', 500);
  }
});

// GET /wp/v2/moments/:id/comments - List moment comments
moments.get('/:id/comments', optionalAuthMiddleware, async (c) => {
  try {
    await ensureMomentCommentTables(c.env);

    const settings = await getSiteSettings(c.env);
    const baseUrl = getBaseUrl(settings?.site_url);
    const id = parseInt(c.req.param('id'));
    let isAdmin = false;

    try {
      const user = (c as any).get('user') as JWTPayload;
      isAdmin = !!user && ['administrator', 'editor'].includes(user.role);
    } catch {
      isAdmin = false;
    }

    const moment = await getMomentOr404(c.env, id);
    if (!moment) {
      return createWPError('moment_not_found', 'Moment not found', 404);
    }

    const page = parseInt(c.req.query('page') || '1');
    const perPage = parseInt(c.req.query('per_page') || '50');
    const status = c.req.query('status') || (isAdmin ? 'all' : 'approved');
    const offset = (page - 1) * perPage;

    let query = `
      SELECT *
      FROM moment_comments
      WHERE moment_id = ?
    `;
    const params: any[] = [id];

    if (!isAdmin) {
      query += ` AND status = 'approved'`;
    } else if (status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at ASC LIMIT ? OFFSET ?';
    params.push(perPage, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all<any>();

    let countQuery = `
      SELECT COUNT(*) AS total
      FROM moment_comments
      WHERE moment_id = ?
    `;
    const countParams: any[] = [id];

    if (!isAdmin) {
      countQuery += ` AND status = 'approved'`;
    } else if (status !== 'all') {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    const countResult = await c.env.DB.prepare(countQuery)
      .bind(...countParams)
      .first<{ total: number }>();

    const total = Number(countResult?.total || 0);
    const headers = buildPaginationHeaders(
      page,
      perPage,
      total,
      `${baseUrl}/wp-json/wp/v2/moments/${id}/comments`,
    );

    return c.json(
      (result.results || []).map((item) => formatMomentCommentResponse(item, baseUrl, isAdmin)),
      200,
      headers,
    );
  } catch (error) {
    console.error('Error fetching moment comments:', error);
    return createWPError('fetch_error', 'Failed to fetch moment comments', 500);
  }
});

// POST /wp/v2/moments/:id/comments - Create moment comment
moments.post('/:id/comments', optionalAuthMiddleware, async (c) => {
  try {
    await ensureMomentCommentTables(c.env);

    const settings = await getSiteSettings(c.env);
    const baseUrl = getBaseUrl(settings?.site_url);
    const momentId = parseInt(c.req.param('id'));
    const moment = await getMomentOr404(c.env, momentId);

    if (!moment) {
      return createWPError('moment_not_found', 'Moment not found', 404);
    }

    const body = await c.req.json();
    let { parent, author_name, author_email, author_url, content } = body;

    if (!content || !String(content).trim()) {
      return createWPError('rest_missing_callback_param', 'Missing parameter(s): content', 400);
    }

    let userId: number | null = null;
    let commentAuthorName = author_name;
    let commentAuthorEmail = author_email;
    let commentAuthorUrl = author_url;

    try {
      const user = (c as any).get('user') as JWTPayload;
      if (user) {
        userId = user.userId;
        const userRecord = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
          .bind(userId)
          .first<any>();

        if (userRecord) {
          commentAuthorName = userRecord.display_name || userRecord.username;
          commentAuthorEmail = userRecord.email;
          commentAuthorUrl = author_url || '';
        }
      }
    } catch {
      // guest comment
    }

    if (!userId && (!author_name || !author_email)) {
      return createWPError(
        'rest_missing_callback_param',
        'Missing parameter(s): author_name, author_email',
        400,
      );
    }

    if (parent) {
      const parentComment = await c.env.DB.prepare(`
        SELECT id
        FROM moment_comments
        WHERE id = ?
          AND moment_id = ?
      `).bind(parent, momentId).first();

      if (!parentComment) {
        return createWPError('rest_comment_invalid_parent', 'Invalid parent comment ID.', 400);
      }
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO moment_comments (
        moment_id, parent_id, author_name, author_email, author_url,
        author_ip, content, status, user_id, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?, CURRENT_TIMESTAMP)
    `).bind(
      momentId,
      parent || 0,
      commentAuthorName,
      commentAuthorEmail,
      commentAuthorUrl || '',
      getClientIp(c),
      String(content).trim(),
      userId,
    ).run();

    await c.env.DB.prepare(`
      UPDATE moments
      SET comment_count = comment_count + 1
      WHERE id = ?
    `).bind(momentId).run();

    const newComment = await c.env.DB.prepare(`
      SELECT *
      FROM moment_comments
      WHERE id = ?
    `).bind(result.meta.last_row_id).first<any>();

    return c.json(formatMomentCommentResponse(newComment, baseUrl, !!userId), 201);
  } catch (error) {
    console.error('Error creating moment comment:', error);
    return createWPError('create_error', 'Failed to create moment comment', 500);
  }
});

// PUT /wp/v2/moments/:id/comments/:commentId - Update moment comment
moments.put('/:id/comments/:commentId', authMiddleware, async (c) => {
  try {
    await ensureMomentCommentTables(c.env);

    const user = (c as any).get('user') as JWTPayload;
    const isAdmin = ['administrator', 'editor'].includes(user.role);
    if (!isAdmin) {
      return createWPError('forbidden', 'You do not have permission to edit moment comments', 403);
    }

    const settings = await getSiteSettings(c.env);
    const baseUrl = getBaseUrl(settings?.site_url);
    const momentId = parseInt(c.req.param('id'));
    const commentId = parseInt(c.req.param('commentId'));
    const body = await c.req.json();
    const { status, content, author_name, author_email, author_url, author_ip } = body;

    const existingComment = await c.env.DB.prepare(`
      SELECT *
      FROM moment_comments
      WHERE id = ?
        AND moment_id = ?
    `).bind(commentId, momentId).first<any>();

    if (!existingComment) {
      return createWPError('rest_comment_invalid_id', 'Invalid moment comment ID.', 404);
    }

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

    if (!updates.length) {
      return c.json(formatMomentCommentResponse(existingComment, baseUrl, true));
    }

    params.push(commentId, momentId);

    await c.env.DB.prepare(`
      UPDATE moment_comments
      SET ${updates.join(', ')}
      WHERE id = ?
        AND moment_id = ?
    `).bind(...params).run();

    await c.env.DB.prepare(`
      UPDATE moments
      SET comment_count = (
        SELECT COUNT(*)
        FROM moment_comments
        WHERE moment_id = ?
          AND status = 'approved'
      )
      WHERE id = ?
    `).bind(momentId, momentId).run();

    const updatedComment = await c.env.DB.prepare(`
      SELECT *
      FROM moment_comments
      WHERE id = ?
        AND moment_id = ?
    `).bind(commentId, momentId).first<any>();

    return c.json(formatMomentCommentResponse(updatedComment, baseUrl, true));
  } catch (error) {
    console.error('Error updating moment comment:', error);
    return createWPError('update_error', 'Failed to update moment comment', 500);
  }
});

// DELETE /wp/v2/moments/:id/comments/:commentId - Delete moment comment
moments.delete('/:id/comments/:commentId', authMiddleware, async (c) => {
  try {
    await ensureMomentCommentTables(c.env);

    const user = (c as any).get('user') as JWTPayload;
    const isAdmin = ['administrator', 'editor'].includes(user.role);
    if (!isAdmin) {
      return createWPError('forbidden', 'You do not have permission to delete moment comments', 403);
    }

    const settings = await getSiteSettings(c.env);
    const baseUrl = getBaseUrl(settings?.site_url);
    const momentId = parseInt(c.req.param('id'));
    const commentId = parseInt(c.req.param('commentId'));
    const force = c.req.query('force') === 'true';

    const existingComment = await c.env.DB.prepare(`
      SELECT *
      FROM moment_comments
      WHERE id = ?
        AND moment_id = ?
    `).bind(commentId, momentId).first<any>();

    if (!existingComment) {
      return createWPError('rest_comment_invalid_id', 'Invalid moment comment ID.', 404);
    }

    if (force) {
      await c.env.DB.prepare(`
        DELETE FROM moment_comments
        WHERE id = ?
          AND moment_id = ?
      `).bind(commentId, momentId).run();
    } else {
      await c.env.DB.prepare(`
        UPDATE moment_comments
        SET status = 'trash'
        WHERE id = ?
          AND moment_id = ?
      `).bind(commentId, momentId).run();
    }

    await c.env.DB.prepare(`
      UPDATE moments
      SET comment_count = (
        SELECT COUNT(*)
        FROM moment_comments
        WHERE moment_id = ?
          AND status = 'approved'
      )
      WHERE id = ?
    `).bind(momentId, momentId).run();

    return c.json({
      deleted: !!force,
      previous: formatMomentCommentResponse(existingComment, baseUrl, true),
    });
  } catch (error) {
    console.error('Error deleting moment comment:', error);
    return createWPError('delete_error', 'Failed to delete moment comment', 500);
  }
});

// POST /wp/v2/moments/:id/like - Like moment
moments.post('/:id/like', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const moment = await getMomentOr404(c.env, id);
    if (!moment) {
      return createWPError('moment_not_found', 'Moment not found', 404);
    }

    await c.env.DB.prepare(`
      UPDATE moments
      SET like_count = like_count + 1
      WHERE id = ?
    `).bind(id).run();

    const updated = await c.env.DB.prepare('SELECT like_count FROM moments WHERE id = ?')
      .bind(id)
      .first<{ like_count: number }>();

    return c.json({
      id,
      like_count: Number(updated?.like_count || 0),
      liked: true,
    });
  } catch (error) {
    console.error('Error liking moment:', error);
    return createWPError('like_error', 'Failed to like moment', 500);
  }
});

// DELETE /wp/v2/moments/:id/like - Unlike moment
moments.delete('/:id/like', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const moment = await getMomentOr404(c.env, id);
    if (!moment) {
      return createWPError('moment_not_found', 'Moment not found', 404);
    }

    await c.env.DB.prepare(`
      UPDATE moments
      SET like_count = CASE WHEN like_count > 0 THEN like_count - 1 ELSE 0 END
      WHERE id = ?
    `).bind(id).run();

    const updated = await c.env.DB.prepare('SELECT like_count FROM moments WHERE id = ?')
      .bind(id)
      .first<{ like_count: number }>();

    return c.json({
      id,
      like_count: Number(updated?.like_count || 0),
      liked: false,
    });
  } catch (error) {
    console.error('Error unliking moment:', error);
    return createWPError('unlike_error', 'Failed to unlike moment', 500);
  }
});

// GET /wp/v2/moments/:id - Get single moment
moments.get('/:id', optionalAuthMiddleware, async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = getBaseUrl(settings?.site_url);
    const id = parseInt(c.req.param('id'));

    const moment = await getMomentOr404(c.env, id);
    if (!moment) {
      return createWPError('moment_not_found', 'Moment not found', 404);
    }

    const author = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind((moment as any).author_id)
      .first();

    await c.env.DB.prepare('UPDATE moments SET view_count = view_count + 1 WHERE id = ?')
      .bind(id)
      .run();

    return c.json(formatMomentResponse(moment, author, baseUrl));
  } catch (error) {
    console.error('Error fetching moment:', error);
    return createWPError('fetch_error', 'Failed to fetch moment', 500);
  }
});

// POST /wp/v2/moments - Create moment
moments.post('/', authMiddleware, async (c) => {
  try {
    const user = (c as any).get('user') as JWTPayload;
    const body = await c.req.json();

    const { content, status = 'publish', media_urls = [] } = body;

    if (!content || content.trim() === '') {
      return createWPError('missing_content', 'Content is required', 400);
    }

    if (!['publish', 'draft', 'trash'].includes(status)) {
      return createWPError('invalid_status', 'Invalid status', 400);
    }

    const mediaUrlsJson = JSON.stringify(media_urls);
    const result = await c.env.DB.prepare(`
      INSERT INTO moments (content, author_id, status, media_urls)
      VALUES (?, ?, ?, ?)
    `).bind(content, user.userId, status, mediaUrlsJson).run();

    const momentId = result.meta.last_row_id;
    const moment = await c.env.DB.prepare('SELECT * FROM moments WHERE id = ?')
      .bind(momentId)
      .first();

    const author = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(user.userId)
      .first();

    const settings = await getSiteSettings(c.env);
    const baseUrl = getBaseUrl(settings?.site_url);

    return c.json(formatMomentResponse(moment, author, baseUrl), 201);
  } catch (error) {
    console.error('Error creating moment:', error);
    return createWPError('create_error', 'Failed to create moment', 500);
  }
});

// PUT /wp/v2/moments/:id - Update moment
moments.put('/:id', authMiddleware, async (c) => {
  try {
    const user = (c as any).get('user') as JWTPayload;
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();

    const existingMoment = await c.env.DB.prepare('SELECT * FROM moments WHERE id = ?')
      .bind(id)
      .first() as any;

    if (!existingMoment) {
      return createWPError('moment_not_found', 'Moment not found', 404);
    }

    if (existingMoment.author_id !== user.userId && user.role !== 'administrator') {
      return createWPError('forbidden', 'You do not have permission to edit this moment', 403);
    }

    const { content, status, media_urls } = body;
    const updates: string[] = [];
    const params: any[] = [];

    if (content !== undefined) {
      updates.push('content = ?');
      params.push(content);
    }

    if (status !== undefined) {
      if (!['publish', 'draft', 'trash'].includes(status)) {
        return createWPError('invalid_status', 'Invalid status', 400);
      }
      updates.push('status = ?');
      params.push(status);
    }

    if (media_urls !== undefined) {
      updates.push('media_urls = ?');
      params.push(JSON.stringify(media_urls));
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    if (updates.length === 1) {
      return createWPError('no_changes', 'No changes to update', 400);
    }

    params.push(id);

    await c.env.DB.prepare(`
      UPDATE moments SET ${updates.join(', ')} WHERE id = ?
    `).bind(...params).run();

    const moment = await c.env.DB.prepare('SELECT * FROM moments WHERE id = ?')
      .bind(id)
      .first();

    const author = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind((moment as any).author_id)
      .first();

    const settings = await getSiteSettings(c.env);
    const baseUrl = getBaseUrl(settings?.site_url);

    return c.json(formatMomentResponse(moment, author, baseUrl));
  } catch (error) {
    console.error('Error updating moment:', error);
    return createWPError('update_error', 'Failed to update moment', 500);
  }
});

// DELETE /wp/v2/moments/:id - Delete moment
moments.delete('/:id', authMiddleware, async (c) => {
  try {
    const user = (c as any).get('user') as JWTPayload;
    const id = parseInt(c.req.param('id'));
    const force = c.req.query('force') === 'true';

    const existingMoment = await c.env.DB.prepare('SELECT * FROM moments WHERE id = ?')
      .bind(id)
      .first() as any;

    if (!existingMoment) {
      return createWPError('moment_not_found', 'Moment not found', 404);
    }

    if (existingMoment.author_id !== user.userId && user.role !== 'administrator') {
      return createWPError('forbidden', 'You do not have permission to delete this moment', 403);
    }

    if (force) {
      await c.env.DB.prepare('DELETE FROM moments WHERE id = ?').bind(id).run();
      return c.json({ deleted: true, previous: existingMoment });
    }

    await c.env.DB.prepare(`
      UPDATE moments
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind('trash', id).run();

    const moment = await c.env.DB.prepare('SELECT * FROM moments WHERE id = ?')
      .bind(id)
      .first();

    const author = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind((moment as any).author_id)
      .first();

    const settings = await getSiteSettings(c.env);
    const baseUrl = getBaseUrl(settings?.site_url);

    return c.json(formatMomentResponse(moment, author, baseUrl));
  } catch (error) {
    console.error('Error deleting moment:', error);
    return createWPError('delete_error', 'Failed to delete moment', 500);
  }
});

export default moments;
