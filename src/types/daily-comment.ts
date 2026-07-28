export const CONDITION_OPTIONS = [
  '良い',
  'やや良い',
  '普通',
  'やや悪い',
  '悪い',
] as const;

export const HUNGER_OPTIONS = [
  '強い',
  'やや強い',
  '普通',
  'やや弱い',
  '弱い',
  'なし',
] as const;

export type ConditionOption = (typeof CONDITION_OPTIONS)[number];
export type HungerOption = (typeof HUNGER_OPTIONS)[number];

export interface DailyComment {
  id: string;
  user_id: string;
  comment_date: string;
  condition: string | null;
  sleep_hours: number | null;
  hunger: string | null;
  free_comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyCommentInput {
  comment_date: string;
  condition?: string | null;
  sleep_hours?: number | null;
  hunger?: string | null;
  free_comment?: string | null;
}
