export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Meal {
  id: string;
  user_id: string;
  meal_type: MealType;
  food_name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  eaten_at: string;
  created_at: string;
}

export interface MealInput {
  meal_type: MealType;
  food_name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  eaten_at: string;
}

export interface FoodItemInput {
  name: string;
  amount: string;
}

export interface FoodItemWithNutrition extends FoodItemInput {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface MealBatchInput {
  meal_type: MealType;
  eaten_at: string;
  items: FoodItemWithNutrition[];
}
