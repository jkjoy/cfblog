import { Hono } from 'hono';
import type { AppEnv, Category, JWTPayload, Post, Tag } from '../types';
import { authMiddleware, requireRole } from '../auth';
import { createWPError, generateSlug, getSiteSettings } from '../utils';

const imports = new Hono<AppEnv>();

const IMPORT_FORMAT = 'cfblog-import';
const IMPORT_VERSION = '1.1';
const IMPORT_META_KEYS = [
  'import_source_platform',
  'import_source_site_name',
  'import_source_site_url',
  'import_source_id',
  'import_source_url',
  'import_source_author'
] as const;

type ConflictStrategy = 'skip' | 'update' | 'duplicate';
type ImportPostType = 'post' | 'page';
type ImportMomentStatus = 'publish' | 'draft' | 'trash';

interface ImportSource {
  platform?: string;
  site_name?: string;
  site_url?: string;
  exported_at?: string;
  generator?: string;
}

interface ImportAuthor {
  username?: string;
  display_name?: string;
  email?: string;
}

interface ImportTaxonomyItem {
  name?: string;
  slug?: string;
  description?: string;
  parent_slug?: string;
}

interface ImportContentItem {
  type?: ImportPostType;
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  published_at?: string;
  comment_status?: string;
  sticky?: boolean;
  featured_image_url?: string;
  categories?: string[];
  tags?: string[];
  parent_slug?: string;
  source?: {
    id?: string | number;
    url?: string;
  };
  author?: ImportAuthor;
}

interface ImportMomentItem {
  content?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  media_urls?: string[];
  source?: {
    id?: string | number;
    url?: string;
  };
  author?: ImportAuthor;
}

interface ImportPackage {
  format: string;
  version: string;
  source?: ImportSource;
  categories?: ImportTaxonomyItem[];
  tags?: ImportTaxonomyItem[];
  content?: ImportContentItem[];
  moments?: ImportMomentItem[];
}

interface ImportOptions {
  dry_run?: boolean;
  conflict_strategy?: ConflictStrategy;
}

interface ImportIssue {
  level: 'warning' | 'error';
  scope: 'package' | 'category' | 'tag' | 'content';
  identifier: string;
  message: string;
}

interface ImportSummary {
  total_content_items: number;
  total_moment_items: number;
  posts_detected: number;
  pages_detected: number;
  moments_detected: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  categories_created: number;
  categories_matched: number;
  tags_created: number;
  tags_matched: number;
}

interface ContentMatch {
  id: number;
  slug: string;
  post_type: string;
}

interface MomentMatch {
  id: number;
}

interface NormalizedImportConfig {
  importPackage: ImportPackage;
  options: Required<ImportOptions>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toStringValue(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeSlug(value: string | null, fallbackPrefix: string, index: number): string {
  const source = value ? generateSlug(value) : '';
  return source || `${fallbackPrefix}-${index}`;
}

function normalizeContentType(value: string | null): ImportPostType {
  return value === 'page' ? 'page' : 'post';
}

function normalizeStatus(value: string | null): Post['status'] {
  switch (value) {
    case 'publish':
    case 'draft':
    case 'pending':
    case 'private':
    case 'trash':
      return value;
    default:
      return 'draft';
  }
}

function normalizeCommentStatus(value: string | null): Post['comment_status'] {
  return value === 'closed' ? 'closed' : 'open';
}

function normalizeMomentStatus(value: string | null): ImportMomentStatus {
  switch (value) {
    case 'draft':
    case 'trash':
      return value;
    default:
      return 'publish';
  }
}

function normalizeDate(value: string | null, fallback: string): string {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toISOString();
}

function normalizeMomentMediaUrls(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => toStringValue(item))
    .filter((item): item is string => !!item);
}

function humanizeSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || slug;
}

function createEmptySummary(
  contentCount: number,
  momentCount: number,
  postsDetected: number,
  pagesDetected: number
): ImportSummary {
  return {
    total_content_items: contentCount,
    total_moment_items: momentCount,
    posts_detected: postsDetected,
    pages_detected: pagesDetected,
    moments_detected: momentCount,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    categories_created: 0,
    categories_matched: 0,
    tags_created: 0,
    tags_matched: 0
  };
}

