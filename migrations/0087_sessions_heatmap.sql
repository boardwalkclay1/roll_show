CREATE TABLE IF NOT EXISTS sessions_heatmap (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  value REAL NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_heatmap_session
  ON sessions_heatmap(session_id);
