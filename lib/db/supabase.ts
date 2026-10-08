import { createClient } from "@supabase/supabase-js";

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseUrl = rawSupabaseUrl
  ? rawSupabaseUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "")
  : undefined;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isServer = typeof window === "undefined";

// Browser client: used ONLY for Supabase Auth (Google sign-in). All data access
// goes through the API routes using the service-role client below. RLS denies
// the anon key access to every table.
export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Server-only admin client. Never falls back to the anon key.
export const supabaseAdmin =
  isServer && supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

if (isServer && supabaseUrl && !supabaseServiceKey && process.env.NODE_ENV === "production") {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is required in production when NEXT_PUBLIC_SUPABASE_URL is set"
  );
}

export const isSupabaseConfigured = Boolean(supabaseAdmin);
