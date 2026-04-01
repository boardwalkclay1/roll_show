DROP TABLE IF EXISTS sponsorship_offers;

CREATE TABLE sponsorship_offers (
  id TEXT PRIMARY KEY,                     -- offer_id (UUID)

  campaign_id TEXT NOT NULL,               -- sponsorship_campaigns.id
  skater_id TEXT NOT NULL,                 -- skater_profiles.id

  offer_type TEXT DEFAULT 'sponsorship',   -- sponsorship | booking | collab | show_support | affiliate
  show_id TEXT,                            -- optional: link to a specific show

  status TEXT NOT NULL DEFAULT 'pending',  -- pending | accepted | rejected | modified
  terms_json TEXT,                         -- full contract terms snapshot

  created_at TEXT NOT NULL,
  updated_at TEXT,                         -- when skater modifies or responds

  FOREIGN KEY (campaign_id) REFERENCES sponsorship_campaigns(id),
  FOREIGN KEY (skater_id) REFERENCES skater_profiles(id),
  FOREIGN KEY (show_id) REFERENCES shows(id)
);
