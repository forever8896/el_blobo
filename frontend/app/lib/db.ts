import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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
