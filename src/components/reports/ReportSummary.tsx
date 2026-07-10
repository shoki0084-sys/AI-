'use client';

import { useState } from 'react';
import { parseApiResponse } from '@/lib/api-client';
import ReportSection from './ReportSection';

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
    <ReportSection title="AI総評" icon="🤖">
      <div className="flex justify-end">
        <button type="button" onClick={generate} disabled={loading} className="btn-primary-sm">
          {loading ? '生成中…' : summary ? '再生成' : '総評を生成'}
        </button>
      </div>
      {message && <p className="text-sm text-amber-700">{message}</p>}
      {summary ? (
        <div className="card-nested">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{summary}</p>
        </div>
      ) : (
        !message && (
          <p className="text-sm text-gray-400">ボタンを押すと直近7日間の総評を生成します。</p>
        )
      )}
    </ReportSection>
  );
}
