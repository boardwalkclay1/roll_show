CREATE TABLE giveaways (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  prize TEXT,
  rules TEXT,
  created_at TEXT NOT NULL,

  FOREIGN KEY (business_id) REFERENCES business_profiles(id)
);
