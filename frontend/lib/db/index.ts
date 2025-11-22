/**
 * Neon Postgres Database Client
 *
 * This module provides database access for the GrowChain Blob system.
 * Uses Neon serverless Postgres for edge-compatible database access.
 */

import { neon } from '@neondatabase/serverless';

// Mock database URL for development (replace with real Neon URL in .env)
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://mock:mock@localhost:5432/mock';

export const sql = neon(DATABASE_URL);

// Type definitions
export interface User {
  id: string;
  wallet_address: string;
  username: string;
  referrer_address?: string;
  skills?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  total_earned: number;
  jobs_completed: number;
  reputation_score: number;
}

export interface Project {
  id: string;
  contract_address?: string;
  assignee_address: string;
  title: string;
  description: string;
  price_estimate: number;
  deadline_start: Date;
  deadline_end: Date;
  status: 'wip' | 'submitted' | 'approved' | 'rejected' | 'paid';
  submission_url?: string;
  submission_notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Referral {
  id: string;
  referrer_address: string;
  referred_address: string;
  referral_level: number;
  created_at: Date;
  total_earned: number;
}

export interface CouncilVote {
  id: string;
  project_id: string;
  judge_id: string;
  vote: boolean;
  reason: string;
  timestamp: Date;
}

export interface ChatMessage {
  id: string;
  user_address: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: Date;
}

/**
 * Database helper functions
 */

// Users
export async function createUser(
  wallet_address: string,
  username: string,
  referrer_address?: string
): Promise<User> {
  const result = await sql`
    INSERT INTO users (wallet_address, username, referrer_address)
    VALUES (${wallet_address}, ${username}, ${referrer_address || null})
    RETURNING *
  `;
  return result[0] as User;
}

export async function getUserByWallet(wallet_address: string): Promise<User | null> {
  const result = await sql`
    SELECT * FROM users WHERE wallet_address = ${wallet_address} LIMIT 1
  `;
  return result.length > 0 ? (result[0] as User) : null;
}

export async function updateUserSkills(wallet_address: string, skills: Record<string, any>): Promise<void> {
  await sql`
    UPDATE users
    SET skills = ${JSON.stringify(skills)}, updated_at = NOW()
    WHERE wallet_address = ${wallet_address}
  `;
}

// Referrals
export async function createReferral(
  referrer_address: string,
  referred_address: string,
  level: number
): Promise<void> {
  await sql`
    INSERT INTO referrals (referrer_address, referred_address, referral_level)
    VALUES (${referrer_address}, ${referred_address}, ${level})
    ON CONFLICT (referrer_address, referred_address) DO NOTHING
  `;
}

export async function getReferralTree(wallet_address: string): Promise<Referral[]> {
  const result = await sql`
    SELECT * FROM referrals
    WHERE referrer_address = ${wallet_address}
    ORDER BY created_at DESC
  `;
  return result as Referral[];
}

// Projects
export async function createProject(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
  const result = await sql`
    INSERT INTO projects (
      assignee_address, title, description, price_estimate,
      deadline_start, deadline_end, status
    )
    VALUES (
      ${project.assignee_address}, ${project.title}, ${project.description},
      ${project.price_estimate}, ${project.deadline_start}, ${project.deadline_end},
      ${project.status}
    )
    RETURNING *
  `;
  return result[0] as Project;
}

export async function getProjectsByUser(wallet_address: string): Promise<Project[]> {
  const result = await sql`
    SELECT * FROM projects
    WHERE assignee_address = ${wallet_address}
    ORDER BY created_at DESC
  `;
  return result as Project[];
}

export async function updateProjectStatus(
  project_id: string,
  status: Project['status'],
  submission_url?: string,
  submission_notes?: string
): Promise<void> {
  await sql`
    UPDATE projects
    SET status = ${status},
        submission_url = ${submission_url || null},
        submission_notes = ${submission_notes || null},
        updated_at = NOW()
    WHERE id = ${project_id}
  `;
}

// Chat history
export async function saveChatMessage(
  user_address: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  await sql`
    INSERT INTO chat_messages (user_address, role, content)
    VALUES (${user_address}, ${role}, ${content})
  `;
}

export async function getChatHistory(user_address: string, limit: number = 50): Promise<ChatMessage[]> {
  const result = await sql`
    SELECT * FROM chat_messages
    WHERE user_address = ${user_address}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return (result as ChatMessage[]).reverse(); // Return in chronological order
}

// Treasury
export async function getCurrentJoiningFee(): Promise<number> {
  const result = await sql`
    SELECT joining_fee FROM treasury LIMIT 1
  `;
  return result[0]?.joining_fee || 50;
}

export async function updateTreasuryBalance(deposit: number, payout: number = 0): Promise<void> {
  await sql`
    UPDATE treasury
    SET total_balance = total_balance + ${deposit} - ${payout},
        total_deposits = total_deposits + ${deposit},
        total_payouts = total_payouts + ${payout},
        updated_at = NOW()
  `;
}
