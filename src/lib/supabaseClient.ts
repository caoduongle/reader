/// <reference types="vite/client" />

/**
 * Client-side Database Client (FR-003)
 * STRICTLY uses public anonymous key (VITE_SUPABASE_ANON_KEY).
 * Service-role key is NEVER bundled or exposed to client applications.
 * All requests through this client are subject to PostgreSQL Row-Level Security (RLS).
 */

export interface SupabaseConfig {
  url?: string;
  anonKey?: string;
}

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-project.supabase.co' &&
    supabaseAnonKey !== 'your-supabase-public-anon-key'
);

/**
 * Returns configuration parameters for client database operations.
 */
export function getClientSupabaseConfig(): SupabaseConfig {
  return {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  };
}
