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
  avgPfc: { calories: number; protein: number; fat: number; carbs: number };
  achievement: {
    calories: number | null;
    protein: number | null;
    fat: number | null;
    carbs: number | null;
  };
  workoutCount: number;
  workoutDays: number;
  summary: string;
  weights: { weight_kg: number; measured_at: string }[];
};

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
    body_fat: null,
    measured_at: w.measured_at,
  }));

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
            {generating ? '生成中…' : 'レポート生成'}
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
                <p className="mt-0.5 text-xs text-gray-400">実施 {report.workoutDays} 日</p>
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
