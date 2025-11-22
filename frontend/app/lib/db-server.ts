import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key
// This bypasses Row Level Security (RLS) and should only be used in API routes

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
}

// Try to use service role key first, fallback to anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Database types
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

export interface ChatMessage {
  id: string;
  user_address: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
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
