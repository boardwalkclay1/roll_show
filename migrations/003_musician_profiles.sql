/* ============================
   MUSICIANS (PROFILE)
============================ */
DROP TABLE IF EXISTS musician_profiles;

CREATE TABLE musician_profiles (
  id TEXT PRIMARY KEY,             -- musician_id (UUID)
  user_id TEXT NOT NULL UNIQUE,    -- links to users.id

  name TEXT,
  bio TEXT,
  genre TEXT,
  avatar_url TEXT,
  city TEXT,
  state TEXT,

  created_at TEXT NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id)
);