function getImportTemplate(): ImportPackage {
  return {
    format: IMPORT_FORMAT,
    version: IMPORT_VERSION,
    source: {
      platform: 'hugo',
      site_name: 'Example Blog',
      site_url: 'https://example.com',
      exported_at: '2026-04-11T00:00:00.000Z',
      generator: 'cfblog-hugo-converter/1.0.0'
    },
    categories: [
      {
        name: '技术',
        slug: 'tech',
        description: '技术相关文章'
      },
      {
        name: '随笔',
        slug: 'notes',
        description: '杂谈和记录'
      }
    ],
    tags: [
      {
        name: 'cloudflare',
        slug: 'cloudflare'
      },
      {
        name: 'wordpress',
        slug: 'wordpress'
      }
    ],
    content: [
      {
        type: 'post',
        title: 'Hello CFBlog',
        slug: 'hello-cfblog',
        content: '# Hello CFBlog\n\n这是一篇从其它博客导入的文章。',
        excerpt: '这是一篇用于演示导入格式的文章。',
        status: 'publish',
        created_at: '2026-04-10T10:00:00.000Z',
        updated_at: '2026-04-10T12:00:00.000Z',
        published_at: '2026-04-10T10:00:00.000Z',
        comment_status: 'open',
        sticky: false,
        featured_image_url: 'https://example.com/uploads/hello-cover.jpg',
        categories: ['tech'],
        tags: ['cloudflare', 'wordpress'],
        source: {
          id: '123',
          url: 'https://example.com/hello-cfblog'
        },
        author: {
          username: 'admin',
          display_name: 'Site Admin',
          email: 'admin@example.com'
        }
      },
      {
        type: 'page',
        title: '关于',
        slug: 'about',
        content: '这里是站点介绍页面。',
        excerpt: '站点介绍',
        status: 'publish',
        created_at: '2026-04-01T08:00:00.000Z',
        updated_at: '2026-04-01T08:00:00.000Z',
        published_at: '2026-04-01T08:00:00.000Z',
        comment_status: 'closed'
      }
    ],
    moments: [
      {
        content: '今天把 Hugo 的 memo 成功迁进来了。',
        status: 'publish',
        created_at: '2026-04-10T18:30:00.000Z',
        updated_at: '2026-04-10T18:30:00.000Z',
        media_urls: ['https://example.com/uploads/moment-1.jpg'],
        source: {
          id: 'memo-001',
          url: 'https://example.com/memo/memo-001'
        },
        author: {
          username: 'admin',
          display_name: 'Site Admin',
          email: 'admin@example.com'
        }
      }
    ]
  };
}

function normalizeImportRequest(rawBody: unknown): NormalizedImportConfig | null {
  if (!isRecord(rawBody)) {
    return null;
  }

  const importPackage = isRecord(rawBody.package)
    ? rawBody.package as unknown as ImportPackage
    : rawBody as unknown as ImportPackage;

  const rawOptions = isRecord(rawBody.options) ? rawBody.options : {};
  const conflictStrategy = rawOptions.conflict_strategy === 'skip' || rawOptions.conflict_strategy === 'duplicate'
    ? rawOptions.conflict_strategy
    : 'update';

  return {
    importPackage,
    options: {
      dry_run: rawOptions.dry_run === true,
      conflict_strategy: conflictStrategy
    }
  };
}

function validateImportPackage(importPackage: ImportPackage): string | null {
  if (!importPackage || importPackage.format !== IMPORT_FORMAT) {
    return `Invalid import format. Expected "${IMPORT_FORMAT}".`;
  }

  if (!importPackage.version || !importPackage.version.startsWith('1')) {
    return 'Unsupported import version. Expected version 1.x.';
  }

  const hasContent = Array.isArray(importPackage.content) && importPackage.content.length > 0;
  const hasMoments = Array.isArray(importPackage.moments) && importPackage.moments.length > 0;

  if (!hasContent && !hasMoments) {
    return 'Import package must include a non-empty content or moments array.';
  }

  return null;
}

