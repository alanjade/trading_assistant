'use client';

import { useEffect, useRef } from 'react';
import { create } from 'zustand';

export type ToastType = 'success' | 'warn' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  push: (type: ToastType, message: string, duration?: number) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (type, message, duration = 3500) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    set((s) => ({ toasts: [...s.toasts.slice(-4), { id, type, message, duration }] }));
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (msg: string, ms?: number) => useToastStore.getState().push('success', msg, ms),
  warn: (msg: string, ms?: number) => useToastStore.getState().push('warn', msg, ms),
  error: (msg: string, ms?: number) => useToastStore.getState().push('error', msg, ms),
  info: (msg: string, ms?: number) => useToastStore.getState().push('info', msg, ms),
};

const TYPE_ICON: Record<ToastType, string> = {
  success: '✓',
  warn: '⚠',
  error: '✕',
  info: 'ℹ',
};

const TYPE_CLASSES: Record<ToastType, { container: string; icon: string; bar: string }> = {
  success: {
    container: 'bg-green-bg border-green/20 border-l-green',
    icon: 'text-green',
    bar: 'bg-green',
  },
  warn: {
    container: 'bg-amber/10 border-amber/20 border-l-amber',
    icon: 'text-amber',
    bar: 'bg-amber',
  },
  error: {
    container: 'bg-red-bg border-red/20 border-l-red',
    icon: 'text-red',
    bar: 'bg-red',
  },
  info: {
    container: 'bg-blue/10 border-blue/20 border-l-blue',
    icon: 'text-blue',
    bar: 'bg-blue',
  },
};

function ToastItem({ toast: t, onRemove }: { toast: Toast; onRemove: () => void }) {
  const cls = TYPE_CLASSES[t.type];
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    bar.style.transition = 'none';
    bar.style.width = '100%';
    void bar.offsetWidth;
    bar.style.transition = `width ${t.duration}ms linear`;
    bar.style.width = '0%';
  }, [t.duration]);

  useEffect(() => {
    const timer = setTimeout(onRemove, t.duration);
    return () => clearTimeout(timer);
  }, [t.duration, onRemove]);

  return (
    <div
      className={`relative flex items-start gap-2.5 py-2.5 pl-3.5 pr-9 border border-l-[3px] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.4)] min-w-[260px] max-w-[360px] overflow-hidden animate-toast-in ${cls.container}`}
    >
      <span className={`text-xs font-mono font-bold shrink-0 mt-px ${cls.icon}`}>
        {TYPE_ICON[t.type]}
      </span>
      <span className="text-11px font-mono text-text leading-normal flex-1">{t.message}</span>
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1.5 right-2 text-xs leading-none bg-transparent border-0 cursor-pointer text-text3 px-1 py-0.5"
        aria-label="Dismiss"
      >
        ×
      </button>
      <div className="absolute bottom-0 left-0 h-0.5 w-full bg-bg3">
        <div ref={barRef} className={`h-full w-full ${cls.bar}`} />
      </div>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, remove } = useToastStore();

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={() => remove(t.id)} />
        </div>
      ))}
    </div>
  );
}
