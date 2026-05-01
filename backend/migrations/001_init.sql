-- Users
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  password   TEXT NOT NULL,
  name       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Refresh tokens (optional revocation support)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
