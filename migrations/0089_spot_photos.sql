CREATE TABLE IF NOT EXISTS spot_photos (
  id TEXT PRIMARY KEY,
  spot_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (spot_id) REFERENCES spots(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_spot_photos_spot ON spot_photos(spot_id);
