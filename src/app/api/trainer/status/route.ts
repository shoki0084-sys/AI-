import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { isAdminEmail } from '@/lib/auth/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { error, user } = await getAuthContext();
  if (error) return NextResponse.json({ isTrainer: false });
  return NextResponse.json({ isTrainer: isAdminEmail(user!.email) });
}
