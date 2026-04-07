-- Migration: Add moment comments table
-- Date: 2026-04-06
-- Description: Support threaded comments for moments/talking page

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

CREATE INDEX IF NOT EXISTS idx_moment_comments_moment ON moment_comments(moment_id);
CREATE INDEX IF NOT EXISTS idx_moment_comments_parent ON moment_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_moment_comments_status ON moment_comments(status);
