CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT,
  phone TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'beneficiary',
  password_hash TEXT,
  house_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS houses (
  id SERIAL PRIMARY KEY,
  house_code TEXT NOT NULL UNIQUE,
  head_of_household TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'planned',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tokens (
  id SERIAL PRIMARY KEY,
  token_code TEXT UNIQUE NOT NULL,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  house_id INTEGER REFERENCES houses(id) ON DELETE CASCADE,
  issued_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  used BOOLEAN DEFAULT FALSE,
  used_by INTEGER REFERENCES users(id),
  used_at TIMESTAMPTZ,
  manual_checkin BOOLEAN DEFAULT FALSE,
  manual_checkin_notes TEXT,
  status TEXT DEFAULT 'active',
  original_token_id INTEGER
);

CREATE TABLE IF NOT EXISTS token_audit (
  id SERIAL PRIMARY KEY,
  token_id INTEGER REFERENCES tokens(id),
  action TEXT NOT NULL,
  performed_by INTEGER REFERENCES users(id),
  details JSONB,
  verifier_details JSONB,
  ts TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tokens_token_code ON tokens(token_code);
CREATE INDEX IF NOT EXISTS idx_houses_house_code ON houses(house_code);
