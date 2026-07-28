'use client';

import { useCallback, useEffect, useState } from 'react';
import { parseApiResponse } from '@/lib/api-client';
import { formatDateJa, getJstTodayString } from '@/lib/datetime';
import {
  ButtonLoadingContent,
  FormLoadingOverlay,
} from '@/components/ui/Loading';
import type { TrainerMemo } from '@/types/trainer-memo';

export default function TrainerMemos({ clientId }: { clientId: string }) {
  const [memos, setMemos] = useState<TrainerMemo[]>([]);
  const [memoDate, setMemoDate] = useState(getJstTodayString);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadMemos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trainer/clients/${clientId}/memos`);
      const data = await parseApiResponse<{ memos: TrainerMemo[] }>(res);
      setMemos(data.memos ?? []);
    } catch (err) {
      setMessage(`⚠️ ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void loadMemos();
  }, [loadMemos]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/trainer/clients/${clientId}/memos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memo_date: memoDate,
          content,
        }),
      });
      const data = await parseApiResponse<{ memo: TrainerMemo }>(res);
      setMemos((prev) => [data.memo, ...prev]);
      setContent('');
      setMessage('✅ メモを保存しました');
    } catch (err) {
      setMessage(`⚠️ ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="card relative space-y-4">
      <FormLoadingOverlay
        show={submitting}
        label="メモを保存しています…"
      />
      <div className="flex items-center gap-2">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-base"
          aria-hidden
        >
          📝
        </span>
        <div>
          <p className="section-title">指導メモ</p>
          <p className="text-xs text-gray-500">クライアントへの指導内容を日付付きで残せます</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="label">日付</label>
          <input
            type="date"
            required
            value={memoDate}
            onChange={(e) => setMemoDate(e.target.value)}
            className="field"
          />
        </div>
        <div>
          <label className="label">指導内容</label>
          <textarea
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="field min-h-[88px]"
            rows={3}
            placeholder="例: 来週から炭水化物+30g / 有酸素20分追加"
          />
        </div>
        <button type="submit" disabled={submitting || loading} className="btn-primary">
          <ButtonLoadingContent loading={submitting} loadingLabel="保存中…">
            メモを保存する
          </ButtonLoadingContent>
        </button>
      </form>

      {message && <p className="text-center text-sm">{message}</p>}

      <div className="space-y-2 border-t border-gray-100 pt-3">
        <p className="text-xs font-medium text-gray-500">履歴</p>
        {loading ? (
          <p className="text-sm text-gray-400">読み込み中…</p>
        ) : memos.length === 0 ? (
          <p className="text-sm text-gray-400">まだメモがありません</p>
        ) : (
          <ul className="space-y-2">
            {memos.map((memo) => (
              <li key={memo.id} className="card-nested space-y-1">
                <p className="text-xs text-gray-400">{formatDateJa(memo.memo_date)}</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                  {memo.content}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
