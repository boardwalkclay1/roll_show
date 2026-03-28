/* ============================
   MUSICIANS (PROFILE)
============================ */
DROP TABLE IF EXISTS musicians;

CREATE TABLE musicians (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,        -- store the user ID manually
  bio TEXT,
  created_at TEXT NOT NULL
);

/* ============================
   TRACKS (R2 STORAGE METADATA)
============================ */
DROP TABLE IF EXISTS tracks;

CREATE TABLE tracks (
  id TEXT PRIMARY KEY,
  artist_id TEXT NOT NULL,      -- link to musicians.id or users.id manually
  title TEXT NOT NULL,
  r2_key TEXT NOT NULL,         -- path to R2 file
  artwork_r2_key TEXT,
  created_at TEXT NOT NULL
);

/* ============================
   TRACK LICENSES
============================ */
DROP TABLE IF EXISTS track_licenses;

CREATE TABLE track_licenses (
  id TEXT PRIMARY KEY,
  track_id TEXT NOT NULL,       -- link to tracks.id manually
  skater_id TEXT NOT NULL,      -- link to users.id manually
  amount_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
