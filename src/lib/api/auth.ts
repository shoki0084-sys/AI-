import { NextResponse } from 'next/server';
import { SUPABASE_ENV_ERROR, hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

export async function getAuthContext() {
  if (!hasSupabaseEnv()) {
    return {
      error: NextResponse.json({ error: SUPABASE_ENV_ERROR }, { status: 503 }),
      user: null,
      supabase: null,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json(
        { error: 'ログインが必要です。ログイン画面からアカウントを作成してください。' },
        { status: 401 }
      ),
      user: null,
      supabase,
    };
  }

  return { error: null, user, supabase };
}
