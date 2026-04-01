DROP TABLE IF EXISTS branding_assets;

CREATE TABLE branding_assets (
  id TEXT PRIMARY KEY,                     -- asset_id (UUID)
  skater_id TEXT NOT NULL,                 -- skater_profiles.id

  asset_url TEXT NOT NULL,                 -- R2 or CDN URL
  asset_type TEXT NOT NULL,                -- overlay | frame | font | background | template
  asset_category TEXT,                     -- card | show | campaign | merch

  created_at TEXT NOT NULL,

  FOREIGN KEY (skater_id) REFERENCES skater_profiles(id)
);
