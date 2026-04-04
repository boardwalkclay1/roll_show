CREATE TABLE IF NOT EXISTS collabs (
  id TEXT PRIMARY KEY,
  from_user TEXT NOT NULL,
  to_user TEXT NOT NULL,
  type TEXT NOT NULL, -- inperson | stitch
  status TEXT DEFAULT 'pending',
  message TEXT,
  spot TEXT,
  date TEXT,
  time TEXT,
  deadline TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_user) REFERENCES users(id),
  FOREIGN KEY (to_user) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_collabs_from ON collabs(from_user);
CREATE INDEX IF NOT EXISTS idx_collabs_to ON collabs(to_user);
