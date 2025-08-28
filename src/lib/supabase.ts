import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

export const createSupabaseServer = () =>
  createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });

export const createSupabaseBrowser = () =>
  createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
