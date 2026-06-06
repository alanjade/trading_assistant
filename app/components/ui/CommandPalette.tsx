'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from '@/components/ui/Toast';
import { fmtSymDisplay } from '@/lib/indicators';
import { useStore } from '@/lib/store';
import { eventBus } from '@/lib/streamEvents';

const TF_KEYS: Record<string, string> = {
  '1': '1m',
  '2': '5m',
  '3': '15m',
  '4': '1h',
  '5': '4h',
  '6': '1d',
};

type TabKey = 'chart' | 'calc' | 'journal' | 'strategy' | 'screener';
const TAB_KEYS: Record<string, TabKey> = {
  c: 'chart',
  k: 'calc',
  j: 'journal',
  s: 'strategy',
};

export function useKeyboardShortcuts(
  onOpenPalette: () => void,
  symbolInputRef?: React.RefObject<HTMLInputElement | null>
) {
  const { setTf } = useStore();
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenPalette();
        return;
      }
      if (inInput) return;

      const tabKey = TAB_KEYS[e.key.toLowerCase()];
      if (tabKey) {
        useStore.setState({ activeTab: tabKey });
        toast.info(`Switched to ${tabKey}`);
        return;
      }

      const tf = TF_KEYS[e.key];
      if (tf) {
        setTf(tf);
        toast.info(`Timeframe → ${tf}`);
        return;
      }

      if (e.key === '/' || (e.key === 's' && !e.metaKey && !e.ctrlKey)) {
        e.preventDefault();
        symbolInputRef?.current?.focus();
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        eventBus.emit('chart:fullscreen');
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onOpenPalette, setTf, symbolInputRef]);
}

interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  icon?: string;
  group: string;
  run: () => void;
}

