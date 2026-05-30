import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { getJstDayBounds, getJstDayBoundsFromString } from '@/lib/datetime';
import type { MealBatchInput, MealInput } from '@/types/meal';

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

  if (scope === 'today' || dateParam) {
    try {
      const { start, end } = dateParam
        ? getJstDayBoundsFromString(dateParam)
        : getJstDayBounds();
      query = query.gte('eaten_at', start).lte('eaten_at', end);
    } catch {
      return NextResponse.json({ error: 'invalid date' }, { status: 400 });
    }
  }

  const { data, error: dbError } = await query.order('eaten_at', { ascending: false });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ meals: data });
}

function formatFoodName(name: string, amount: string) {
  return amount ? `${name.trim()} (${amount.trim()})` : name.trim();
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
