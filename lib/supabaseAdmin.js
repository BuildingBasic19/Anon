// SERVER-SIDE ONLY. Never import this in a page component or anything that
// runs in the browser — the service role key bypasses Row Level Security
// entirely. It must only be used inside /pages/api/* routes.
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
