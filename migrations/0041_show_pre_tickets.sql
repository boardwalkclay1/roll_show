DROP TABLE IF EXISTS show_pre_tickets;

CREATE TABLE show_pre_tickets (
  id TEXT PRIMARY KEY,
  show_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,

  status TEXT NOT NULL DEFAULT 'reserved',
  -- reserved | charged | refunded

  created_at TEXT NOT NULL,

  FOREIGN KEY (show_id) REFERENCES shows(id),
  FOREIGN KEY (buyer_id) REFERENCES buyer_profiles(id)
);
