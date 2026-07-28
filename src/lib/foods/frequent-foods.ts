'use client';

import type { CommonFood } from './common-foods';

const STORAGE_KEY = 'ai-bodymake:frequent-foods';
const MAX_ITEMS = 20;

export type FrequentFood = CommonFood & {
  count: number;
  lastUsed: string;
};

function readAll(): FrequentFood[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FrequentFood[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: FrequentFood[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
}

/** よく使う順（同点は直近） */
export function getFrequentFoods(limit = 8): FrequentFood[] {
  return [...readAll()]
    .sort((a, b) => b.count - a.count || b.lastUsed.localeCompare(a.lastUsed))
    .slice(0, limit);
}

export function rememberFoods(items: CommonFood[]) {
  const now = new Date().toISOString();
  const map = new Map(readAll().map((f) => [`${f.name}||${f.amount}`, f]));

  for (const item of items) {
    const name = item.name.trim();
    const amount = item.amount.trim();
    if (!name) continue;
    const key = `${name}||${amount}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.lastUsed = now;
    } else {
      map.set(key, { name, amount, count: 1, lastUsed: now });
    }
  }

  writeAll(
    [...map.values()].sort(
      (a, b) => b.count - a.count || b.lastUsed.localeCompare(a.lastUsed)
    )
  );
}
