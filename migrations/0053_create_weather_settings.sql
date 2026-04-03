CREATE TABLE weather_settings (
  user_id TEXT PRIMARY KEY,
  location TEXT NOT NULL,
  units TEXT DEFAULT 'F',
  forecast_days INTEGER DEFAULT 7,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
)
