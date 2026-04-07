import { Hono } from 'hono';
import type { AppEnv, Post } from '../types';
import { authMiddleware } from '../auth';
import { generateSlug, getSiteSettings } from '../utils';

const pages = new Hono<AppEnv>();

interface PageWithAuthorRow extends Post {
  author_name: string | null;
}

function formatPageResponse(page: PageWithAuthorRow, baseUrl: string) {
  return {
    id: page.id,
    date: page.created_at,
    modified: page.updated_at,
    slug: page.slug,
    status: page.status,
    type: 'page',
    title: {
      rendered: page.title
    },
    content: {
      rendered: page.content || ''
    },
    excerpt: {
      rendered: page.excerpt || ''
    },
    author: page.author_id,
    author_name: page.author_name,
    featured_media: page.featured_image || '',
    comment_status: page.comment_status,
    parent: page.parent_id || 0,
    _links: {
      self: [{ href: `${baseUrl}/wp-json/wp/v2/pages/${page.id}` }],
      collection: [{ href: `${baseUrl}/wp-json/wp/v2/pages` }]
    }
  };
}

// Get all pages
pages.get('/', async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const url = new URL(c.req.url);
    const perPage = parseInt(url.searchParams.get('per_page') || '20');
    const page = parseInt(url.searchParams.get('page') || '1');
    const status = url.searchParams.get('status') || 'publish';
    const offset = (page - 1) * perPage;

    let query = `
      SELECT p.*, u.username as author_name
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.post_type = 'page'
    `;
    const params: any[] = [];

    if (status !== 'all') {
      query += ` AND p.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    params.push(perPage, offset);

    const { results } = await c.env.DB.prepare(query).bind(...params).all<PageWithAuthorRow>();

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM posts WHERE post_type = 'page'`;
    const countParams: any[] = [];
    if (status !== 'all') {
      countQuery += ` AND status = ?`;
      countParams.push(status);
    }
    const total = (await c.env.DB.prepare(countQuery).bind(...countParams).first<{ total: number }>())?.total || 0;

    const totalPages = Math.ceil(total / perPage);

    c.header('X-WP-Total', total.toString());
    c.header('X-WP-TotalPages', totalPages.toString());

    return c.json(results.map((p) => formatPageResponse(p, baseUrl)));
  } catch (error: any) {
    console.error('[DEBUG] Failed to get pages:', error);
    return c.json({ code: 'rest_internal_error', message: error.message }, 500);
  }
});

// Get single page
pages.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));

  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const page = await c.env.DB.prepare(`
      SELECT p.*, u.username as author_name
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.id = ? AND p.post_type = 'page'
    `).bind(id).first<PageWithAuthorRow>();

    if (!page) {
      return c.json({ code: 'rest_page_invalid', message: 'Invalid page ID.' }, 404);
    }

    return c.json(formatPageResponse(page, baseUrl));
  } catch (error: any) {
    console.error('[DEBUG] Failed to get page:', error);
    return c.json({ code: 'rest_internal_error', message: error.message }, 500);
  }
});

// Create page (requires authentication)
pages.post('/', authMiddleware, async (c) => {
  const user = c.get('user');

  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const { title, content, excerpt, slug, status, parent, comment_status } = await c.req.json();

    if (!title) {
      return c.json({ code: 'rest_missing_callback_param', message: 'Missing parameter: title' }, 400);
    }

    // Generate slug if not provided
    const pageSlug = slug && slug.trim() ? slug.trim() : generateSlug(title);

    // Check if slug already exists
    const existingPage = await c.env.DB.prepare(`
      SELECT id FROM posts WHERE slug = ? AND post_type = 'page'
    `).bind(pageSlug).first<{ id: number }>();

    if (existingPage) {
      return c.json({
        code: 'rest_slug_exists',
        message: 'A page with this slug already exists.'
      }, 400);
    }

    const now = new Date().toISOString();
    const pageStatus = status || 'draft';
    const publishedAt = pageStatus === 'publish' ? now : null;

    const result = await c.env.DB.prepare(`
      INSERT INTO posts (
        title, content, excerpt, slug, status, post_type, author_id,
        parent_id, comment_status, created_at, updated_at, published_at
      )
      VALUES (?, ?, ?, ?, ?, 'page', ?, ?, ?, ?, ?, ?)
    `).bind(
      title,
      content || '',
      excerpt || '',
      pageSlug,
      pageStatus,
      user.userId,
      parent || 0,
      comment_status || 'open',
      now,
      now,
      publishedAt
    ).run();

    const newPage = await c.env.DB.prepare(`
      SELECT p.*, u.username as author_name
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.id = ?
    `).bind(result.meta.last_row_id).first<PageWithAuthorRow>();

    if (!newPage) {
      return c.json({ code: 'rest_page_invalid', message: 'Failed to create page.' }, 500);
    }

    return c.json(formatPageResponse(newPage, baseUrl), 201);
  } catch (error: any) {
    console.error('[DEBUG] Failed to create page:', error);
    return c.json({ code: 'rest_internal_error', message: error.message }, 500);
  }
});

