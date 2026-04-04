-- BADGE INDEXES
CREATE INDEX IF NOT EXISTS idx_badges_category
ON badges (category);

CREATE INDEX IF NOT EXISTS idx_user_badges_user
ON user_badges (user_id);

CREATE INDEX IF NOT EXISTS idx_user_badges_badge
ON user_badges (badge_id);
