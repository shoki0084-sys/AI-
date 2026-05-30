import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getAuthContext } from '@/lib/api/auth';
import { estimateNutrition } from '@/lib/openai/nutrition-estimate';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { error } = await getAuthContext();
  if (error) return error;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY が未設定です。.env.local を確認してください。' },
      { status: 503 }
    );
  }

  const body = (await req.json()) as {
    items?: { name?: string; amount?: string }[];
  };

  const items = (body.items ?? [])
    .map((item) => ({
      name: item.name?.trim() ?? '',
      amount: item.amount?.trim() ?? '',
    }))
    .filter((item) => item.name);

  if (items.length === 0) {
    return NextResponse.json({ error: '食材を1つ以上入力してください' }, { status: 400 });
  }

  if (items.some((item) => !item.amount)) {
    return NextResponse.json({ error: 'すべての食材に分量を入力してください' }, { status: 400 });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const results = await estimateNutrition(openai, items);
    return NextResponse.json({ items: results });
  } catch (e) {
    return NextResponse.json(
      { error: `栄養計算エラー: ${(e as Error).message}` },
      { status: 502 }
    );
  }
}
