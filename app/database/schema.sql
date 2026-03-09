-- USERS
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL, -- 'skater' or 'buyer'
  created_at TEXT NOT NULL
);

-- SKATER PROFILES
CREATE TABLE skaters (
  user_id TEXT PRIMARY KEY,
  display_name TEXT,
  discipline TEXT,
  bio TEXT,
  paypal_id TEXT,
  venmo_id TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- SHOWS
CREATE TABLE shows (
  id TEXT PRIMARY KEY,
  skater_id TEXT NOT NULL,
  title TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  discipline TEXT,
  price INTEGER NOT NULL,
  premiere_date TEXT,
  video_id TEXT,
  status TEXT NOT NULL, -- draft, scheduled, live, ended
  created_at TEXT NOT NULL,
  FOREIGN KEY (skater_id) REFERENCES skaters(user_id)
);

-- TICKETS
CREATE TABLE tickets (
  id TEXT PRIMARY KEY,
  show_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  purchase_time TEXT NOT NULL,
  status TEXT NOT NULL, -- valid, used, refunded
  FOREIGN KEY (show_id) REFERENCES shows(id),
  FOREIGN KEY (buyer_id) REFERENCES users(id)
);

-- PAYOUTS
CREATE TABLE payouts (
  id TEXT PRIMARY KEY,
  skater_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL, -- pending, paid
  created_at TEXT NOT NULL,
  FOREIGN KEY (skater_id) REFERENCES skaters(user_id)
);

-- VIDEO METADATA
CREATE TABLE videos (
  id TEXT PRIMARY KEY,
  skater_id TEXT NOT NULL,
  title TEXT,
  duration INTEGER,
  r2_key TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (skater_id) REFERENCES skaters(user_id)
);

-- BRANDING (tickets + stamps + flyers)
CREATE TABLE branding (
  skater_id TEXT PRIMARY KEY,
  ticket_json TEXT,
  stamp_json TEXT,
  flyer_json TEXT,
  FOREIGN KEY (skater_id) REFERENCES skaters(user_id)
);
