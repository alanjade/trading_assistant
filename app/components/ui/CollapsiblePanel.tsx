'use client';

import type React from 'react';
import { useState } from 'react';

export default function CollapsiblePanel({
  title,
  children,
  defaultOpen = true,
  className = '',
  ...sectionProps
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
} & React.HTMLAttributes<HTMLElement>) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = `panel-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <section className={`min-w-0 overflow-hidden rounded-xl border border-border/70 bg-bg2/70 shadow-[0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur-sm ${className}`} {...sectionProps}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="mb-0 flex w-full items-center justify-between rounded-t-xl border-b border-border/70 bg-bg2/80 px-3 py-2.5 text-left font-mono text-11px font-semibold text-text2 shadow-sm md:hidden"
      >
        <span>{title}</span>
        <span className="text-text3">{open ? '-' : '+'}</span>
      </button>
      <div id={panelId} className={`p-3 ${open ? 'block' : 'hidden md:block'}`}>
        {children}
      </div>
    </section>
  );
}
