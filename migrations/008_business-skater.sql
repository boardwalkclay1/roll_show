-- SKATERS: label signing
ALTER TABLE skaters
  ADD COLUMN signed_to_label INTEGER DEFAULT 0,
  ADD COLUMN label_contract_id TEXT;

-- BUSINESSES: ads + balance
ALTER TABLE businesses
  ADD COLUMN can_advertise INTEGER DEFAULT 0,
  ADD COLUMN ad_balance_cents INTEGER DEFAULT 0;

-- BUSINESS ADS
CREATE TABLE IF NOT EXISTS business_ads (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  title TEXT,
  image_r2_key TEXT,
  target_url TEXT,
  start_at TEXT,
  end_at TEXT,
  status TEXT, -- pending, approved, running, expired, rejected
  created_at TEXT
);

-- SPONSORSHIPS
CREATE TABLE IF NOT EXISTS sponsorships (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  skater_id TEXT NOT NULL,
  label_cut_percent INTEGER NOT NULL,
  skater_cut_percent INTEGER NOT NULL,
  status TEXT, -- pending, active, completed, cancelled
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS sponsorship_payments (
  id TEXT PRIMARY KEY,
  sponsorship_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  label_amount_cents INTEGER NOT NULL,
  skater_amount_cents INTEGER NOT NULL,
  created_at TEXT
);

-- MESSAGING
CREATE TABLE IF NOT EXISTS message_threads (
  id TEXT PRIMARY KEY,
  skater_id TEXT,
  business_id TEXT,
  sponsorship_id TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  from_user_id TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT
);

-- EVENTS
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  type TEXT, -- 'skate', 'business'
  title TEXT,
  description TEXT,
  location TEXT,
  lat REAL,
  lng REAL,
  start_at TEXT,
  end_at TEXT,
  created_by_business_id TEXT,
  created_by_owner_id TEXT,
  created_at TEXT
);
