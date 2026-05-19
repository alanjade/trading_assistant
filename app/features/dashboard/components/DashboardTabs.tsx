'use client';

import { SHORTCUT_HINTS, TAB_LABELS } from '../constants';
import type { AppTab } from '../types';
import { useStore } from '@/lib/store';

const tabs: AppTab[] = ['chart', 'calc', 'journal', 'strategy', 'screener'];

export default function DashboardTabs() {
  const activeTab = useStore((state) => state.activeTab);
  const setActiveTab = useStore((state) => state.setActiveTab);

  return (
    <nav
      data-onboard="tabs"
      className="flex gap-0.5 px-4 py-2 border-b border-border bg-bg2 items-center"
    >
      {tabs.map((tab) => {
        const active = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            className={`px-4 py-1.5 text-11px font-mono font-semibold rounded-sm cursor-pointer tracking-wide border transition-all ${
              active
                ? 'border-border2 bg-bg3 text-text'
                : 'border-transparent bg-transparent text-text2'
            }`}
            onPointerDown={() => setActiveTab(tab)}
            onClick={() => setActiveTab(tab)}
          >
            {TAB_LABELS[tab]}
          </button>
        );
      })}

      <div className="ml-auto flex items-center gap-1 text-9px font-mono text-text3">
        {SHORTCUT_HINTS.map((hint) => (
          <span
            key={hint}
            className="px-1.5 py-px rounded-sm border border-border2 bg-bg3"
          >
            {hint}
          </span>
        ))}
      </div>
    </nav>
  );
}
