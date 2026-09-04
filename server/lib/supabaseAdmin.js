/**
 * Server-Side Supabase Admin Client (FR-003)
 * Privileged database access using SUPABASE_SERVICE_ROLE_KEY.
 * STRICTLY restricted to backend server processes; NEVER exposed to client bundles.
 */

export function getAdminSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    if (process.env.NODE_ENV === 'test') {
      return { configured: false, url: '', serviceRoleKey: '' };
    }
    console.warn('[Security Notice]: SUPABASE_SERVICE_ROLE_KEY is not configured on the server.');
  }

  return {
    configured: Boolean(supabaseUrl && serviceRoleKey),
    url: supabaseUrl || '',
    serviceRoleKey: serviceRoleKey || '',
  };
}
