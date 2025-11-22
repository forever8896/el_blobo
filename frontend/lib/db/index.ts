/**
 * Supabase Database Client
 *
 * This module provides database access for the GrowChain Blob system.
 * Uses Supabase client for serverless database access with RLS support.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions
export interface User {
  id: string;
  wallet_address: string;
  username: string;
  referrer_address?: string;
  skills?: Record<string, unknown>;
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
  const { data, error } = await supabase
    .from('users')
    .insert({
      wallet_address,
      username,
      referrer_address: referrer_address || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as User;
}

export async function getUserByWallet(wallet_address: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', wallet_address)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data as User | null;
}

export async function updateUserSkills(wallet_address: string, skills: Record<string, unknown>): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ skills, updated_at: new Date().toISOString() })
    .eq('wallet_address', wallet_address);

  if (error) throw error;
}

// Referrals
export async function createReferral(
  referrer_address: string,
  referred_address: string,
  level: number
): Promise<void> {
  const { error } = await supabase
    .from('referrals')
    .insert({
      referrer_address,
      referred_address,
      referral_level: level,
    });

  // Ignore unique constraint violations (ON CONFLICT DO NOTHING)
  if (error && error.code !== '23505') throw error;
}

export async function getReferralTree(wallet_address: string): Promise<Referral[]> {
  const { data, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_address', wallet_address)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Referral[];
}

// Projects
export async function createProject(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      assignee_address: project.assignee_address,
      title: project.title,
      description: project.description,
      price_estimate: project.price_estimate,
      deadline_start: project.deadline_start.toISOString(),
      deadline_end: project.deadline_end.toISOString(),
      status: project.status,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Project;
}

export async function getProjectsByUser(wallet_address: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('assignee_address', wallet_address)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Project[];
}

export async function updateProjectStatus(
  project_id: string,
  status: Project['status'],
  submission_url?: string,
  submission_notes?: string
): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({
      status,
      submission_url: submission_url || null,
      submission_notes: submission_notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', project_id);

  if (error) throw error;
}

// Chat history
export async function saveChatMessage(
  user_address: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  const { error } = await supabase
    .from('chat_messages')
    .insert({
      user_address,
      role,
      content,
    });

  if (error) throw error;
}

export async function getChatHistory(user_address: string, limit: number = 50): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_address', user_address)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data as ChatMessage[];
}

// Treasury
export async function getCurrentJoiningFee(): Promise<number> {
  const { data, error } = await supabase
    .from('treasury')
    .select('joining_fee')
    .limit(1)
    .single();

  if (error) return 50; // Default fallback
  return data?.joining_fee || 50;
}

export async function updateTreasuryBalance(deposit: number, payout: number = 0): Promise<void> {
  // Note: This requires a Postgres function for atomic updates
  // For now, using RPC call (you'll need to create this function in Supabase)
  const { error } = await supabase.rpc('update_treasury_balance', {
    deposit_amount: deposit,
    payout_amount: payout,
  });

  if (error) throw error;
}
