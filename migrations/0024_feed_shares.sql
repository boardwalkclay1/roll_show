CREATE TABLE feed_shares (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,

  FOREIGN KEY (post_id) REFERENCES feed_posts(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
