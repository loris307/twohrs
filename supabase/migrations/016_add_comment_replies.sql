-- Add parent_comment_id for one-level comment replies
ALTER TABLE comments
  ADD COLUMN parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE;

-- Index for efficient reply lookups
CREATE INDEX idx_comments_parent_comment_id
  ON comments (parent_comment_id)
  WHERE parent_comment_id IS NOT NULL;
