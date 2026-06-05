'use client';

import { TAB_LABELS } from '../constants';
import type { AppTab } from '../types';
import { useStore } from '@/lib/store';

const tabs: AppTab[] = ['chart', 'calc', 'journal', 'strategy', 'screener'];

export default function BottomMobileNav() {
  const activeTab = useStore((state) => state.activeTab);
  const setActiveTab = useStore((state) => state.setActiveTab);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[120] grid grid-cols-5 border-t border-border/80 bg-bg2/95 px-1 py-1.5 shadow-[0_-8px_24px_rgba(0,0,0,0.28)] backdrop-blur-md md:hidden">
      {tabs.map((tab) => {
        const active = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => setActiveTab(tab)}
            className={`min-w-0 rounded-sm px-1 py-1.5 font-mono text-9px font-semibold transition-all ${
              active
                ? 'bg-bg3 text-text shadow-sm'
                : 'text-text3 hover:bg-bg3/70 hover:text-text'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        );
      })}
    </nav>
  );
}
