CREATE TABLE IF NOT EXISTS feed_views (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (post_id) REFERENCES feed_posts(id)
);

CREATE INDEX IF NOT EXISTS idx_feed_views_user ON feed_views(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_views_post ON feed_views(post_id);
