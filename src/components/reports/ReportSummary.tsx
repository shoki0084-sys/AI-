'use client';

import { useState } from 'react';
import { parseApiResponse } from '@/lib/api-client';

export default function ReportSummary() {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/reports/summary', { method: 'POST' });
      const data = await parseApiResponse<{ summary: string }>(res);
      setSummary(data.summary);
    } catch (err) {
      setMessage(`⚠️ ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-600">AI総評</p>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white active:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '生成中…' : summary ? '再生成' : '総評を生成'}
        </button>
      </div>
      {message && <p className="text-sm text-amber-700">{message}</p>}
      {summary ? (
        <p className="whitespace-pre-wrap text-sm text-gray-700">{summary}</p>
      ) : (
        !message && <p className="text-sm text-gray-400">ボタンを押すと直近7日間の総評を生成します。</p>
      )}
    </div>
  );
}
