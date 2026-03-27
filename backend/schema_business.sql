/* ============================
   BUSINESSES (PROFILE)
============================ */
DROP TABLE IF EXISTS businesses;

CREATE TABLE businesses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_name TEXT,
  website TEXT,
  verified INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

/* ============================
   BUSINESS REQUESTS
============================ */
DROP TABLE IF EXISTS business_requests;

CREATE TABLE business_requests (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  website TEXT,
  description TEXT,
  created_at TEXT NOT NULL
);

/* ============================
   UNIVERSAL OFFERS
============================ */
DROP TABLE IF EXISTS offers;

CREATE TABLE offers (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  type TEXT NOT NULL,              -- brand | music | collab | lesson | custom
  amount_cents INTEGER,
  terms TEXT,
  status TEXT NOT NULL,            -- pending | accepted | rejected | withdrawn
  created_at TEXT NOT NULL,
  FOREIGN KEY (from_user_id) REFERENCES users(id),
  FOREIGN KEY (to_user_id) REFERENCES users(id)
);

/* ============================
   OFFER MESSAGES (NEGOTIATION)
============================ */
DROP TABLE IF EXISTS offer_messages;

CREATE TABLE offer_messages (
  id TEXT PRIMARY KEY,
  offer_id TEXT NOT NULL,
  sender_user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (offer_id) REFERENCES offers(id),
  FOREIGN KEY (sender_user_id) REFERENCES users(id)
);

/* ============================
   CONTRACTS
============================ */
DROP TABLE IF EXISTS contracts;

CREATE TABLE contracts (
  id TEXT PRIMARY KEY,
  offer_id TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL,            -- pending | signed | declined
  created_at TEXT NOT NULL,
  signed_at TEXT,
  FOREIGN KEY (offer_id) REFERENCES offers(id)
);

/* ============================
   CONTRACT PARTICIPANTS
============================ */
DROP TABLE IF EXISTS contract_participants;

CREATE TABLE contract_participants (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role_in_contract TEXT,           -- skater | musician | business | owner
  percentage INTEGER,              -- revenue split
  signed INTEGER DEFAULT 0,
  signed_at TEXT,
  FOREIGN KEY (contract_id) REFERENCES contracts(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
