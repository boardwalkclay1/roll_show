CREATE TABLE IF NOT EXISTS feed_impressions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  post_id TEXT NOT NULL,
  source TEXT, -- home, profile, search, etc.
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (post_id) REFERENCES feed_posts(id)
);

CREATE INDEX IF NOT EXISTS idx_feed_impressions_post ON feed_impressions(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_impressions_user ON feed_impressions(user_id);
