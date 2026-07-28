export type BodyPart =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'legs'
  | 'core'
  | 'cardio';

export type ExerciseDef = {
  name: string;
  /** ひらがな読み（五十音ソート用） */
  reading: string;
  part: BodyPart;
};

export const BODY_PART_LABELS: Record<BodyPart, string> = {
  chest: '胸',
  back: '背中',
  shoulders: '肩',
  arms: '腕',
  legs: '脚',
  core: '体幹',
  cardio: '有酸素',
};

export const EXERCISES: ExerciseDef[] = [
  // 胸
  { name: 'ベンチプレス', reading: 'べんちぷれす', part: 'chest' },
  { name: 'インクラインベンチプレス', reading: 'いんくらいんべんちぷれす', part: 'chest' },
  { name: 'ダンベルプレス', reading: 'だんべるぷれす', part: 'chest' },
  { name: 'ダンベルフライ', reading: 'だんべるふらい', part: 'chest' },
  { name: 'ケーブルフライ', reading: 'けーぶるふらい', part: 'chest' },
  { name: 'プッシュアップ', reading: 'ぷっしゅあっぷ', part: 'chest' },
  { name: 'ディップス', reading: 'でぃっぷす', part: 'chest' },
  // 背中
  { name: 'デッドリフト', reading: 'でっどりふと', part: 'back' },
  { name: '懸垂', reading: 'けんすい', part: 'back' },
  { name: 'ラットプルダウン', reading: 'らっとぷるだうん', part: 'back' },
  { name: 'ベントオーバーロウ', reading: 'べんとおーばーろう', part: 'back' },
  { name: 'シーテッドロウ', reading: 'しーてっどろう', part: 'back' },
  { name: 'ワンハンドロウ', reading: 'わんはんどろう', part: 'back' },
  { name: 'フェイスプル', reading: 'ふぇいすぷる', part: 'back' },
  // 肩
  { name: 'ショルダープレス', reading: 'しょるだーぷれす', part: 'shoulders' },
  { name: 'サイドレイズ', reading: 'さいどれいず', part: 'shoulders' },
  { name: 'フロントレイズ', reading: 'ふろんとれいず', part: 'shoulders' },
  { name: 'リアデルトフライ', reading: 'りあでるとふらい', part: 'shoulders' },
  { name: 'アップライトロウ', reading: 'あっぷらいとろう', part: 'shoulders' },
  { name: 'シュラッグ', reading: 'しゅらっぐ', part: 'shoulders' },
  // 腕
  { name: 'バーベルカール', reading: 'ばーべるかーる', part: 'arms' },
  { name: 'ダンベルカール', reading: 'だんべるかーる', part: 'arms' },
  { name: 'ハンマーカール', reading: 'はんまーかーる', part: 'arms' },
  { name: 'ケーブルプッシュダウン', reading: 'けーぶるぷっしゅだうん', part: 'arms' },
  { name: 'スカルクラッシャー', reading: 'すかるくらっしゅー', part: 'arms' },
  { name: 'フレンチプレス', reading: 'ふれんちぷれす', part: 'arms' },
  // 脚
  { name: 'スクワット', reading: 'すくわっと', part: 'legs' },
  { name: 'フロントスクワット', reading: 'ふろんとすくわっと', part: 'legs' },
  { name: 'レッグプレス', reading: 'れっぐぷれす', part: 'legs' },
  { name: 'レッグエクステンション', reading: 'れっぐえくすてんしょん', part: 'legs' },
  { name: 'レッグカール', reading: 'れっぐかーる', part: 'legs' },
  { name: 'ルーマニアンデッドリフト', reading: 'るーまにあんでっどりふと', part: 'legs' },
  { name: 'ブルガリアンスクワット', reading: 'ぶるがりあんすくわっと', part: 'legs' },
  { name: 'ランジ', reading: 'らんじ', part: 'legs' },
  { name: 'カーフレイズ', reading: 'かーふれいず', part: 'legs' },
  { name: 'ヒップスラスト', reading: 'ひっぷすらすと', part: 'legs' },
  // 体幹
  { name: 'プランク', reading: 'ぷらんく', part: 'core' },
  { name: 'アブローラー', reading: 'あぶろーらー', part: 'core' },
  { name: 'クランチ', reading: 'くらんち', part: 'core' },
  { name: 'レッグレイズ', reading: 'れっぐれいず', part: 'core' },
  { name: 'ロシアンツイスト', reading: 'ろしあんついすと', part: 'core' },
  { name: 'サイドプランク', reading: 'さいどぷらんく', part: 'core' },
  // 有酸素
  { name: 'ランニング', reading: 'らんにんぐ', part: 'cardio' },
  { name: 'ウォーキング', reading: 'うぉーきんぐ', part: 'cardio' },
  { name: 'バイク', reading: 'ばいく', part: 'cardio' },
  { name: 'ローイング', reading: 'ろーいんぐ', part: 'cardio' },
  { name: 'ジャンプロープ', reading: 'じゃんぷろーぷ', part: 'cardio' },
];

export const GOJUON_ROWS: { label: string; chars: string[] }[] = [
  { label: 'あ', chars: ['あ', 'い', 'う', 'え', 'お'] },
  { label: 'か', chars: ['か', 'き', 'く', 'け', 'こ', 'が', 'ぎ', 'ぐ', 'げ', 'ご'] },
  { label: 'さ', chars: ['さ', 'し', 'す', 'せ', 'そ', 'ざ', 'じ', 'ず', 'ぜ', 'ぞ'] },
  { label: 'た', chars: ['た', 'ち', 'つ', 'て', 'と', 'だ', 'ぢ', 'づ', 'で', 'ど'] },
  { label: 'な', chars: ['な', 'に', 'ぬ', 'ね', 'の'] },
  { label: 'は', chars: ['は', 'ひ', 'ふ', 'へ', 'ほ', 'ば', 'び', 'ぶ', 'べ', 'ぼ', 'ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ'] },
  { label: 'ま', chars: ['ま', 'み', 'む', 'め', 'も'] },
  { label: 'や', chars: ['や', 'ゆ', 'よ'] },
  { label: 'ら', chars: ['ら', 'り', 'る', 'れ', 'ろ'] },
  { label: 'わ', chars: ['わ', 'を', 'ん'] },
];

export function exercisesByPart(part: BodyPart) {
  return EXERCISES.filter((e) => e.part === part).sort((a, b) =>
    a.reading.localeCompare(b.reading, 'ja')
  );
}

export function exercisesByGojuon(rowLabel: string) {
  const row = GOJUON_ROWS.find((r) => r.label === rowLabel);
  if (!row) return [];
  const set = new Set(row.chars);
  return EXERCISES.filter((e) => set.has(e.reading[0])).sort((a, b) =>
    a.reading.localeCompare(b.reading, 'ja')
  );
}
