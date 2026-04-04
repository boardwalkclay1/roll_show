CREATE TABLE IF NOT EXISTS sessions_analytics_bridge (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  analytics_id TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (analytics_id) REFERENCES analytics(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_analytics_session ON sessions_analytics_bridge(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_analytics_analytic ON sessions_analytics_bridge(analytics_id);
