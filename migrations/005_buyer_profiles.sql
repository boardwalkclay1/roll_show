CREATE TABLE buyer_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,

  name TEXT,
  phone TEXT,
  city TEXT,
  state TEXT,

  created_at TEXT NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id)
);
