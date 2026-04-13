import type { Env } from './types';

export type CommentStatus = 'approved' | 'pending' | 'spam';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const DEFAULT_SPAM_KEYWORDS = [
  'telegram',
  'whatsapp',
  'wechat',
  'line',
  'casino',
  'poker',
  'gambling',
  'payday',
  'viagra',
  'cialis',
  'porn',
  'escort',
  'seo service',
  'backlink',
  'crypto pump',
  '博彩',
  '代发',
  '外链',
  '引流',
  '加微',
  '加v',
  '纸飞机',
];

type CommentTable = 'comments' | 'moment_comments';
type ResourceColumn = 'post_id' | 'moment_id';

export interface CommentProtectionSettings {
  firstCommentModeration: boolean;
  maxLinks: number;
  rateLimitMaxPerEmail: number;
  rateLimitMaxPerIp: number;
  rateLimitSeconds: number;
  rateLimitWindowMinutes: number;
  spamKeywords: string[];
  turnstileEnabled: boolean;
  turnstileSecretKey: string;
  turnstileSiteKey: string;
}

export interface ModerateCommentInput {
  authorEmail: string;
  authorIp: string;
  authorUrl?: string;
  content: string;
  env: Env;
  honeypot?: string;
  resourceColumn: ResourceColumn;
  resourceId: number;
  settings: Record<string, any>;
  table: CommentTable;
  turnstileToken?: string;
  userId: number | null;
}

