'use client';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { toJstDateString } from '@/lib/datetime';

type Meal = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  eaten_at: string;
};

const COLORS = {
  protein: '#3b82f6',
  fat: '#f59e0b',
  carbs: '#8b5cf6',
  calories: '#10b981',
  grid: '#f3f4f6',
  axis: '#9ca3af',
};

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function aggregateByDay(meals: Meal[]) {
  const byDay = new Map<string, { calories: number; protein: number; fat: number; carbs: number }>();
  for (const m of meals) {
    const day = toJstDateString(m.eaten_at);
    const cur = byDay.get(day) ?? { calories: 0, protein: 0, fat: 0, carbs: 0 };
    byDay.set(day, {
      calories: cur.calories + Number(m.calories ?? 0),
      protein: cur.protein + Number(m.protein ?? 0),
      fat: cur.fat + Number(m.fat ?? 0),
      carbs: cur.carbs + Number(m.carbs ?? 0),
    });
  }
  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({
      date: day.slice(5),
      protein: round1(v.protein),
      fat: round1(v.fat),
      carbs: round1(v.carbs),
      calories: Math.round(v.calories),
    }));
}

export default function ClientPfcChart({ meals }: { meals: Meal[] }) {
  const data = aggregateByDay(meals);

  if (!data.length) {
    return <p className="text-sm text-gray-400">食事の記録がありません。</p>;
  }

  return (
    <div className="h-72 w-full -mx-1">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: COLORS.axis }}
            tickLine={false}
            axisLine={{ stroke: COLORS.grid }}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 10, fill: COLORS.axis }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 10, fill: COLORS.axis }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid #f3f4f6',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              fontSize: '13px',
            }}
            formatter={(value: number, name: string) => {
              if (name === 'カロリー') return [`${value} kcal`, name];
              return [`${value} g`, name];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
          <Bar yAxisId="left" dataKey="protein" name="タンパク質" fill={COLORS.protein} radius={[4, 4, 0, 0]} barSize={12} />
          <Bar yAxisId="left" dataKey="fat" name="脂質" fill={COLORS.fat} radius={[4, 4, 0, 0]} barSize={12} />
          <Bar yAxisId="left" dataKey="carbs" name="炭水化物" fill={COLORS.carbs} radius={[4, 4, 0, 0]} barSize={12} />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="calories"
            name="カロリー"
            stroke={COLORS.calories}
            strokeWidth={2}
            dot={{ r: 3, fill: COLORS.calories, strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
