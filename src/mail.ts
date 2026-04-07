import type { Comment, Env } from './types';
import { getSiteSettings, normalizeBaseUrl } from './utils';

interface MailMessage {
  to: string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  idempotencyKey: string;
}

interface CommentNotificationContext {
  comment: Pick<Comment, 'id' | 'author_name' | 'author_email' | 'content' | 'created_at' | 'parent_id' | 'status'>;
  parentComment?: Pick<Comment, 'id' | 'author_name' | 'author_email' | 'content'> | null;
  post: {
    id: number;
    slug?: string | null;
    title?: string | null;
  };
  commentLink: string;
}

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

function isSettingEnabled(value: unknown): boolean {
  return TRUE_VALUES.has(String(value ?? '').trim().toLowerCase());
}

function isValidEmail(value: unknown): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? '').trim());
}

function normalizeEmail(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripTags(value: unknown): string {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function formatFromAddress(name: string, email: string): string {
  const safeName = name.replace(/[<>\r\n"]/g, '').trim();
  return safeName ? `${safeName} <${email}>` : email;
}

function buildEmailLayout(
  siteTitle: string,
  heading: string,
  bodyHtml: string,
  actionLabel: string,
  actionUrl: string,
): string {
  const safeSiteTitle = escapeHtml(siteTitle);
  const safeHeading = escapeHtml(heading);
  const safeActionLabel = escapeHtml(actionLabel);
  const safeActionUrl = escapeHtml(actionUrl);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeHeading}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;">
    <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
        <div style="padding:24px 24px 12px;background:#111827;color:#ffffff;">
          <div style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.72;">${safeSiteTitle}</div>
          <h1 style="margin:12px 0 0;font-size:24px;line-height:1.35;font-weight:700;">${safeHeading}</h1>
        </div>
        <div style="padding:24px;">
          ${bodyHtml}
          <div style="margin-top:28px;">
            <a href="${safeActionUrl}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#111827;color:#ffffff;text-decoration:none;font-weight:600;">
              ${safeActionLabel}
            </a>
          </div>
        </div>
      </div>
      <p style="margin:16px 8px 0;color:#6b7280;font-size:12px;line-height:1.6;">
        This message was sent by ${safeSiteTitle}. If the button above does not work, open: ${safeActionUrl}
      </p>
    </div>
  </body>
</html>`;
}

async function sendResendEmail(
  env: Env,
  fromName: string,
  fromEmail: string,
  message: MailMessage,
): Promise<void> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[Mail] Skipped sending email: RESEND_API_KEY is not configured.');
    return;
  }

  const payload: Record<string, unknown> = {
    from: formatFromAddress(fromName, fromEmail),
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
  };

  if (message.replyTo) {
    payload.reply_to = message.replyTo;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': message.idempotencyKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error ${response.status}: ${errorText}`);
  }
}

export async function sendCommentNotifications(
  env: Env,
  context: CommentNotificationContext,
): Promise<void> {
  try {
    if (String(context.comment.status || 'approved') !== 'approved') {
      return;
    }

    const settings = await getSiteSettings(env);
    if (!isSettingEnabled(settings.mail_notifications_enabled)) {
      return;
    }

    const fromEmail = String(settings.mail_from_email || '').trim();
    if (!isValidEmail(fromEmail)) {
      console.warn('[Mail] Skipped sending email: mail_from_email is missing or invalid.');
      return;
    }

    const siteTitle = String(settings.site_title || 'CFBlog').trim() || 'CFBlog';
    const siteUrl = normalizeBaseUrl(String(settings.site_url || 'http://localhost:8787'));
    const fromName = String(settings.mail_from_name || siteTitle).trim() || siteTitle;
    const adminEmail = String(settings.admin_email || '').trim();
    const postTitle = String(context.post.title || 'Untitled post').trim() || 'Untitled post';
    const commentAuthorName = String(context.comment.author_name || 'A visitor').trim() || 'A visitor';
    const commentAuthorEmail = String(context.comment.author_email || '').trim();
    const commentExcerpt = truncate(stripTags(context.comment.content), 360);
    const fallbackLink = context.post.slug
      ? `${siteUrl}/${String(context.post.slug).trim()}#comment-${context.comment.id}`
      : `${siteUrl}/posts/${context.post.id}#comment-${context.comment.id}`;
    const commentLink = String(context.commentLink || '').trim() || fallbackLink;
    const isReply = Number(context.comment.parent_id || 0) > 0;

    let adminRecipientNormalized = '';
    const shouldNotifyAdmin =
      isSettingEnabled(settings.notify_admin_on_comment) && isValidEmail(adminEmail);

    if (shouldNotifyAdmin) {
      adminRecipientNormalized = normalizeEmail(adminEmail);
      const adminHeading = isReply ? 'A new reply was posted' : 'A new comment was posted';
      const adminSubject = isReply
        ? `[${siteTitle}] New reply on "${postTitle}"`
        : `[${siteTitle}] New comment on "${postTitle}"`;
      const adminBodyHtml = `
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">
          <strong>${escapeHtml(commentAuthorName)}</strong> left ${isReply ? 'a reply' : 'a comment'} on
          <strong>${escapeHtml(postTitle)}</strong>.
        </p>
        <div style="padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;">
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Author</p>
          <p style="margin:0 0 12px;font-size:15px;">${escapeHtml(commentAuthorName)}${commentAuthorEmail ? ` (${escapeHtml(commentAuthorEmail)})` : ''}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Submitted at</p>
          <p style="margin:0 0 12px;font-size:15px;">${escapeHtml(context.comment.created_at)}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Content</p>
          <blockquote style="margin:0;padding:12px 16px;border-left:4px solid #d1d5db;background:#ffffff;color:#111827;">
            ${escapeHtml(commentExcerpt)}
          </blockquote>
        </div>
      `;
      const adminText = [
        `${commentAuthorName} left ${isReply ? 'a reply' : 'a comment'} on "${postTitle}".`,
        '',
        `Author: ${commentAuthorName}${commentAuthorEmail ? ` (${commentAuthorEmail})` : ''}`,
        `Submitted at: ${context.comment.created_at}`,
        '',
        'Content:',
        commentExcerpt,
        '',
        `View: ${commentLink}`,
      ].join('\n');

      await sendResendEmail(env, fromName, fromEmail, {
        to: [adminEmail],
        subject: adminSubject,
        html: buildEmailLayout(siteTitle, adminHeading, adminBodyHtml, 'View Comment', commentLink),
        text: adminText,
        replyTo: isValidEmail(commentAuthorEmail) ? commentAuthorEmail : undefined,
        idempotencyKey: `comment-admin-${context.comment.id}`,
      });
    }

    const replyTargetEmail = String(context.parentComment?.author_email || '').trim();
    const shouldNotifyCommenter =
      isReply &&
      !!context.parentComment &&
      isSettingEnabled(settings.notify_commenter_on_reply) &&
      isValidEmail(replyTargetEmail);

    if (!shouldNotifyCommenter) {
      return;
    }

    if (normalizeEmail(replyTargetEmail) === normalizeEmail(commentAuthorEmail)) {
      return;
    }

    if (
      adminRecipientNormalized &&
      normalizeEmail(replyTargetEmail) === adminRecipientNormalized &&
      shouldNotifyAdmin
    ) {
      return;
    }

    const parentAuthorName =
      String(context.parentComment?.author_name || 'there').trim() || 'there';
    const parentExcerpt = truncate(stripTags(context.parentComment?.content), 220);
    const replyHeading = 'Someone replied to your comment';
    const replySubject = `[${siteTitle}] New reply to your comment on "${postTitle}"`;
    const replyBodyHtml = `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">
        <strong>${escapeHtml(commentAuthorName)}</strong> replied to your comment on
        <strong>${escapeHtml(postTitle)}</strong>.
      </p>
      <div style="padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;">
        <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Your comment</p>
        <blockquote style="margin:0 0 16px;padding:12px 16px;border-left:4px solid #d1d5db;background:#ffffff;color:#111827;">
          ${escapeHtml(parentExcerpt)}
        </blockquote>
        <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">New reply</p>
        <blockquote style="margin:0;padding:12px 16px;border-left:4px solid #111827;background:#ffffff;color:#111827;">
          ${escapeHtml(commentExcerpt)}
        </blockquote>
      </div>
      <p style="margin:16px 0 0;font-size:14px;color:#4b5563;">
        Hi ${escapeHtml(parentAuthorName)}, you can continue the conversation from the page below.
      </p>
    `;
    const replyText = [
      `${commentAuthorName} replied to your comment on "${postTitle}".`,
      '',
      'Your comment:',
      parentExcerpt,
      '',
      'New reply:',
      commentExcerpt,
      '',
      `View the discussion: ${commentLink}`,
    ].join('\n');

    await sendResendEmail(env, fromName, fromEmail, {
      to: [replyTargetEmail],
      subject: replySubject,
      html: buildEmailLayout(siteTitle, replyHeading, replyBodyHtml, 'View Reply', commentLink),
      text: replyText,
      idempotencyKey: `comment-reply-${context.comment.id}`,
    });
  } catch (error) {
    console.error('[Mail] Failed to send comment notifications:', error);
  }
}
