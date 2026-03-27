/* ============================
   USERS (GLOBAL IDENTITY)
============================ */
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,              -- buyer | skater | business | musician | owner
  verified INTEGER DEFAULT 0,      -- business verification
  phone TEXT,
  city TEXT,
  state TEXT,
  created_at TEXT NOT NULL
);
