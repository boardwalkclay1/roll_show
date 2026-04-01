DROP TABLE IF EXISTS event_checkins;

CREATE TABLE event_checkins (
  id TEXT PRIMARY KEY,
  show_id TEXT NOT NULL,
  user_id TEXT NOT NULL,

  status TEXT NOT NULL,
  -- maybe | going | there

  created_at TEXT NOT NULL,

  FOREIGN KEY (show_id) REFERENCES shows(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
