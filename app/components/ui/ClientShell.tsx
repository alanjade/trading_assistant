'use client';

import type { ReactNode } from 'react';
import ErrorBoundary from './ErrorBoundary';
import GlobalShell from './GlobalShell';

export default function ClientShell({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      {children}
      <GlobalShell />
    </ErrorBoundary>
  );
}
