import { Env, Post, PostResponse, Category, CategoryResponse, Tag, TagResponse, Media, MediaResponse, User, UserResponse, Comment, CommentResponse } from './types';

// Cache for settings to avoid repeated DB queries
let settingsCache: Record<string, any> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute

// Get site settings from database
export async function getSiteSettings(env: Env): Promise<Record<string, any>> {
  // Return cached settings if available and not expired
  const now = Date.now();
  if (settingsCache && (now - cacheTimestamp) < CACHE_TTL) {
    return settingsCache;
  }

  try {
    const result = await env.DB.prepare('SELECT setting_key, setting_value FROM site_settings').all();
    const settings: Record<string, any> = {
      site_title: 'CFBlog',
      site_description: '基于 Cloudflare Workers + D1 + R2 构建的现代化博客系统',
      site_url: 'http://localhost:8787',
      admin_email: 'admin@example.com'
    };

    for (const row of result.results as any[]) {
      settings[row.setting_key] = row.setting_value;
    }

    // Cache the settings
    settingsCache = settings;
    cacheTimestamp = now;

    return settings;
  } catch (error) {
    // Return defaults if DB query fails
    return {
      site_title: 'CFBlog',
      site_description: '基于 Cloudflare Workers + D1 + R2 构建的现代化博客系统',
      site_url: 'http://localhost:8787',
      admin_email: 'admin@example.com'
    };
  }
}

// Clear settings cache (call when settings are updated)
export function clearSettingsCache(): void {
  settingsCache = null;
  cacheTimestamp = 0;
}

// Normalize base URL by removing trailing slash
export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '');
}

// MD5 hash function for Gravatar (pure JavaScript implementation)
// Since crypto.subtle.digest doesn't support MD5 in Workers, we implement it ourselves
export async function md5(text: string): Promise<string> {
  const str = text.toLowerCase().trim();

  // MD5 implementation in JavaScript
  function md5cycle(x: number[], k: number[]) {
    let a = x[0], b = x[1], c = x[2], d = x[3];
    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);
    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);
    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);
    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);
    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);
  }

  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }

  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & c) | ((~b) & d), a, b, x, s, t);
  }

  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & d) | (c & (~d)), a, b, x, s, t);
  }

  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }

  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(c ^ (b | (~d)), a, b, x, s, t);
  }

  function add32(a: number, b: number) {
    return (a + b) & 0xFFFFFFFF;
  }

  function md51(s: string) {
    const n = s.length;
    const state = [1732584193, -271733879, -1732584194, 271733878];
    let i;
    for (i = 64; i <= s.length; i += 64) {
      md5cycle(state, md5blk(s.substring(i - 64, i)));
    }
    s = s.substring(i - 64);
    const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (i = 0; i < s.length; i++)
      tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
    tail[i >> 2] |= 0x80 << ((i % 4) << 3);
    if (i > 55) {
      md5cycle(state, tail);
      for (i = 0; i < 16; i++) tail[i] = 0;
    }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
  }

  function md5blk(s: string) {
    const md5blks = [];
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i) +
        (s.charCodeAt(i + 1) << 8) +
        (s.charCodeAt(i + 2) << 16) +
        (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }

  const hex_chr = '0123456789abcdef'.split('');

  function rhex(n: number) {
    let s = '';
    for (let j = 0; j < 4; j++)
      s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F];
    return s;
  }

  function hex(x: number[]) {
    for (let i = 0; i < x.length; i++)
      x[i] = rhex(x[i]);
    return x.join('');
  }

  return hex(md51(str));
}

