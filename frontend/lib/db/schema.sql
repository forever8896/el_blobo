-- GrowChain Database Schema for Neon Postgres

-- Users table - stores all registered blob workers
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  referrer_address TEXT, -- wallet address of person who invited them
  skills JSONB, -- user skills and interview responses
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  total_earned DECIMAL(10, 2) DEFAULT 0.00,
  jobs_completed INTEGER DEFAULT 0,
  reputation_score DECIMAL(3, 2) DEFAULT 0.00 -- 0.00 to 1.00
);

-- Referral tree tracking
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_address TEXT NOT NULL,
  referred_address TEXT NOT NULL,
  referral_level INTEGER NOT NULL, -- 1 for direct, 2 for indirect
  created_at TIMESTAMP DEFAULT NOW(),
  total_earned DECIMAL(10, 2) DEFAULT 0.00, -- total commissions earned from this referral
  UNIQUE(referrer_address, referred_address)
);

-- Projects/Jobs table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_address TEXT, -- Project smart contract address (NULL until deployed)
  assignee_address TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price_estimate DECIMAL(10, 2) NOT NULL,
  deadline_start TIMESTAMP NOT NULL,
  deadline_end TIMESTAMP NOT NULL,
  status TEXT NOT NULL DEFAULT 'wip', -- 'wip' | 'submitted' | 'approved' | 'rejected' | 'paid'
  submission_url TEXT,
  submission_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (assignee_address) REFERENCES users(wallet_address)
);

-- AI Council votes
CREATE TABLE IF NOT EXISTS council_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  judge_id TEXT NOT NULL, -- 'judge1', 'judge2', 'judge3'
  vote BOOLEAN NOT NULL, -- true = approve, false = reject
  reason TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Twitter sentiment data (for AI decision making)
CREATE TABLE IF NOT EXISTS sentiment_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain TEXT NOT NULL, -- e.g., 'base-sepolia'
  sentiment_score DECIMAL(3, 2) NOT NULL, -- -1.00 to 1.00
  data_source TEXT NOT NULL, -- 'twitter' | 'reddit' | etc
  analyzed_at TIMESTAMP DEFAULT NOW()
);

-- Blob treasury tracking
CREATE TABLE IF NOT EXISTS treasury (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  total_deposits DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  total_payouts DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  joining_fee DECIMAL(10, 2) NOT NULL DEFAULT 50.00, -- dynamic, AI can update
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Initialize treasury with default values
INSERT INTO treasury (total_balance, total_deposits, total_payouts, joining_fee)
VALUES (0.00, 0.00, 0.00, 50.00)
ON CONFLICT DO NOTHING;

-- Chat history (for persistent Blob conversations)
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL,
  role TEXT NOT NULL, -- 'user' | 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_address) REFERENCES users(wallet_address)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_referrer ON users(referrer_address);
CREATE INDEX IF NOT EXISTS idx_projects_assignee ON projects(assignee_address);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_address);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_address);
CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_messages(user_address);
