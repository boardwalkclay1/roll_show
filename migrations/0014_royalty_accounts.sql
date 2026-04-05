DROP TABLE IF EXISTS royalty_accounts;

CREATE TABLE royalty_accounts (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  balance_cents INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
