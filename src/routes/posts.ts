import { Hono } from 'hono';
import { Env, Post, JWTPayload } from '../types';
import { formatPostResponse, generateSlug, generateSlugWithAI, generateExcerptWithAI, buildPaginationHeaders, createWPError, getSiteSettings, sendWebhook } from '../utils';
import { authMiddleware, optionalAuthMiddleware, canEditPost, canDeletePost, canPublishPost } from '../auth';

const posts = new Hono<{ Bindings: Env }>();

// GET /wp/v2/posts - List posts
posts.get('/', optionalAuthMiddleware, async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const page = parseInt(c.req.query('page') || '1');
    const perPage = parseInt(c.req.query('per_page') || '10');
    const status = c.req.query('status') || 'publish';
    const author = c.req.query('author');
    const categories = c.req.query('categories');
    const tags = c.req.query('tags');
    const search = c.req.query('search');
    const slug = c.req.query('slug');  // 添加 slug 参数
    const orderby = c.req.query('orderby') || 'date';
    const order = c.req.query('order') || 'desc';

    const offset = (page - 1) * perPage;

    let query = 'SELECT * FROM posts WHERE post_type = ? AND status = ?';
    const params: any[] = ['post', status];

    if (author) {
      query += ' AND author_id = ?';
      params.push(parseInt(author));
    }

    // Filter by slug
    if (slug) {
      query += ' AND slug = ?';
      params.push(slug);
    }

    // Filter by categories (支持ID或slug)
    if (categories) {
      const categoryValues = categories.split(',');

      // 判断是ID还是slug
      const isNumeric = categoryValues.every((val: string) => !isNaN(parseInt(val)));

      if (isNumeric) {
        // 如果是数字ID
        const categoryIds = categoryValues.map((id: string) => parseInt(id));
        query += ` AND id IN (SELECT post_id FROM post_categories WHERE category_id IN (${categoryIds.map(() => '?').join(',')}))`;
        params.push(...categoryIds);
      } else {
        // 如果是slug，先查询对应的分类ID
        const slugPlaceholders = categoryValues.map(() => '?').join(',');
        const categoryResult = await c.env.DB.prepare(
          `SELECT id FROM categories WHERE slug IN (${slugPlaceholders})`
        ).bind(...categoryValues).all();

        const categoryIds = categoryResult.results.map((cat: any) => cat.id);

        if (categoryIds.length > 0) {
          query += ` AND id IN (SELECT post_id FROM post_categories WHERE category_id IN (${categoryIds.map(() => '?').join(',')}))`;
          params.push(...categoryIds);
        } else {
          // 如果找不到对应的分类，返回空结果
          query += ' AND 1=0'; // 添加永假条件，返回空结果
        }
      }
    }

    // Filter by tags (支持ID或slug)
    if (tags) {
      const tagValues = tags.split(',');
      const isNumeric = tagValues.every((val: string) => !isNaN(parseInt(val)));

      if (isNumeric) {
        const tagIds = tagValues.map((id: string) => parseInt(id));
        query += ` AND id IN (SELECT post_id FROM post_tags WHERE tag_id IN (${tagIds.map(() => '?').join(',')}))`;
        params.push(...tagIds);
      } else {
        const slugPlaceholders = tagValues.map(() => '?').join(',');
        const tagResult = await c.env.DB.prepare(
          `SELECT id FROM tags WHERE slug IN (${slugPlaceholders})`
        ).bind(...tagValues).all();

        const tagIds = tagResult.results.map((tag: any) => tag.id);

        if (tagIds.length > 0) {
          query += ` AND id IN (SELECT post_id FROM post_tags WHERE tag_id IN (${tagIds.map(() => '?').join(',')}))`;
          params.push(...tagIds);
        } else {
          query += ' AND 1=0';
        }
      }
    }

    if (search) {
      query += ' AND (title LIKE ? OR content LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Order
    const orderMap: Record<string, string> = {
      date: 'published_at',
      modified: 'updated_at',
      title: 'title',
      id: 'id'
    };
    const orderColumn = orderMap[orderby] || 'published_at';
    query += ` ORDER BY ${orderColumn} ${order.toUpperCase()} LIMIT ? OFFSET ?`;
    params.push(perPage, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all();

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM posts WHERE post_type = ? AND status = ?';
    const countParams: any[] = ['post', status];
    if (author) {
      countQuery += ' AND author_id = ?';
      countParams.push(parseInt(author));
    }
    // Filter by slug
    if (slug) {
      countQuery += ' AND slug = ?';
      countParams.push(slug);
    }
    // Filter by categories (支持ID或slug)
    if (categories) {
      const categoryValues = categories.split(',');
      const isNumeric = categoryValues.every((val: string) => !isNaN(parseInt(val)));

      if (isNumeric) {
        const categoryIds = categoryValues.map((id: string) => parseInt(id));
        countQuery += ` AND id IN (SELECT post_id FROM post_categories WHERE category_id IN (${categoryIds.map(() => '?').join(',')}))`;
        countParams.push(...categoryIds);
      } else {
        // 使用前面查询到的categoryIds
        const slugPlaceholders = categoryValues.map(() => '?').join(',');
        const categoryResult = await c.env.DB.prepare(
          `SELECT id FROM categories WHERE slug IN (${slugPlaceholders})`
        ).bind(...categoryValues).all();

        const categoryIds = categoryResult.results.map((cat: any) => cat.id);

        if (categoryIds.length > 0) {
          countQuery += ` AND id IN (SELECT post_id FROM post_categories WHERE category_id IN (${categoryIds.map(() => '?').join(',')}))`;
          countParams.push(...categoryIds);
        } else {
          countQuery += ' AND 1=0';
        }
      }
    }
    // Filter by tags (支持ID或slug)
    if (tags) {
      const tagValues = tags.split(',');
      const isNumeric = tagValues.every((val: string) => !isNaN(parseInt(val)));

      if (isNumeric) {
        const tagIds = tagValues.map((id: string) => parseInt(id));
        countQuery += ` AND id IN (SELECT post_id FROM post_tags WHERE tag_id IN (${tagIds.map(() => '?').join(',')}))`;
        countParams.push(...tagIds);
      } else {
        const slugPlaceholders = tagValues.map(() => '?').join(',');
        const tagResult = await c.env.DB.prepare(
          `SELECT id FROM tags WHERE slug IN (${slugPlaceholders})`
        ).bind(...tagValues).all();

        const tagIds = tagResult.results.map((tag: any) => tag.id);

        if (tagIds.length > 0) {
          countQuery += ` AND id IN (SELECT post_id FROM post_tags WHERE tag_id IN (${tagIds.map(() => '?').join(',')}))`;
          countParams.push(...tagIds);
        } else {
          countQuery += ' AND 1=0';
        }
      }
    }
    if (search) {
      countQuery += ' AND (title LIKE ? OR content LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first();
    const totalItems = (countResult?.count as number) || 0;

    // Get categories and tags for each post
    const formattedPosts = await Promise.all(
      (result.results as Post[]).map(async (post) => {
        // Get categories
        const categoryResult = await c.env.DB.prepare(
          'SELECT category_id FROM post_categories WHERE post_id = ?'
        )
          .bind(post.id)
          .all();
        const categoryIds = categoryResult.results.map((r: any) => r.category_id);

        // Get tags
        const tagResult = await c.env.DB.prepare(
          'SELECT tag_id FROM post_tags WHERE post_id = ?'
        )
          .bind(post.id)
          .all();
        const tagIds = tagResult.results.map((r: any) => r.tag_id);

        return formatPostResponse(post, baseUrl, categoryIds, tagIds);
      })
    );

    // Add pagination headers
    const headers = buildPaginationHeaders(
      page,
      perPage,
      totalItems,
      `${baseUrl}/wp-json/wp/v2/posts`
    );

    return c.json(formattedPosts, 200, headers);
  } catch (error: any) {
    return createWPError('server_error', error.message, 500);
  }
});

// GET /wp/v2/posts/:id - Get single post
posts.get('/:id', optionalAuthMiddleware, async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const id = parseInt(c.req.param('id'));

    const post = await c.env.DB.prepare('SELECT * FROM posts WHERE id = ? AND post_type = ?')
      .bind(id, 'post')
      .first<Post>();

    if (!post) {
      return createWPError('rest_post_invalid_id', 'Invalid post ID.', 404);
    }

    // Get categories
    const categoryResult = await c.env.DB.prepare(
      'SELECT category_id FROM post_categories WHERE post_id = ?'
    )
      .bind(id)
      .all();
    const categoryIds = categoryResult.results.map((r: any) => r.category_id);

    // Get tags
    const tagResult = await c.env.DB.prepare('SELECT tag_id FROM post_tags WHERE post_id = ?')
      .bind(id)
      .all();
    const tagIds = tagResult.results.map((r: any) => r.tag_id);

    // Increment view count
    await c.env.DB.prepare('UPDATE posts SET view_count = view_count + 1 WHERE id = ?')
      .bind(id)
      .run();

    return c.json(formatPostResponse(post, baseUrl, categoryIds, tagIds));
  } catch (error: any) {
    return createWPError('server_error', error.message, 500);
  }
});

