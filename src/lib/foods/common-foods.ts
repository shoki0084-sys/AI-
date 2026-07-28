/** 定番の食事候補（分量の目安付き） */
export type CommonFood = {
  name: string;
  amount: string;
};

export const COMMON_FOODS: CommonFood[] = [
  { name: '白米', amount: '150g' },
  { name: '玄米', amount: '150g' },
  { name: 'オートミール', amount: '40g' },
  { name: '食パン', amount: '6枚切り1枚' },
  { name: '鶏むね肉', amount: '100g' },
  { name: '鶏ささみ', amount: '100g' },
  { name: '卵', amount: '1個' },
  { name: '納豆', amount: '1パック' },
  { name: '豆腐（木綿）', amount: '150g' },
  { name: 'ヨーグルト（無糖）', amount: '100g' },
  { name: 'バナナ', amount: '1本' },
  { name: 'りんご', amount: '1個' },
  { name: 'サラダチキン', amount: '1袋' },
  { name: 'プロテイン（ホエイ）', amount: '1スクープ' },
  { name: '牛乳', amount: '200ml' },
  { name: '味噌汁', amount: '1杯' },
  { name: 'サバ缶', amount: '1缶' },
  { name: 'ツナ（水煮）', amount: '1缶' },
  { name: 'ブロッコリー', amount: '100g' },
  { name: 'さつまいも', amount: '100g' },
];
