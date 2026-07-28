import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { formatFoodName } from '@/lib/foods/food-name';
import type { MealType } from '@/types/meal';

const ALLOWED_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

type Ctx = { params: { id: string } };

export async function PATCH(req: Request, ctx: Ctx) {
  const { error, user, supabase } = await getAuthContext();
  if (error) return error;

  const { id } = ctx.params;
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const body = (await req.json()) as {
    meal_type?: MealType;
    food_name?: string;
    name?: string;
    amount?: string;
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
    eaten_at?: string;
  };

  const updates: Record<string, string | number> = {};

  if (body.meal_type != null) {
    if (!ALLOWED_TYPES.includes(body.meal_type)) {
      return NextResponse.json({ error: 'invalid meal_type' }, { status: 400 });
    }
    updates.meal_type = body.meal_type;
  }
  if (body.name != null || body.amount != null) {
    const name = (body.name ?? '').trim();
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    updates.food_name = formatFoodName(name, body.amount ?? '');
  } else if (body.food_name != null) {
    const name = body.food_name.trim();
    if (!name) {
      return NextResponse.json({ error: 'food_name is required' }, { status: 400 });
    }
    updates.food_name = name;
  }
  if (body.eaten_at != null) {
    if (!body.eaten_at) {
      return NextResponse.json({ error: 'eaten_at is required' }, { status: 400 });
    }
    updates.eaten_at = body.eaten_at;
  }
  if (body.calories != null) updates.calories = Number(body.calories);
  if (body.protein != null) updates.protein = Number(body.protein);
  if (body.fat != null) updates.fat = Number(body.fat);
  if (body.carbs != null) updates.carbs = Number(body.carbs);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 });
  }

  const { data, error: dbError } = await supabase!
    .from('meals')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user!.id)
    .select()
    .maybeSingle();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ meal: data });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { error, user, supabase } = await getAuthContext();
  if (error) return error;

  const { id } = ctx.params;
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const { data, error: dbError } = await supabase!
    .from('meals')
    .delete()
    .eq('id', id)
    .eq('user_id', user!.id)
    .select('id')
    .maybeSingle();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
