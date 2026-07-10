'use client';

import { useEffect, useState } from 'react';
import { parseApiResponse } from '@/lib/api-client';

type Profile = {
  target_calories: number | null;
  target_protein: number | null;
  target_fat: number | null;
  target_carbs: number | null;
};

type ProfileResponse = { profile: Profile | null };

const FIELDS = [
  { key: 'target_calories' as const, label: '目標カロリー', unit: 'kcal', step: '10' },
  { key: 'target_protein' as const, label: '目標タンパク質', unit: 'g', step: '1' },
  { key: 'target_fat' as const, label: '目標脂質', unit: 'g', step: '1' },
  { key: 'target_carbs' as const, label: '目標炭水化物', unit: 'g', step: '1' },
];

export default function TargetPfcForm() {
  const [values, setValues] = useState<Record<keyof Profile, string>>({
    target_calories: '',
    target_protein: '',
    target_fat: '',
    target_carbs: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/profile');
        const data = await parseApiResponse<ProfileResponse>(res);
        const p = data.profile;
        if (p) {
          setValues({
            target_calories: p.target_calories != null ? String(p.target_calories) : '',
            target_protein: p.target_protein != null ? String(p.target_protein) : '',
            target_fat: p.target_fat != null ? String(p.target_fat) : '',
            target_carbs: p.target_carbs != null ? String(p.target_carbs) : '',
          });
        }
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

    const body: Record<string, number | null> = {};
    for (const field of FIELDS) {
      const raw = values[field.key].trim();
      if (raw === '') {
        body[field.key] = null;
      } else {
        const n = Number(raw);
        if (!Number.isFinite(n) || n <= 0) {
          setMessage(`⚠️ ${field.label}を正しく入力してください`);
          setSubmitting(false);
          return;
        }
        body[field.key] = n;
      }
    }

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      await parseApiResponse(res);
      setMessage('✅ 目標PFCを保存しました');
    } catch (err) {
      setMessage(`⚠️ ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <p className="text-sm text-gray-600">
        1日の目標PFCを設定すると、食事画面で達成状況が確認できます。
      </p>

      {FIELDS.map((field) => (
        <div key={field.key}>
          <label className="label">
            {field.label} ({field.unit})
          </label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={field.step}
            value={values[field.key]}
            onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
            className="field"
            disabled={loading}
          />
        </div>
      ))}

      <p className="text-xs text-gray-400">空欄にして保存すると、その項目の目標を解除します。</p>

      <button type="submit" disabled={submitting || loading} className="btn-primary">
        {loading ? '読み込み中…' : submitting ? '保存中…' : '目標PFCを保存する'}
      </button>

      {message && <p className="text-center text-sm">{message}</p>}
    </form>
  );
}
