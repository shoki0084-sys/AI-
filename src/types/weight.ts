export interface WeightLog {
  id: string;
  user_id: string;
  weight_kg: number;
  body_fat: number | null;
  measured_at: string;
  created_at: string;
}

export interface WeightInput {
  weight_kg: number;
  body_fat?: number | null;
  measured_at: string;
}
