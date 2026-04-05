DROP TABLE IF EXISTS tickets;

CREATE TABLE tickets (
  id TEXT PRIMARY KEY,                     -- ticket_id (UUID)

  show_id TEXT NOT NULL,                   -- shows.id
  buyer_profile_id TEXT NOT NULL,          -- buyer_profiles.id
  purchaser_user_id TEXT NOT NULL,         -- users.id

  ticket_type TEXT DEFAULT 'standard',     -- standard | preticket | vip | virtual | meet_and_greet
  price_cents INTEGER NOT NULL,

  status TEXT NOT NULL,                    -- reserved | charged | refunded | cancelled
  purchased_at TEXT NOT NULL,

  funding_applied INTEGER DEFAULT 0,       -- 1 = preticket counted toward funding
  checkin_status TEXT DEFAULT 'none',      -- none | maybe | going | there
  checkin_at TEXT,                         -- timestamp when checked in

  qr_code_url TEXT,                        -- auto-generated QR for entry

  FOREIGN KEY (show_id) REFERENCES shows(id),
  FOREIGN KEY (buyer_profile_id) REFERENCES buyer_profiles(id),
  FOREIGN KEY (purchaser_user_id) REFERENCES users(id)
);
