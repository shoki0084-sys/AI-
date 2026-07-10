'use client';

import { useEffect, useState } from 'react';
import { parseApiResponse } from '@/lib/api-client';
import { formatDateTimeJa } from '@/lib/datetime';

type Analysis = {
  id: string;
  avg_weight: number | null;
  avg_calories: number | null;
  avg_protein: number | null;
  avg_fat: number | null;
  avg_carbs: number | null;
  workout_days: number;
  analysis: string;
  created_at: string;
};

export default function CoachAnalysis({ clientId }: { clientId: string }) {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/trainer/clients/${clientId}/analyze`);
        const data = await parseApiResponse<{ analyses: Analysis[] }>(res);
        setAnalyses(data.analyses);
      } catch (err) {
        setMessage(`⚠️ ${(err as Error).message}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId]);

  const generate = async () => {
    setGenerating(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/trainer/clients/${clientId}/analyze`, { method: 'POST' });
      const data = await parseApiResponse<{ analysis: Analysis }>(res);
      setAnalyses((prev) => [data.analysis, ...prev]);
    } catch (err) {
      setMessage(`⚠️ ${(err as Error).message}`);
    } finally {
      setGenerating(false);
    }
  };

  const latest = analyses[0];

  return (
    <section className="card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-base" aria-hidden>
            🤖
          </span>
          <p className="section-title">AI分析結果</p>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={generating}
          className="btn-primary-sm shrink-0"
        >
          {generating ? '分析中…' : '分析を実行'}
        </button>
      </div>

      {message && <p className="text-sm text-amber-700">{message}</p>}

      {loading ? (
        <p className="text-sm text-gray-400">読み込み中…</p>
      ) : latest ? (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">{formatDateTimeJa(latest.created_at)} 時点</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="card-nested space-y-0.5 text-center">
              <p className="stat-label">7日平均体重</p>
              <p className="text-sm font-bold text-gray-800">
                {latest.avg_weight != null ? `${latest.avg_weight}kg` : '—'}
              </p>
            </div>
            <div className="card-nested space-y-0.5 text-center">
              <p className="stat-label">PFC(1日平均)</p>
              <p className="text-sm font-bold text-gray-800">
                {latest.avg_calories ?? '—'}
                <span className="text-xs font-normal text-gray-400">kcal</span>
              </p>
              <p className="text-[10px] text-gray-500">
                P{latest.avg_protein ?? '—'} F{latest.avg_fat ?? '—'} C{latest.avg_carbs ?? '—'}
              </p>
            </div>
            <div className="card-nested space-y-0.5 text-center">
              <p className="stat-label">筋トレ頻度</p>
              <p className="text-sm font-bold text-gray-800">週{latest.workout_days}日</p>
            </div>
          </div>
          <div className="card-nested">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{latest.analysis}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-400">
          まだ分析がありません。「分析を実行」で直近7日間を分析します。
        </p>
      )}
    </section>
  );
}
