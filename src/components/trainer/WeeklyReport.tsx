'use client';

import { useState } from 'react';
import { parseApiResponse } from '@/lib/api-client';
import ClientWeightChart from './ClientWeightChart';
import PfcAchievement from '@/components/reports/PfcAchievement';
import ReportSection from '@/components/reports/ReportSection';

type Report = {
  periodStart: string;
  periodEnd: string;
  avgWeight: number | null;
  weightChange: number | null;
  bodyFatChange: number | null;
  avgPfc: { calories: number; protein: number; fat: number; carbs: number };
  achievement: {
    calories: number | null;
    protein: number | null;
    fat: number | null;
    carbs: number | null;
  };
  pfcAchievementRate: number | null;
  mealDays: number;
  mealRecordRate: number;
  workoutCount: number;
  workoutDays: number;
  workoutRate: number;
  summary: string;
  weights: { weight_kg: number; body_fat: number | null; measured_at: string }[];
};

function formatSigned(value: number | null, unit: string) {
  if (value == null) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}${unit}`;
}

function formatPct(value: number | null) {
  if (value == null) return '—';
  return `${value}%`;
}

export default function WeeklyReport({ clientId }: { clientId: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const generate = async () => {
    setGenerating(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/trainer/clients/${clientId}/report`, { method: 'POST' });
      const data = await parseApiResponse<{ report: Report }>(res);
      setReport(data.report);
    } catch (err) {
      setMessage(`⚠️ ${(err as Error).message}`);
    } finally {
      setGenerating(false);
    }
  };

  const pfcItems = report
    ? [
        {
          key: 'calories',
          label: 'カロリー',
          value: report.avgPfc.calories,
          rate: report.achievement.calories,
          unit: 'kcal',
        },
        {
          key: 'protein',
          label: 'タンパク質',
          value: report.avgPfc.protein,
          rate: report.achievement.protein,
          unit: 'g',
        },
        {
          key: 'fat',
          label: '脂質',
          value: report.avgPfc.fat,
          rate: report.achievement.fat,
          unit: 'g',
        },
        {
          key: 'carbs',
          label: '炭水化物',
          value: report.avgPfc.carbs,
          rate: report.achievement.carbs,
          unit: 'g',
        },
      ]
    : [];

  const chartWeights = (report?.weights ?? []).map((w) => ({
    weight_kg: w.weight_kg,
    body_fat: w.body_fat,
    measured_at: w.measured_at,
  }));

  const summaryRows = report
    ? [
        { label: '体重', value: formatSigned(report.weightChange, 'kg') },
        { label: '体脂肪', value: formatSigned(report.bodyFatChange, '%') },
        { label: 'PFC達成率', value: formatPct(report.pfcAchievementRate) },
        { label: '食事記録率', value: formatPct(report.mealRecordRate) },
        { label: '筋トレ実施率', value: formatPct(report.workoutRate) },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-base"
              aria-hidden
            >
              📊
            </span>
            <p className="section-title">週間レポート</p>
          </div>
          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="btn-primary-sm shrink-0"
          >
            {generating ? '生成中…' : report ? '再生成' : 'レポート生成'}
          </button>
        </div>

        {message && <p className="text-sm text-amber-700">{message}</p>}

        {!report && !message && (
          <p className="text-sm text-gray-400">
            「レポート生成」で直近7日間の週間レポートを作成します。
          </p>
        )}
      </div>

      {report && (
        <>
          <p className="px-1 text-xs text-gray-400">
            対象期間：{report.periodStart} 〜 {report.periodEnd}
          </p>

          <ReportSection title="今週" icon="📅">
            <ul className="space-y-2">
              {summaryRows.map((row) => (
                <li
                  key={row.label}
                  className="flex items-center justify-between gap-3 border-b border-gray-50 pb-2 last:border-0 last:pb-0"
                >
                  <span className="text-sm text-gray-500">{row.label}</span>
                  <span className="text-base font-semibold text-gray-900">{row.value}</span>
                </li>
              ))}
            </ul>
            <p className="pt-1 text-xs text-gray-400">
              食事 {report.mealDays}/7日 · 筋トレ {report.workoutDays}/7日（{report.workoutCount}回）
            </p>
          </ReportSection>

          <ReportSection title="体重推移グラフ" icon="⚖️">
            <ClientWeightChart weights={chartWeights} />
          </ReportSection>

          <ReportSection title="PFC達成率" icon="🍱">
            <p className="text-xs text-gray-400">1日平均 / 目標に対する達成率</p>
            <PfcAchievement items={pfcItems} />
          </ReportSection>

          <ReportSection title="筋トレ回数" icon="🏋️">
            <div className="card-nested flex items-center justify-between gap-3">
              <div>
                <p className="stat-label">直近7日間のトレーニング</p>
                <p className="stat-value">
                  {report.workoutCount}
                  <span className="stat-unit">回</span>
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  実施 {report.workoutDays} 日 · 実施率 {report.workoutRate}%
                </p>
              </div>
              <span className="text-3xl" aria-hidden>
                🏋️
              </span>
            </div>
          </ReportSection>

          <ReportSection title="AI総評" icon="🤖">
            <div className="card-nested">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {report.summary}
              </p>
            </div>
          </ReportSection>
        </>
      )}
    </div>
  );
}
