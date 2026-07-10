type PfcItem = {
  key: string;
  label: string;
  value: number;
  rate: number | null;
  unit: string;
};

const BAR_COLORS: Record<string, string> = {
  calories: 'bg-emerald-500',
  protein: 'bg-blue-500',
  fat: 'bg-amber-500',
  carbs: 'bg-violet-500',
};

export default function PfcAchievement({ items }: { items: PfcItem[] }) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.key} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-gray-600">
              {item.label}
              <span className="ml-1.5 text-gray-400">
                {item.value}
                {item.unit}
              </span>
            </span>
            <span className="shrink-0 text-sm font-semibold text-gray-800">
              {item.rate != null ? `${item.rate}%` : '目標未設定'}
            </span>
          </div>
          <div className="progress-track">
            <div
              className={`progress-fill ${BAR_COLORS[item.key] ?? 'bg-blue-500'}`}
              style={{ width: `${Math.min(100, item.rate ?? 0)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
