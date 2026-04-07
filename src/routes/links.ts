import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { authMiddleware } from '../auth';
import { getSiteSettings } from '../utils';

const links = new Hono<AppEnv>();

interface LinkRow {
  id: number;
  name: string;
  url: string;
  description: string | null;
  avatar: string | null;
  category_id: number;
  target: string;
  visible: string;
  rating: number | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

interface LinkWithCategoryRow extends LinkRow {
  category_name: string | null;
  category_slug: string | null;
}

function formatLinkResponse(link: LinkWithCategoryRow, baseUrl: string) {
  return {
    id: link.id,
    name: link.name,
    url: link.url,
    description: link.description || '',
    avatar: link.avatar || '',
    category: {
      id: link.category_id,
      name: link.category_name,
      slug: link.category_slug
    },
    target: link.target,
    visible: link.visible,
    rating: link.rating || 0,
    sort_order: link.sort_order || 0,
    created_at: link.created_at,
    updated_at: link.updated_at,
    _links: {
      self: [{ href: `${baseUrl}/wp-json/wp/v2/links/${link.id}` }],
      collection: [{ href: `${baseUrl}/wp-json/wp/v2/links` }]
    }
  };
}

// Get all links
links.get('/', async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const url = new URL(c.req.url);
    const perPage = parseInt(url.searchParams.get('per_page') || '50');
    const page = parseInt(url.searchParams.get('page') || '1');
    const categoryId = url.searchParams.get('category');
    const visible = url.searchParams.get('visible') || 'yes';
    const offset = (page - 1) * perPage;

    let query = `
      SELECT l.*, lc.name as category_name, lc.slug as category_slug
      FROM links l
      LEFT JOIN link_categories lc ON l.category_id = lc.id
      WHERE l.visible = ?
    `;
    const params: any[] = [visible];

    if (categoryId) {
      query += ` AND l.category_id = ?`;
      params.push(parseInt(categoryId));
    }

    query += ` ORDER BY l.sort_order ASC, l.created_at DESC LIMIT ? OFFSET ?`;
    params.push(perPage, offset);

    const { results } = await c.env.DB.prepare(query).bind(...params).all<LinkWithCategoryRow>();

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM links WHERE visible = ?`;
    const countParams: any[] = [visible];
    if (categoryId) {
      countQuery += ` AND category_id = ?`;
      countParams.push(parseInt(categoryId));
    }
    const total = (await c.env.DB.prepare(countQuery).bind(...countParams).first<{ total: number }>())?.total || 0;

    const totalPages = Math.ceil(total / perPage);

    c.header('X-WP-Total', total.toString());
    c.header('X-WP-TotalPages', totalPages.toString());

    return c.json(results.map((link) => formatLinkResponse(link, baseUrl)));
  } catch (error: any) {
    console.error('[DEBUG] Failed to get links:', error);
    return c.json({ code: 'rest_internal_error', message: error.message }, 500);
  }
});

// Get single link
links.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));

  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const link = await c.env.DB.prepare(`
      SELECT l.*, lc.name as category_name, lc.slug as category_slug
      FROM links l
      LEFT JOIN link_categories lc ON l.category_id = lc.id
      WHERE l.id = ?
    `).bind(id).first<LinkWithCategoryRow>();

    if (!link) {
      return c.json({ code: 'rest_link_invalid', message: 'Invalid link ID.' }, 404);
    }

    return c.json(formatLinkResponse(link, baseUrl));
  } catch (error: any) {
    console.error('[DEBUG] Failed to get link:', error);
    return c.json({ code: 'rest_internal_error', message: error.message }, 500);
  }
});

// Create link (requires authentication)
links.post('/', authMiddleware, async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const { name, url, description, avatar, category_id, target, visible, rating, sort_order } = await c.req.json();

    if (!name || !url) {
      return c.json({ code: 'rest_missing_callback_param', message: 'Missing required parameters: name, url' }, 400);
    }

    const now = new Date().toISOString();

    const result = await c.env.DB.prepare(`
      INSERT INTO links (name, url, description, avatar, category_id, target, visible, rating, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      name,
      url,
      description || '',
      avatar || '',
      category_id || 1,
      target || '_blank',
      visible || 'yes',
      rating || 0,
      sort_order || 0,
      now,
      now
    ).run();

    // Update category count
    if (category_id) {
      await c.env.DB.prepare(`
        UPDATE link_categories SET count = count + 1 WHERE id = ?
      `).bind(category_id).run();
    }

    const newLink = await c.env.DB.prepare(`
      SELECT l.*, lc.name as category_name, lc.slug as category_slug
      FROM links l
      LEFT JOIN link_categories lc ON l.category_id = lc.id
      WHERE l.id = ?
    `).bind(result.meta.last_row_id).first<LinkWithCategoryRow>();

    if (!newLink) {
      return c.json({ code: 'rest_link_invalid', message: 'Failed to create link.' }, 500);
    }

    return c.json(formatLinkResponse(newLink, baseUrl), 201);
  } catch (error: any) {
    console.error('[DEBUG] Failed to create link:', error);
    return c.json({ code: 'rest_internal_error', message: error.message }, 500);
  }
});

