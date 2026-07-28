'use client';

import { useCallback, useEffect, useState } from 'react';
import { parseApiResponse } from '@/lib/api-client';
import { getJstTodayString } from '@/lib/datetime';
import {
  ButtonLoadingContent,
  FormLoadingOverlay,
} from '@/components/ui/Loading';
import {
  CONDITION_OPTIONS,
  HUNGER_OPTIONS,
  type DailyComment,
} from '@/types/daily-comment';

type Props = {
  onSaved?: () => void;
};

export default function DailyCommentForm({ onSaved }: Props) {
  const [commentDate, setCommentDate] = useState(getJstTodayString);
  const [condition, setCondition] = useState('');
  const [sleepHours, setSleepHours] = useState('');
  const [hunger, setHunger] = useState('');
  const [freeComment, setFreeComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadComment = useCallback(async (date: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/daily-comments?date=${encodeURIComponent(date)}`);
      const data = await parseApiResponse<{ comment: DailyComment | null }>(res);
      const c = data.comment;
      setCondition(c?.condition ?? '');
      setSleepHours(c?.sleep_hours != null ? String(c.sleep_hours) : '');
      setHunger(c?.hunger ?? '');
      setFreeComment(c?.free_comment ?? '');
    } catch (err) {
      setCondition('');
      setSleepHours('');
      setHunger('');
      setFreeComment('');
      setMessage(`⚠️ ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadComment(commentDate);
  }, [commentDate, loadComment]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/daily-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment_date: commentDate,
          condition: condition || null,
          sleep_hours: sleepHours ? Number(sleepHours) : null,
          hunger: hunger || null,
          free_comment: freeComment || null,
        }),
      });
      await parseApiResponse(res);
      setMessage('✅ コメントを保存しました');
      onSaved?.();
    } catch (err) {
      setMessage(`⚠️ ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="card relative space-y-4">
      <FormLoadingOverlay
        show={submitting || loading}
        label={submitting ? 'コメントを保存しています…' : '読み込み中…'}
      />
      <div>
        <h2 className="text-base font-semibold text-gray-900">今日のコメント</h2>
        <p className="mt-1 text-sm text-gray-600">
          体調や睡眠など、その日の状況を記録できます。AIアドバイスでも利用されます。
        </p>
      </div>

      <div>
        <label className="label">日付</label>
        <input
          type="date"
          required
          value={commentDate}
          onChange={(e) => setCommentDate(e.target.value)}
          className="field"
        />
      </div>

      <div>
        <label className="label">体調</label>
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          className="field"
        >
          <option value="">未選択</option>
          {CONDITION_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">睡眠時間 (時間)</label>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          max={24}
          step="0.5"
          value={sleepHours}
          onChange={(e) => setSleepHours(e.target.value)}
          className="field"
          placeholder="例: 5"
        />
      </div>

      <div>
        <label className="label">空腹感</label>
        <select
          value={hunger}
          onChange={(e) => setHunger(e.target.value)}
          className="field"
        >
          <option value="">未選択</option>
          {HUNGER_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">自由コメント</label>
        <textarea
          value={freeComment}
          onChange={(e) => setFreeComment(e.target.value)}
          className="field min-h-[88px]"
          placeholder="例: 外食が多かった / 飲み会があった"
          rows={3}
        />
      </div>

      <button type="submit" disabled={submitting || loading} className="btn-primary">
        <ButtonLoadingContent loading={submitting} loadingLabel="保存中…">
          コメントを保存する
        </ButtonLoadingContent>
      </button>

      {message && <p className="text-center text-sm">{message}</p>}
    </form>
  );
}
