export interface Workout {
  id: string;
  user_id: string;
  exercise_name: string;
  weight_kg: number;
  reps: number;
  sets: number;
  performed_at: string;
  note: string | null;
  created_at: string;
}

export interface WorkoutInput {
  exercise_name: string;
  weight_kg: number;
  reps: number;
  sets: number;
  performed_at: string;
  note?: string;
}

export interface ExerciseEntry {
  exercise_name: string;
  weight_kg: number;
  reps: number;
  sets: number;
}

export interface WorkoutBatchInput {
  performed_at: string;
  note?: string;
  exercises: ExerciseEntry[];
}
