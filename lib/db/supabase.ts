import { createClient } from "@supabase/supabase-js";

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseUrl = rawSupabaseUrl
  ? rawSupabaseUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "")
  : undefined;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && (supabaseAnonKey || supabaseServiceKey));

// Client for public browser operations
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey || supabaseServiceKey!)
  : null;

// Admin client with service role key for cron worker & server side mutations
export const supabaseAdmin = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseServiceKey || supabaseAnonKey!)
  : null;