// Update page
pages.put('/:id', authMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'));

  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const { title, content, excerpt, slug, status, parent, comment_status } = await c.req.json();

    const existingPage = await c.env.DB.prepare(`
      SELECT * FROM posts WHERE id = ? AND post_type = 'page'
    `).bind(id).first<Post>();

    if (!existingPage) {
      return c.json({ code: 'rest_page_invalid', message: 'Invalid page ID.' }, 404);
    }

    const updates: string[] = ['updated_at = ?'];
    const params: any[] = [new Date().toISOString()];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }

    if (content !== undefined) {
      updates.push('content = ?');
      params.push(content);
    }

    if (excerpt !== undefined) {
      updates.push('excerpt = ?');
      params.push(excerpt);
    }

    if (slug !== undefined && slug.trim()) {
      // Check if slug already exists for other pages
      const slugExists = await c.env.DB.prepare(`
        SELECT id FROM posts WHERE slug = ? AND id != ? AND post_type = 'page'
      `).bind(slug.trim(), id).first<{ id: number }>();

      if (slugExists) {
        return c.json({
          code: 'rest_slug_exists',
          message: 'A page with this slug already exists.'
        }, 400);
      }

      updates.push('slug = ?');
      params.push(slug.trim());
    }

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);

      // Update published_at if status changes to publish
      if (status === 'publish' && existingPage.status !== 'publish') {
        updates.push('published_at = ?');
        params.push(new Date().toISOString());
      }
    }

    if (parent !== undefined) {
      updates.push('parent_id = ?');
      params.push(parent);
    }

    if (comment_status !== undefined) {
      updates.push('comment_status = ?');
      params.push(comment_status);
    }

    const updateQuery = `UPDATE posts SET ${updates.join(', ')} WHERE id = ?`;
    params.push(id);

    await c.env.DB.prepare(updateQuery).bind(...params).run();

    const updatedPage = await c.env.DB.prepare(`
      SELECT p.*, u.username as author_name
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.id = ?
    `).bind(id).first<PageWithAuthorRow>();

    if (!updatedPage) {
      return c.json({ code: 'rest_page_invalid', message: 'Invalid page ID.' }, 404);
    }

    return c.json(formatPageResponse(updatedPage, baseUrl));
  } catch (error: any) {
    console.error('[DEBUG] Failed to update page:', error);
    return c.json({ code: 'rest_internal_error', message: error.message }, 500);
  }
});

// Delete page
pages.delete('/:id', authMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'));
  const force = c.req.query('force') === 'true';

  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const page = await c.env.DB.prepare(`
      SELECT * FROM posts WHERE id = ? AND post_type = 'page'
    `).bind(id).first<Post>();

    if (!page) {
      return c.json({ code: 'rest_page_invalid', message: 'Invalid page ID.' }, 404);
    }

    if (force) {
      // Permanently delete
      await c.env.DB.prepare(`
        DELETE FROM posts WHERE id = ?
      `).bind(id).run();

      return c.json({ deleted: true, previous: page });
    } else {
      // Move to trash
      await c.env.DB.prepare(`
        UPDATE posts SET status = 'trash' WHERE id = ?
      `).bind(id).run();

      const trashedPage = await c.env.DB.prepare(`
        SELECT * FROM posts WHERE id = ?
      `).bind(id).first<Post>();

      if (!trashedPage) {
        return c.json({ code: 'rest_page_invalid', message: 'Invalid page ID.' }, 404);
      }

      return c.json({
        id: trashedPage.id,
        status: trashedPage.status
      });
    }
  } catch (error: any) {
    console.error('[DEBUG] Failed to delete page:', error);
    return c.json({ code: 'rest_internal_error', message: error.message }, 500);
  }
});

export default pages;
