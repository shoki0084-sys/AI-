export interface TrainerMemo {
  id: string;
  trainer_id: string;
  client_id: string;
  user_id: string;
  memo_date: string;
  content: string;
  created_at: string;
}

export interface TrainerMemoInput {
  memo_date: string;
  content: string;
}
