DROP TABLE IF EXISTS skater_profiles;

CREATE TABLE skater_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  display_name TEXT,
  bio TEXT,
  discipline TEXT,
  avatar_url TEXT,
  city TEXT,
  state TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
