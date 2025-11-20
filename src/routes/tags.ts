import { Hono } from 'hono';
import { Env, Tag, JWTPayload } from '../types';
import { formatTagResponse, generateSlug, generateSmartTagSlug, buildPaginationHeaders, createWPError, getSiteSettings } from '../utils';
import { authMiddleware, optionalAuthMiddleware, requireRole } from '../auth';

const tags = new Hono<{ Bindings: Env }>();

// GET /wp/v2/tags - List tags
tags.get('/', async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const page = parseInt(c.req.query('page') || '1');
    const perPage = parseInt(c.req.query('per_page') || '10');
    const search = c.req.query('search');
    const post = c.req.query('post');
    const slug = c.req.query('slug');
    const include = c.req.query('include');
    const exclude = c.req.query('exclude');
    const orderby = c.req.query('orderby') || 'name';
    const order = c.req.query('order') || 'asc';

    const offset = (page - 1) * perPage;

    let query = 'SELECT * FROM tags WHERE 1=1';
    const params: any[] = [];

    if (search) {
      query += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }

    if (slug) {
      query += ' AND slug = ?';
      params.push(slug);
    }

    if (include) {
      const ids = include.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
      if (ids.length > 0) {
        query += ` AND id IN (${ids.map(() => '?').join(',')})`;
        params.push(...ids);
      }
    }

    if (exclude) {
      const ids = exclude.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
      if (ids.length > 0) {
        query += ` AND id NOT IN (${ids.map(() => '?').join(',')})`;
        params.push(...ids);
      }
    }

    if (post) {
      query = `SELECT t.* FROM tags t
               INNER JOIN post_tags pt ON t.id = pt.tag_id
               WHERE pt.post_id = ?`;
      params.push(parseInt(post));
    }

    // Order
    const orderMap: Record<string, string> = {
      name: 'name',
      count: 'count',
      id: 'id'
    };
    const orderColumn = orderMap[orderby] || 'name';
    query += ` ORDER BY ${orderColumn} ${order.toUpperCase()} LIMIT ? OFFSET ?`;
    params.push(perPage, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all();

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM tags WHERE 1=1';
    const countParams: any[] = [];
    if (search) {
      countQuery += ' AND name LIKE ?';
      countParams.push(`%${search}%`);
    }
    if (slug) {
      countQuery += ' AND slug = ?';
      countParams.push(slug);
    }
    if (include) {
      const ids = include.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
      if (ids.length > 0) {
        countQuery += ` AND id IN (${ids.map(() => '?').join(',')})`;
        countParams.push(...ids);
      }
    }
    if (exclude) {
      const ids = exclude.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
      if (ids.length > 0) {
        countQuery += ` AND id NOT IN (${ids.map(() => '?').join(',')})`;
        countParams.push(...ids);
      }
    }

    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first();
    const totalItems = (countResult?.count as number) || 0;

    const formattedTags = (result.results as Tag[]).map((tag) =>
      formatTagResponse(tag, baseUrl)
    );

    // Add pagination headers
    const headers = buildPaginationHeaders(
      page,
      perPage,
      totalItems,
      `${baseUrl}/wp-json/wp/v2/tags`
    );

    return c.json(formattedTags, 200, headers);
  } catch (error: any) {
    return createWPError('server_error', error.message, 500);
  }
});

// GET /wp/v2/tags/:id - Get single tag
tags.get('/:id', async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const id = parseInt(c.req.param('id'));

    const tag = await c.env.DB.prepare('SELECT * FROM tags WHERE id = ?')
      .bind(id)
      .first<Tag>();

    if (!tag) {
      return createWPError('rest_term_invalid', 'Term does not exist.', 404);
    }

    return c.json(formatTagResponse(tag, baseUrl));
  } catch (error: any) {
    return createWPError('server_error', error.message, 500);
  }
});