async function ensureUniquePostSlug(env: AppEnv['Bindings'], baseSlug: string, excludeId?: number): Promise<string> {
  let candidate = baseSlug;
  let counter = 1;

  while (true) {
    const existing = excludeId !== undefined
      ? await env.DB.prepare('SELECT id FROM posts WHERE slug = ? AND id != ?')
        .bind(candidate, excludeId)
        .first<{ id: number }>()
      : await env.DB.prepare('SELECT id FROM posts WHERE slug = ?')
        .bind(candidate)
        .first<{ id: number }>();

    if (!existing) {
      return candidate;
    }

    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

async function ensureUniqueTermSlug(
  env: AppEnv['Bindings'],
  table: 'categories' | 'tags',
  baseSlug: string,
  excludeId?: number
): Promise<string> {
  let candidate = baseSlug;
  let counter = 1;

  while (true) {
    const existing = excludeId !== undefined
      ? await env.DB.prepare(`SELECT id FROM ${table} WHERE slug = ? AND id != ?`)
        .bind(candidate, excludeId)
        .first<{ id: number }>()
      : await env.DB.prepare(`SELECT id FROM ${table} WHERE slug = ?`)
        .bind(candidate)
        .first<{ id: number }>();

    if (!existing) {
      return candidate;
    }

    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

async function findCategoryBySlugOrName(env: AppEnv['Bindings'], slug: string, name: string | null): Promise<Category | null> {
  const bySlug = await env.DB.prepare('SELECT * FROM categories WHERE slug = ?')
    .bind(slug)
    .first<Category>();

  if (bySlug) {
    return bySlug;
  }

  if (name) {
    return await env.DB.prepare('SELECT * FROM categories WHERE name = ?')
      .bind(name)
      .first<Category>();
  }

  return null;
}

async function findTagBySlugOrName(env: AppEnv['Bindings'], slug: string, name: string | null): Promise<Tag | null> {
  const bySlug = await env.DB.prepare('SELECT * FROM tags WHERE slug = ?')
    .bind(slug)
    .first<Tag>();

  if (bySlug) {
    return bySlug;
  }

  if (name) {
    return await env.DB.prepare('SELECT * FROM tags WHERE name = ?')
      .bind(name)
      .first<Tag>();
  }

  return null;
}

async function findExistingImportedContent(
  env: AppEnv['Bindings'],
  item: ImportContentItem,
  itemType: ImportPostType,
  itemSlug: string,
  source: ImportSource | undefined
): Promise<ContentMatch | null> {
  const sourceId = item.source?.id !== undefined && item.source?.id !== null
    ? String(item.source.id)
    : null;
  const platform = toStringValue(source?.platform);
  const siteUrl = toStringValue(source?.site_url);

  if (sourceId && platform) {
    const params: string[] = [itemType, sourceId, platform];
    let query = `
      SELECT p.id, p.slug, p.post_type
      FROM posts p
      INNER JOIN post_meta meta_source_id
        ON meta_source_id.post_id = p.id
       AND meta_source_id.meta_key = 'import_source_id'
       AND meta_source_id.meta_value = ?
      INNER JOIN post_meta meta_platform
        ON meta_platform.post_id = p.id
       AND meta_platform.meta_key = 'import_source_platform'
       AND meta_platform.meta_value = ?
      WHERE p.post_type = ?
    `;

    if (siteUrl) {
      query += `
        AND EXISTS (
          SELECT 1
          FROM post_meta meta_site
          WHERE meta_site.post_id = p.id
            AND meta_site.meta_key = 'import_source_site_url'
            AND meta_site.meta_value = ?
        )
      `;
      params.push(siteUrl);
    }

    const reorderedParams = [params[1], params[2], params[0], ...(siteUrl ? [params[3]] : [])];
    const importedMatch = await env.DB.prepare(query)
      .bind(...reorderedParams)
      .first<ContentMatch>();

    if (importedMatch) {
      return importedMatch;
    }
  }

  return await env.DB.prepare('SELECT id, slug, post_type FROM posts WHERE slug = ? AND post_type = ?')
    .bind(itemSlug, itemType)
    .first<ContentMatch>();
}

async function findExistingImportedMoment(
  env: AppEnv['Bindings'],
  item: ImportMomentItem,
  content: string,
  createdAt: string,
  source: ImportSource | undefined
): Promise<MomentMatch | null> {
  const sourceId = item.source?.id !== undefined && item.source?.id !== null
    ? String(item.source.id)
    : null;
  const platform = toStringValue(source?.platform);
  const siteUrl = toStringValue(source?.site_url);

  if (sourceId && platform) {
    const params: string[] = [sourceId, platform];
    let query = `
      SELECT m.id
      FROM moments m
      INNER JOIN moment_meta meta_source_id
        ON meta_source_id.moment_id = m.id
       AND meta_source_id.meta_key = 'import_source_id'
       AND meta_source_id.meta_value = ?
      INNER JOIN moment_meta meta_platform
        ON meta_platform.moment_id = m.id
       AND meta_platform.meta_key = 'import_source_platform'
       AND meta_platform.meta_value = ?
      WHERE 1 = 1
    `;

    if (siteUrl) {
      query += `
        AND EXISTS (
          SELECT 1
          FROM moment_meta meta_site
          WHERE meta_site.moment_id = m.id
            AND meta_site.meta_key = 'import_source_site_url'
            AND meta_site.meta_value = ?
        )
      `;
      params.push(siteUrl);
    }

    const importedMatch = await env.DB.prepare(query)
      .bind(...params)
      .first<MomentMatch>();

    if (importedMatch) {
      return importedMatch;
    }
  }

  return await env.DB.prepare('SELECT id FROM moments WHERE content = ? AND created_at = ?')
    .bind(content, createdAt)
    .first<MomentMatch>();
}

function getImportMetaPairs(
  importPackage: ImportPackage,
  source: { id?: string | number; url?: string } | undefined,
  author: ImportAuthor | undefined
): Array<[string, string | null]> {
  return [
    ['import_source_platform', toStringValue(importPackage.source?.platform)],
    ['import_source_site_name', toStringValue(importPackage.source?.site_name)],
    ['import_source_site_url', toStringValue(importPackage.source?.site_url)],
    ['import_source_id', source?.id !== undefined && source?.id !== null ? String(source.id) : null],
    ['import_source_url', toStringValue(source?.url)],
    ['import_source_author', author ? JSON.stringify(author) : null]
  ];
}

async function syncImportMeta(
  env: AppEnv['Bindings'],
  postId: number,
  importPackage: ImportPackage,
  item: ImportContentItem
): Promise<void> {
  const deletePlaceholders = IMPORT_META_KEYS.map(() => '?').join(', ');

  await env.DB.prepare(
    `DELETE FROM post_meta WHERE post_id = ? AND meta_key IN (${deletePlaceholders})`
  )
    .bind(postId, ...IMPORT_META_KEYS)
    .run();

  const metaPairs = getImportMetaPairs(importPackage, item.source, item.author);

  for (const [metaKey, metaValue] of metaPairs) {
    if (!metaValue) {
      continue;
    }

    await env.DB.prepare('INSERT INTO post_meta (post_id, meta_key, meta_value) VALUES (?, ?, ?)')
      .bind(postId, metaKey, metaValue)
      .run();
  }
}

async function syncMomentImportMeta(
  env: AppEnv['Bindings'],
  momentId: number,
  importPackage: ImportPackage,
  item: ImportMomentItem
): Promise<void> {
  const deletePlaceholders = IMPORT_META_KEYS.map(() => '?').join(', ');

  await env.DB.prepare(
    `DELETE FROM moment_meta WHERE moment_id = ? AND meta_key IN (${deletePlaceholders})`
  )
    .bind(momentId, ...IMPORT_META_KEYS)
    .run();

  const metaPairs = getImportMetaPairs(importPackage, item.source, item.author);

  for (const [metaKey, metaValue] of metaPairs) {
    if (!metaValue) {
      continue;
    }

    await env.DB.prepare('INSERT INTO moment_meta (moment_id, meta_key, meta_value) VALUES (?, ?, ?)')
      .bind(momentId, metaKey, metaValue)
      .run();
  }
}

async function replacePostRelations(
  env: AppEnv['Bindings'],
  postId: number,
  categoryIds: number[],
  tagIds: number[]
): Promise<void> {
  await env.DB.prepare('DELETE FROM post_categories WHERE post_id = ?').bind(postId).run();
  await env.DB.prepare('DELETE FROM post_tags WHERE post_id = ?').bind(postId).run();

  for (const categoryId of categoryIds) {
    await env.DB.prepare('INSERT OR IGNORE INTO post_categories (post_id, category_id) VALUES (?, ?)')
      .bind(postId, categoryId)
      .run();
  }

  for (const tagId of tagIds) {
    await env.DB.prepare('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)')
      .bind(postId, tagId)
      .run();
  }
}

async function recountTaxonomyCounts(env: AppEnv['Bindings']): Promise<void> {
  await env.DB.prepare(`
    UPDATE categories
    SET count = (
      SELECT COUNT(*)
      FROM post_categories
      WHERE post_categories.category_id = categories.id
    )
  `).run();

  await env.DB.prepare(`
    UPDATE tags
    SET count = (
      SELECT COUNT(*)
      FROM post_tags
      WHERE post_tags.tag_id = tags.id
    )
  `).run();
}

function addIssue(
  issues: ImportIssue[],
  level: ImportIssue['level'],
  scope: ImportIssue['scope'],
  identifier: string,
  message: string
): void {
  issues.push({ level, scope, identifier, message });
}

imports.get('/', authMiddleware, requireRole('administrator'), async (c) => {
  return c.json({
    format: IMPORT_FORMAT,
    version: IMPORT_VERSION,
    conflict_strategies: ['update', 'skip', 'duplicate'],
    notes: [
      'Top-level content accepts both posts and pages. Use type="post" or type="page".',
      'Top-level moments accepts short-form entries for /wp-json/wp/v2/moments imports.',
      'Categories and tags are matched by slug first, then by name.',
      'Imported media keeps remote URLs through featured_image_url. Binary media transfer is not included.'
    ],
    template_endpoint: '/wp-json/wp/v2/import/template',
    template: getImportTemplate()
  });
});

imports.get('/template', authMiddleware, requireRole('administrator'), async (c) => {
  return c.json(getImportTemplate());
});

imports.post('/', authMiddleware, requireRole('administrator'), async (c) => {
  let normalized: NormalizedImportConfig | null = null;

  try {
    normalized = normalizeImportRequest(await c.req.json());
  } catch {
    return createWPError('rest_invalid_json', 'Invalid JSON body.', 400);
  }

  if (!normalized) {
    return createWPError('rest_invalid_param', 'Import payload must be a JSON object.', 400);
  }

  const validationError = validateImportPackage(normalized.importPackage);
  if (validationError) {
    return createWPError('rest_invalid_param', validationError, 400);
  }

  const contentItems = normalized.importPackage.content || [];
  const momentItems = normalized.importPackage.moments || [];
  const postsDetected = contentItems.filter((item) => normalizeContentType(toStringValue(item.type)) === 'post').length;
  const pagesDetected = contentItems.length - postsDetected;
  const summary = createEmptySummary(contentItems.length, momentItems.length, postsDetected, pagesDetected);
  const issues: ImportIssue[] = [];
  const categoryIdMap = new Map<string, number>();
  const tagIdMap = new Map<string, number>();
  const pageParentQueue: Array<{ postId: number; parentKey: string; childSlug: string }> = [];
  const categoryParentQueue: Array<{ categoryId: number; parentKey: string; childSlug: string }> = [];
  const now = new Date().toISOString();
  const currentUser = c.get('user') as JWTPayload;
  const dryRun = normalized.options.dry_run;

  const rememberTaxonomyKeys = (keys: string[], id: number) => {
    for (const key of keys) {
      categoryIdMap.set(normalizeLookupKey(key), id);
    }
  };
  const rememberTagKeys = (keys: string[], id: number) => {
    for (const key of keys) {
      tagIdMap.set(normalizeLookupKey(key), id);
    }
  };

  const ensureCategoryReference = async (rawReference: string, index: number): Promise<number | null> => {
    const trimmed = rawReference.trim();
    if (!trimmed) {
      return null;
    }

    const directMatch = categoryIdMap.get(normalizeLookupKey(trimmed));
    if (directMatch) {
      return directMatch;
    }

    const guessedSlug = normalizeSlug(trimmed, 'category', index);
    const existing = await findCategoryBySlugOrName(c.env, guessedSlug, trimmed);

    if (existing) {
      rememberTaxonomyKeys([trimmed, guessedSlug, existing.slug, existing.name], existing.id);
      summary.categories_matched += 1;
      return existing.id;
    }

    if (dryRun) {
      rememberTaxonomyKeys([trimmed, guessedSlug], -1);
      summary.categories_created += 1;
      return null;
    }

    const uniqueSlug = await ensureUniqueTermSlug(c.env, 'categories', guessedSlug);
    const categoryName = toStringValue(trimmed) || humanizeSlug(uniqueSlug);
    const result = await c.env.DB.prepare(
      'INSERT INTO categories (name, slug, description, parent_id, created_at) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(categoryName, uniqueSlug, '', 0, now)
      .run();

    const categoryId = result.meta.last_row_id;
    rememberTaxonomyKeys([trimmed, guessedSlug, uniqueSlug, categoryName], categoryId);
    summary.categories_created += 1;
    return categoryId;
  };

  const ensureTagReference = async (rawReference: string, index: number): Promise<number | null> => {
    const trimmed = rawReference.trim();
    if (!trimmed) {
      return null;
    }

    const directMatch = tagIdMap.get(normalizeLookupKey(trimmed));
    if (directMatch) {
      return directMatch;
    }

    const guessedSlug = normalizeSlug(trimmed, 'tag', index);
    const existing = await findTagBySlugOrName(c.env, guessedSlug, trimmed);

    if (existing) {
      rememberTagKeys([trimmed, guessedSlug, existing.slug, existing.name], existing.id);
      summary.tags_matched += 1;
      return existing.id;
    }

    if (dryRun) {
      rememberTagKeys([trimmed, guessedSlug], -1);
      summary.tags_created += 1;
      return null;
    }

    const uniqueSlug = await ensureUniqueTermSlug(c.env, 'tags', guessedSlug);
    const tagName = toStringValue(trimmed) || humanizeSlug(uniqueSlug);
    const result = await c.env.DB.prepare(
      'INSERT INTO tags (name, slug, description, created_at) VALUES (?, ?, ?, ?)'
    )
      .bind(tagName, uniqueSlug, '', now)
      .run();

    const tagId = result.meta.last_row_id;
    rememberTagKeys([trimmed, guessedSlug, uniqueSlug, tagName], tagId);
    summary.tags_created += 1;
    return tagId;
  };

  for (let index = 0; index < (normalized.importPackage.categories || []).length; index += 1) {
    const item = normalized.importPackage.categories![index];
    const rawName = toStringValue(item.name);
    const rawSlug = toStringValue(item.slug);
    const identifier = rawSlug || rawName || `category-${index + 1}`;
    const normalizedSlug = normalizeSlug(rawSlug || rawName, 'category', index + 1);
    const categoryName = rawName || humanizeSlug(rawSlug || normalizedSlug);

    const existing = await findCategoryBySlugOrName(c.env, normalizedSlug, categoryName);

    if (existing) {
      rememberTaxonomyKeys([normalizedSlug, categoryName, existing.slug, existing.name], existing.id);
      summary.categories_matched += 1;

      if (!dryRun) {
        await c.env.DB.prepare(
          'UPDATE categories SET name = ?, description = ? WHERE id = ?'
        )
          .bind(categoryName, toStringValue(item.description) || existing.description || '', existing.id)
          .run();
      }

      if (item.parent_slug) {
        categoryParentQueue.push({
          categoryId: existing.id,
          parentKey: item.parent_slug,
          childSlug: existing.slug
        });
      }

      continue;
    }

    if (dryRun) {
      rememberTaxonomyKeys([normalizedSlug, categoryName], -1);
      summary.categories_created += 1;
      if (item.parent_slug) {
        categoryParentQueue.push({
          categoryId: -1,
          parentKey: item.parent_slug,
          childSlug: normalizedSlug
        });
      }
      continue;
    }

    const uniqueSlug = await ensureUniqueTermSlug(c.env, 'categories', normalizedSlug);
    const result = await c.env.DB.prepare(
      'INSERT INTO categories (name, slug, description, parent_id, created_at) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(categoryName, uniqueSlug, toStringValue(item.description) || '', 0, now)
      .run();

    const categoryId = result.meta.last_row_id;
    rememberTaxonomyKeys([normalizedSlug, categoryName, uniqueSlug], categoryId);
    summary.categories_created += 1;

    if (item.parent_slug) {
      categoryParentQueue.push({
        categoryId,
        parentKey: item.parent_slug,
        childSlug: uniqueSlug
      });
    }
  }

  for (let index = 0; index < (normalized.importPackage.tags || []).length; index += 1) {
    const item = normalized.importPackage.tags![index];
    const rawName = toStringValue(item.name);
    const rawSlug = toStringValue(item.slug);
    const identifier = rawSlug || rawName || `tag-${index + 1}`;
    const normalizedSlug = normalizeSlug(rawSlug || rawName, 'tag', index + 1);
    const tagName = rawName || humanizeSlug(rawSlug || normalizedSlug);

    const existing = await findTagBySlugOrName(c.env, normalizedSlug, tagName);

    if (existing) {
      rememberTagKeys([normalizedSlug, tagName, existing.slug, existing.name], existing.id);
      summary.tags_matched += 1;

      if (!dryRun) {
        await c.env.DB.prepare('UPDATE tags SET name = ?, description = ? WHERE id = ?')
          .bind(tagName, toStringValue(item.description) || existing.description || '', existing.id)
          .run();
      }
      continue;
    }

    if (dryRun) {
      rememberTagKeys([normalizedSlug, tagName], -1);
      summary.tags_created += 1;
      continue;
    }

    const uniqueSlug = await ensureUniqueTermSlug(c.env, 'tags', normalizedSlug);
    const result = await c.env.DB.prepare(
      'INSERT INTO tags (name, slug, description, created_at) VALUES (?, ?, ?, ?)'
    )
      .bind(tagName, uniqueSlug, toStringValue(item.description) || '', now)
      .run();

    const tagId = result.meta.last_row_id;
    rememberTagKeys([normalizedSlug, tagName, uniqueSlug], tagId);
    summary.tags_created += 1;
  }

  for (let index = 0; index < contentItems.length; index += 1) {
    const item = contentItems[index];
    const itemType = normalizeContentType(toStringValue(item.type));
    const rawTitle = toStringValue(item.title);
    const itemLabel = item.slug || rawTitle || `${itemType}-${index + 1}`;

    if (!rawTitle) {
      summary.failed += 1;
      addIssue(issues, 'error', 'content', itemLabel, 'Missing required field: title.');
      continue;
    }

    const status = normalizeStatus(toStringValue(item.status));
    const baseSlug = normalizeSlug(toStringValue(item.slug) || rawTitle, itemType, index + 1);
    const createdAt = normalizeDate(toStringValue(item.created_at), now);
    const updatedAt = normalizeDate(toStringValue(item.updated_at), createdAt);
    const publishedAt = status === 'publish'
      ? normalizeDate(toStringValue(item.published_at) || toStringValue(item.created_at), createdAt)
      : null;

    const existing = await findExistingImportedContent(c.env, item, itemType, baseSlug, normalized.importPackage.source);

    if (existing && normalized.options.conflict_strategy === 'skip') {
      summary.skipped += 1;
      addIssue(issues, 'warning', 'content', itemLabel, `Skipped because ${itemType} "${existing.slug}" already exists.`);
      continue;
    }

    const finalSlug = existing && normalized.options.conflict_strategy === 'update'
      ? await ensureUniquePostSlug(c.env, baseSlug, existing.id)
      : await ensureUniquePostSlug(c.env, baseSlug);

    const categoryIds: number[] = [];
    const tagIds: number[] = [];

    for (let refIndex = 0; refIndex < (item.categories || []).length; refIndex += 1) {
      const categoryId = await ensureCategoryReference(item.categories![refIndex], refIndex + 1);
      if (categoryId && categoryId > 0) {
        categoryIds.push(categoryId);
      }
    }

    if (itemType === 'post' && categoryIds.length === 0) {
      const defaultCategoryId = await ensureCategoryReference('uncategorized', 0);
      if (defaultCategoryId && defaultCategoryId > 0) {
        categoryIds.push(defaultCategoryId);
      }
    }

    for (let refIndex = 0; refIndex < (item.tags || []).length; refIndex += 1) {
      const tagId = await ensureTagReference(item.tags![refIndex], refIndex + 1);
      if (tagId && tagId > 0) {
        tagIds.push(tagId);
      }
    }

    if (dryRun) {
      if (existing && normalized.options.conflict_strategy === 'update') {
        summary.updated += 1;
      } else {
        summary.created += 1;
      }

      if (itemType === 'page' && item.parent_slug) {
        pageParentQueue.push({
          postId: -1,
          parentKey: item.parent_slug,
          childSlug: baseSlug
        });
      }
      continue;
    }

    try {
      if (existing && normalized.options.conflict_strategy === 'update') {
        await c.env.DB.prepare(`
          UPDATE posts
          SET title = ?,
              content = ?,
              excerpt = ?,
              slug = ?,
              status = ?,
              comment_status = ?,
              sticky = ?,
              featured_image_url = ?,
              author_id = ?,
              updated_at = ?,
              created_at = ?,
              published_at = ?
          WHERE id = ?
        `)
          .bind(
            rawTitle,
            item.content || '',
            item.excerpt || '',
            finalSlug,
            status,
            normalizeCommentStatus(toStringValue(item.comment_status)),
            item.sticky ? 1 : 0,
            toStringValue(item.featured_image_url),
            currentUser.userId,
            updatedAt,
            createdAt,
            publishedAt,
            existing.id
          )
          .run();

        await replacePostRelations(c.env, existing.id, categoryIds, tagIds);
        await syncImportMeta(c.env, existing.id, normalized.importPackage, item);
        summary.updated += 1;

        if (itemType === 'page' && item.parent_slug) {
          pageParentQueue.push({
            postId: existing.id,
            parentKey: item.parent_slug,
            childSlug: finalSlug
          });
        }
      } else {
        const insertResult = await c.env.DB.prepare(`
          INSERT INTO posts (
            title,
            content,
            excerpt,
            slug,
            status,
            post_type,
            author_id,
            parent_id,
            comment_status,
            sticky,
            featured_image_url,
            created_at,
            updated_at,
            published_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
          .bind(
            rawTitle,
            item.content || '',
            item.excerpt || '',
            finalSlug,
            status,
            itemType,
            currentUser.userId,
            0,
            normalizeCommentStatus(toStringValue(item.comment_status)),
            item.sticky ? 1 : 0,
            toStringValue(item.featured_image_url),
            createdAt,
            updatedAt,
            publishedAt
          )
          .run();

        const postId = insertResult.meta.last_row_id;
        await replacePostRelations(c.env, postId, categoryIds, tagIds);
        await syncImportMeta(c.env, postId, normalized.importPackage, item);
        summary.created += 1;

        if (itemType === 'page' && item.parent_slug) {
          pageParentQueue.push({
            postId,
            parentKey: item.parent_slug,
            childSlug: finalSlug
          });
        }
      }
    } catch (error: any) {
      summary.failed += 1;
      addIssue(issues, 'error', 'content', itemLabel, error.message || 'Failed to import content item.');
    }
  }

  for (let index = 0; index < momentItems.length; index += 1) {
    const item = momentItems[index];
    const rawContent = toStringValue(item.content);
    const itemLabel = String(item.source?.id ?? item.created_at ?? `moment-${index + 1}`);

    if (!rawContent) {
      summary.failed += 1;
      addIssue(issues, 'error', 'content', itemLabel, 'Missing required field: content.');
      continue;
    }

    const status = normalizeMomentStatus(toStringValue(item.status));
    const createdAt = normalizeDate(toStringValue(item.created_at), now);
    const updatedAt = normalizeDate(toStringValue(item.updated_at), createdAt);
    const mediaUrls = normalizeMomentMediaUrls(item.media_urls);
    const existing = await findExistingImportedMoment(
      c.env,
      item,
      rawContent,
      createdAt,
      normalized.importPackage.source
    );

    if (existing && normalized.options.conflict_strategy === 'skip') {
      summary.skipped += 1;
      addIssue(issues, 'warning', 'content', itemLabel, 'Skipped because matching moment already exists.');
      continue;
    }

    if (dryRun) {
      if (existing && normalized.options.conflict_strategy === 'update') {
        summary.updated += 1;
      } else {
        summary.created += 1;
      }
      continue;
    }

    try {
      if (existing && normalized.options.conflict_strategy === 'update') {
        await c.env.DB.prepare(`
          UPDATE moments
          SET content = ?,
              status = ?,
              media_urls = ?,
              author_id = ?,
              created_at = ?,
              updated_at = ?
          WHERE id = ?
        `)
          .bind(
            rawContent,
            status,
            JSON.stringify(mediaUrls),
            currentUser.userId,
            createdAt,
            updatedAt,
            existing.id
          )
          .run();

        await syncMomentImportMeta(c.env, existing.id, normalized.importPackage, item);
        summary.updated += 1;
      } else {
        const insertResult = await c.env.DB.prepare(`
          INSERT INTO moments (
            content,
            author_id,
            status,
            media_urls,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `)
          .bind(
            rawContent,
            currentUser.userId,
            status,
            JSON.stringify(mediaUrls),
            createdAt,
            updatedAt
          )
          .run();

        const momentId = insertResult.meta.last_row_id;
        await syncMomentImportMeta(c.env, momentId, normalized.importPackage, item);
        summary.created += 1;
      }
    } catch (error: any) {
      summary.failed += 1;
      addIssue(issues, 'error', 'content', itemLabel, error.message || 'Failed to import moment item.');
    }
  }

  if (!dryRun) {
    for (const relation of categoryParentQueue) {
      if (relation.categoryId <= 0) {
        continue;
      }

      const parentCategoryId = categoryIdMap.get(normalizeLookupKey(relation.parentKey));
      if (!parentCategoryId || parentCategoryId <= 0 || parentCategoryId === relation.categoryId) {
        addIssue(issues, 'warning', 'category', relation.childSlug, `Parent category "${relation.parentKey}" could not be resolved.`);
        continue;
      }

      await c.env.DB.prepare('UPDATE categories SET parent_id = ? WHERE id = ?')
        .bind(parentCategoryId, relation.categoryId)
        .run();
    }

    for (const relation of pageParentQueue) {
      if (relation.postId <= 0) {
        continue;
      }

      const parentPost = await c.env.DB.prepare('SELECT id FROM posts WHERE slug = ? AND post_type = ?')
        .bind(relation.parentKey, 'page')
        .first<{ id: number }>();

      if (!parentPost || parentPost.id === relation.postId) {
        addIssue(issues, 'warning', 'content', relation.childSlug, `Parent page "${relation.parentKey}" could not be resolved.`);
        continue;
      }

      await c.env.DB.prepare('UPDATE posts SET parent_id = ? WHERE id = ?')
        .bind(parentPost.id, relation.postId)
        .run();
    }

    await recountTaxonomyCounts(c.env);
  }

  const settings = await getSiteSettings(c.env);

  return c.json({
    success: true,
    dry_run: dryRun,
    format: normalized.importPackage.format,
    version: normalized.importPackage.version,
    strategy: normalized.options.conflict_strategy,
    source: normalized.importPackage.source || null,
    site: {
      title: settings.site_title || 'CFBlog',
      url: settings.site_url || 'http://localhost:8787'
    },
    summary,
    issues
  });
});

export default imports;
