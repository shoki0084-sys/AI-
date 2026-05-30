import { createBrowserClient } from '@supabase/ssr';
import { hasSupabaseEnv, SUPABASE_ENV_ERROR } from '@/lib/env';

export function createClient() {
  if (!hasSupabaseEnv()) {
    throw new Error(SUPABASE_ENV_ERROR);
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
