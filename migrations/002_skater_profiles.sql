-- 002_skater_profiles.sql — CLEAN, D1-SAFE (minimal: only discipline/subclass + linkage)

DROP TABLE IF EXISTS skater_profiles;

CREATE TABLE IF NOT EXISTS skater_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  stage_name TEXT NOT NULL,
  discipline TEXT NOT NULL,    -- e.g., street|park|vert|downhill
  subclass TEXT,               -- e.g., freestyle|rink|outdoor|cruiser
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
