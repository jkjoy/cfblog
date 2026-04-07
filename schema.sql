-- WordPress-like Blog System Database Schema
-- 注意：不包含默认用户，需要通过 API 创建

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    display_name TEXT,
    role TEXT DEFAULT 'subscriber' CHECK(role IN ('administrator', 'editor', 'author', 'contributor', 'subscriber')),
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    registered_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_login TEXT,
    avatar_url TEXT,
    bio TEXT
);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    excerpt TEXT,
    slug TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'draft' CHECK(status IN ('publish', 'draft', 'pending', 'private', 'trash')),
    post_type TEXT DEFAULT 'post' CHECK(post_type IN ('post', 'page')),
    author_id INTEGER NOT NULL,
    parent_id INTEGER DEFAULT 0,
    featured_image TEXT,
    featured_media_id INTEGER DEFAULT NULL,
    featured_image_url TEXT DEFAULT NULL,
    comment_status TEXT DEFAULT 'open' CHECK(comment_status IN ('open', 'closed')),
    comment_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    published_at TEXT,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (featured_media_id) REFERENCES media(id) ON DELETE SET NULL
);

-- Categories table (Taxonomy)
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    parent_id INTEGER DEFAULT 0,
    count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Post-Category relationship (many-to-many)
CREATE TABLE IF NOT EXISTS post_categories (
    post_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    PRIMARY KEY (post_id, category_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Post-Tag relationship (many-to-many)
CREATE TABLE IF NOT EXISTS post_tags (
    post_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (post_id, tag_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    parent_id INTEGER DEFAULT 0,
    author_name TEXT NOT NULL,
    author_email TEXT NOT NULL,
    author_url TEXT,
    author_ip TEXT,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('approved', 'pending', 'spam', 'trash')),
    user_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Media table (R2 storage references)
CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    r2_key TEXT UNIQUE NOT NULL,
    url TEXT NOT NULL,
    alt_text TEXT,
    caption TEXT,
    description TEXT,
    width INTEGER,
    height INTEGER,
    author_id INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Settings/Options table
CREATE TABLE IF NOT EXISTS options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    option_name TEXT UNIQUE NOT NULL,
    option_value TEXT,
    autoload TEXT DEFAULT 'yes' CHECK(autoload IN ('yes', 'no'))
);

-- Site Settings table
CREATE TABLE IF NOT EXISTS site_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Link Categories table
CREATE TABLE IF NOT EXISTS link_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Links table (Blogroll/友情链接)
CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    avatar TEXT,
    category_id INTEGER DEFAULT 1,
    target TEXT DEFAULT '_blank' CHECK(target IN ('_blank', '_self')),
    visible TEXT DEFAULT 'yes' CHECK(visible IN ('yes', 'no')),
    rating INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES link_categories(id) ON DELETE SET DEFAULT
);

-- Moments table (社交媒体风格的动态/说说)
-- Similar to Twitter/Weibo posts - short updates with optional media
CREATE TABLE IF NOT EXISTS moments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    author_id INTEGER NOT NULL,
    status TEXT DEFAULT 'publish' CHECK(status IN ('publish', 'draft', 'trash')),
    media_urls TEXT,  -- JSON array of media URLs
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS moment_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    moment_id INTEGER NOT NULL,
    parent_id INTEGER DEFAULT 0,
    author_name TEXT NOT NULL,
    author_email TEXT NOT NULL,
    author_url TEXT,
    author_ip TEXT,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'approved' CHECK(status IN ('approved', 'pending', 'spam', 'trash')),
    user_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (moment_id) REFERENCES moments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Meta tables for extensibility
CREATE TABLE IF NOT EXISTS post_meta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    meta_key TEXT NOT NULL,
    meta_value TEXT,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_meta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    meta_key TEXT NOT NULL,
    meta_value TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(post_type);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published_at);
CREATE INDEX IF NOT EXISTS idx_posts_featured_media ON posts(featured_media_id);
CREATE INDEX IF NOT EXISTS idx_posts_featured_image_url ON posts(featured_image_url);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
CREATE INDEX IF NOT EXISTS idx_media_author ON media(author_id);
CREATE INDEX IF NOT EXISTS idx_media_type ON media(mime_type);
CREATE INDEX IF NOT EXISTS idx_post_meta_key ON post_meta(post_id, meta_key);
CREATE INDEX IF NOT EXISTS idx_user_meta_key ON user_meta(user_id, meta_key);
CREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_links_category ON links(category_id);
CREATE INDEX IF NOT EXISTS idx_links_visible ON links(visible);
CREATE INDEX IF NOT EXISTS idx_links_sort ON links(sort_order);
CREATE INDEX IF NOT EXISTS idx_moments_author ON moments(author_id);
CREATE INDEX IF NOT EXISTS idx_moments_status ON moments(status);
CREATE INDEX IF NOT EXISTS idx_moments_created ON moments(created_at);
CREATE INDEX IF NOT EXISTS idx_moment_comments_moment ON moment_comments(moment_id);
CREATE INDEX IF NOT EXISTS idx_moment_comments_parent ON moment_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_moment_comments_status ON moment_comments(status);

-- Insert default options
INSERT OR IGNORE INTO options (option_name, option_value, autoload) VALUES
('site_title', 'My Blog', 'yes'),
('site_description', 'Just another WordPress-like blog', 'yes'),
('posts_per_page', '10', 'yes'),
('default_comment_status', 'open', 'yes'),
('date_format', 'Y-m-d', 'yes'),
('time_format', 'H:i:s', 'yes'),
('timezone', 'UTC', 'yes');

-- Insert default category
INSERT OR IGNORE INTO categories (name, slug, description)
VALUES ('Uncategorized', 'uncategorized', 'Default category');

-- Insert default link category
INSERT OR IGNORE INTO link_categories (name, slug, description)
VALUES ('Friends', 'friends', 'Friendly links');

-- Insert default site settings
INSERT OR IGNORE INTO site_settings (setting_key, setting_value) VALUES
('site_title', 'CFBlog'),
('site_description', '基于 Cloudflare Workers + D1 + R2 构建的现代化博客系统'),
('site_keywords', 'blog, cloudflare, workers, vue3, typescript'),
('site_author', 'CFBlog'),
('mail_notifications_enabled', '0'),
('notify_admin_on_comment', '1'),
('notify_commenter_on_reply', '1'),
('mail_from_name', 'CFBlog'),
('mail_from_email', ''),
('site_favicon', ''),
('site_logo', ''),
('site_notice', ''),
('social_telegram', ''),
('social_x', ''),
('social_mastodon', ''),
('social_email', ''),
('social_qq', ''),
('site_icp', ''),
('site_footer_text', '© 2024 CFBlog. Powered by Cloudflare Workers.'),
('head_html', ''),
('webhook_url', ''),
('webhook_secret', ''),
('webhook_events', 'post.created,post.updated,post.published,post.deleted,comment.created,comment.updated,comment.deleted');
