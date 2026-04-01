DROP TABLE IF EXISTS tickets;

CREATE TABLE tickets (
  id TEXT PRIMARY KEY,
  show_id TEXT NOT NULL,
  buyer_profile_id TEXT NOT NULL,
  purchaser_user_id TEXT NOT NULL,
  status TEXT NOT NULL,
  purchased_at TEXT NOT NULL,
  FOREIGN KEY (show_id) REFERENCES shows(id),
  FOREIGN KEY (buyer_profile_id) REFERENCES buyer_profiles(id),
  FOREIGN KEY (purchaser_user_id) REFERENCES users(id)
);
