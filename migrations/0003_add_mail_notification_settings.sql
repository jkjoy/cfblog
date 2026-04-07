-- Migration: Add mail notification settings
-- Date: 2026-04-07
-- Description: Add Resend-based comment notification settings

INSERT OR IGNORE INTO site_settings (setting_key, setting_value) VALUES
('mail_notifications_enabled', '0'),
('notify_admin_on_comment', '1'),
('notify_commenter_on_reply', '1'),
('mail_from_name', 'CFBlog'),
('mail_from_email', '');
