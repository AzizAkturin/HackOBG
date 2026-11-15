CREATE TABLE IF NOT EXISTS weight_classes (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  min_bet TEXT NOT NULL,
  max_bet TEXT NOT NULL,
  rake_bps INTEGER NOT NULL,
  models_json TEXT NOT NULL,
  max_tokens INTEGER NOT NULL,
  reasoning TEXT NOT NULL CHECK (reasoning IN ('off', 'low', 'high')),
  fight_seconds INTEGER NOT NULL,
  config_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fighters (
  id INTEGER PRIMARY KEY,
  owner TEXT NOT NULL,
  class_id INTEGER NOT NULL REFERENCES weight_classes(id),
  name TEXT NOT NULL,
  nickname TEXT,
  bio TEXT,
  avatar TEXT,
  persona TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  params_json TEXT NOT NULL DEFAULT '{}',
  profile_hash TEXT NOT NULL,
  elo INTEGER NOT NULL DEFAULT 1500,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS fighter_memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fighter_id INTEGER NOT NULL REFERENCES fighters(id),
  round_id INTEGER NOT NULL,
  note TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS fighter_summary (
  fighter_id INTEGER PRIMARY KEY REFERENCES fighters(id),
  summary TEXT NOT NULL,
  updated_round INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id INTEGER,
  prompt TEXT NOT NULL,
  category TEXT NOT NULL,
  scoring_mode TEXT NOT NULL,
  rubric_json TEXT,
  salt TEXT NOT NULL,
  task_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rounds (
  id INTEGER PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES weight_classes(id),
  phase TEXT NOT NULL,
  lock_time INTEGER NOT NULL,
  vote_end INTEGER,
  fight_seconds INTEGER NOT NULL,
  created_by TEXT NOT NULL,
  task_id INTEGER REFERENCES tasks(id),
  shuffle_json TEXT,
  judge_rank_json TEXT,
  salt TEXT,
  reveal_commit TEXT,
  pitches_hash TEXT,
  winner_index INTEGER,
  create_tx TEXT,
  open_voting_tx TEXT,
  settle_tx TEXT,
  cancel_tx TEXT
);

CREATE TABLE IF NOT EXISTS round_fighters (
  round_id INTEGER NOT NULL REFERENCES rounds(id),
  idx INTEGER NOT NULL,
  fighter_id INTEGER NOT NULL REFERENCES fighters(id),
  output TEXT,
  pitch TEXT,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  finished_at INTEGER,
  ko INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (round_id, idx)
);

CREATE TABLE IF NOT EXISTS round_events (
  round_id INTEGER NOT NULL,
  seq INTEGER NOT NULL,
  t_ms INTEGER NOT NULL,
  fighter_idx INTEGER,
  kind TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  PRIMARY KEY (round_id, seq)
);

CREATE TABLE IF NOT EXISTS entries (
  round_id INTEGER NOT NULL,
  address TEXT NOT NULL,
  fighter_idx INTEGER NOT NULL,
  amount TEXT NOT NULL,
  voted_label TEXT,
  claimed INTEGER NOT NULL DEFAULT 0,
  tx_hash TEXT NOT NULL,
  PRIMARY KEY (round_id, address)
);

CREATE TABLE IF NOT EXISTS votes (
  round_id INTEGER NOT NULL,
  address TEXT NOT NULL,
  label TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  PRIMARY KEY (round_id, address)
);

CREATE TABLE IF NOT EXISTS elo_history (
  fighter_id INTEGER NOT NULL REFERENCES fighters(id),
  round_id INTEGER NOT NULL,
  elo_before INTEGER NOT NULL,
  elo_after INTEGER NOT NULL,
  PRIMARY KEY (fighter_id, round_id)
);

CREATE TABLE IF NOT EXISTS drips (
  address TEXT PRIMARY KEY,
  privy_user_id TEXT UNIQUE,
  ip TEXT,
  amount TEXT NOT NULL,
  tx_hash TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS indexer_state (
  key TEXT PRIMARY KEY,
  last_indexed_block INTEGER NOT NULL
);

-- Accounts: one per wallet, created by the explicit sign-up step after a verified SIWE signature.
CREATE TABLE IF NOT EXISTS users (
  address TEXT PRIMARY KEY,                       -- EIP-55 checksummed
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  avatar TEXT NOT NULL,                           -- preset id, see packages/shared/src/profile.ts
  age_confirmed_at INTEGER NOT NULL,              -- user confirmed 18+
  terms_version TEXT NOT NULL,
  terms_accepted_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER NOT NULL
);

-- Proof that a wallet without an account just signed in. Spent by POST /api/auth/signup.
CREATE TABLE IF NOT EXISTS pending_signups (
  token_hash TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

-- Single-use SIWE nonces. Deleted when consumed or expired.
CREATE TABLE IF NOT EXISTS auth_nonces (
  nonce TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);

-- Bearer sessions. Only the SHA-256 of the token is stored.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  address TEXT NOT NULL REFERENCES users(address),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_address ON sessions(address);
