CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL, -- buyer | skater | admin
  phone TEXT,
  city TEXT,
  state TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE skaters (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  bio TEXT,
  discipline TEXT,
  profile_image TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE shows (
  id TEXT PRIMARY KEY,
  skater_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  thumbnail TEXT,
  video_url TEXT,
  premiere_date TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (skater_id) REFERENCES skaters(id)
);

CREATE TABLE tickets (
  id TEXT PRIMARY KEY,
  show_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  qr_code TEXT NOT NULL,
  stamp TEXT,
  status TEXT NOT NULL, -- pending | paid | canceled
  created_at TEXT NOT NULL,
  FOREIGN KEY (show_id) REFERENCES shows(id),
  FOREIGN KEY (buyer_id) REFERENCES users(id)
);

CREATE TABLE purchases (
  id TEXT PRIMARY KEY,
  buyer_id TEXT NOT NULL,
  ticket_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  partner_transaction_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (buyer_id) REFERENCES users(id),
  FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

CREATE TABLE payouts (
  id TEXT PRIMARY KEY,
  skater_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL, -- pending | paid | failed
  created_at TEXT NOT NULL,
  FOREIGN KEY (skater_id) REFERENCES skaters(id)
);
