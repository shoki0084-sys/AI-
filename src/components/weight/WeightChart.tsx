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
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (data.length === 0)
    return (
      <p className="text-sm text-gray-500">
        まだ記録がありません。上のフォームから体重を保存してください。
      </p>
    );

  return (
    <div className="card">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11 }}
              domain={['auto', 'auto']}
            />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="weight"
              name="体重(kg)"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="bodyFat"
              name="体脂肪率(%)"
              stroke="#f97316"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
