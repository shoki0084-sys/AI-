'use client';

import { useEffect, useState } from 'react';
import { parseApiResponse } from '@/lib/api-client';

type ProfileResponse = { profile: { target_weight: number | null } | null };

export default function TargetWeightForm() {
  const [targetWeight, setTargetWeight] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/profile');
        const data = await parseApiResponse<ProfileResponse>(res);
        const tw = data.profile?.target_weight;
        if (tw != null) setTargetWeight(String(tw));
      } catch (err) {
        setMessage(`⚠️ ${(err as Error).message}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const value = targetWeight.trim();
    if (value && Number(value) <= 0) {
      setMessage('⚠️ 正しい目標体重を入力してください');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_weight: value === '' ? null : Number(value) }),
      });
      await parseApiResponse(res);
      setMessage('✅ 目標体重を保存しました');
    } catch (err) {
      setMessage(`⚠️ ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <p className="text-sm text-gray-600">
        目標体重を設定すると、ダッシュボードに現在の体重との差と進捗が表示されます。
      </p>

      <div>
        <label className="label">目標体重 (kg)</label>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="0.1"
          value={targetWeight}
          onChange={(e) => setTargetWeight(e.target.value)}
          className="field"
          placeholder="60.0"
          disabled={loading}
        />
        <p className="mt-1 text-xs text-gray-400">空欄にして保存すると目標を解除します。</p>
      </div>

      <button type="submit" disabled={submitting || loading} className="btn-primary">
        {loading ? '読み込み中…' : submitting ? '保存中…' : '目標体重を保存する'}
      </button>

      {message && <p className="text-center text-sm">{message}</p>}
    </form>
  );
}