// Generate WordPress-style _links for HATEOAS
export function generatePostLinks(post: Post, baseUrl: string): any {
  baseUrl = normalizeBaseUrl(baseUrl);
  return {
    self: [{ href: `${baseUrl}/wp-json/wp/v2/posts/${post.id}` }],
    collection: [{ href: `${baseUrl}/wp-json/wp/v2/posts` }],
    about: [{ href: `${baseUrl}/wp-json/wp/v2/types/${post.post_type}` }],
    author: [
      {
        embeddable: true,
        href: `${baseUrl}/wp-json/wp/v2/users/${post.author_id}`
      }
    ],
    replies: [
      {
        embeddable: true,
        href: `${baseUrl}/wp-json/wp/v2/comments?post=${post.id}`
      }
    ],
    'version-history': [
      {
        count: 1,
        href: `${baseUrl}/wp-json/wp/v2/posts/${post.id}/revisions`
      }
    ],
    'wp:attachment': [
      {
        href: `${baseUrl}/wp-json/wp/v2/media?parent=${post.id}`
      }
    ],
    'wp:term': [
      {
        taxonomy: 'category',
        embeddable: true,
        href: `${baseUrl}/wp-json/wp/v2/categories?post=${post.id}`
      },
      {
        taxonomy: 'post_tag',
        embeddable: true,
        href: `${baseUrl}/wp-json/wp/v2/tags?post=${post.id}`
      }
    ],
    curies: [
      {
        name: 'wp',
        href: 'https://api.w.org/{rel}',
        templated: true
      }
    ]
  };
}

// Convert database Post to WordPress REST API response format
export function formatPostResponse(post: Post, baseUrl: string, categories: number[] = [], tags: number[] = []): PostResponse {
  baseUrl = normalizeBaseUrl(baseUrl);
  return {
    id: post.id,
    date: post.published_at || post.created_at,
    date_gmt: post.published_at || post.created_at,
    modified: post.updated_at,
    modified_gmt: post.updated_at,
    slug: post.slug,
    status: post.status,
    type: post.post_type,
    link: `${baseUrl}/${post.slug}`,
    title: {
      rendered: post.title
    },
    content: {
      rendered: post.content || '',
      protected: post.status === 'private'
    },
    excerpt: {
      rendered: post.excerpt || '',
      protected: false
    },
    author: post.author_id,
    featured_media: post.featured_media_id || 0,
    featured_image_url: post.featured_image_url || undefined,
    comment_status: post.comment_status,
    ping_status: 'closed',
    sticky: false,
    template: '',
    format: 'standard',
    meta: [],
    categories: categories,
    tags: tags,
    comment_count: post.comment_count || 0,
    view_count: post.view_count || 0,
    _links: generatePostLinks(post, baseUrl)
  };
}

// Convert database Category to WordPress REST API response format
export function formatCategoryResponse(category: Category, baseUrl: string): CategoryResponse {
  baseUrl = normalizeBaseUrl(baseUrl);
  return {
    id: category.id,
    count: category.count,
    description: category.description || '',
    link: `${baseUrl}/category/${category.slug}`,
    name: category.name,
    slug: category.slug,
    taxonomy: 'category',
    parent: category.parent_id,
    meta: [],
    _links: {
      self: [{ href: `${baseUrl}/wp-json/wp/v2/categories/${category.id}` }],
      collection: [{ href: `${baseUrl}/wp-json/wp/v2/categories` }],
      about: [{ href: `${baseUrl}/wp-json/wp/v2/taxonomies/category` }],
      'wp:post_type': [
        {
          href: `${baseUrl}/wp-json/wp/v2/posts?categories=${category.id}`
        }
      ],
      curies: [
        {
          name: 'wp',
          href: 'https://api.w.org/{rel}',
          templated: true
        }
      ]
    }
  };
}

// Convert database Tag to WordPress REST API response format
export function formatTagResponse(tag: Tag, baseUrl: string): TagResponse {
  baseUrl = normalizeBaseUrl(baseUrl);
  return {
    id: tag.id,
    count: tag.count,
    description: tag.description || '',
    link: `${baseUrl}/tag/${tag.slug}`,
    name: tag.name,
    slug: tag.slug,
    taxonomy: 'post_tag',
    meta: [],
    _links: {
      self: [{ href: `${baseUrl}/wp-json/wp/v2/tags/${tag.id}` }],
      collection: [{ href: `${baseUrl}/wp-json/wp/v2/tags` }],
      about: [{ href: `${baseUrl}/wp-json/wp/v2/taxonomies/post_tag` }],
      'wp:post_type': [
        {
          href: `${baseUrl}/wp-json/wp/v2/posts?tags=${tag.id}`
        }
      ],
      curies: [
        {
          name: 'wp',
          href: 'https://api.w.org/{rel}',
          templated: true
        }
      ]
    }
  };
}

