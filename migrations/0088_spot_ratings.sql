CREATE TABLE IF NOT EXISTS spot_ratings (
  id TEXT PRIMARY KEY,
  spot_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (spot_id) REFERENCES spots(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_spot_ratings_spot ON spot_ratings(spot_id);
CREATE INDEX IF NOT EXISTS idx_spot_ratings_user ON spot_ratings(user_id);
