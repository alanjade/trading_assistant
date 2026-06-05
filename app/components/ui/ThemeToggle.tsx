'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { applyTheme } from '@/lib/themeService';

export function useTheme() {
  const { theme, setSettings } = useStore();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setSettings({ theme: next });
    applyTheme(next);
  };

  return { theme, toggle };
}

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="fixed bottom-20 left-5 z-[9998] flex h-9 w-9 items-center justify-center rounded-full border border-border2 bg-bg3 text-base text-text2 shadow-lg transition-all md:bottom-5"
    >
      {theme === 'dark' ? 'L' : 'D'}
    </button>
  );
}
