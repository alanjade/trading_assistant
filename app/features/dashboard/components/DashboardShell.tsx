'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useTheme } from '@/components/ui/ThemeToggle';
import { useMarketWebSocket } from '@/features/market/hooks/useMarketWebSocket';
import { useStore } from '@/lib/store';
const IndicatorPanel = dynamic(
  () => import('@/features/chart/components/IndicatorPanel'),
  {
    ssr: false,
    loading: () => <div className="h-14 rounded-xl bg-bg3 animate-pulse" />,
  }
);
const DashboardContent = dynamic(
  () => import('./DashboardContent'),
  { ssr: false, loading: () => <div className="h-96 rounded-xl bg-bg3 animate-pulse" /> }
);
import DashboardHeader from './DashboardHeader';
import DashboardTabs from './DashboardTabs';

export default function DashboardShell() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [indicatorOpen, setIndicatorOpen] = useState(false);
  const sym = useStore((state) => state.sym);
  const tf = useStore((state) => state.tf);

  useTheme();
  useMarketWebSocket(sym, tf);

  useEffect(() => {
    useStore.getState().hydrateTradesFromIdb();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <DashboardHeader
        onOpenIndicators={() => setIndicatorOpen(true)}
        paletteOpen={paletteOpen}
        onOpenPalette={() => setPaletteOpen(true)}
        onClosePalette={() => setPaletteOpen(false)}
      />
      <DashboardTabs />
      <DashboardContent />

      {indicatorOpen && <IndicatorPanel onClose={() => setIndicatorOpen(false)} />}
    </div>
  );
}
