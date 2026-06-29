'use client';

import { useState } from 'react';
import { parseApiResponse } from '@/lib/api-client';
import {
  ButtonLoadingContent,
  LoadingBlock,
} from '@/components/ui/Loading';

export default function WeeklyAdvicePanel() {
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/advice/weekly', { method: 'POST' });
      const data = await parseApiResponse<{ advice: string }>(res);
      setAdvice(data.advice);
    } catch (err) {
      setMessage(`⚠️ ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

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
      {advice && <p className="whitespace-pre-wrap text-sm text-gray-700">{advice}</p>}
    </div>
  );
}
