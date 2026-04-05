CREATE TABLE IF NOT EXISTS tag_links (
  id TEXT PRIMARY KEY,
  tag_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tag_id) REFERENCES tags(id)
);

CREATE INDEX IF NOT EXISTS idx_tag_links_tag ON tag_links(tag_id);
CREATE INDEX IF NOT EXISTS idx_tag_links_target ON tag_links(target_type, target_id);
