DROP TABLE IF EXISTS skater_group_members;

CREATE TABLE skater_group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  skater_id TEXT NOT NULL,
  role TEXT DEFAULT 'member', -- leader | member
  joined_at TEXT NOT NULL,

  FOREIGN KEY (group_id) REFERENCES skater_groups(id),
  FOREIGN KEY (skater_id) REFERENCES skater_profiles(id)
);
