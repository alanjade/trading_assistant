'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { PanelSkeleton } from '@/components/ui';
import { useTheme } from '@/components/ui/ThemeToggle';
import { useMarketWebSocket } from '@/features/market/hooks/useMarketWebSocket';
import { cacheStorage } from '@/features/market/services/storageService';
import { useStore } from '@/lib/store';
import { startSyncEngine } from '@/lib/syncEngine';
import BottomMobileNav from './BottomMobileNav';
import DashboardHeader from './DashboardHeader';
import DashboardTabs from './DashboardTabs';

const IndicatorPanel = dynamic(() => import('@/features/chart/components/IndicatorPanel'), {
  ssr: false,
  loading: () => <PanelSkeleton className="h-14" />,
});
const DashboardContent = dynamic(() => import('./DashboardContent'), {
  ssr: false,
  loading: () => <PanelSkeleton className="h-96" />,
});

export default function DashboardShell() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [indicatorOpen, setIndicatorOpen] = useState(false);
  const sym = useStore((state) => state.sym);
  const tf = useStore((state) => state.tf);

  useTheme();
  useMarketWebSocket(sym, tf);

  useEffect(() => {
    cacheStorage.clearExpiredIdb();
    useStore.getState().hydrateTradesFromIdb();
    useStore.getState().hydrateStrategiesFromCache();
    return startSyncEngine(() => useStore.getState());
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-bg text-text">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,rgba(0,229,160,0.08),transparent_38%)]" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-[radial-gradient(circle_at_bottom,rgba(77,166,255,0.06),transparent_35%)]" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:32px_32px]" />
      </div>
      <DashboardHeader
        onOpenIndicators={() => setIndicatorOpen(true)}
        paletteOpen={paletteOpen}
        onOpenPalette={() => setPaletteOpen(true)}
        onClosePalette={() => setPaletteOpen(false)}
      />
      <DashboardTabs />
      <DashboardContent />
      <BottomMobileNav />

      {indicatorOpen && <IndicatorPanel onClose={() => setIndicatorOpen(false)} />}
    </div>
  );
}
