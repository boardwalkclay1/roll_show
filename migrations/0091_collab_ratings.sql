CREATE TABLE IF NOT EXISTS collab_ratings (
  id TEXT PRIMARY KEY,
  collab_id TEXT NOT NULL,
  from_user TEXT NOT NULL,
  to_user TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (collab_id) REFERENCES collabs(id),
  FOREIGN KEY (from_user) REFERENCES users(id),
  FOREIGN KEY (to_user) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_collab_ratings_collab ON collab_ratings(collab_id);