// Convert database Media to WordPress REST API response format
export function formatMediaResponse(media: Media, baseUrl: string): MediaResponse {
  baseUrl = normalizeBaseUrl(baseUrl);
  return {
    id: media.id,
    date: media.created_at,
    date_gmt: media.created_at,
    modified: media.created_at,
    modified_gmt: media.created_at,
    slug: media.filename,
    status: 'inherit',
    type: 'attachment',
    link: media.url,
    title: {
      rendered: media.title
    },
    author: media.author_id,
    comment_status: 'closed',
    ping_status: 'closed',
    template: '',
    meta: [],
    description: {
      rendered: media.description || ''
    },
    caption: {
      rendered: media.caption || ''
    },
    alt_text: media.alt_text || '',
    media_type: media.file_type,
    mime_type: media.mime_type,
    media_details: {
      width: media.width || 0,
      height: media.height || 0,
      file: media.filename,
      filesize: media.file_size
    },
    source_url: media.url,
    _links: {
      self: [{ href: `${baseUrl}/wp-json/wp/v2/media/${media.id}` }],
      collection: [{ href: `${baseUrl}/wp-json/wp/v2/media` }],
      about: [{ href: `${baseUrl}/wp-json/wp/v2/types/attachment` }],
      author: [
        {
          embeddable: true,
          href: `${baseUrl}/wp-json/wp/v2/users/${media.author_id}`
        }
      ],
      replies: [
        {
          embeddable: true,
          href: `${baseUrl}/wp-json/wp/v2/comments?post=${media.id}`
        }
      ]
    }
  };
}

// Convert database User to WordPress REST API response format
export async function formatUserResponse(user: User, baseUrl: string, isAdmin: boolean = false): Promise<UserResponse> {
  baseUrl = normalizeBaseUrl(baseUrl);

  // Generate Gravatar hash from email
  const emailHash = await md5(user.email || '');

  const response: any = {
    id: user.id,
    name: user.display_name || user.username,
    url: '',
    description: user.bio || '',
    link: `${baseUrl}/author/${user.username}`,
    slug: user.username,
    avatar_urls: {
      24: user.avatar_url || `https://www.gravatar.com/avatar/${emailHash}?s=24&d=mm&r=g`,
      48: user.avatar_url || `https://www.gravatar.com/avatar/${emailHash}?s=48&d=mm&r=g`,
      96: user.avatar_url || `https://www.gravatar.com/avatar/${emailHash}?s=96&d=mm&r=g`
    },
    roles: [user.role],
    role: user.role, // For backward compatibility
    registered_date: user.registered_at,
    meta: [],
    _links: {
      self: [{ href: `${baseUrl}/wp-json/wp/v2/users/${user.id}` }],
      collection: [{ href: `${baseUrl}/wp-json/wp/v2/users` }]
    }
  };

  // Only include email for admin users
  if (isAdmin) {
    response.email = user.email;
  }

  return response;
}

// Generate comment _links for HATEOAS
export function generateCommentLinks(comment: Comment, baseUrl: string): any {
  baseUrl = normalizeBaseUrl(baseUrl);
  return {
    self: [{ href: `${baseUrl}/wp-json/wp/v2/comments/${comment.id}` }],
    collection: [{ href: `${baseUrl}/wp-json/wp/v2/comments` }],
    up: [
      {
        embeddable: true,
        post_type: 'post',
        href: `${baseUrl}/wp-json/wp/v2/posts/${comment.post_id}`
      }
    ]
  };
}

// Convert database Comment to WordPress REST API response format
export async function formatCommentResponse(
  comment: Comment,
  baseUrl: string,
  postSlug?: string,
  isAdmin: boolean = false,
  postTitle?: string
): Promise<CommentResponse> {
  baseUrl = normalizeBaseUrl(baseUrl);

  // Generate Gravatar hash from email
  const emailHash = await md5(comment.author_email || '');

  const response: CommentResponse = {
    id: comment.id,
    post: comment.post_id,
    parent: comment.parent_id || 0,
    author: comment.user_id || 0,
    author_name: comment.author_name,
    author_url: comment.author_url || '',
    date: comment.created_at,
    date_gmt: comment.created_at,
    content: {
      rendered: comment.content
    },
    link: postSlug
      ? `${baseUrl}/${postSlug}#comment-${comment.id}`
      : `${baseUrl}/posts/${comment.post_id}#comment-${comment.id}`,
    status: comment.status,
    type: 'comment',
    author_avatar_urls: {
      24: `https://www.gravatar.com/avatar/${emailHash}?s=24&d=mm&r=g`,
      48: `https://www.gravatar.com/avatar/${emailHash}?s=48&d=mm&r=g`,
      96: `https://www.gravatar.com/avatar/${emailHash}?s=96&d=mm&r=g`
    },
    meta: [],
    _links: generateCommentLinks(comment, baseUrl)
  };

  // Add post title if provided
  if (postTitle) {
    response.post_title = postTitle;
  }

  // Only include sensitive fields for admin users
  if (isAdmin) {
    response.author_email = comment.author_email;
    response.author_ip = comment.author_ip || '';
  }

  return response;
}

