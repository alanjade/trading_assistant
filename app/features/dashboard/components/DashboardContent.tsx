'use client';

import { CHART_SECTION_LABELS } from '../constants';
import type { ChartSection } from '../types';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { PanelSkeleton } from '@/components/ui';
import CollapsiblePanel from '@/components/ui/CollapsiblePanel';
import { useStore } from '@/lib/store';

const ScreenerPanel = dynamic(() => import('@/components/screener/ScreenerPanel'), {
  ssr: false,
  loading: () => <PanelSkeleton className="h-96" />,
});
const FuturesCard = dynamic(() => import('@/features/calculator/components/FuturesCard'), {
  ssr: false,
  loading: () => <PanelSkeleton className="h-[260px]" />,
});
const GoalCard = dynamic(() => import('@/features/calculator/components/GoalCard'), {
  ssr: false,
  loading: () => <PanelSkeleton className="h-[160px]" />,
});
const RRCard = dynamic(() => import('@/features/calculator/components/RRCard'), {
  ssr: false,
  loading: () => <PanelSkeleton className="h-[300px]" />,
});
const BacktestPanel = dynamic(() => import('@/features/chart/components/BacktestPanel'), {
  ssr: false,
  loading: () => <PanelSkeleton className="h-[280px]" />,
});
const CandleChart = dynamic(() => import('@/features/chart/components/CandleChart'), {
  ssr: false,
  loading: () => <PanelSkeleton className="h-[420px]" />,
});
const CrossoverLog = dynamic(() => import('@/features/chart/components/CrossoverLog'), {
  ssr: false,
  loading: () => <PanelSkeleton className="h-[180px]" />,
});
const EntryZones = dynamic(() => import('@/features/chart/components/EntryZones'), {
  ssr: false,
  loading: () => <PanelSkeleton className="h-[180px]" />,
});
const PaperTradingPanel = dynamic(() => import('@/features/chart/components/PaperTradingPanel'), {
  ssr: false,
  loading: () => <PanelSkeleton className="h-[240px]" />,
});
const PriceAlerts = dynamic(() => import('@/features/chart/components/PriceAlerts'), {
  ssr: false,
  loading: () => <PanelSkeleton className="h-[220px]" />,
});
const SessionPnL = dynamic(() => import('@/features/chart/components/SessionPnL'), {
  ssr: false,
  loading: () => <PanelSkeleton className="h-[220px]" />,
});
const SuggestionCard = dynamic(() => import('@/features/chart/components/SuggestionCard'), {
  ssr: false,
  loading: () => <PanelSkeleton className="h-35" />,
});
const TradeLog = dynamic(() => import('@/features/journal/components/TradeLog'), {
  ssr: false,
  loading: () => <PanelSkeleton className="h-[300px]" />,
});
const StrategyBuilder = dynamic(() => import('@/features/strategy/components/StrategyBuilder'), {
  ssr: false,
  loading: () => <PanelSkeleton className="h-[300px]" />,
});

function ChartContent() {
  const [chartSection, setChartSection] = useState<ChartSection>('analysis');

  return (
    <div className="grid grid-cols-1 gap-2.5">
      <CandleChart />

      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        <CollapsiblePanel title="Signal" className="min-w-0" data-onboard="suggestion-card">
          <SuggestionCard />
        </CollapsiblePanel>
        <CollapsiblePanel title="Entry Zones" className="min-w-0">
          <EntryZones />
        </CollapsiblePanel>
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
    <main className="mx-auto flex-1 w-full max-w-[1120px] px-3.5 py-4 pb-24 md:px-4 md:py-5 md:pb-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
        >
          {activeTab === 'chart' && <ChartContent />}

          {activeTab === 'calc' && (
            <div className="grid grid-cols-1 gap-2.5 items-start md:grid-cols-2">
              <CollapsiblePanel title="Risk Calculator" className="min-w-0">
                <RRCard />
                <GoalCard />
              </CollapsiblePanel>
              <CollapsiblePanel title="Futures" className="min-w-0">
                <FuturesCard />
              </CollapsiblePanel>
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
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
