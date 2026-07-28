/** "鶏むね肉 (100g)" → { name, amount } */
export function parseFoodName(foodName: string): { name: string; amount: string } {
  const trimmed = foodName.trim();
  const match = trimmed.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (match) {
    return { name: match[1].trim(), amount: match[2].trim() };
  }
  return { name: trimmed, amount: '' };
}

export function formatFoodName(name: string, amount: string) {
  const n = name.trim();
  const a = amount.trim();
  return a ? `${n} (${a})` : n;
}
