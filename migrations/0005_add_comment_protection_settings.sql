-- Migration: Add comment protection settings and indexes
-- Description: Introduce Turnstile, moderation and rate-limit defaults for comments

CREATE INDEX IF NOT EXISTS idx_comments_author_ip_created ON comments(author_ip, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_author_email_created ON comments(author_email, created_at);
CREATE INDEX IF NOT EXISTS idx_moment_comments_author_ip_created ON moment_comments(author_ip, created_at);
CREATE INDEX IF NOT EXISTS idx_moment_comments_author_email_created ON moment_comments(author_email, created_at);

INSERT OR IGNORE INTO site_settings (setting_key, setting_value) VALUES
('comment_turnstile_enabled', '0'),
('comment_turnstile_site_key', ''),
('comment_turnstile_secret_key', ''),
('comment_moderation_first_comment', '1'),
('comment_rate_limit_seconds', '30'),
('comment_max_links', '2'),
('comment_spam_keywords', '');
