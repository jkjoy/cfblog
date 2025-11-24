-- Migration: Add sticky field to posts table
-- Date: 2024-11-24
-- Description: Add sticky column to support pinned posts feature

-- Add sticky column to posts table
ALTER TABLE posts ADD COLUMN sticky INTEGER DEFAULT 0;

-- Create index for sticky field to improve query performance
CREATE INDEX IF NOT EXISTS idx_posts_sticky ON posts(sticky);
