#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const IMPORT_FORMAT = 'cfblog-import';
const IMPORT_VERSION = '1.1';
const ARRAY_KEYS = new Set(['categories', 'tags', 'images', 'media_urls']);
const IMAGE_EXTENSIONS = /\.(avif|bmp|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i;

function printUsage() {
  console.log(`Usage:
  node ./scripts/convert-hugo-content.mjs --posts-dir <dir> --memo-dir <dir> [options]

Options:
  --output <file>       Output JSON path. Default: ./hugoblog-import.json
  --site-name <name>    Source site name. Default: Hugo Blog
  --site-url <url>      Source site URL. Default: empty
  --help                Show this help
`);
}

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

async function collectMarkdownFiles(rootDir) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectMarkdownFiles(fullPath));
      continue;
    }

    if (entry.isFile() && /\.md$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  files.sort((left, right) => left.localeCompare(right, 'en'));
  return files;
}

function parseFrontMatter(rawText) {
  const text = rawText.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const lines = text.split('\n');

  if (lines[0]?.trim() !== '---') {
    return {
      data: {},
      content: text.trim(),
    };
  }

  let endIndex = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === '---') {
      endIndex = index;
      break;
    }
  }

  if (endIndex === -1) {
    return {
      data: {},
      content: text.trim(),
    };
  }

  const frontMatterText = lines.slice(1, endIndex).join('\n');
  const content = lines.slice(endIndex + 1).join('\n').replace(/^\s+/, '').trim();

  return {
    data: parseSimpleYaml(frontMatterText),
    content,
  };
}

function parseSimpleYaml(frontMatterText) {
  const result = {};
  const lines = frontMatterText.split('\n');
  let currentKey = null;

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    const listMatch = line.match(/^\s*-\s*(.+?)\s*$/);
    if (listMatch && currentKey) {
      if (!Array.isArray(result[currentKey])) {
        result[currentKey] = [];
      }
      result[currentKey].push(parseScalar(listMatch[1]));
      continue;
    }

    const keyMatch = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!keyMatch) {
      continue;
    }

    const [, key, rawValue] = keyMatch;
    if (!rawValue.trim()) {
      result[key] = ARRAY_KEYS.has(key) ? [] : '';
      currentKey = key;
      continue;
    }

    result[key] = parseScalar(rawValue.trim());
    currentKey = Array.isArray(result[key]) ? key : null;
  }

  return result;
}

function parseScalar(rawValue) {
  const value = rawValue.trim();

  if (!value) {
    return '';
  }

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  if (value.startsWith('[') && value.endsWith(']')) {
    return splitInlineArray(value.slice(1, -1)).map((item) => parseScalar(item));
  }

  if (/^(true|false)$/i.test(value)) {
    return value.toLowerCase() === 'true';
  }

  return value;
}

function splitInlineArray(text) {
  const items = [];
  let current = '';
  let quote = '';

  for (const char of text) {
    if ((char === '"' || char === "'") && (!quote || quote === char)) {
      quote = quote ? '' : char;
      current += char;
      continue;
    }

    if (char === ',' && !quote) {
      if (current.trim()) {
        items.push(current.trim());
      }
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    items.push(current.trim());
  }

  return items;
}

function slugifyText(value, fallbackPrefix, fallbackIndex) {
  const text = String(value || '').trim();
  const asciiSlug = text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (asciiSlug) {
    return asciiSlug;
  }

  if (text) {
    const unicodeSlug = Array.from(text)
      .map((char) => char.codePointAt(0)?.toString(16))
      .filter(Boolean)
      .join('-')
      .slice(0, 120);

    if (unicodeSlug) {
      return `u-${unicodeSlug}`;
    }
  }

  return `${fallbackPrefix}-${fallbackIndex}`;
}

function ensureUniqueSlug(slug, usedSlugs) {
  let candidate = slug;
  let counter = 1;

  while (usedSlugs.has(candidate)) {
    candidate = `${slug}-${counter}`;
    counter += 1;
  }

  usedSlugs.add(candidate);
  return candidate;
}

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeDate(value, fallback) {
  const text = String(value || '').trim();
  if (!text) {
    return fallback;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toISOString();
}

function normalizePostStatus(frontMatter) {
  const explicitStatus = String(frontMatter.status ?? '').trim().toLowerCase();
  if (['publish', 'draft', 'pending', 'private', 'trash'].includes(explicitStatus)) {
    return explicitStatus;
  }

  const isDraft = String(frontMatter.draft ?? '').trim().toLowerCase() === 'true';
  const isPublished = String(frontMatter.published ?? '').trim().toLowerCase();
  if (isDraft || isPublished === 'false') {
    return 'draft';
  }

  return 'publish';
}

function normalizeMomentStatus(frontMatter) {
  const explicitStatus = String(frontMatter.status ?? '').trim().toLowerCase();
  if (['publish', 'draft', 'trash'].includes(explicitStatus)) {
    return explicitStatus;
  }

  const isDraft = String(frontMatter.draft ?? '').trim().toLowerCase() === 'true';
  const isPublished = String(frontMatter.published ?? '').trim().toLowerCase();
  if (isDraft || isPublished === 'false') {
    return 'draft';
  }

  return 'publish';
}

function extractReferenceMap(markdown) {
  const map = new Map();
  const referencePattern = /^\s*\[([^\]]+)\]:\s*(\S+)\s*$/gm;

  for (const match of markdown.matchAll(referencePattern)) {
    map.set(match[1].trim().toLowerCase(), match[2].trim());
  }

  return map;
}

function stripReferenceDefinitions(markdown) {
  return markdown.replace(/^\s*\[[^\]]+\]:\s*\S+\s*$/gm, '').trim();
}

