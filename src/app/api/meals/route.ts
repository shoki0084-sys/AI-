import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import {
  getJstDayBounds,
  getJstDayBoundsFromString,
  toJstDateString,
} from '@/lib/datetime';
import { formatFoodName } from '@/lib/foods/food-name';
import type { MealBatchInput, MealInput, MealType } from '@/types/meal';

const ALLOWED_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export async function GET(req: Request) {
  const { error, user, supabase } = await getAuthContext();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get('scope');
  const dateParam = searchParams.get('date');
  let query = supabase!
    .from('meals')
    .select('*')
    .eq('user_id', user!.id);

  let dayLabel: string | null = null;
  if (scope === 'today' || dateParam) {
    try {
      const bounds = dateParam
        ? getJstDayBoundsFromString(dateParam)
        : getJstDayBounds();
      dayLabel = bounds.label;
      // PostgREST 比較用に少しだけ余裕を持たせ、最終的に JST 日付で絞り込む
      const padMs = 12 * 60 * 60 * 1000;
      const startPad = new Date(new Date(bounds.start).getTime() - padMs).toISOString();
      const endPad = new Date(new Date(bounds.end).getTime() + padMs).toISOString();
      query = query.gte('eaten_at', startPad).lte('eaten_at', endPad);
    } catch {
      return NextResponse.json({ error: 'invalid date' }, { status: 400 });
    }
  }

  const { data, error: dbError } = await query.order('eaten_at', { ascending: false });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  const meals =
    dayLabel == null
      ? data
      : (data ?? []).filter((m) => toJstDateString(m.eaten_at) === dayLabel);

  return NextResponse.json({ meals });
}

/** 複数件の日時・区分を一括更新 */
export async function PATCH(req: Request) {
  const { error, user, supabase } = await getAuthContext();
  if (error) return error;

  const body = (await req.json()) as {
    ids?: string[];
    eaten_at?: string;
    meal_type?: MealType;
  };

  const ids = (body.ids ?? []).filter(Boolean);
  if (ids.length === 0) {
    return NextResponse.json({ error: 'ids is required' }, { status: 400 });
  }

  const updates: { eaten_at?: string; meal_type?: MealType } = {};
  if (body.eaten_at != null) {
    if (!body.eaten_at) {
      return NextResponse.json({ error: 'eaten_at is required' }, { status: 400 });
    }
    updates.eaten_at = body.eaten_at;
  }
  if (body.meal_type != null) {
    if (!ALLOWED_TYPES.includes(body.meal_type)) {
      return NextResponse.json({ error: 'invalid meal_type' }, { status: 400 });
    }
    updates.meal_type = body.meal_type;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 });
  }

  const { data, error: dbError } = await supabase!
    .from('meals')
    .update(updates)
    .eq('user_id', user!.id)
    .in('id', ids)
    .select();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ meals: data ?? [] });
}

export async function POST(req: Request) {
  const { error, user, supabase } = await getAuthContext();
  if (error) return error;

  const body = (await req.json()) as MealInput & Partial<MealBatchInput>;

  if (!ALLOWED_TYPES.includes(body.meal_type)) {
    return NextResponse.json({ error: 'invalid meal_type' }, { status: 400 });
  }
  if (!body.eaten_at) {
    return NextResponse.json({ error: 'eaten_at is required' }, { status: 400 });
  }

  const batchItems = body.items?.filter((item) => item.name?.trim()) ?? [];

  if (batchItems.length > 0) {
    const rows = batchItems.map((item) => ({
      user_id: user!.id,
      meal_type: body.meal_type,
      food_name: formatFoodName(item.name, item.amount),
      calories: item.calories ?? 0,
      protein: item.protein ?? 0,
      fat: item.fat ?? 0,
      carbs: item.carbs ?? 0,
      eaten_at: body.eaten_at,
    }));

    const { data, error: dbError } = await supabase!.from('meals').insert(rows).select();

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
    return NextResponse.json({ meals: data }, { status: 201 });
  }

  if (!body.food_name?.trim()) {
    return NextResponse.json({ error: 'food_name is required' }, { status: 400 });
  }

  const { data, error: dbError } = await supabase!
    .from('meals')
    .insert({
      user_id: user!.id,
      meal_type: body.meal_type,
      food_name: body.food_name.trim(),
      calories: body.calories ?? 0,
      protein: body.protein ?? 0,
      fat: body.fat ?? 0,
      carbs: body.carbs ?? 0,
      eaten_at: body.eaten_at,
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ meal: data }, { status: 201 });
}
