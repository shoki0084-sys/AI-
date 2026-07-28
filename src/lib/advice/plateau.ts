/** 7日間の体重変化がこの範囲内なら停滞とみなす (kg) */
export const PLATEAU_THRESHOLD_KG = 0.3;

/**
 * 直近期間の体重変化から停滞かどうかを判定する。
 * 記録が2件未満の場合は判定不可（false）。
 */
export function isWeightPlateau(weightChangeKg: number | null): boolean {
  if (weightChangeKg == null) return false;
  return Math.abs(weightChangeKg) <= PLATEAU_THRESHOLD_KG;
}

export function formatWeightChangeKg(weightChangeKg: number | null): string {
  if (weightChangeKg == null) return 'データ不足';
  const sign = weightChangeKg > 0 ? '+' : '';
  return `${sign}${weightChangeKg}kg`;
}
