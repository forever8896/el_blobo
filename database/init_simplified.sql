-- Simplified Database Schema for The Blob
-- Version: 2.0 (Integrated with Smart Contracts)
-- Last Updated: 2025-11-22

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- Stores user profiles and wallet addresses
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  referrer_address TEXT, -- Address of the person who invited them
  skills JSONB, -- Interview responses stored as JSON array
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_users_referrer ON users(referrer_address);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PROJECTS TABLE
-- Stores job/project metadata (descriptions, submissions)
-- Onchain data (deadlines, rewards, status) queried from smart contracts
-- ============================================================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_key TEXT UNIQUE NOT NULL, -- Maps to onchain project key (bytes32)
  assignee_address TEXT REFERENCES users(wallet_address) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  submission_url TEXT, -- URL to completed work
  submission_notes TEXT, -- Optional explanation from worker
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_projects_contract_key ON projects(contract_key);
CREATE INDEX idx_projects_assignee ON projects(assignee_address);

-- Updated_at trigger
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COUNCIL_VOTES TABLE
-- Stores AI judge evaluation results
-- ============================================================================
CREATE TABLE council_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  judge_id TEXT NOT NULL, -- 'judge1', 'judge2', 'judge3'
  judge_name TEXT, -- 'VALIDATOR-PRIME', 'CHAOS-ARBITER', 'IMPACT-SAGE'
  vote BOOLEAN NOT NULL, -- true = approve, false = reject
  reason TEXT, -- AI's reasoning for the vote
  ai_provider TEXT, -- 'openai', 'grok', 'gemini'
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_council_votes_project ON council_votes(project_id);
CREATE INDEX idx_council_votes_judge ON council_votes(judge_id);

-- Constraint: Each judge can only vote once per project
CREATE UNIQUE INDEX idx_council_votes_unique_vote
  ON council_votes(project_id, judge_id);

-- ============================================================================
-- CHAT_MESSAGES TABLE
-- Stores conversation history between users and the AI agent
-- ============================================================================
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_address TEXT REFERENCES users(wallet_address) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_chat_messages_user ON chat_messages(user_address);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- ============================================================================
-- REFERRALS TABLE (OPTIONAL)
-- Tracks referral tree structure
-- Consider moving to smart contract if rewards will be paid onchain
-- ============================================================================
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_address TEXT NOT NULL,
  referred_address TEXT NOT NULL,
  referral_level INTEGER NOT NULL DEFAULT 1, -- 1 = direct, 2 = indirect
  total_earned DECIMAL(20, 6) DEFAULT 0, -- Commission earned from this referral
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique referral relationship
  UNIQUE(referrer_address, referred_address)
);

-- Indexes
CREATE INDEX idx_referrals_referrer ON referrals(referrer_address);
CREATE INDEX idx_referrals_referred ON referrals(referred_address);

-- ============================================================================
-- VIEWS FOR DERIVED DATA
-- Calculate stats from onchain data (to be implemented with indexing)
-- ============================================================================

-- User statistics view (placeholder - implement with onchain event indexing)
CREATE OR REPLACE VIEW user_stats AS
SELECT
  u.wallet_address,
  u.username,
  -- These should be calculated from indexed onchain events:
  0::DECIMAL as total_earned, -- Query RewardVault.userShares + convertToAssets
  0::INTEGER as jobs_completed, -- Count finalized projects from events
  0.0::DECIMAL as reputation_score, -- Calculate approval rate from events
  COUNT(DISTINCT p.id) as projects_assigned,
  COUNT(DISTINCT p.id) FILTER (WHERE p.submission_url IS NOT NULL) as projects_submitted
FROM users u
LEFT JOIN projects p ON p.assignee_address = u.wallet_address
GROUP BY u.wallet_address, u.username;

