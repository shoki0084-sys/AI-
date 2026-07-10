'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type WeightRow = { weight_kg: number; body_fat: number | null; measured_at: string };

const CHART_COLORS = {
  weight: '#2563eb',
  bodyFat: '#f59e0b',
  grid: '#f3f4f6',
  axis: '#9ca3af',
};

export default function ClientWeightChart({ weights }: { weights: WeightRow[] }) {
  if (!weights.length) {
    return <p className="text-sm text-gray-400">体重の記録がありません。</p>;
  }

  const data = weights.map((w) => ({
    date: w.measured_at.slice(5, 16).replace('T', ' '),
    weight: Number(w.weight_kg),
    bodyFat: w.body_fat !== null ? Number(w.body_fat) : null,
  }));

  return (
    <div className="h-72 w-full -mx-1">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: CHART_COLORS.axis }}
            tickLine={false}
            axisLine={{ stroke: CHART_COLORS.grid }}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 10, fill: CHART_COLORS.axis }}
            tickLine={false}
            axisLine={false}
            domain={['auto', 'auto']}
            width={36}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 10, fill: CHART_COLORS.axis }}
            tickLine={false}
            axisLine={false}
            domain={['auto', 'auto']}
            width={32}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid #f3f4f6',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              fontSize: '13px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="weight"
            name="体重(kg)"
            stroke={CHART_COLORS.weight}
            strokeWidth={2.5}
            dot={{ r: 3, fill: CHART_COLORS.weight, strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="bodyFat"
            name="体脂肪率(%)"
            stroke={CHART_COLORS.bodyFat}
            strokeWidth={2.5}
            dot={{ r: 3, fill: CHART_COLORS.bodyFat, strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
