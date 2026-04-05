CREATE TABLE IF NOT EXISTS spot_reviews (
  id TEXT PRIMARY KEY,
  spot_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT,
  body TEXT,
  rating INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (spot_id) REFERENCES spots(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_spot_reviews_spot ON spot_reviews(spot_id);
CREATE INDEX IF NOT EXISTS idx_spot_reviews_user ON spot_reviews(user_id);
