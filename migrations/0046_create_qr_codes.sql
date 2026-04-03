CREATE TABLE qr_codes (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  type TEXT NOT NULL,
  target_id TEXT,
  tracking_mode TEXT DEFAULT 'none',
  expiration_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
