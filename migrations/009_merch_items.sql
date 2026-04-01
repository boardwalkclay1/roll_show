CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  password TEXT,
  role TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS shows (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  price_cents INTEGER,
  thumbnail TEXT,
  premiere_date TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  show_id TEXT,
  buyer_id TEXT,
  qr_code TEXT,
  stamp TEXT,
  status TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  buyer_id TEXT,
  ticket_id TEXT,
  amount_cents INTEGER,
  partner_transaction_id TEXT,
  created_at TEXT
);