// POST /wp/v2/posts - Create post
posts.post('/', authMiddleware, async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const user = c.get('user') as JWTPayload;
    const body = await c.req.json();

    const { title, content, excerpt, slug, status, categories, tags, featured_media, featured_image_url, date, sticky } = body;

    if (!title) {
      return createWPError('rest_invalid_param', 'Title is required.', 400);
    }

    // Check if user can publish
    const postStatus = status || 'draft';
    if (postStatus === 'publish' && !canPublishPost(user)) {
      return createWPError(
        'rest_cannot_publish',
        'Sorry, you are not allowed to publish posts.',
        403
      );
    }

    // Generate slug using AI if not provided
    let postSlug: string;
    if (slug && slug.trim()) {
      postSlug = slug.trim();
    } else {
      // Use AI to generate slug
      postSlug = await generateSlugWithAI(c.env, title);
    }

    // Ensure slug is unique
    let slugExists = await c.env.DB.prepare('SELECT id FROM posts WHERE slug = ?')
      .bind(postSlug)
      .first();
    let counter = 1;
    const baseSlug = postSlug;
    while (slugExists) {
      postSlug = `${baseSlug}-${counter}`;
      slugExists = await c.env.DB.prepare('SELECT id FROM posts WHERE slug = ?')
        .bind(postSlug)
        .first();
      counter++;
    }

    // Generate excerpt using AI if not provided
    let postExcerpt = excerpt;
    if (!postExcerpt && content) {
      postExcerpt = await generateExcerptWithAI(c.env, title, content);
    }

    const now = new Date().toISOString();
    // Use custom date if provided, otherwise use current time
    const customDate = date ? new Date(date).toISOString() : now;
    const publishedAt = postStatus === 'publish' ? customDate : null;

    // Insert post
    const result = await c.env.DB.prepare(
      `INSERT INTO posts (title, content, excerpt, slug, status, post_type, author_id, featured_media_id, featured_image_url, sticky, published_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        title,
        content || '',
        postExcerpt || '',
        postSlug,
        postStatus,
        'post',
        user.userId,
        featured_media || null,
        featured_image_url || null,
        sticky ? 1 : 0,
        publishedAt,
        now,
        now
      )
      .run();

    const postId = result.meta.last_row_id;

    // Add categories
    if (categories && Array.isArray(categories)) {
      for (const categoryId of categories) {
        await c.env.DB.prepare(
          'INSERT OR IGNORE INTO post_categories (post_id, category_id) VALUES (?, ?)'
        )
          .bind(postId, categoryId)
          .run();

        // Update category count
        await c.env.DB.prepare('UPDATE categories SET count = count + 1 WHERE id = ?')
          .bind(categoryId)
          .run();
      }
    }

    // Add tags
    if (tags && Array.isArray(tags)) {
      for (const tagId of tags) {
        await c.env.DB.prepare('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)')
          .bind(postId, tagId)
          .run();

        // Update tag count
        await c.env.DB.prepare('UPDATE tags SET count = count + 1 WHERE id = ?')
          .bind(tagId)
          .run();
      }
    }

    // Get the created post
    const createdPost = await c.env.DB.prepare('SELECT * FROM posts WHERE id = ?')
      .bind(postId)
      .first<Post>();

    const formattedPost = formatPostResponse(createdPost!, baseUrl, categories || [], tags || []);

    // Trigger webhook for post creation
    // Only send one event to avoid duplicate deployments for deploy hooks
    if (postStatus === 'publish') {
      // For published posts, send published event (most important for deploy hooks)
      await sendWebhook(c.env, 'post.published', formattedPost);
    } else {
      // For drafts and other statuses, send created event
      await sendWebhook(c.env, 'post.created', formattedPost);
    }

    return c.json(formattedPost, 201);
  } catch (error: any) {
    return createWPError('server_error', error.message, 500);
  }
});

// PUT /wp/v2/posts/:id - Update post
posts.put('/:id', authMiddleware, async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const user = c.get('user') as JWTPayload;
    const id = parseInt(c.req.param('id'));

    // Check if post exists
    const existingPost = await c.env.DB.prepare('SELECT * FROM posts WHERE id = ? AND post_type = ?')
      .bind(id, 'post')
      .first<Post>();

    if (!existingPost) {
      return createWPError('rest_post_invalid_id', 'Invalid post ID.', 404);
    }

    // Check permissions
    if (!(await canEditPost(c, id))) {
      return createWPError(
        'rest_cannot_edit',
        'Sorry, you are not allowed to edit this post.',
        403
      );
    }

    const body = await c.req.json();
    const { title, content, excerpt, slug, status, categories, tags, featured_media, featured_image_url, date, sticky } = body;

    // Check publish permission
    if (status === 'publish' && existingPost.status !== 'publish' && !canPublishPost(user)) {
      return createWPError(
        'rest_cannot_publish',
        'Sorry, you are not allowed to publish posts.',
        403
      );
    }

    const now = new Date().toISOString();
    // Use custom date if provided, otherwise use existing or current time
    let publishedAt = existingPost.published_at;
    if (status === 'publish') {
      if (date) {
        // If custom date is provided, use it
        publishedAt = new Date(date).toISOString();
      } else if (!existingPost.published_at) {
        // If no custom date and post wasn't published before, use current time
        publishedAt = now;
      }
    }

    // Build update query dynamically to avoid undefined values
    const updates: string[] = ['updated_at = ?'];
    const params: any[] = [now];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }

    if (content !== undefined) {
      updates.push('content = ?');
      params.push(content);
    }

    // Handle excerpt - generate with AI if empty or not provided
    let shouldGenerateExcerpt = false;
    let excerptValue = excerpt;

    if (excerpt !== undefined) {
      // If excerpt is explicitly provided
      if (!excerpt || excerpt.trim() === '') {
        // Excerpt is empty, generate with AI
        shouldGenerateExcerpt = true;
      } else {
        // Use provided excerpt
        excerptValue = excerpt;
      }
    } else if (content !== undefined) {
      // Excerpt not provided but content changed, check if existing excerpt is empty
      if (!existingPost.excerpt || existingPost.excerpt.trim() === '') {
        shouldGenerateExcerpt = true;
      }
    }

    if (shouldGenerateExcerpt) {
      const titleForExcerpt = title !== undefined ? title : existingPost.title;
      const contentForExcerpt = content !== undefined ? content : existingPost.content;
      excerptValue = await generateExcerptWithAI(c.env, titleForExcerpt, contentForExcerpt);
    }

    if (excerptValue !== undefined && excerptValue !== excerpt) {
      updates.push('excerpt = ?');
      params.push(excerptValue);
    } else if (excerpt !== undefined) {
      updates.push('excerpt = ?');
      params.push(excerpt);
    }

    // Handle slug - generate with AI if empty or not provided
    if (slug !== undefined) {
      let newSlug: string;
      if (slug && slug.trim()) {
        // Use provided slug
        newSlug = slug.trim();
      } else {
        // Slug is empty, generate with AI
        const titleForSlug = title !== undefined ? title : existingPost.title;
        newSlug = await generateSlugWithAI(c.env, titleForSlug);

        // Ensure slug is unique
        let slugExists = await c.env.DB.prepare('SELECT id FROM posts WHERE slug = ? AND id != ?')
          .bind(newSlug, id)
          .first();
        let counter = 1;
        const baseSlug = newSlug;
        while (slugExists) {
          newSlug = `${baseSlug}-${counter}`;
          slugExists = await c.env.DB.prepare('SELECT id FROM posts WHERE slug = ? AND id != ?')
            .bind(newSlug, id)
            .first();
          counter++;
        }
      }
      updates.push('slug = ?');
      params.push(newSlug);
    }

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
      updates.push('published_at = ?');
      params.push(publishedAt);
    }

    if (featured_media !== undefined) {
      updates.push('featured_media_id = ?');
      params.push(featured_media);
    }

    if (featured_image_url !== undefined) {
      updates.push('featured_image_url = ?');
      params.push(featured_image_url);
    }

    if (sticky !== undefined) {
      updates.push('sticky = ?');
      params.push(sticky ? 1 : 0);
    }

    const updateQuery = `UPDATE posts SET ${updates.join(', ')} WHERE id = ?`;
    params.push(id);

    await c.env.DB.prepare(updateQuery).bind(...params).run();

    // Update categories if provided
    if (categories && Array.isArray(categories)) {
      // Remove old categories
      const oldCategories = await c.env.DB.prepare(
        'SELECT category_id FROM post_categories WHERE post_id = ?'
      )
        .bind(id)
        .all();

      for (const oldCat of oldCategories.results) {
        await c.env.DB.prepare('UPDATE categories SET count = count - 1 WHERE id = ?')
          .bind((oldCat as any).category_id)
          .run();
      }

      await c.env.DB.prepare('DELETE FROM post_categories WHERE post_id = ?').bind(id).run();

      // Add new categories
      for (const categoryId of categories) {
        await c.env.DB.prepare(
          'INSERT OR IGNORE INTO post_categories (post_id, category_id) VALUES (?, ?)'
        )
          .bind(id, categoryId)
          .run();

        await c.env.DB.prepare('UPDATE categories SET count = count + 1 WHERE id = ?')
          .bind(categoryId)
          .run();
      }
    }

    // Update tags if provided
    if (tags && Array.isArray(tags)) {
      // Remove old tags
      const oldTags = await c.env.DB.prepare('SELECT tag_id FROM post_tags WHERE post_id = ?')
        .bind(id)
        .all();

      for (const oldTag of oldTags.results) {
        await c.env.DB.prepare('UPDATE tags SET count = count - 1 WHERE id = ?')
          .bind((oldTag as any).tag_id)
          .run();
      }

      await c.env.DB.prepare('DELETE FROM post_tags WHERE post_id = ?').bind(id).run();

      // Add new tags
      for (const tagId of tags) {
        await c.env.DB.prepare('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)')
          .bind(id, tagId)
          .run();

        await c.env.DB.prepare('UPDATE tags SET count = count + 1 WHERE id = ?')
          .bind(tagId)
          .run();
      }
    }

    // Get updated post
    const updatedPost = await c.env.DB.prepare('SELECT * FROM posts WHERE id = ?')
      .bind(id)
      .first<Post>();

    // Get categories and tags
    const categoryResult = await c.env.DB.prepare(
      'SELECT category_id FROM post_categories WHERE post_id = ?'
    )
      .bind(id)
      .all();
    const categoryIds = categoryResult.results.map((r: any) => r.category_id);

    const tagResult = await c.env.DB.prepare('SELECT tag_id FROM post_tags WHERE post_id = ?')
      .bind(id)
      .all();
    const tagIds = tagResult.results.map((r: any) => r.tag_id);

    // Trigger webhook for post update
    const formattedPost = formatPostResponse(updatedPost!, baseUrl, categoryIds, tagIds);

    // Send webhook notifications
    if (status === 'publish' && existingPost.status !== 'publish') {
      // Post was just published
      await sendWebhook(c.env, 'post.published', formattedPost);
    } else {
      // Regular update
      await sendWebhook(c.env, 'post.updated', formattedPost);
    }

    return c.json(formattedPost);
  } catch (error: any) {
    return createWPError('server_error', error.message, 500);
  }
});

// DELETE /wp/v2/posts/:id - Delete post
posts.delete('/:id', authMiddleware, async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const id = parseInt(c.req.param('id'));
    const force = c.req.query('force') === 'true';

    // Check if post exists
    const post = await c.env.DB.prepare('SELECT * FROM posts WHERE id = ? AND post_type = ?')
      .bind(id, 'post')
      .first<Post>();

    if (!post) {
      return createWPError('rest_post_invalid_id', 'Invalid post ID.', 404);
    }

    // Check permissions
    if (!(await canDeletePost(c, id))) {
      return createWPError(
        'rest_cannot_delete',
        'Sorry, you are not allowed to delete this post.',
        403
      );
    }

    if (force) {
      // Permanently delete
      await c.env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
      await c.env.DB.prepare('DELETE FROM post_categories WHERE post_id = ?').bind(id).run();
      await c.env.DB.prepare('DELETE FROM post_tags WHERE post_id = ?').bind(id).run();
      await c.env.DB.prepare('DELETE FROM post_meta WHERE post_id = ?').bind(id).run();

      const formattedPost = formatPostResponse(post, baseUrl);

      // Trigger webhook for post deletion
      await sendWebhook(c.env, 'post.deleted', formattedPost);

      return c.json({ deleted: true, previous: formattedPost });
    } else {
      // Move to trash
      await c.env.DB.prepare('UPDATE posts SET status = ? WHERE id = ?').bind('trash', id).run();

      const trashedPost = await c.env.DB.prepare('SELECT * FROM posts WHERE id = ?')
        .bind(id)
        .first<Post>();

      const formattedPost = formatPostResponse(trashedPost!, baseUrl);

      // Trigger webhook for post update (status changed to trash)
      await sendWebhook(c.env, 'post.updated', formattedPost);

      return c.json(formattedPost);
    }
  } catch (error: any) {
    return createWPError('server_error', error.message, 500);
  }
});

export default posts;
