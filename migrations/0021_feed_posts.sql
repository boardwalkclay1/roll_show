DROP TABLE IF EXISTS feed_posts;

CREATE TABLE feed_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,                     -- skater | business | musician | buyer
  profile_id TEXT NOT NULL,               -- skater_id | business_id | musician_id | buyer_id

  post_type TEXT DEFAULT 'post',          -- post | story | clip | show_announcement | campaign_update
  content TEXT,
  media_url TEXT,
  media_type TEXT,                        -- image | video | clip

  created_at TEXT NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id)
);
