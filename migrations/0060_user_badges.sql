-- USER BADGES TABLE
CREATE TABLE IF NOT EXISTS user_badges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  badge_id TEXT NOT NULL,
  earned_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (badge_id) REFERENCES badges(id)
);

-- Prevent duplicate badge awards
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_badge_unique
ON user_badges (user_id, badge_id);
