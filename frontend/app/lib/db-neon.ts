/**
 * NeonDB Database Client
 *
 * Serverless Postgres database client using Vercel's NeonDB integration.
 * Replaces Supabase with raw SQL queries for better control and performance.
 *
 * Uses pg library for local development and @vercel/postgres for production.
 */

import { Pool, QueryResult } from 'pg';

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false, // NeonDB uses self-signed certs
  },
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Helper to execute SQL queries
async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const client = await pool.connect();
  try {
    const result = await client.query<T>(text, params);
    return result;
  } finally {
    client.release();
  }
}

// Template literal tag function for SQL queries (similar to @vercel/postgres syntax)
function sql<T = any>(strings: TemplateStringsArray, ...values: any[]): Promise<QueryResult<T>> {
  // Build the parameterized query
  let text = '';
  const params: any[] = [];

  strings.forEach((string, i) => {
    text += string;
    if (i < values.length) {
      params.push(values[i]);
      text += `$${params.length}`;
    }
  });

  return query<T>(text, params);
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface User {
  id: string;
  wallet_address: string;
  username: string | null;
  referrer_address: string | null;
  skills: {
    responses: string[];
  } | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  contract_key: string;
  assignee_address: string | null;
  title: string;
  description: string | null;
  submission_url: string | null;
  submission_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CouncilVote {
  id: string;
  project_id: string;
  judge_id: string;
  judge_name: string | null;
  vote: boolean;
  reason: string | null;
  ai_provider: string | null;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  user_address: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_address: string;
  referred_address: string;
  referral_level: number;
  total_earned: string;
  created_at: string;
}

// ============================================================================
// USER OPERATIONS
// ============================================================================

/**
 * Get user by wallet address
 */
export async function getUserByWallet(
  walletAddress: string
): Promise<User | null> {
  const normalizedAddress = walletAddress.toLowerCase();

  const result = await sql<User>`
    SELECT * FROM users
    WHERE wallet_address = ${normalizedAddress}
    LIMIT 1
  `;

  return result.rows[0] || null;
}

/**
 * Create a new user
 */
export async function createUser(params: {
  walletAddress: string;
  username: string;
  skills?: { responses: string[] } | null;
  referrerAddress?: string | null;
}): Promise<User> {
  const normalizedAddress = params.walletAddress.toLowerCase();
  const normalizedReferrer = params.referrerAddress?.toLowerCase() || null;
  const skillsJson = params.skills ? JSON.stringify(params.skills) : null;

  const result = await query<User>(
    `INSERT INTO users (wallet_address, username, skills, referrer_address)
     VALUES ($1, $2, $3::jsonb, $4)
     RETURNING *`,
    [normalizedAddress, params.username, skillsJson, normalizedReferrer]
  );

  return result.rows[0];
}

/**
 * Update user profile
 */
export async function updateUser(params: {
  walletAddress: string;
  username?: string;
  skills?: { responses: string[] };
}): Promise<User> {
  const normalizedAddress = params.walletAddress.toLowerCase();
  const skillsJson = params.skills ? JSON.stringify(params.skills) : null;

  // Build dynamic update query
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (params.username !== undefined) {
    updates.push(`username = $${paramIndex++}`);
    values.push(params.username);
  }

  if (params.skills !== undefined) {
    updates.push(`skills = $${paramIndex++}::jsonb`);
    values.push(skillsJson);
  }

  if (updates.length === 0) {
    // No updates, just return the existing user
    const user = await getUserByWallet(normalizedAddress);
    if (!user) throw new Error('User not found');
    return user;
  }

  values.push(normalizedAddress);

  const text = `
    UPDATE users
    SET ${updates.join(', ')}, updated_at = NOW()
    WHERE wallet_address = $${paramIndex}
    RETURNING *
  `;

  const result = await query<User>(text, values);
  return result.rows[0];
}

/**
 * Check if username is taken
 */
export async function isUsernameTaken(username: string): Promise<boolean> {
  const result = await query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM users WHERE username = $1) as exists',
    [username]
  );

  return result.rows[0].exists;
}

// ============================================================================
// PROJECT OPERATIONS
// ============================================================================

/**
 * Create a new project
 */
