/* ============================
   USERS (GLOBAL IDENTITY)
============================ */
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id TEXT PRIMARY KEY,             -- global user_id (UUID)
  email TEXT UNIQUE NOT NULL,      -- login identity
  password_hash TEXT NOT NULL,     -- bcrypt hash
  role TEXT NOT NULL,              -- buyer | skater | musician | business | owner
  created_at TEXT NOT NULL         -- ISO timestamp
);
