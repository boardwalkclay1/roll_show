/* ============================
   BUYERS (PROFILE)
============================ */
DROP TABLE IF EXISTS buyers;

CREATE TABLE buyers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  state TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

/* ============================
   TICKETS
============================ */
DROP TABLE IF EXISTS tickets;

CREATE TABLE tickets (
  id TEXT PRIMARY KEY,
  show_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  qr_code TEXT NOT NULL,
  stamp TEXT,
  status TEXT NOT NULL,            -- pending | paid | canceled
  created_at TEXT NOT NULL,
  FOREIGN KEY (buyer_id) REFERENCES users(id)
);

/* ============================
   PURCHASES
============================ */
DROP TABLE IF EXISTS purchases;

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
