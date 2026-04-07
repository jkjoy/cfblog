import { Hono } from 'hono';
import type { AppEnv, Media } from '../types';
import { formatMediaResponse, buildPaginationHeaders, createWPError, getSiteSettings, normalizeBaseUrl } from '../utils';
import { authMiddleware, requireRole } from '../auth';

const media = new Hono<AppEnv>();

interface UploadedFileLike {
  arrayBuffer(): Promise<ArrayBuffer>;
  name: string;
  size: number;
  type: string;
}

// GET /wp/v2/media - List media
media.get('/', authMiddleware, async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const page = parseInt(c.req.query('page') || '1');
    const perPage = parseInt(c.req.query('per_page') || '10');
    const author = c.req.query('author');
    const parent = c.req.query('parent');
    const mediaType = c.req.query('media_type');
    const mimeType = c.req.query('mime_type');

    const offset = (page - 1) * perPage;

    let query = 'SELECT * FROM media WHERE 1=1';
    const params: any[] = [];

    if (author) {
      query += ' AND author_id = ?';
      params.push(parseInt(author));
    }

    if (parent) {
      // This would be for attached media to posts
      query += ' AND id IN (SELECT CAST(meta_value AS INTEGER) FROM post_meta WHERE meta_key = "_thumbnail_id" AND post_id = ?)';
      params.push(parseInt(parent));
    }

    if (mediaType) {
      query += ' AND file_type = ?';
      params.push(mediaType);
    }

    if (mimeType) {
      query += ' AND mime_type = ?';
      params.push(mimeType);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(perPage, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all<Media>();

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM media WHERE 1=1';
    const countParams: any[] = [];
    if (author) {
      countQuery += ' AND author_id = ?';
      countParams.push(parseInt(author));
    }

    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first<{ count: number }>();
    const totalItems = countResult?.count || 0;

    const formattedMedia = result.results.map((m) =>
      formatMediaResponse(m, baseUrl)
    );

    // Add pagination headers
    const headers = buildPaginationHeaders(
      page,
      perPage,
      totalItems,
      `${baseUrl}/wp-json/wp/v2/media`
    );

    return c.json(formattedMedia, 200, headers);
  } catch (error: any) {
    return createWPError('server_error', error.message, 500);
  }
});

// GET /wp/v2/media/:id - Get single media
media.get('/:id', async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const id = parseInt(c.req.param('id'));

    const mediaItem = await c.env.DB.prepare('SELECT * FROM media WHERE id = ?')
      .bind(id)
      .first<Media>();

    if (!mediaItem) {
      return createWPError('rest_post_invalid_id', 'Invalid media ID.', 404);
    }

    return c.json(formatMediaResponse(mediaItem, baseUrl));
  } catch (error: any) {
    return createWPError('server_error', error.message, 500);
  }
});

