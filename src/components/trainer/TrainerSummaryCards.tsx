'use client';

import { useEffect, useState } from 'react';
import { parseApiResponse } from '@/lib/api-client';

type ClientStatus = 'good' | 'stalled' | 'attention';

type Client = { status: ClientStatus };
type AlertClient = { id: string };

const CARDS = [
  {
    key: 'total' as const,
    label: '顧客数',
    icon: '👥',
    accent: 'border-blue-100 bg-blue-50/60',
    valueClass: 'text-gray-900',
  },
  {
    key: 'good' as const,
    label: '順調人数',
    icon: '✅',
    accent: 'border-emerald-100 bg-emerald-50/60',
    valueClass: 'text-emerald-700',
  },
  {
    key: 'stalled' as const,
    label: '停滞人数',
    icon: '📉',
    accent: 'border-amber-100 bg-amber-50/60',
    valueClass: 'text-amber-700',
  },
  {
    key: 'uninput' as const,
    label: '未入力人数',
    icon: '⚠️',
    accent: 'border-rose-100 bg-rose-50/60',
    valueClass: 'text-rose-700',
  },
];

export default function TrainerSummaryCards() {
  const [stats, setStats] = useState({ total: 0, good: 0, stalled: 0, uninput: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [clientsRes, alertsRes] = await Promise.all([
          fetch('/api/trainer/clients'),
          fetch('/api/trainer/alerts'),
        ]);
        const clientsData = await parseApiResponse<{ clients: Client[] }>(clientsRes);
        const alertsData = await parseApiResponse<{ clients: AlertClient[] }>(alertsRes);
        const clients = clientsData.clients;
        setStats({
          total: clients.length,
          good: clients.filter((c) => c.status === 'good').length,
          stalled: clients.filter((c) => c.status === 'stalled').length,
          uninput: alertsData.clients.length,
        });
      } catch {
        // 表示専用のため握りつぶす
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {CARDS.map((card) => (
        <div
          key={card.key}
          className={`card flex min-h-[104px] flex-col justify-between border ${card.accent}`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="stat-label">{card.label}</p>
            <span className="text-lg leading-none" aria-hidden>
              {card.icon}
            </span>
          </div>
          {loading ? (
            <div className="h-8 w-12 animate-pulse rounded-lg bg-gray-200/80" />
          ) : (
            <p className={`stat-value ${card.valueClass}`}>{stats[card.key]}</p>
          )}
        </div>
      ))}
    </section>
  );
}
