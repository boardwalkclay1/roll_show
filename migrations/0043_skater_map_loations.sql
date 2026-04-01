DROP TABLE IF EXISTS skater_map_locations;

CREATE TABLE skater_map_locations (
  id TEXT PRIMARY KEY,
  skater_id TEXT NOT NULL,
  added_by_user_id TEXT NOT NULL,

  label TEXT,
  latitude REAL,
  longitude REAL,

  visibility TEXT DEFAULT 'public',
  -- public | friends | private

  created_at TEXT NOT NULL,

  FOREIGN KEY (skater_id) REFERENCES skater_profiles(id),
  FOREIGN KEY (added_by_user_id) REFERENCES users(id)
);
