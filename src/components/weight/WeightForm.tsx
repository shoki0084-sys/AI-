'use client';

import { useState } from 'react';
import { parseApiResponse } from '@/lib/api-client';

type Props = {
  onSaved?: () => void;
};

export default function WeightForm({ onSaved }: Props) {
  const [weightKg, setWeightKg] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [measuredAt, setMeasuredAt] = useState(new Date().toISOString().slice(0, 16));
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const weight = Number(weightKg);
    if (!weight || weight <= 0) {
      setMessage('⚠️ 体重を入力してください');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight_kg: weight,
          body_fat: bodyFat ? Number(bodyFat) : null,
          measured_at: new Date(measuredAt).toISOString(),
        }),
      });
      await parseApiResponse(res);
      setMessage('✅ 体重を保存しました');
      setWeightKg('');
      setBodyFat('');
      onSaved?.();
    } catch (err) {
      setMessage(`⚠️ ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <p className="text-sm text-gray-600">体重と体脂肪率を記録できます。</p>

      <div>
        <label className="label">体重 (kg)</label>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="0.1"
          required
          value={weightKg}
          onChange={(e) => setWeightKg(e.target.value)}
          className="field"
          placeholder="65.5"
        />
      </div>

      <div>
        <label className="label">体脂肪率 (%) ※任意</label>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          step="0.1"
          value={bodyFat}
          onChange={(e) => setBodyFat(e.target.value)}
          className="field"
          placeholder="18.0"
        />
      </div>

      <div>
        <label className="label">測定日時</label>
        <input
          type="datetime-local"
          required
          value={measuredAt}
          onChange={(e) => setMeasuredAt(e.target.value)}
          className="field"
        />
      </div>

      <button type="submit" disabled={submitting} className="btn-primary">
        {submitting ? '保存中…' : '体重を保存する'}
      </button>

      {message && <p className="text-center text-sm">{message}</p>}
    </form>
  );
}
