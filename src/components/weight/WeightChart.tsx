'use client';

import { useEffect, useState } from 'react';
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
import { parseApiResponse } from '@/lib/api-client';
import type { WeightLog } from '@/types/weight';

interface ChartPoint {
  date: string;
  weight: number;
  bodyFat: number | null;
}

const CHART_COLORS = {
  weight: '#2563eb',
  bodyFat: '#f59e0b',
  grid: '#f3f4f6',
  axis: '#9ca3af',
};

type Props = {
  refreshKey?: number;
};

export default function WeightChart({ refreshKey = 0 }: Props) {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/weight');
        const json = await parseApiResponse<{ logs: WeightLog[] }>(res);
        const points: ChartPoint[] = json.logs.map((l) => ({
          date: l.measured_at.slice(5, 16).replace('T', ' '),
          weight: Number(l.weight_kg),
          bodyFat: l.body_fat !== null ? Number(l.body_fat) : null,
        }));
        setData(points);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshKey]);

  if (loading) return <p className="text-sm text-gray-500">読み込み中…</p>;
  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (data.length === 0)
    return (
      <div className="card">
        <p className="text-sm text-gray-500">
          まだ記録がありません。上のフォームから体重を保存してください。
        </p>
      </div>
    );

  return (
    <div className="card space-y-3">
      <p className="section-title">体重・体脂肪率の推移</p>
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
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              iconType="circle"
              iconSize={8}
            />
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
    </div>
  );
}
