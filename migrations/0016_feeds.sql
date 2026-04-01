DROP TABLE IF EXISTS feeds;

CREATE TABLE feeds (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  created_at TEXT NOT NULL
);
