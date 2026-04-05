CREATE TABLE skater_music_library (
  id TEXT PRIMARY KEY,
  skater_id TEXT NOT NULL,
  track_id TEXT NOT NULL,
  added_at TEXT NOT NULL,

  FOREIGN KEY (skater_id) REFERENCES skater_profiles(id),
  FOREIGN KEY (track_id) REFERENCES tracks(id)
);
