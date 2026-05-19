'use client';

import dynamic from 'next/dynamic';
import { CHART_SECTION_LABELS } from '../constants';
import type { ChartSection } from '../types';
import { useState } from 'react';
import { useStore } from '@/lib/store';

const ScreenerPanel = dynamic(
  () => import('@/components/screener/ScreenerPanel'),
  { ssr: false, loading: () => <div className="h-96 rounded-xl bg-bg3 animate-pulse" /> }
);
const FuturesCard = dynamic(
  () => import('@/features/calculator/components/FuturesCard'),
  { ssr: false, loading: () => <div className="h-[260px] rounded-xl bg-bg3 animate-pulse" /> }
);
const GoalCard = dynamic(
  () => import('@/features/calculator/components/GoalCard'),
  { ssr: false, loading: () => <div className="h-[160px] rounded-xl bg-bg3 animate-pulse" /> }
);
const RRCard = dynamic(
  () => import('@/features/calculator/components/RRCard'),
  { ssr: false, loading: () => <div className="h-[300px] rounded-xl bg-bg3 animate-pulse" /> }
);
const BacktestPanel = dynamic(
  () => import('@/features/chart/components/BacktestPanel'),
  { ssr: false, loading: () => <div className="h-[280px] rounded-xl bg-bg3 animate-pulse" /> }
);
const CandleChart = dynamic(
  () => import('@/features/chart/components/CandleChart'),
  { ssr: false, loading: () => <div className="h-[420px] rounded-xl bg-bg3 animate-pulse" /> }
);
const CrossoverLog = dynamic(
  () => import('@/features/chart/components/CrossoverLog'),
  { ssr: false, loading: () => <div className="h-[180px] rounded-xl bg-bg3 animate-pulse" /> }
);
const EntryZones = dynamic(
  () => import('@/features/chart/components/EntryZones'),
  { ssr: false, loading: () => <div className="h-[180px] rounded-xl bg-bg3 animate-pulse" /> }
);
const PaperTradingPanel = dynamic(
  () => import('@/features/chart/components/PaperTradingPanel'),
  { ssr: false, loading: () => <div className="h-[240px] rounded-xl bg-bg3 animate-pulse" /> }
);
const PriceAlerts = dynamic(
  () => import('@/features/chart/components/PriceAlerts'),
  { ssr: false, loading: () => <div className="h-[220px] rounded-xl bg-bg3 animate-pulse" /> }
);
const SessionPnL = dynamic(
  () => import('@/features/chart/components/SessionPnL'),
  { ssr: false, loading: () => <div className="h-[220px] rounded-xl bg-bg3 animate-pulse" /> }
);
const SuggestionCard = dynamic(
  () => import('@/features/chart/components/SuggestionCard'),
  { ssr: false, loading: () => <div className="h-[140px] rounded-xl bg-bg3 animate-pulse" /> }
);
const TradeLog = dynamic(
  () => import('@/features/journal/components/TradeLog'),
  { ssr: false, loading: () => <div className="h-[300px] rounded-xl bg-bg3 animate-pulse" /> }
);
const StrategyBuilder = dynamic(
  () => import('@/features/strategy/components/StrategyBuilder'),
  { ssr: false, loading: () => <div className="h-[300px] rounded-xl bg-bg3 animate-pulse" /> }
);

function ChartContent() {
  const [chartSection, setChartSection] = useState<ChartSection>('analysis');

  return (
    <div className="grid grid-cols-1 gap-2.5">
      <CandleChart />

      <div className="grid grid-cols-2 gap-2.5">
        <div className="min-w-0" data-onboard="suggestion-card">
          <SuggestionCard />
        </div>
        <div className="min-w-0">
          <EntryZones />
        </div>
      </div>

      <CrossoverLog />

      <div className="flex gap-1 py-1.5 border-b border-border">
        {CHART_SECTION_LABELS.map(([key, label]) => {
          const active = chartSection === key;
          return (
            <button
              key={key}
              type="button"
              className={`px-3.5 py-1 text-10px font-mono font-semibold rounded-sm cursor-pointer border transition-all ${
                active
                  ? 'border-border2 bg-bg3 text-text'
                  : 'border-transparent bg-transparent text-text3'
              }`}
              onClick={() => setChartSection(key)}
            >
              {label}
            </button>
          );
        })}
      </div>

      {chartSection === 'session' && <SessionPnL />}
      {chartSection === 'alerts' && <PriceAlerts />}
      {chartSection === 'backtest' && <BacktestPanel />}
      {chartSection === 'paper' && <PaperTradingPanel />}
    </div>
  );
}

export default function DashboardContent() {
  const activeTab = useStore((state) => state.activeTab);

  return (
    <main className="flex-1 py-3.5 px-4 max-w-[1000px] mx-auto w-full">
      {activeTab === 'chart' && <ChartContent />}

      {activeTab === 'calc' && (
        <div className="grid grid-cols-2 gap-2.5 items-start">
          <div className="min-w-0">
            <RRCard />
            <GoalCard />
          </div>
          <div className="min-w-0">
            <FuturesCard />
          </div>
        </div>
      )}

      {activeTab === 'journal' && <TradeLog />}

      {activeTab === 'strategy' && (
        <div className="max-w-[760px] mx-auto">
          <StrategyBuilder />
        </div>
      )}

      {activeTab === 'screener' && (
        <div className="max-w-[760px] mx-auto">
          <ScreenerPanel />
        </div>
      )}
    </main>
  );
}