-- Project status view (combines DB + onchain data)
CREATE OR REPLACE VIEW project_details AS
SELECT
  p.id,
  p.contract_key,
  p.title,
  p.description,
  p.assignee_address,
  p.submission_url,
  p.submission_notes,
  p.created_at,
  -- Placeholder for onchain data (query via RPC):
  NULL::TIMESTAMPTZ as begin_deadline, -- From ProjectData.project.beginDeadline
  NULL::TIMESTAMPTZ as end_deadline, -- From ProjectData.project.endDeadline
  NULL::DECIMAL as total_reward, -- From ProjectData.project.totalReward
  NULL::TEXT as status, -- From ProjectData.project.status
  NULL::BOOLEAN as finalized, -- From Main.projectFinalized[key]
  -- Council vote summary
  COUNT(cv.id) FILTER (WHERE cv.vote = true) as approvals,
  COUNT(cv.id) FILTER (WHERE cv.vote = false) as rejections,
  COUNT(cv.id) as total_votes
FROM projects p
LEFT JOIN council_votes cv ON cv.project_id = p.id
GROUP BY p.id, p.contract_key, p.title, p.description, p.assignee_address,
         p.submission_url, p.submission_notes, p.created_at;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Optional but recommended for production
-- ============================================================================

-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE council_votes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY users_select_own
  ON users FOR SELECT
  USING (wallet_address = current_setting('app.current_user', true));

-- Policy: Users can update their own profile
CREATE POLICY users_update_own
  ON users FOR UPDATE
  USING (wallet_address = current_setting('app.current_user', true));

-- Policy: Anyone can read projects (for discovery)
CREATE POLICY projects_select_all
  ON projects FOR SELECT
  USING (true);

-- Policy: Users can read their own chat messages
CREATE POLICY chat_messages_select_own
  ON chat_messages FOR SELECT
  USING (user_address = current_setting('app.current_user', true));

-- Policy: Service role can do anything (for backend operations)
CREATE POLICY service_role_all_users
  ON users FOR ALL
  USING (current_user = 'service_role');

CREATE POLICY service_role_all_projects
  ON projects FOR ALL
  USING (current_user = 'service_role');

CREATE POLICY service_role_all_chat
  ON chat_messages FOR ALL
  USING (current_user = 'service_role');

CREATE POLICY service_role_all_votes
  ON council_votes FOR ALL
  USING (current_user = 'service_role');

-- ============================================================================
-- SAMPLE DATA (OPTIONAL - Remove in production)
-- ============================================================================

-- Sample user
INSERT INTO users (wallet_address, username, skills) VALUES
  ('0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe', 'coinbase_server',
   '{"responses": ["Smart contract development", "Full-stack web3", "Testing & QA"]}');

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to get or create user by wallet address
CREATE OR REPLACE FUNCTION get_or_create_user(
  p_wallet_address TEXT,
  p_username TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Try to get existing user
  SELECT id INTO v_user_id
  FROM users
  WHERE wallet_address = p_wallet_address;

  -- If user doesn't exist, create them
  IF v_user_id IS NULL THEN
    INSERT INTO users (wallet_address, username)
    VALUES (p_wallet_address, p_username)
    RETURNING id INTO v_user_id;
  END IF;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- List all tables
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Count rows in each table
SELECT
  'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'projects', COUNT(*) FROM projects
UNION ALL
SELECT 'council_votes', COUNT(*) FROM council_votes
UNION ALL
SELECT 'chat_messages', COUNT(*) FROM chat_messages
UNION ALL
SELECT 'referrals', COUNT(*) FROM referrals;

-- ============================================================================
-- NOTES
-- ============================================================================

-- Data Storage Distribution:
--
-- SUPABASE (Off-chain):
-- - User profiles (username, skills)
-- - Project descriptions and submissions
-- - AI council vote reasoning
-- - Chat conversation history
-- - Referral relationships
--
-- SMART CONTRACTS (On-chain):
-- - User registration status
-- - Project deadlines and reward amounts
-- - Project finalization status
-- - Multisig approvals (4-of-4)
-- - Reward share balances
-- - Vault USDC balance
--
-- To get complete project data:
-- 1. Query this database for title, description, submission_url
-- 2. Query smart contracts for deadlines, reward, status, finalized
-- 3. Combine in application layer or use event indexing service
