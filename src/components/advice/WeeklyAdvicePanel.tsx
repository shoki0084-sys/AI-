'use client';

import { useState } from 'react';
import { parseApiResponse } from '@/lib/api-client';
import {
  ButtonLoadingContent,
  LoadingBlock,
} from '@/components/ui/Loading';

type WeeklyAdviceResponse = {
  advice: string;
  isPlateau?: boolean;
  weightChange?: number | null;
  plateauThresholdKg?: number;
};

export default function WeeklyAdvicePanel() {
  const [advice, setAdvice] = useState<string | null>(null);
  const [isPlateau, setIsPlateau] = useState(false);
  const [weightChange, setWeightChange] = useState<number | null>(null);
  const [thresholdKg, setThresholdKg] = useState(0.3);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/advice/weekly', { method: 'POST' });
      const data = await parseApiResponse<WeeklyAdviceResponse>(res);
      setAdvice(data.advice);
      setIsPlateau(Boolean(data.isPlateau));
      setWeightChange(data.weightChange ?? null);
      if (data.plateauThresholdKg != null) setThresholdKg(data.plateauThresholdKg);
    } catch (err) {
      setMessage(`⚠️ ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const changeLabel =
    weightChange == null
      ? null
      : `${weightChange > 0 ? '+' : ''}${weightChange}kg`;

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-700">週間AI分析</p>
          <p className="text-xs text-gray-400">直近7日間の体重・PFC・トレーニングを総合分析</p>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="btn-primary-sm"
        >
          <ButtonLoadingContent loading={loading} loadingLabel="分析中…">
            {advice ? '再分析' : '分析する'}
          </ButtonLoadingContent>
        </button>
      </div>
      {loading && (
        <LoadingBlock label="週間データを分析しています…" className="py-4" />
      )}
      {message && <p className="text-sm text-amber-700">{message}</p>}
      {advice && (
        <div className="space-y-3">
          {isPlateau && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-sm font-semibold text-amber-800">停滞を検知しました</p>
              <p className="mt-0.5 text-xs text-amber-700">
                直近7日間の体重変化が ±{thresholdKg}kg 以内
                {changeLabel ? `（${changeLabel}）` : ''}
                です。下のアドバイスにカロリー調整・有酸素・トレーニング提案を含めています。
              </p>
            </div>
          )}
          <p className="whitespace-pre-wrap text-sm text-gray-700">{advice}</p>
        </div>
      )}
    </div>
  );
}
