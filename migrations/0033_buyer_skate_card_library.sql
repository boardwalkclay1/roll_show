CREATE TABLE buyer_skate_card_library (
  id TEXT PRIMARY KEY,
  buyer_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  acquired_at TEXT NOT NULL,

  FOREIGN KEY (buyer_id) REFERENCES buyer_profiles(id),
  FOREIGN KEY (card_id) REFERENCES skate_cards(id)
);
