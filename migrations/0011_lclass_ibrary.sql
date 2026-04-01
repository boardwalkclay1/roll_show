DROP TABLE IF EXISTS class_library;

CREATE TABLE class_library (
  id TEXT PRIMARY KEY,
  owner_role TEXT NOT NULL,
  owner_profile_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  media_url TEXT,
  price_cents INTEGER DEFAULT 0,
  is_public INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);
