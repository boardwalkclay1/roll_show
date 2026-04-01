DROP TABLE IF EXISTS qr_links;

CREATE TABLE qr_links (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,

  target_type TEXT NOT NULL,
  -- profile | campaign | merch | show | skate_card | offering

  target_id TEXT NOT NULL,
  qr_image_url TEXT NOT NULL,

  created_at TEXT NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id)
);
