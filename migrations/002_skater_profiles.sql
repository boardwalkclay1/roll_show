DROP TABLE IF EXISTS skater_profiles;

CREATE TABLE skater_profiles (
  id TEXT PRIMARY KEY,             -- skater_id (UUID)
  user_id TEXT NOT NULL UNIQUE,    -- links to users.id

  display_name TEXT,               -- skater’s chosen name
  bio TEXT,                        -- profile bio

  discipline TEXT,                 -- roller | inline | skateboard | longboard
  subclass TEXT,                   -- rink | outdoor | vert | street | cruiser | dancer | downhill

  avatar_url TEXT,                 -- profile picture
  city TEXT,
  state TEXT,

  created_at TEXT NOT NULL,        -- ISO timestamp

  FOREIGN KEY (user_id) REFERENCES users(id)
);
