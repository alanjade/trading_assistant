'use client';

import { SHORTCUT_HINTS, TAB_LABELS } from '../constants';
import type { AppTab } from '../types';
import { LayoutGroup, motion } from 'framer-motion';
import { useStore } from '@/lib/store';

const tabs: AppTab[] = ['chart', 'calc', 'journal', 'strategy', 'screener'];

export default function DashboardTabs() {
  const activeTab = useStore((state) => state.activeTab);
  const setActiveTab = useStore((state) => state.setActiveTab);

  return (
    <nav
      data-onboard="tabs"
      aria-label="Primary dashboard views"
      className="hidden items-center gap-0.5 border-b border-border/80 bg-bg2/95 px-4 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-md md:flex"
    >
      <LayoutGroup>
        {tabs.map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              aria-current={active ? 'page' : undefined}
              className={`relative rounded-sm border px-4 py-1.5 text-11px font-mono font-semibold tracking-wide transition-all ${
                active
                  ? 'border-border2 bg-bg3 text-text shadow-sm'
                  : 'border-transparent bg-transparent text-text2 hover:border-border2 hover:bg-bg3/80 hover:text-text'
              }`}
              onPointerDown={() => setActiveTab(tab)}
              onClick={() => setActiveTab(tab)}
            >
              {active && (
                <motion.span
                  layoutId="active-dashboard-tab"
                  className="absolute inset-0 z-0 rounded-sm bg-bg3"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative z-10">{TAB_LABELS[tab]}</span>
            </button>
          );
        })}
      </LayoutGroup>

      <div className="ml-auto flex items-center gap-1 text-9px font-mono text-text3">
        {SHORTCUT_HINTS.map((hint) => (
          <span key={hint} className="px-1.5 py-px rounded-sm border border-border2 bg-bg3">
            {hint}
          </span>
        ))}
      </div>
    </nav>
  );
}
