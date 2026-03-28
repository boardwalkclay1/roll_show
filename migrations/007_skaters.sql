/* ============================
   SKATERS (PROFILE)
============================ */
DROP TABLE IF EXISTS skaters;

CREATE TABLE skaters (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,        -- manually link to users.id
  bio TEXT,
  discipline TEXT,
  profile_image TEXT,
  clip_url TEXT,
  created_at TEXT NOT NULL
);

/* ============================
   SHOWS (SKATER PERFORMANCES)
============================ */
DROP TABLE IF EXISTS shows;

CREATE TABLE shows (
  id TEXT PRIMARY KEY,
  skater_id TEXT NOT NULL,      -- manually link to skaters.id
  title TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  thumbnail TEXT,
  video_url TEXT,
  premiere_date TEXT,
  created_at TEXT NOT NULL
);

/* ============================
   LESSONS (SKATER BUSINESS)
============================ */
DROP TABLE IF EXISTS lessons;

CREATE TABLE lessons (
  id TEXT PRIMARY KEY,
  skater_id TEXT NOT NULL,      -- manually link to skaters.id
  title TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

/* ============================
   LESSON REQUESTS
============================ */
DROP TABLE IF EXISTS lesson_requests;

CREATE TABLE lesson_requests (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,      -- manually link to lessons.id
  buyer_id TEXT NOT NULL,       -- manually link to users.id
  status TEXT NOT NULL,         -- pending | accepted | declined | completed
  created_at TEXT NOT NULL
);

/* ============================
   PAYOUTS (SKATER EARNINGS)
============================ */
DROP TABLE IF EXISTS payouts;

CREATE TABLE payouts (
  id TEXT PRIMARY KEY,
  skater_id TEXT NOT NULL,      -- manually link to skaters.id
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL,         -- pending | paid | failed
  created_at TEXT NOT NULL
);