export async function createProject(params: {
  contractKey: string;
  assigneeAddress: string;
  title: string;
  description: string;
}): Promise<Project> {
  const normalizedAssignee = params.assigneeAddress.toLowerCase();

  const result = await query<Project>(
    `INSERT INTO projects (contract_key, assignee_address, title, description)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [params.contractKey, normalizedAssignee, params.title, params.description]
  );

  return result.rows[0];
}

/**
 * Get projects by assignee
 */
export async function getProjectsByUser(walletAddress: string): Promise<Project[]> {
  const normalizedAddress = walletAddress.toLowerCase();

  const result = await query<Project>(
    `SELECT * FROM projects
     WHERE assignee_address = $1
     ORDER BY created_at DESC`,
    [normalizedAddress]
  );

  return result.rows;
}

/**
 * Update project submission
 */
export async function updateProjectSubmission(params: {
  projectId: string;
  submissionUrl?: string;
  submissionNotes?: string;
}): Promise<Project> {
  const result = await query<Project>(
    `UPDATE projects
     SET
       submission_url = $1,
       submission_notes = $2,
       updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [params.submissionUrl || null, params.submissionNotes || null, params.projectId]
  );

  return result.rows[0];
}

/**
 * Get project by contract key
 */
export async function getProjectByContractKey(contractKey: string): Promise<Project | null> {
  const result = await query<Project>(
    `SELECT * FROM projects
     WHERE contract_key = $1
     LIMIT 1`,
    [contractKey]
  );

  return result.rows[0] || null;
}

// ============================================================================
// COUNCIL VOTE OPERATIONS
// ============================================================================

/**
 * Save a council vote
 */
export async function saveCouncilVote(params: {
  projectId: string;
  judgeId: string;
  judgeName: string;
  vote: boolean;
  reason: string;
  aiProvider: string;
}): Promise<CouncilVote> {
  const result = await query<CouncilVote>(
    `INSERT INTO council_votes (project_id, judge_id, judge_name, vote, reason, ai_provider)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (project_id, judge_id)
     DO UPDATE SET
       vote = EXCLUDED.vote,
       reason = EXCLUDED.reason,
       timestamp = NOW()
     RETURNING *`,
    [params.projectId, params.judgeId, params.judgeName, params.vote, params.reason, params.aiProvider]
  );

  return result.rows[0];
}

/**
 * Get all votes for a project
 */
export async function getProjectVotes(projectId: string): Promise<CouncilVote[]> {
  const result = await query<CouncilVote>(
    `SELECT * FROM council_votes
     WHERE project_id = $1
     ORDER BY timestamp ASC`,
    [projectId]
  );

  return result.rows;
}

// ============================================================================
// CHAT MESSAGE OPERATIONS
// ============================================================================

/**
 * Save a chat message
 */
export async function saveChatMessage(params: {
  userAddress: string;
  role: 'user' | 'assistant';
  content: string;
}): Promise<ChatMessage> {
  const normalizedAddress = params.userAddress.toLowerCase();

  const result = await query<ChatMessage>(
    `INSERT INTO chat_messages (user_address, role, content)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [normalizedAddress, params.role, params.content]
  );

  return result.rows[0];
}

/**
 * Get chat history for a user
 */
export async function getChatHistory(
  walletAddress: string,
  limit: number = 50
): Promise<ChatMessage[]> {
  const normalizedAddress = walletAddress.toLowerCase();

  const result = await query<ChatMessage>(
    `SELECT * FROM chat_messages
     WHERE user_address = $1
     ORDER BY created_at ASC
     LIMIT $2`,
    [normalizedAddress, limit]
  );

  return result.rows;
}

// ============================================================================
// REFERRAL OPERATIONS
// ============================================================================

/**
 * Create a referral relationship
 */
export async function createReferral(params: {
  referrerAddress: string;
  referredAddress: string;
  referralLevel: number;
}): Promise<void> {
  const normalizedReferrer = params.referrerAddress.toLowerCase();
  const normalizedReferred = params.referredAddress.toLowerCase();

  // Use INSERT ... ON CONFLICT DO NOTHING to ignore duplicates
  await query(
    `INSERT INTO referrals (referrer_address, referred_address, referral_level)
     VALUES ($1, $2, $3)
     ON CONFLICT (referrer_address, referred_address) DO NOTHING`,
    [normalizedReferrer, normalizedReferred, params.referralLevel]
  );
}

/**
 * Get all referrals for a user
 */
export async function getReferralTree(walletAddress: string): Promise<Referral[]> {
  const normalizedAddress = walletAddress.toLowerCase();

  const result = await query<Referral>(
    `SELECT * FROM referrals
     WHERE referrer_address = $1
     ORDER BY created_at DESC`,
    [normalizedAddress]
  );

  return result.rows;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Execute a raw SQL query (for advanced use cases)
 */
export { query };

/**
 * Check database connection
 */
export async function checkConnection(): Promise<boolean> {
  try {
    await query('SELECT 1 as connected');
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}
