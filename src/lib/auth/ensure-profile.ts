import type { SupabaseClient } from '@supabase/supabase-js';

export async function ensureUserProfile(
  supabase: SupabaseClient,
  userId: string
) {
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (data) return;

  await supabase.from('users').insert({ id: userId });
}
