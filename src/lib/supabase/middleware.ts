import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { hasSupabaseEnv } from '@/lib/env';

const PUBLIC_PATHS = ['/login', '/auth/callback'];

/** リダイレクト時も getUser() で更新したセッション Cookie を引き継ぐ */
function withSessionCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value }) => {
    to.cookies.set(name, value);
  });
  return to;
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!hasSupabaseEnv()) {
    if (pathname === '/login') return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('error', 'config');
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isCronApi = pathname.startsWith('/api/cron/');

  if (!user && !isPublic && !isCronApi) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }

    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return withSessionCookies(response, NextResponse.redirect(url));
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return withSessionCookies(response, NextResponse.redirect(url));
  }

  return response;
}
