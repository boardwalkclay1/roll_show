CREATE TABLE buyer_music_library (
  id TEXT PRIMARY KEY,
  buyer_id TEXT NOT NULL,
  track_id TEXT NOT NULL,
  added_at TEXT NOT NULL,

  FOREIGN KEY (buyer_id) REFERENCES buyer_profiles(id),
  FOREIGN KEY (track_id) REFERENCES tracks(id)
);
