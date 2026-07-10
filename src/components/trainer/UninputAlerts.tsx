'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { parseApiResponse } from '@/lib/api-client';

type AlertClient = {
  id: string;
  name: string;
  missingWeight: boolean;
  missingMeal: boolean;
  missingWorkout: boolean;
};

export default function UninputAlerts() {
  const [clients, setClients] = useState<AlertClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/trainer/alerts');
        const data = await parseApiResponse<{ clients: AlertClient[] }>(res);
        setClients(data.clients);
      } catch {
        // 表示専用のため握りつぶす
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <section className="card">
        <p className="text-sm text-gray-400">未入力チェック中…</p>
      </section>
    );
  }

  return (
    <section className="card space-y-2">
      <p className="text-sm font-semibold text-gray-600">本日の未入力顧客（{clients.length}）</p>
      {clients.length ? (
        <ul className="divide-y">
          {clients.map((c) => (
            <li key={c.id} className="py-2">
              <Link
                href={`/trainer/clients/${c.id}`}
                className="flex items-center justify-between gap-2 text-sm active:bg-gray-50"
              >
                <span className="truncate text-gray-700">{c.name}</span>
                <span className="flex shrink-0 flex-wrap justify-end gap-1">
                  {c.missingWeight && (
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                      本日体重未入力
                    </span>
                  )}
                  {c.missingMeal && (
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                      本日食事未入力
                    </span>
                  )}
                  {c.missingWorkout && (
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                      本日筋トレ未入力
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400">全顧客が本日分を入力済みです。</p>
      )}
    </section>
  );
}