export default function CommandPalette({
  open,
  onClose,
  anchorRef,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const [dropPos, setDropPos] = useState({ top: 48, right: 14 });
  const inputRef = useRef<HTMLInputElement>(null);
  const store = useStore();

  useEffect(() => {
    if (open && anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const paletteWidth = Math.min(400, Math.max(260, window.innerWidth - 28));
      const paletteHeight = 420;
      const maxRight = Math.max(14, window.innerWidth - paletteWidth - 14);
      const maxTop = Math.max(12, window.innerHeight - paletteHeight - 12);

      setDropPos({
        top: Math.min(rect.bottom + 6, maxTop),
        right: Math.min(Math.max(14, window.innerWidth - rect.right), maxRight),
      });
    }
  }, [open, anchorRef]);

  const actions: PaletteAction[] = [
    {
      id: 'tab-chart',
      label: 'Go to Chart',
      hint: 'C',
      icon: '📈',
      group: 'Navigation',
      run: () => {
        useStore.setState({ activeTab: 'chart' });
        onClose();
      },
    },
    {
      id: 'tab-calc',
      label: 'Go to Calculator',
      hint: 'K',
      icon: '🧮',
      group: 'Navigation',
      run: () => {
        useStore.setState({ activeTab: 'calc' });
        onClose();
      },
    },
    {
      id: 'tab-journal',
      label: 'Go to Journal',
      hint: 'J',
      icon: '📓',
      group: 'Navigation',
      run: () => {
        useStore.setState({ activeTab: 'journal' });
        onClose();
      },
    },
    {
      id: 'tab-strategy',
      label: 'Go to Strategy',
      hint: 'S',
      icon: '⚡',
      group: 'Navigation',
      run: () => {
        useStore.setState({ activeTab: 'strategy' });
        onClose();
      },
    },
    ...(['1m', '5m', '15m', '1h', '4h', '1d'] as const).map((tf, i) => ({
      id: `tf-${tf}`,
      label: `Set timeframe ${tf}`,
      hint: String(i + 1),
      icon: '⏱',
      group: 'Timeframe',
      run: () => {
        store.setTf(tf);
        toast.info(`Timeframe → ${tf}`);
        onClose();
      },
    })),
    ...['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT', 'TONUSDT'].map((sym) => ({
      id: `sym-${sym}`,
      label: `Load ${fmtSymDisplay(sym)}`,
      icon: '💰',
      group: 'Symbols',
      run: () => {
        store.setSym(sym);
        toast.info(`Symbol → ${fmtSymDisplay(sym)}`);
        onClose();
      },
    })),
    {
      id: 'theme-toggle',
      label: `Switch to ${store.theme === 'dark' ? 'light' : 'dark'} theme`,
      icon: store.theme === 'dark' ? '☀' : '☾',
      group: 'Settings',
      run: () => {
        const next = store.theme === 'dark' ? 'light' : 'dark';
        store.setSettings({ theme: next });
        toast.info(`Theme → ${next}`);
        onClose();
      },
    },
    {
      id: 'ind-panel',
      label: 'Open Indicator Panel',
      icon: '📊',
      group: 'Chart',
      run: () => {
        eventBus.emit('chart:openIndicators');
        onClose();
      },
    },
    {
      id: 'chart-fullscreen',
      label: 'Toggle Fullscreen Chart',
      hint: 'F',
      icon: '⛶',
      group: 'Chart',
      run: () => {
        eventBus.emit('chart:fullscreen');
        onClose();
      },
    },
  ];

  const q = query.trim().toLowerCase();
  const filtered = q
    ? actions.filter(
        (a) =>
          a.label.toLowerCase().includes(q) ||
          a.group.toLowerCase().includes(q) ||
          (a.hint ?? '').toLowerCase().includes(q)
      )
    : actions;
  const groups = [...new Set(filtered.map((a) => a.group))];

  useEffect(() => setCursor(0), [query]);
  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const runCurrent = useCallback(() => {
    filtered[cursor]?.run();
  }, [filtered, cursor]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, filtered.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        runCurrent();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, filtered, runCurrent, onClose]);

  if (!open) return null;

  let globalIdx = -1;

  const palette = (
    <>
      <div className="fixed inset-0 z-[9000]" onClick={onClose} aria-hidden />

      <div
        className="fixed z-[9001] w-[min(400px,calc(100vw-28px))] bg-bg2 border border-border2 rounded overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.04)] animate-drop-in"
        style={{ top: dropPos.top, right: dropPos.right }}
      >
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-bg3">
          <span className="font-mono text-[13px] text-text3 shrink-0">⌘</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands…"
            className="flex-1 border-0 outline-none bg-transparent font-mono text-xs text-text"
          />
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="flex items-center justify-center w-[22px] h-[22px] shrink-0 border border-border2 rounded bg-bg4 text-text3 cursor-pointer font-mono text-[13px] leading-none transition-colors hover:text-text2"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[340px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="font-mono text-11px text-text3 text-center py-[18px]">
              No commands match &quot;{query}&quot;
            </div>
          ) : (
            groups.map((group) => {
              const items = filtered.filter((a) => a.group === group);
              return (
                <div key={group}>
                  <div className="font-mono text-9px text-text3 uppercase tracking-widest px-3 pt-1.5 pb-0.5 border-t border-border">
                    {group}
                  </div>
                  {items.map((action) => {
                    globalIdx++;
                    const idx = globalIdx;
                    const active = idx === cursor;
                    return (
                      <div
                        key={action.id}
                        onClick={action.run}
                        onMouseEnter={() => setCursor(idx)}
                        className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors border-l-2 ${
                          active
                            ? 'bg-bg3 border-l-accent'
                            : 'bg-transparent border-l-transparent'
                        }`}
                      >
                        {action.icon && (
                          <span className="text-[13px] w-[18px] text-center shrink-0">
                            {action.icon}
                          </span>
                        )}
                        <span
                          className={`flex-1 font-mono text-xs ${
                            active ? 'text-text font-semibold' : 'text-text2 font-normal'
                          }`}
                        >
                          {action.label}
                        </span>
                        {action.hint && (
                          <span className="font-mono text-9px text-text3 px-1.5 py-px border border-border2 rounded-sm bg-bg4">
                            {action.hint}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <div className="flex gap-3 items-center px-3 py-1.5 border-t border-border bg-bg3">
          {[
            ['↑↓', 'navigate'],
            ['↵', 'run'],
            ['esc', 'close'],
          ].map(([key, label]) => (
            <span key={key} className="flex items-center gap-1 font-mono text-9px text-text3">
              <span className="px-1 py-px border border-border2 rounded-sm bg-bg2">{key}</span>
              {label}
            </span>
          ))}
        </div>
      </div>
    </>
  );

  return typeof document !== 'undefined' ? createPortal(palette, document.body) : null;
}
