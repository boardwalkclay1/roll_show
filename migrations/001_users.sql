DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT,                        -- required by signup + returned by login
  email TEXT UNIQUE NOT NULL,       -- used for login
  password_hash TEXT NOT NULL,      -- bcrypt hash
  role TEXT NOT NULL,               -- buyer | skater | musician | business | owner
  created_at TEXT NOT NULL,         -- ISO timestamp
  "owner-1" INTEGER DEFAULT 0       -- 1 = owner, 0 = normal user
);