// Generate slug from title
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Pagination helper
export function buildPaginationHeaders(page: number, perPage: number, totalItems: number, baseUrl: string): Record<string, string> {
  baseUrl = normalizeBaseUrl(baseUrl);
  const totalPages = Math.ceil(totalItems / perPage);

  const headers: Record<string, string> = {
    'X-WP-Total': totalItems.toString(),
    'X-WP-TotalPages': totalPages.toString()
  };

  const links: string[] = [];

  if (page > 1) {
    links.push(`<${baseUrl}?page=${page - 1}&per_page=${perPage}>; rel="prev"`);
  }
  if (page < totalPages) {
    links.push(`<${baseUrl}?page=${page + 1}&per_page=${perPage}>; rel="next"`);
  }

  if (links.length > 0) {
    headers['Link'] = links.join(', ');
  }

  return headers;
}

// Create WordPress-style error response
export function createWPError(code: string, message: string, status: number = 400): Response {
  return new Response(
    JSON.stringify({
      code,
      message,
      data: { status }
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}

// Webhook notification types
export type WebhookEvent =
  | 'post.created'
  | 'post.updated'
  | 'post.deleted'
  | 'post.published'
  | 'category.created'
  | 'category.updated'
  | 'category.deleted'
  | 'tag.created'
  | 'tag.updated'
  | 'tag.deleted'
  | 'media.uploaded'
  | 'media.deleted'
  | 'comment.created'
  | 'comment.updated'
  | 'comment.deleted'
  | 'settings.updated';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: any;
  site_url: string;
}

// Send webhook notification
export async function sendWebhook(env: Env, event: WebhookEvent, data: any): Promise<void> {
  try {
    const settings = await getSiteSettings(env);
    const webhookUrl = settings.webhook_url;
    const webhookSecret = settings.webhook_secret;
    const webhookEvents = settings.webhook_events || '';

    // Log webhook configuration for debugging
    console.log(`[Webhook] Event: ${event}`);
    console.log(`[Webhook] URL configured: ${webhookUrl ? 'Yes' : 'No'}`);

    // Skip if no webhook URL configured
    if (!webhookUrl || webhookUrl.trim() === '') {
      console.log('[Webhook] Skipped: No webhook URL configured');
      return;
    }

    // Check if this event should trigger webhook
    const enabledEvents = webhookEvents.split(',').map(e => e.trim());
    if (enabledEvents.length > 0 && !enabledEvents.includes(event)) {
      console.log(`[Webhook] Skipped: Event '${event}' not in enabled events`);
      return;
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
      site_url: settings.site_url || 'http://localhost:8787'
    };

    // Create HMAC signature if secret is provided
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'CFBlog-Webhook/1.0'
    };

    if (webhookSecret && webhookSecret.trim() !== '') {
      // Create signature using Web Crypto API
      const encoder = new TextEncoder();
      const keyData = encoder.encode(webhookSecret);
      const messageData = encoder.encode(JSON.stringify(payload));

      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        messageData
      );

      const hashArray = Array.from(new Uint8Array(signature));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      headers['X-Webhook-Signature'] = `sha256=${hashHex}`;
      console.log('[Webhook] Signature added');
    }

    console.log(`[Webhook] Sending to: ${webhookUrl}`);

    // Send webhook - await it to ensure it's sent
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log(`[Webhook] Successfully sent (${response.status})`);
      } else {
        console.error(`[Webhook] Failed with status ${response.status}: ${await response.text()}`);
      }
    } catch (fetchError: any) {
      console.error('[Webhook] Delivery failed:', fetchError.message);
      // Silently fail - don't block the main operation
    }

  } catch (error: any) {
    console.error('[Webhook] Error:', error.message);
    // Silently fail - don't block the main operation
  }
}

