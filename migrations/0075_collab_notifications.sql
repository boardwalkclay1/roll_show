CREATE TABLE IF NOT EXISTS collab_notifications (
  id TEXT PRIMARY KEY,
  collab_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL, -- request, accepted, declined, message, result
  message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (collab_id) REFERENCES collabs(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_collab_notifications_user ON collab_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_collab_notifications_collab ON collab_notifications(collab_id);
