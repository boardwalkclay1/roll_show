-- 0099_legal_acceptances.sql
-- Creates table for storing user acceptance of legal/policy agreements

CREATE TABLE IF NOT EXISTS legal_acceptances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER NOT NULL,
    role TEXT NOT NULL,

    agreement_type TEXT NOT NULL,
    agreement_version TEXT NOT NULL,

    accepted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    ip_address TEXT,
    user_agent TEXT,

    UNIQUE(user_id, agreement_type, agreement_version)
);