// Check if text contains Chinese characters
export function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text);
}

// Smart tag slug generation - use English directly, AI for Chinese
export async function generateSmartTagSlug(env: Env, name: string, providedSlug?: string): Promise<string> {
  // If slug is explicitly provided and not empty, use it
  if (providedSlug && providedSlug.trim()) {
    return providedSlug.trim();
  }

  // If name is empty, return empty
  if (!name || !name.trim()) {
    return '';
  }

  // Check if name contains Chinese characters
  if (containsChinese(name)) {
    // Use AI to generate slug for Chinese names
    return await generateSlugWithAI(env, name);
  } else {
    // For English names, use the simple slug generator
    return generateSlug(name);
  }
}

// AI-powered slug generation
export async function generateSlugWithAI(env: Env, title: string): Promise<string> {
  try {
    // Use AI to generate a clean, SEO-friendly slug
    const prompt = `Generate a clean, SEO-friendly URL slug for this article title. The slug should:
- Be in lowercase
- Use hyphens to separate words
- Be concise (3-6 words maximum)
- Contain only alphanumeric characters and hyphens
- Not contain any special characters or spaces

Title: "${title}"

Respond with ONLY the slug, nothing else. Example format: "understanding-machine-learning"

Slug:`;

    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 50
    }) as { response: string };

    let aiSlug = response.response.trim().toLowerCase();

    // Clean up the AI response
    aiSlug = aiSlug
      .replace(/^slug:\s*/i, '') // Remove "slug:" prefix if present
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

    // Fallback to traditional slug generation if AI fails
    if (!aiSlug || aiSlug.length < 2) {
      return generateSlug(title);
    }

    return aiSlug;
  } catch (error) {
    console.error('AI slug generation failed, using fallback:', error);
    return generateSlug(title);
  }
}

// AI-powered excerpt generation
export async function generateExcerptWithAI(env: Env, title: string, content: string, language: string = 'zh'): Promise<string> {
  try {
    // Strip HTML tags from content
    const cleanContent = content
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Limit content length for AI processing
    const contentPreview = cleanContent.substring(0, 2000);

    // Language-specific prompts
    const languagePrompts: Record<string, string> = {
      'zh': `请为这篇文章生成一个简洁且吸引人的摘要。摘要要求：
- 1-2句话（约150-200字符）
- 准确概括文章核心内容
- 吸引读者继续阅读
- 使用中文

标题："${title}"

内容预览："${contentPreview}"

只返回摘要文本，不要其他内容：`,
      'en': `Generate a concise and engaging excerpt (summary) for this blog article. The excerpt should:
- Be 1-2 sentences (around 150-200 characters)
- Capture the main idea of the article
- Be engaging and make readers want to read more
- Be in English

Title: "${title}"

Content preview: "${contentPreview}"

Generate ONLY the excerpt text, nothing else:`,
      'auto': `Generate a concise and engaging excerpt (summary) for this blog article. The excerpt should:
- Be 1-2 sentences (around 150-200 characters)
- Capture the main idea of the article
- Be engaging and make readers want to read more
- Be in the same language as the article content

Title: "${title}"

Content preview: "${contentPreview}"

Generate ONLY the excerpt text, nothing else:`
    };

    const prompt = languagePrompts[language] || languagePrompts['zh'];

    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 100
    }) as { response: string };

    let aiExcerpt = response.response.trim();

    // Remove common prefixes that AI might add
    aiExcerpt = aiExcerpt
      .replace(/^(excerpt:|summary:|description:|摘要：|简介：|概述：)\s*/i, '')
      .replace(/^["']|["']$/g, ''); // Remove surrounding quotes

    // Fallback to simple excerpt if AI fails
    if (!aiExcerpt || aiExcerpt.length < 10) {
      return cleanContent.substring(0, 200) + (cleanContent.length > 200 ? '...' : '');
    }

    // Ensure excerpt is not too long
    if (aiExcerpt.length > 300) {
      aiExcerpt = aiExcerpt.substring(0, 297) + '...';
    }

    return aiExcerpt;
  } catch (error) {
    console.error('AI excerpt generation failed, using fallback:', error);
    // Fallback: return first 200 characters of content
    const cleanContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return cleanContent.substring(0, 200) + (cleanContent.length > 200 ? '...' : '');
  }
}

