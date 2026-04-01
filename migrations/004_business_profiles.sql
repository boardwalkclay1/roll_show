/* ============================
   BUSINESS PROFILES
============================ */
DROP TABLE IF EXISTS business_profiles;

CREATE TABLE business_profiles (
  id TEXT PRIMARY KEY,               -- business_id (UUID)
  user_id TEXT NOT NULL UNIQUE,      -- links to users.id

  company_name TEXT NOT NULL,
  brand_name TEXT,                   -- shorter display name if different
  description TEXT,

  website TEXT,
  website_verified INTEGER DEFAULT 0, -- 0 = not verified, 1 = verified

  logo_url TEXT,
  banner_url TEXT,

  contact_email TEXT,
  contact_phone TEXT,

  city TEXT,
  state TEXT,
  country TEXT,

  /* AD + SPONSORSHIP CAPABILITIES */
  ad_account_enabled INTEGER DEFAULT 0,   -- can request/run ads
  ad_review_status TEXT DEFAULT 'pending',-- pending | approved | rejected

  sponsorship_enabled INTEGER DEFAULT 1,  -- can sponsor skaters
  affiliate_enabled INTEGER DEFAULT 1,    -- can issue affiliate links

  default_coupon_code TEXT,              -- base code for “kupon contracts”
  default_coupon_percent INTEGER,        -- default % off for campaigns

  min_sponsorship_cents INTEGER,         -- minimum budget per campaign
  preferred_disciplines TEXT,            -- e.g. "roller,skateboard,longboard"
  preferred_regions TEXT,                -- e.g. "US,EU,ATL,LA"

  social_instagram TEXT,
  social_tiktok TEXT,
  social_youtube TEXT,

  notes_internal TEXT,                   -- owner-only notes about this brand

  created_at TEXT NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id)
);
