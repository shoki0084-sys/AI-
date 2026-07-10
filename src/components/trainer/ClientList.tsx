'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { parseApiResponse } from '@/lib/api-client';

type ClientStatus = 'good' | 'stalled' | 'attention';

type Client = {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
  status: ClientStatus;
  current_weight: number | null;
  target_weight: number | null;
  progress_pct: number | null;
};

const STATUS_BADGE: Record<ClientStatus, { label: string; className: string }> = {
  good: { label: '順調', className: 'bg-emerald-50 text-emerald-700' },
  stalled: { label: '停滞', className: 'bg-amber-50 text-amber-700' },
  attention: { label: '要対応', className: 'bg-rose-50 text-rose-700' },
};

function formatWeight(kg: number | null) {
  if (kg == null) return '—';
  return `${Math.round(kg * 10) / 10}`;
}

function ClientCard({ client }: { client: Client }) {
  const name = client.display_name || client.email || client.user_id.slice(0, 8);
  const badge = STATUS_BADGE[client.status];
  const goalReached = client.progress_pct != null && client.progress_pct >= 100;

  return (
    <Link href={`/trainer/clients/${client.id}`} className="card-interactive block space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-base font-semibold text-gray-900">{name}</p>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card-nested space-y-0.5">
          <p className="stat-label">現在体重</p>
          <p className="text-lg font-bold text-gray-900">
            {formatWeight(client.current_weight)}
            {client.current_weight != null && (
              <span className="ml-1 text-xs font-normal text-gray-400">kg</span>
            )}
          </p>
        </div>
        <div className="card-nested space-y-0.5">
          <p className="stat-label">目標体重</p>
          <p className="text-lg font-bold text-gray-900">
            {formatWeight(client.target_weight)}
            {client.target_weight != null && (
              <span className="ml-1 text-xs font-normal text-gray-400">kg</span>
            )}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="stat-label">進捗率</p>
          <p className="text-sm font-semibold text-gray-800">
            {client.progress_pct != null ? `${client.progress_pct}%` : '—'}
          </p>
        </div>
        {client.progress_pct != null ? (
          <div className="progress-track">
            <div
              className={`progress-fill ${goalReached ? 'progress-fill-success' : ''}`}
              style={{ width: `${client.progress_pct}%` }}
            />
          </div>
        ) : (
          <p className="text-xs text-gray-400">体重・目標の記録が揃うと表示されます</p>
        )}
      </div>
    </Link>
  );
}

function ClientCardSkeleton() {
  return (
    <div className="card space-y-3">
      <div className="flex justify-between gap-2">
        <div className="h-5 w-28 animate-pulse rounded bg-gray-200" />
        <div className="h-5 w-12 animate-pulse rounded-full bg-gray-200" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-14 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-14 animate-pulse rounded-xl bg-gray-100" />
      </div>
      <div className="h-3 animate-pulse rounded-full bg-gray-100" />
    </div>
  );
}

export default function ClientList() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/trainer/clients');
      const data = await parseApiResponse<{ clients: Client[] }>(res);
      setClients(data.clients);
    } catch (err) {
      setMessage(`⚠️ ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/trainer/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), displayName: displayName.trim() || undefined }),
      });
      await parseApiResponse(res);
      setEmail('');
      setDisplayName('');
      setMessage('✅ 顧客を登録しました。');
      await load();
    } catch (err) {
      setMessage(`⚠️ ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {message && <p className="card text-sm text-amber-700">{message}</p>}

      <form onSubmit={addClient} className="card space-y-2">
        <p className="text-sm font-semibold text-gray-600">顧客を登録（既存ユーザーのメール）</p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="client@example.com"
          className="field py-2 text-sm"
          required
        />
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="表示名（任意）"
          className="field py-2 text-sm"
        />
        <button type="submit" disabled={submitting} className="btn-primary-sm w-full">
          {submitting ? '登録中…' : '顧客を登録'}
        </button>
      </form>

      <section className="space-y-3">
        <p className="section-title">顧客一覧（{loading ? '…' : clients.length}）</p>
        {loading ? (
          <div className="space-y-3">
            <ClientCardSkeleton />
            <ClientCardSkeleton />
          </div>
        ) : clients.length ? (
          <div className="space-y-3">
            {clients.map((c) => (
              <ClientCard key={c.id} client={c} />
            ))}
          </div>
        ) : (
          <p className="card text-sm text-gray-400">まだ顧客が登録されていません。</p>
        )}
      </section>
    </div>
  );
}
