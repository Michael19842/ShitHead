import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from './config';

let supabase: SupabaseClient | null = null;

export function initializeSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);
  }
  return supabase;
}

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    return initializeSupabase();
  }
  return supabase;
}

export { supabase };
