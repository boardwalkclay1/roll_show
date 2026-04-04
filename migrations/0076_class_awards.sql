CREATE TABLE IF NOT EXISTS class_awards (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,        -- references class_library.id
  skater_id TEXT NOT NULL,       -- references users.id (role = skater)
  award_type TEXT NOT NULL,      -- 'top_trick' | 'top_skater' | 'top_heart'
  month_start TEXT NOT NULL,     -- ISO date string, e.g. '2026-04-01'
  month_end TEXT NOT NULL,       -- ISO date string, e.g. '2026-04-30'
  reason TEXT,                   -- your notes on why they earned it
  featured_video_url TEXT,       -- optional: link to the clip for top trick
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (class_id) REFERENCES class_library(id),
  FOREIGN KEY (skater_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_class_awards_class
  ON class_awards(class_id);

CREATE INDEX IF NOT EXISTS idx_class_awards_skater
  ON class_awards(skater_id);

CREATE INDEX IF NOT EXISTS idx_class_awards_type_month
  ON class_awards(award_type, month_start);
