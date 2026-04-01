DROP TABLE IF EXISTS sponsorship_campaigns;

CREATE TABLE sponsorship_campaigns (
  id TEXT PRIMARY KEY,                     -- campaign_id (UUID)
  business_id TEXT NOT NULL,               -- business_profiles.id

  title TEXT NOT NULL,
  description TEXT,

  campaign_type TEXT DEFAULT 'general',    -- general | show_specific | affiliate | kupon
  show_id TEXT,                            -- optional: link to a specific show

  budget_cents INTEGER NOT NULL,
  coupon_code TEXT,
  coupon_percent INTEGER,
  duration_days INTEGER,

  status TEXT DEFAULT 'active',            -- active | paused | completed | cancelled

  created_at TEXT NOT NULL,

  FOREIGN KEY (business_id) REFERENCES business_profiles(id),
  FOREIGN KEY (show_id) REFERENCES shows(id)
);
