import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Browser client: keeps the anonymous session in localStorage.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server client that acts as the caller, so row level security applies to them.
// Returns null when the request has no token.
export function supabaseForRequest(req: Request) {
  const authorization = req.headers.get('authorization');
  if (!authorization) return null;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