// POST /wp/v2/tags - Create tag
tags.post('/', authMiddleware, requireRole('administrator', 'editor', 'author'), async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const body = await c.req.json();
    const { name, description, slug } = body;

    if (!name) {
      return createWPError('rest_invalid_param', 'Name is required.', 400);
    }

    // Generate slug intelligently - use English directly, AI for Chinese
    let tagSlug = await generateSmartTagSlug(c.env, name, slug);

    // Ensure slug is unique
    let slugExists = await c.env.DB.prepare('SELECT id FROM tags WHERE slug = ?')
      .bind(tagSlug)
      .first();
    let counter = 1;
    const baseSlug = tagSlug;
    while (slugExists) {
      tagSlug = `${baseSlug}-${counter}`;
      slugExists = await c.env.DB.prepare('SELECT id FROM tags WHERE slug = ?')
        .bind(tagSlug)
        .first();
      counter++;
    }

    const now = new Date().toISOString();

    // Insert tag
    const result = await c.env.DB.prepare(
      'INSERT INTO tags (name, slug, description, created_at) VALUES (?, ?, ?, ?)'
    )
      .bind(name, tagSlug, description || '', now)
      .run();

    const tagId = result.meta.last_row_id;

    // Get created tag
    const createdTag = await c.env.DB.prepare('SELECT * FROM tags WHERE id = ?')
      .bind(tagId)
      .first<Tag>();

    return c.json(formatTagResponse(createdTag!, baseUrl), 201);
  } catch (error: any) {
    return createWPError('server_error', error.message, 500);
  }
});

// PUT /wp/v2/tags/:id - Update tag
tags.put('/:id', authMiddleware, requireRole('administrator', 'editor'), async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const id = parseInt(c.req.param('id'));

    // Check if tag exists
    const existingTag = await c.env.DB.prepare('SELECT * FROM tags WHERE id = ?')
      .bind(id)
      .first<Tag>();

    if (!existingTag) {
      return createWPError('rest_term_invalid', 'Term does not exist.', 404);
    }

    const body = await c.req.json();
    const { name, description, slug } = body;

    // Build update query dynamically to avoid undefined values
    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    // Handle slug - generate with AI if empty or not provided but name changed
    if (slug !== undefined) {
      let newSlug: string;
      if (slug && slug.trim()) {
        // Use provided slug
        newSlug = slug.trim();
      } else {
        // Slug is empty, generate intelligently
        const nameForSlug = name !== undefined ? name : existingTag.name;
        newSlug = await generateSmartTagSlug(c.env, nameForSlug, '');

        // Ensure slug is unique
        let slugExists = await c.env.DB.prepare('SELECT id FROM tags WHERE slug = ? AND id != ?')
          .bind(newSlug, id)
          .first();
        let counter = 1;
        const baseSlug = newSlug;
        while (slugExists) {
          newSlug = `${baseSlug}-${counter}`;
          slugExists = await c.env.DB.prepare('SELECT id FROM tags WHERE slug = ? AND id != ?')
            .bind(newSlug, id)
            .first();
          counter++;
        }
      }
      updates.push('slug = ?');
      params.push(newSlug);
    }

    // If no fields to update, return current tag
    if (updates.length === 0) {
      return c.json(formatTagResponse(existingTag, baseUrl));
    }

    const updateQuery = `UPDATE tags SET ${updates.join(', ')} WHERE id = ?`;
    params.push(id);

    await c.env.DB.prepare(updateQuery).bind(...params).run();

    // Get updated tag
    const updatedTag = await c.env.DB.prepare('SELECT * FROM tags WHERE id = ?')
      .bind(id)
      .first<Tag>();

    return c.json(formatTagResponse(updatedTag!, baseUrl));
  } catch (error: any) {
    return createWPError('server_error', error.message, 500);
  }
});

// DELETE /wp/v2/tags/:id - Delete tag
tags.delete('/:id', authMiddleware, requireRole('administrator', 'editor'), async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const id = parseInt(c.req.param('id'));
    const force = c.req.query('force') === 'true';

    // Check if tag exists
    const tag = await c.env.DB.prepare('SELECT * FROM tags WHERE id = ?')
      .bind(id)
      .first<Tag>();

    if (!tag) {
      return createWPError('rest_term_invalid', 'Term does not exist.', 404);
    }

    if (force) {
      // Delete tag
      await c.env.DB.prepare('DELETE FROM post_tags WHERE tag_id = ?').bind(id).run();
      await c.env.DB.prepare('DELETE FROM tags WHERE id = ?').bind(id).run();

      return c.json({ deleted: true, previous: formatTagResponse(tag, baseUrl) });
    } else {
      return createWPError(
        'rest_trash_not_supported',
        'Terms do not support trashing. Set force=true to delete.',
        501
      );
    }
  } catch (error: any) {
    return createWPError('server_error', error.message, 500);
  }
});

export default tags;
