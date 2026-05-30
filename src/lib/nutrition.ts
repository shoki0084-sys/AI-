export function calcCaloriesFromPfc(protein: number, fat: number, carbs: number) {
  return Math.round((protein * 4 + fat * 9 + carbs * 4) * 10) / 10;
}