export interface ModerateCommentResult {
  errorMessage?: string;
  errorStatus?: number;
  status?: CommentStatus;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parsePositiveInt(value: unknown, fallback: number): number {
  const parsed = parseInt(String(value ?? '').trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function normalizeEmail(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

export function getRequestIp(c: any): string {
  const rawIp =
    c.req.header('CF-Connecting-IP') ||
    c.req.header('cf-connecting-ip') ||
    c.req.header('X-Forwarded-For') ||
    c.req.header('x-forwarded-for') ||
    c.req.header('X-Real-IP') ||
    c.req.header('x-real-ip') ||
    '';

  return String(rawIp)
    .split(',')[0]
    .trim();
}

export function getCommentProtectionSettings(rawSettings: Record<string, any>): CommentProtectionSettings {
  const turnstileSiteKey = String(rawSettings.comment_turnstile_site_key || '').trim();
  const turnstileSecretKey = String(rawSettings.comment_turnstile_secret_key || '').trim();
  const configuredKeywords = String(rawSettings.comment_spam_keywords || '')
    .split(/[\n,]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return {
    firstCommentModeration: parseBoolean(rawSettings.comment_moderation_first_comment, true),
    maxLinks: parsePositiveInt(rawSettings.comment_max_links, 2),
    rateLimitMaxPerEmail: 3,
    rateLimitMaxPerIp: 1,
    rateLimitSeconds: parsePositiveInt(rawSettings.comment_rate_limit_seconds, 30),
    rateLimitWindowMinutes: 10,
    spamKeywords: [...new Set([...DEFAULT_SPAM_KEYWORDS, ...configuredKeywords])],
    turnstileEnabled:
      parseBoolean(rawSettings.comment_turnstile_enabled, false) &&
      !!turnstileSiteKey &&
      !!turnstileSecretKey,
    turnstileSecretKey,
    turnstileSiteKey,
  };
}

export function getPublicCommentProtectionSettings(rawSettings: Record<string, any>) {
  const settings = getCommentProtectionSettings(rawSettings);

  return {
    turnstileEnabled: settings.turnstileEnabled,
    turnstileSiteKey: settings.turnstileSiteKey,
  };
}

export function getApprovedStatusDelta(previousStatus: string, nextStatus: string): number {
  const previousApproved = previousStatus === 'approved' ? 1 : 0;
  const nextApproved = nextStatus === 'approved' ? 1 : 0;
  return nextApproved - previousApproved;
}

export async function applyCountDelta(
  env: Env,
  table: 'moments' | 'posts',
  id: number,
  delta: number,
): Promise<void> {
  if (!delta) {
    return;
  }

  await env.DB.prepare(`
    UPDATE ${table}
    SET comment_count = CASE
      WHEN comment_count + ? < 0 THEN 0
      ELSE comment_count + ?
    END
    WHERE id = ?
  `).bind(delta, delta, id).run();
}

function countLinks(content: string): number {
  return (content.match(/\b(?:https?:\/\/|www\.)\S+/gi) || []).length;
}

function containsSpamKeyword(content: string, keywords: string[]): boolean {
  const normalizedContent = content.toLowerCase();
  return keywords.some((keyword) => keyword && normalizedContent.includes(keyword));
}

async function verifyTurnstileToken(token: string, remoteIp: string, secretKey: string): Promise<boolean> {
  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      secret: secretKey,
      response: token,
      remoteip: remoteIp,
    }),
  });

  if (!response.ok) {
    return false;
  }

  const result = await response.json<{ success?: boolean }>();
  return !!result?.success;
}

async function queryCount(
  env: Env,
  table: CommentTable,
  whereClause: string,
  params: any[],
): Promise<number> {
  try {
    const result = await env.DB.prepare(
      `SELECT COUNT(*) AS count FROM ${table} WHERE ${whereClause}`,
    ).bind(...params).first<{ count: number }>();

    return Number(result?.count || 0);
  } catch {
    return 0;
  }
}

async function hasApprovedCommentByEmail(env: Env, normalizedEmail: string): Promise<boolean> {
  if (!normalizedEmail) {
    return false;
  }

  const [postCount, momentCount] = await Promise.all([
    queryCount(
      env,
      'comments',
      `LOWER(author_email) = ? AND status = 'approved'`,
      [normalizedEmail],
    ),
    queryCount(
      env,
      'moment_comments',
      `LOWER(author_email) = ? AND status = 'approved'`,
      [normalizedEmail],
    ),
  ]);

  return postCount > 0 || momentCount > 0;
}

async function isRateLimited(
  env: Env,
  table: CommentTable,
  authorIp: string,
  normalizedEmail: string,
  security: CommentProtectionSettings,
): Promise<boolean> {
  const ipWindowStart = new Date(Date.now() - security.rateLimitSeconds * 1000).toISOString();
  const emailWindowStart = new Date(
    Date.now() - security.rateLimitWindowMinutes * 60 * 1000,
  ).toISOString();

  const [ipCount, emailCount] = await Promise.all([
    authorIp
      ? queryCount(env, table, 'author_ip = ? AND created_at >= ?', [authorIp, ipWindowStart])
      : Promise.resolve(0),
    normalizedEmail
      ? queryCount(
          env,
          table,
          'LOWER(author_email) = ? AND created_at >= ?',
          [normalizedEmail, emailWindowStart],
        )
      : Promise.resolve(0),
  ]);

  return ipCount >= security.rateLimitMaxPerIp || emailCount >= security.rateLimitMaxPerEmail;
}

async function hasDuplicateComment(
  env: Env,
  table: CommentTable,
  resourceColumn: ResourceColumn,
  resourceId: number,
  normalizedEmail: string,
  content: string,
): Promise<boolean> {
  if (!normalizedEmail || !content) {
    return false;
  }

  const duplicateWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const count = await queryCount(
    env,
    table,
    `${resourceColumn} = ? AND LOWER(author_email) = ? AND LOWER(TRIM(content)) = ? AND created_at >= ?`,
    [resourceId, normalizedEmail, content.toLowerCase(), duplicateWindowStart],
  );

  return count > 0;
}

export async function moderateCommentSubmission(
  input: ModerateCommentInput,
): Promise<ModerateCommentResult> {
  const security = getCommentProtectionSettings(input.settings);
  const normalizedEmail = normalizeEmail(input.authorEmail);
  const trimmedContent = String(input.content || '').trim();
  const normalizedAuthorUrl = String(input.authorUrl || '').trim().toLowerCase();

  if (String(input.honeypot || '').trim()) {
    return { status: 'spam' };
  }

  if (!input.userId && security.turnstileEnabled) {
    const token = String(input.turnstileToken || '').trim();
    if (!token) {
      return { errorMessage: '请先完成人机验证。' };
    }

    const verified = await verifyTurnstileToken(token, input.authorIp, security.turnstileSecretKey);
    if (!verified) {
      return { errorMessage: '人机验证失败，请重试。' };
    }
  }

  if (await isRateLimited(input.env, input.table, input.authorIp, normalizedEmail, security)) {
    return {
      errorMessage: `评论提交过于频繁，请在 ${security.rateLimitSeconds} 秒后再试。`,
      errorStatus: 429,
    };
  }

  if (
    await hasDuplicateComment(
      input.env,
      input.table,
      input.resourceColumn,
      input.resourceId,
      normalizedEmail,
      trimmedContent,
    )
  ) {
    return { errorMessage: '请勿重复提交相同评论。' };
  }

  const contentForScan = [trimmedContent, normalizedAuthorUrl].filter(Boolean).join('\n');
  if (countLinks(trimmedContent) > security.maxLinks || containsSpamKeyword(contentForScan, security.spamKeywords)) {
    return { status: 'spam' };
  }

  if (input.userId) {
    return { status: 'approved' };
  }

  if (!security.firstCommentModeration) {
    return { status: 'approved' };
  }

  const hasApprovedHistory = await hasApprovedCommentByEmail(input.env, normalizedEmail);
  return { status: hasApprovedHistory ? 'approved' : 'pending' };
}