// POST /wp/v2/media - Upload media
media.post('/', authMiddleware, async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const user = c.get('user');

    // Get the uploaded file from the request
    const formData = await c.req.formData();
    const fileEntry = formData.get('file');
    if (!fileEntry || typeof fileEntry === 'string') {
      return createWPError('rest_invalid_param', 'File is required.', 400);
    }
    const file = fileEntry as unknown as UploadedFileLike;

    const title = (formData.get('title') as string) || file.name;
    const altText = (formData.get('alt_text') as string) || '';
    const caption = (formData.get('caption') as string) || '';
    const description = (formData.get('description') as string) || '';

    // Validate file
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'video/mp4',
      'video/webm',
      'application/pdf'
    ];

    if (!allowedTypes.includes(file.type)) {
      return createWPError(
        'rest_invalid_file_type',
        'Sorry, this file type is not permitted for security reasons.',
        400
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop();
    const filename = `${timestamp}-${randomStr}.${extension}`;
    const r2Key = `uploads/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${filename}`;

    // Upload to R2
    const fileBuffer = await file.arrayBuffer();
    await c.env.MEDIA.put(r2Key, fileBuffer, {
      httpMetadata: {
        contentType: file.type
      }
    });

    // Generate public URL
    // In production, you should configure a custom domain for your R2 bucket
    const url = `${normalizeBaseUrl(baseUrl)}/media/${r2Key}`;

    // Determine file type and dimensions
    let fileType = 'file';
    let width: number | null = null;
    let height: number | null = null;

    if (file.type.startsWith('image/')) {
      fileType = 'image';
      // In a real implementation, you would extract image dimensions here
      // This might require using an image processing library
    } else if (file.type.startsWith('video/')) {
      fileType = 'video';
    } else if (file.type.startsWith('audio/')) {
      fileType = 'audio';
    }

    const now = new Date().toISOString();

    // Save to database
    const result = await c.env.DB.prepare(
      `INSERT INTO media (title, filename, file_type, file_size, mime_type, r2_key, url, alt_text, caption, description, width, height, author_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        title,
        filename,
        fileType,
        file.size,
        file.type,
        r2Key,
        url,
        altText,
        caption,
        description,
        width,
        height,
        user.userId,
        now
      )
      .run();

    const mediaId = result.meta.last_row_id;

    // Get created media
    const createdMedia = await c.env.DB.prepare('SELECT * FROM media WHERE id = ?')
      .bind(mediaId)
      .first<Media>();

    return c.json(formatMediaResponse(createdMedia!, baseUrl), 201);
  } catch (error: any) {
    return createWPError('server_error', error.message, 500);
  }
});

// PUT /wp/v2/media/:id - Update media
media.put('/:id', authMiddleware, async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const user = c.get('user');
    const id = parseInt(c.req.param('id'));

    // Check if media exists
    const existingMedia = await c.env.DB.prepare('SELECT * FROM media WHERE id = ?')
      .bind(id)
      .first<Media>();

    if (!existingMedia) {
      return createWPError('rest_post_invalid_id', 'Invalid media ID.', 404);
    }

    // Check permissions - only author or admin can edit
    if (
      existingMedia.author_id !== user.userId &&
      user.role !== 'administrator' &&
      user.role !== 'editor'
    ) {
      return createWPError(
        'rest_cannot_edit',
        'Sorry, you are not allowed to edit this media.',
        403
      );
    }

    const body = await c.req.json();
    const { title, alt_text, caption, description } = body;

    // Build update query dynamically to avoid undefined values
    const updates: string[] = [];
    const params: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }

    if (alt_text !== undefined) {
      updates.push('alt_text = ?');
      params.push(alt_text);
    }

    if (caption !== undefined) {
      updates.push('caption = ?');
      params.push(caption);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    // If no fields to update, return current media
    if (updates.length === 0) {
      return c.json(formatMediaResponse(existingMedia, baseUrl));
    }

    const updateQuery = `UPDATE media SET ${updates.join(', ')} WHERE id = ?`;
    params.push(id);

    await c.env.DB.prepare(updateQuery).bind(...params).run();

    // Get updated media
    const updatedMedia = await c.env.DB.prepare('SELECT * FROM media WHERE id = ?')
      .bind(id)
      .first<Media>();

    if (!updatedMedia) {
      return createWPError('rest_post_invalid_id', 'Invalid media ID.', 404);
    }

    return c.json(formatMediaResponse(updatedMedia, baseUrl));
  } catch (error: any) {
    return createWPError('server_error', error.message, 500);
  }
});

// DELETE /wp/v2/media/:id - Delete media
media.delete('/:id', authMiddleware, async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const user = c.get('user');
    const id = parseInt(c.req.param('id'));
    const force = c.req.query('force') === 'true';

    // Check if media exists
    const mediaItem = await c.env.DB.prepare('SELECT * FROM media WHERE id = ?')
      .bind(id)
      .first<Media>();

    if (!mediaItem) {
      return createWPError('rest_post_invalid_id', 'Invalid media ID.', 404);
    }

    // Check permissions
    if (
      mediaItem.author_id !== user.userId &&
      user.role !== 'administrator' &&
      user.role !== 'editor'
    ) {
      return createWPError(
        'rest_cannot_delete',
        'Sorry, you are not allowed to delete this media.',
        403
      );
    }

    if (force) {
      // Delete from R2
      await c.env.MEDIA.delete(mediaItem.r2_key);

      // Delete from database
      await c.env.DB.prepare('DELETE FROM media WHERE id = ?').bind(id).run();

      return c.json({ deleted: true, previous: formatMediaResponse(mediaItem, baseUrl) });
    } else {
      return createWPError(
        'rest_trash_not_supported',
        'Media does not support trashing. Set force=true to delete.',
        501
      );
    }
  } catch (error: any) {
    return createWPError('server_error', error.message, 500);
  }
});

// GET /media/* - Serve media files from R2
media.get('/uploads/*', async (c) => {
  try {
    const path = c.req.path.replace('/wp-json/wp/v2/media/', '');

    const object = await c.env.MEDIA.get(path);

    if (!object) {
      return createWPError('not_found', 'File not found.', 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('cache-control', 'public, max-age=31536000');

    return new Response(object.body, {
      headers
    });
  } catch (error: any) {
    return createWPError('server_error', error.message, 500);
  }
});

export default media;
