-- ============================================================================
-- NeonDB Migration Script for The Blob
-- ============================================================================
-- This script migrates the database schema from Supabase to NeonDB
-- Run this script in your Vercel Postgres (NeonDB) database
--
-- Instructions:
-- 1. Create a new Vercel Postgres database in your project
-- 2. Get the connection string from Vercel Dashboard
-- 3. Connect using psql or the Vercel dashboard SQL editor
-- 4. Run this entire script
-- ============================================================================

-- Enable UUID extension (NeonDB supports this)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- Stores user profiles and wallet addresses
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  referrer_address TEXT, -- Address of the person who invited them
  skills JSONB, -- Interview responses stored as JSON array
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_referrer ON users(referrer_address);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PROJECTS TABLE
-- Stores job/project metadata (descriptions, submissions)
-- Onchain data (deadlines, rewards, status) queried from smart contracts
-- ============================================================================
CREATE TABLE IF NOT EXISTS projects (
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
CREATE INDEX IF NOT EXISTS idx_projects_contract_key ON projects(contract_key);
CREATE INDEX IF NOT EXISTS idx_projects_assignee ON projects(assignee_address);

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COUNCIL_VOTES TABLE
-- Stores AI judge evaluation results
-- ============================================================================
CREATE TABLE IF NOT EXISTS council_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  judge_id TEXT NOT NULL, -- 'judge1', 'judge2', 'judge3'
  judge_name TEXT, -- 'VALIDATOR-PRIME', 'CHAOS-ARBITER', 'IMPACT-SAGE'
  vote BOOLEAN NOT NULL, -- true = approve, false = reject
  reason TEXT, -- AI's reasoning for the vote
  ai_provider TEXT, -- 'OpenAI GPT-4', 'Grok (X.AI)', 'Google Gemini'
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_council_votes_project ON council_votes(project_id);
CREATE INDEX IF NOT EXISTS idx_council_votes_judge ON council_votes(judge_id);

-- Constraint: Each judge can only vote once per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_council_votes_unique_vote
  ON council_votes(project_id, judge_id);

-- ============================================================================
-- CHAT_MESSAGES TABLE
-- Stores conversation history between users and the AI agent
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_address TEXT REFERENCES users(wallet_address) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_address);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- ============================================================================
-- REFERRALS TABLE
-- Tracks referral tree structure
-- ============================================================================
CREATE TABLE IF NOT EXISTS referrals (
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
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_address);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_address);

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
-- ADMIN_SUGGESTIONS TABLE
-- Stores admin-defined suggestions that guide job creation AI
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_suggestions (
  id SERIAL PRIMARY KEY,
  suggestions TEXT NOT NULL,
  updated_by VARCHAR(42) NOT NULL, -- Admin wallet address who made the update
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick retrieval
CREATE INDEX IF NOT EXISTS idx_admin_suggestions_updated_at ON admin_suggestions(updated_at DESC);

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_admin_suggestions_updated_at ON admin_suggestions;
CREATE TRIGGER update_admin_suggestions_updated_at
  BEFORE UPDATE ON admin_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default suggestions (if none exist)
INSERT INTO admin_suggestions (suggestions, updated_by)
SELECT
  'ADMIN GUIDANCE FOR JOB CREATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The following suggestions help align user contributions with ecosystem goals:

PRIORITY AREAS:
1. Developer Tools & Infrastructure
   - SDKs, libraries, and frameworks that make building on Ronin easier
   - Documentation and tutorials for developers
   - Testing tools and deployment scripts

2. Community & Education
   - Educational content about the Ronin ecosystem
   - Community engagement initiatives
   - Social media content creation

3. DeFi & Smart Contracts
   - DeFi protocols and applications
   - Smart contract auditing and security
   - Liquidity and trading tools

4. Gaming & NFTs
   - Gaming integrations and tooling
   - NFT marketplaces and utilities
   - Play-to-earn mechanics

ECOSYSTEM ALIGNMENT:
- All work should contribute to Ronin ecosystem growth
- Focus on sustainable, long-term value creation
- Encourage collaboration and knowledge sharing
- Support both technical and non-technical contributors

QUALITY STANDARDS:
- Code submissions should be well-documented
- Content should be original and high-quality
- Projects should have clear deliverables
- Work should be verifiable and demonstrable
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  'system'
WHERE NOT EXISTS (SELECT 1 FROM admin_suggestions);

-- Add comment to table
COMMENT ON TABLE admin_suggestions IS 'Stores admin-defined suggestions that are injected into the job creation AI system prompt to guide and align user contributions with ecosystem goals';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Update .env with POSTGRES_URL from Vercel
-- 2. Remove old Supabase environment variables
-- 3. Test API endpoints
-- 4. Update application code to use NeonDB client
-- 5. Remove @supabase/supabase-js dependency
-- ============================================================================
