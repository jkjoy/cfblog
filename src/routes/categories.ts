import { Hono } from 'hono';
import { Env, Category, JWTPayload } from '../types';
import { formatCategoryResponse, generateSlug, generateSmartTagSlug, buildPaginationHeaders, createWPError, getSiteSettings } from '../utils';
import { authMiddleware, optionalAuthMiddleware, requireRole } from '../auth';

const categories = new Hono<{ Bindings: Env }>();

// GET /wp/v2/categories - List categories
categories.get('/', async (c) => {
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

    let query = 'SELECT * FROM categories WHERE 1=1';
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
      query = `SELECT c.* FROM categories c
               INNER JOIN post_categories pc ON c.id = pc.category_id
               WHERE pc.post_id = ?`;
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
    let countQuery = 'SELECT COUNT(*) as count FROM categories WHERE 1=1';
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

    const formattedCategories = (result.results as Category[]).map((cat) =>
      formatCategoryResponse(cat, baseUrl)
    );

    // Add pagination headers
    const headers = buildPaginationHeaders(
      page,
      perPage,
      totalItems,
      `${baseUrl}/wp-json/wp/v2/categories`
    );

    return c.json(formattedCategories, 200, headers);
  } catch (error: any) {
    return createWPError('server_error', error.message, 500);
  }
});

// GET /wp/v2/categories/:id - Get single category
categories.get('/:id', async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const id = parseInt(c.req.param('id'));

    const category = await c.env.DB.prepare('SELECT * FROM categories WHERE id = ?')
      .bind(id)
      .first<Category>();

    if (!category) {
      return createWPError('rest_term_invalid', 'Term does not exist.', 404);
    }

    return c.json(formatCategoryResponse(category, baseUrl));
  } catch (error: any) {
    return createWPError('server_error', error.message, 500);
  }
});

// POST /wp/v2/categories - Create category
categories.post('/', authMiddleware, requireRole('administrator', 'editor'), async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    // Debug logging
    const user = c.get('user') as JWTPayload | undefined;
    console.log('[DEBUG] Create category - User:', user);

    const body = await c.req.json();
    const { name, description, slug, parent } = body;

    if (!name) {
      return createWPError('rest_invalid_param', 'Name is required.', 400);
    }

    // Generate slug intelligently - use English directly, AI for Chinese
    let categorySlug = await generateSmartTagSlug(c.env, name, slug);

    // Ensure slug is unique
    let slugExists = await c.env.DB.prepare('SELECT id FROM categories WHERE slug = ?')
      .bind(categorySlug)
      .first();
    let counter = 1;
    const baseSlug = categorySlug;
    while (slugExists) {
      categorySlug = `${baseSlug}-${counter}`;
      slugExists = await c.env.DB.prepare('SELECT id FROM categories WHERE slug = ?')
        .bind(categorySlug)
        .first();
      counter++;
    }

    const now = new Date().toISOString();

    // Insert category
    const result = await c.env.DB.prepare(
      'INSERT INTO categories (name, slug, description, parent_id, created_at) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(name, categorySlug, description || '', parent || 0, now)
      .run();

    const categoryId = result.meta.last_row_id;

    // Get created category
    const createdCategory = await c.env.DB.prepare('SELECT * FROM categories WHERE id = ?')
      .bind(categoryId)
      .first<Category>();

    return c.json(formatCategoryResponse(createdCategory!, baseUrl), 201);
  } catch (error: any) {
    return createWPError('server_error', error.message, 500);
  }
});

// PUT /wp/v2/categories/:id - Update category
categories.put('/:id', authMiddleware, requireRole('administrator', 'editor'), async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const id = parseInt(c.req.param('id'));

    // Check if category exists
    const existingCategory = await c.env.DB.prepare('SELECT * FROM categories WHERE id = ?')
      .bind(id)
      .first<Category>();

    if (!existingCategory) {
      return createWPError('rest_term_invalid', 'Term does not exist.', 404);
    }

    const body = await c.req.json();
    const { name, description, slug, parent } = body;

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
        const nameForSlug = name !== undefined ? name : existingCategory.name;
        newSlug = await generateSmartTagSlug(c.env, nameForSlug, '');

        // Ensure slug is unique
        let slugExists = await c.env.DB.prepare('SELECT id FROM categories WHERE slug = ? AND id != ?')
          .bind(newSlug, id)
          .first();
        let counter = 1;
        const baseSlug = newSlug;
        while (slugExists) {
          newSlug = `${baseSlug}-${counter}`;
          slugExists = await c.env.DB.prepare('SELECT id FROM categories WHERE slug = ? AND id != ?')
            .bind(newSlug, id)
            .first();
          counter++;
        }
      }
      updates.push('slug = ?');
      params.push(newSlug);
    }

    if (parent !== undefined) {
      updates.push('parent_id = ?');
      params.push(parent);
    }

    // If no fields to update, return current category
    if (updates.length === 0) {
      return c.json(formatCategoryResponse(existingCategory, baseUrl));
    }

    const updateQuery = `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`;
    params.push(id);

    await c.env.DB.prepare(updateQuery).bind(...params).run();

    // Get updated category
    const updatedCategory = await c.env.DB.prepare('SELECT * FROM categories WHERE id = ?')
      .bind(id)
      .first<Category>();

    return c.json(formatCategoryResponse(updatedCategory!, baseUrl));
  } catch (error: any) {
    return createWPError('server_error', error.message, 500);
  }
});

// DELETE /wp/v2/categories/:id - Delete category
categories.delete('/:id', authMiddleware, requireRole('administrator', 'editor'), async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const id = parseInt(c.req.param('id'));
    const force = c.req.query('force') === 'true';

    // Check if category exists
    const category = await c.env.DB.prepare('SELECT * FROM categories WHERE id = ?')
      .bind(id)
      .first<Category>();

    if (!category) {
      return createWPError('rest_term_invalid', 'Term does not exist.', 404);
    }

    // Don't allow deletion of default category (id = 1)
    if (id === 1) {
      return createWPError(
        'rest_cannot_delete',
        'Cannot delete the default category.',
        403
      );
    }

    if (force) {
      // Delete category and reassign posts to default category
      await c.env.DB.prepare(
        'UPDATE post_categories SET category_id = 1 WHERE category_id = ?'
      )
        .bind(id)
        .run();

      await c.env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();

      return c.json({ deleted: true, previous: formatCategoryResponse(category, baseUrl) });
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

export default categories;
