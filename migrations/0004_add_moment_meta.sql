CREATE TABLE IF NOT EXISTS moment_meta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    moment_id INTEGER NOT NULL,
    meta_key TEXT NOT NULL,
    meta_value TEXT,
    FOREIGN KEY (moment_id) REFERENCES moments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_moment_meta_key ON moment_meta(moment_id, meta_key);
