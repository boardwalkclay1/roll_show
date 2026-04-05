CREATE TABLE IF NOT EXISTS error_logs (
  id TEXT PRIMARY KEY,
  context TEXT,
  message TEXT NOT NULL,
  stack TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_error_logs_context ON error_logs(context);