function extractMarkdownTarget(rawTarget) {
  const value = String(rawTarget || '').trim();
  if (!value) {
    return '';
  }

  const withoutAngles = value.startsWith('<') && value.endsWith('>')
    ? value.slice(1, -1)
    : value;

  const match = withoutAngles.match(/^(\S+?)(?:\s+["'(].*)?$/);
  return (match ? match[1] : withoutAngles).trim();
}

function isImageUrl(url) {
  return IMAGE_EXTENSIONS.test(url);
}

function extractAllMarkdownImageUrls(markdown) {
  const referenceMap = extractReferenceMap(markdown);
  const urls = [];

  for (const match of markdown.matchAll(/!\[[^\]]*]\(([^)]+)\)/g)) {
    const url = extractMarkdownTarget(match[1]);
    if (url) {
      urls.push(url);
    }
  }

  for (const match of markdown.matchAll(/!\[[^\]]*]\[([^\]]+)\]/g)) {
    const url = referenceMap.get(match[1].trim().toLowerCase());
    if (url) {
      urls.push(url);
    }
  }

  return Array.from(new Set(urls));
}

function pickFeaturedImage(frontMatter, markdown) {
  const candidates = [
    frontMatter.cover,
    frontMatter.featured,
    frontMatter.featured_image,
    ...toStringArray(frontMatter.images),
    ...extractAllMarkdownImageUrls(markdown),
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  return candidates.find((item) => /^https?:\/\//i.test(item)) || '';
}

function stripMarkdownForExcerpt(markdown) {
  return markdown
    .replace(/^\s*\[[^\]]+\]:\s*\S+\s*$/gm, ' ')
    .replace(/!\[[^\]]*]\(([^)]+)\)/g, ' ')
    .replace(/!\[[^\]]*]\[[^\]]+]/g, ' ')
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, '$1')
    .replace(/<((?:https?|mailto):[^>]+)>/g, '$1')
    .replace(/[`*_>#~\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildExcerpt(frontMatter, markdown) {
  const preferred = String(frontMatter.description || frontMatter.summary || frontMatter.excerpt || '').trim();
  if (preferred) {
    return preferred;
  }

  const plainText = stripMarkdownForExcerpt(markdown);
  return plainText.slice(0, 180);
}

function normalizeMomentBody(markdown, fallbackTitle) {
  const referenceMap = extractReferenceMap(markdown);
  const mediaUrls = [];
  let content = stripReferenceDefinitions(markdown);

  content = content.replace(/!\[[^\]]*]\(([^)]+)\)/g, (_match, target) => {
    const url = extractMarkdownTarget(target);
    if (!url) {
      return '';
    }

    if (isImageUrl(url)) {
      mediaUrls.push(url);
      return '';
    }

    return url;
  });

  content = content.replace(/!\[[^\]]*]\[([^\]]+)\]/g, (_match, label) => {
    const url = referenceMap.get(String(label).trim().toLowerCase()) || '';
    if (!url) {
      return '';
    }

    if (isImageUrl(url)) {
      mediaUrls.push(url);
      return '';
    }

    return url;
  });

  content = content.replace(/\[([^\]]+)]\(([^)]+)\)/g, (_match, text, target) => {
    const label = String(text || '').trim();
    const url = extractMarkdownTarget(target);
    if (!label) {
      return url;
    }

    if (!url || label === url || label.startsWith('#') || label.startsWith('@')) {
      return label || url;
    }

    return `${label} ${url}`;
  });

  content = content
    .replace(/<((?:https?|mailto):[^>]+)>/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!content) {
    content = String(fallbackTitle || '').trim();
  }

  return {
    content,
    mediaUrls: Array.from(new Set(mediaUrls)),
  };
}

function buildSourceUrl(siteUrl, type, relativeId, slug) {
  const base = String(siteUrl || '').trim().replace(/\/$/, '');
  if (!base) {
    return '';
  }

  if (type === 'post') {
    return `${base}/${encodeURIComponent(slug)}`;
  }

  return `${base}/talking#${encodeURIComponent(relativeId)}`;
}

function registerTerms(map, values, usedSlugs) {
  for (const name of values) {
    if (!map.has(name)) {
      const slug = ensureUniqueSlug(slugifyText(name, 'term', map.size + 1), usedSlugs);
      map.set(name, {
        name,
        slug,
      });
    }
  }
}

function buildImportPackage({ postsDir, memoDir, postFiles, memoFiles, siteName, siteUrl }) {
  const usedPostSlugs = new Set();
  const usedCategorySlugs = new Set();
  const usedTagSlugs = new Set();
  const categories = new Map();
  const tags = new Map();
  const content = [];
  const moments = [];
  const exportedAt = new Date().toISOString();

  for (let index = 0; index < postFiles.length; index += 1) {
    const file = postFiles[index];
    const raw = file.raw;
    const frontMatter = raw.data;
    const relativePath = path.relative(postsDir, file.path).replace(/\\/g, '/');
    const basename = path.basename(file.path, path.extname(file.path));
    const title = String(frontMatter.title || basename).trim() || basename;
    const baseSlug = slugifyText(frontMatter.slug || basename || title, 'post', index + 1);
    const slug = ensureUniqueSlug(baseSlug, usedPostSlugs);
    const categoriesList = toStringArray(frontMatter.categories);
    const tagsList = toStringArray(frontMatter.tags);
    const now = exportedAt;
    const createdAt = normalizeDate(frontMatter.date, now);
    const updatedAt = normalizeDate(frontMatter.lastmod || frontMatter.updated_at, createdAt);
    const status = normalizePostStatus(frontMatter);

    registerTerms(categories, categoriesList, usedCategorySlugs);
    registerTerms(tags, tagsList, usedTagSlugs);

    content.push({
      type: 'post',
      title,
      slug,
      content: raw.content,
      excerpt: buildExcerpt(frontMatter, raw.content),
      status,
      created_at: createdAt,
      updated_at: updatedAt,
      published_at: status === 'publish' ? createdAt : null,
      comment_status: 'open',
      sticky: false,
      featured_image_url: pickFeaturedImage(frontMatter, raw.content) || undefined,
      categories: categoriesList.map((name) => categories.get(name).slug),
      tags: tagsList.map((name) => tags.get(name).slug),
      source: {
        id: `posts/${relativePath}`,
        url: buildSourceUrl(siteUrl, 'post', relativePath, slug),
      },
    });
  }

  for (let index = 0; index < memoFiles.length; index += 1) {
    const file = memoFiles[index];
    const raw = file.raw;
    const frontMatter = raw.data;
    const relativePath = path.relative(memoDir, file.path).replace(/\\/g, '/');
    const basename = path.basename(file.path, path.extname(file.path));
    const title = String(frontMatter.title || basename).trim() || basename;
    const normalizedMoment = normalizeMomentBody(raw.content, title);
    const now = exportedAt;
    const createdAt = normalizeDate(frontMatter.date, now);
    const updatedAt = normalizeDate(frontMatter.lastmod || frontMatter.updated_at, createdAt);

    moments.push({
      content: normalizedMoment.content,
      status: normalizeMomentStatus(frontMatter),
      created_at: createdAt,
      updated_at: updatedAt,
      media_urls: normalizedMoment.mediaUrls,
      source: {
        id: `memo/${relativePath}`,
        url: buildSourceUrl(siteUrl, 'moment', relativePath, basename),
      },
    });
  }

  return {
    format: IMPORT_FORMAT,
    version: IMPORT_VERSION,
    source: {
      platform: 'hugo',
      site_name: siteName,
      site_url: siteUrl,
      exported_at: exportedAt,
      generator: 'cfblog-hugo-converter/1.0.0',
    },
    categories: Array.from(categories.values()).sort((left, right) => left.name.localeCompare(right.name, 'zh')),
    tags: Array.from(tags.values()).sort((left, right) => left.name.localeCompare(right.name, 'zh')),
    content,
    moments,
  };
}

async function readMarkdownFile(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  return {
    path: filePath,
    raw: parseFrontMatter(text),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    process.exit(0);
  }

  const postsDirArg = args['posts-dir'];
  const memoDirArg = args['memo-dir'];
  if (!postsDirArg || !memoDirArg) {
    printUsage();
    process.exit(1);
  }

  const postsDir = path.resolve(String(postsDirArg));
  const memoDir = path.resolve(String(memoDirArg));
  const outputPath = path.resolve(String(args.output || path.join(process.cwd(), 'hugoblog-import.json')));
  const siteName = String(args['site-name'] || 'Hugo Blog').trim() || 'Hugo Blog';
  const siteUrl = String(args['site-url'] || '').trim();

  const [postPaths, memoPaths] = await Promise.all([
    collectMarkdownFiles(postsDir),
    collectMarkdownFiles(memoDir),
  ]);

  const [postFiles, memoFiles] = await Promise.all([
    Promise.all(postPaths.map((filePath) => readMarkdownFile(filePath))),
    Promise.all(memoPaths.map((filePath) => readMarkdownFile(filePath))),
  ]);

  const importPackage = buildImportPackage({
    postsDir,
    memoDir,
    postFiles,
    memoFiles,
    siteName,
    siteUrl,
  });

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(importPackage, null, 2)}\n`, 'utf8');

  console.log(`Wrote import file: ${outputPath}`);
  console.log(`Posts: ${importPackage.content.length}`);
  console.log(`Moments: ${importPackage.moments.length}`);
  console.log(`Categories: ${importPackage.categories.length}`);
  console.log(`Tags: ${importPackage.tags.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