// Update link
links.put('/:id', authMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'));

  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const { name, url, description, avatar, category_id, target, visible, rating, sort_order } = await c.req.json();

    const existingLink = await c.env.DB.prepare(`
      SELECT * FROM links WHERE id = ?
    `).bind(id).first<LinkRow>();

    if (!existingLink) {
      return c.json({ code: 'rest_link_invalid', message: 'Invalid link ID.' }, 404);
    }

    const updates: string[] = ['updated_at = ?'];
    const params: any[] = [new Date().toISOString()];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }

    if (url !== undefined) {
      updates.push('url = ?');
      params.push(url);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    if (avatar !== undefined) {
      updates.push('avatar = ?');
      params.push(avatar);
    }

    if (category_id !== undefined) {
      updates.push('category_id = ?');
      params.push(category_id);

      // Update category counts
      if (existingLink.category_id !== category_id) {
        await c.env.DB.prepare(`
          UPDATE link_categories SET count = count - 1 WHERE id = ?
        `).bind(existingLink.category_id).run();

        await c.env.DB.prepare(`
          UPDATE link_categories SET count = count + 1 WHERE id = ?
        `).bind(category_id).run();
      }
    }

    if (target !== undefined) {
      updates.push('target = ?');
      params.push(target);
    }

    if (visible !== undefined) {
      updates.push('visible = ?');
      params.push(visible);
    }

    if (rating !== undefined) {
      updates.push('rating = ?');
      params.push(rating);
    }

    if (sort_order !== undefined) {
      updates.push('sort_order = ?');
      params.push(sort_order);
    }

    const updateQuery = `UPDATE links SET ${updates.join(', ')} WHERE id = ?`;
    params.push(id);

    await c.env.DB.prepare(updateQuery).bind(...params).run();

    const updatedLink = await c.env.DB.prepare(`
      SELECT l.*, lc.name as category_name, lc.slug as category_slug
      FROM links l
      LEFT JOIN link_categories lc ON l.category_id = lc.id
      WHERE l.id = ?
    `).bind(id).first<LinkWithCategoryRow>();

    if (!updatedLink) {
      return c.json({ code: 'rest_link_invalid', message: 'Invalid link ID.' }, 404);
    }

    return c.json(formatLinkResponse(updatedLink, baseUrl));
  } catch (error: any) {
    console.error('[DEBUG] Failed to update link:', error);
    return c.json({ code: 'rest_internal_error', message: error.message }, 500);
  }
});

// Delete link
links.delete('/:id', authMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'));

  try {
    const link = await c.env.DB.prepare(`
      SELECT * FROM links WHERE id = ?
    `).bind(id).first<LinkRow>();

    if (!link) {
      return c.json({ code: 'rest_link_invalid', message: 'Invalid link ID.' }, 404);
    }

    // Update category count
    await c.env.DB.prepare(`
      UPDATE link_categories SET count = count - 1 WHERE id = ?
    `).bind(link.category_id).run();

    await c.env.DB.prepare(`
      DELETE FROM links WHERE id = ?
    `).bind(id).run();

    return c.json({ deleted: true, previous: link });
  } catch (error: any) {
    console.error('[DEBUG] Failed to delete link:', error);
    return c.json({ code: 'rest_internal_error', message: error.message }, 500);
  }
});

export default links;
