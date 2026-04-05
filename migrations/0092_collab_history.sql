CREATE TABLE IF NOT EXISTS collab_history (
  id TEXT PRIMARY KEY,
  collab_id TEXT NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (collab_id) REFERENCES collabs(id)
);

CREATE INDEX IF NOT EXISTS idx_collab_history_collab ON collab_history(collab_id);
