CREATE TABLE IF NOT EXISTS creators (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,              -- 'artist', 'skater', 'recorder', 'other'
  user_id TEXT,
  name TEXT NOT NULL,
  email TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,              -- 'music', 'video', 'combo'
  title TEXT NOT NULL,
  primary_creator_id TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS asset_rights (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  grantor_creator_id TEXT NOT NULL,
  scope TEXT NOT NULL,
  territory TEXT NOT NULL,
  term TEXT NOT NULL,
  exclusivity TEXT NOT NULL,
  can_sublicense INTEGER NOT NULL,
  agreement_version TEXT NOT NULL,
  signed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS asset_royalty_splits (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  role TEXT NOT NULL,
  percentage REAL NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS distribution_destinations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS asset_distributions (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  destination_id TEXT NOT NULL,
  status TEXT NOT NULL,
  external_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS asset_usage (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  source TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  metric_value INTEGER NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS asset_revenue (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  source TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  paid_at TEXT
);

CREATE TABLE IF NOT EXISTS agreement_snapshots (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  agreement_type TEXT NOT NULL,
  version TEXT NOT NULL,
  content TEXT NOT NULL,
  signed_at TEXT NOT NULL
);
