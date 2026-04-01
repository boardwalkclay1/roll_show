DROP TABLE IF EXISTS royalty_events;

CREATE TABLE royalty_events (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  direction TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES royalty_accounts(id)
);
