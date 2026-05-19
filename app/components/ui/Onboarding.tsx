"use client";

import { useEffect, useRef, useState } from 'react';
import OnboardingView, { type TooltipStep } from './OnboardingView';

const STEPS: TooltipStep[] = [
  {
    id: 'symbol-search',
    target: '[data-onboard="symbol-search"]',
    title: 'Symbol Search',
    body: 'Type any symbol to load its chart. Click preset pills for quick access. Press / or S to focus from anywhere.',
    placement: 'bottom',
  },
  {
    id: 'timeframe',
    target: '[data-onboard="timeframe"]',
    title: 'Timeframes',
    body: 'Switch chart timeframe. Keyboard shortcuts: 1=1m 2=5m 3=15m 4=1h 5=4h 6=1d.',
    placement: 'bottom',
  },
  {
    id: 'indicators',
    target: '[data-onboard="indicators-btn"]',
    title: 'Indicator Panel',
    body: 'Toggle and configure any indicator. Each has adjustable parameters saved between sessions.',
    placement: 'bottom',
  },
  {
    id: 'suggestion',
    target: '[data-onboard="suggestion-card"]',
    title: 'Strategy Signal',
    body: 'Live entry/stop/target from your active strategy. Click "Apply to Calculator" to pre-fill the risk calculator.',
    placement: 'top',
  },
  {
    id: 'tabs',
    target: '[data-onboard="tabs"]',
    title: 'Navigation',
    body: 'C=Chart  K=Calculator  J=Journal  S=Strategy. Press Cmd+K for the command palette.',
    placement: 'bottom',
  },
];

const STORAGE_KEY = 'tradeassist_onboarded';

function useOnboarding() {
  const [step, setStep] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      setTimeout(() => {
        setStep(0);
        setVisible(true);
      }, 800);
    }
  }, []);

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
    setStep(null);
  };

  const next = () => {
    const nextStep = (step ?? 0) + 1;
    if (nextStep >= STEPS.length) finish();
    else setStep(nextStep);
  };

  return { step, visible, next, skip: finish, finish, total: STEPS.length };
}

function getPosition(
  target: Element | null,
  placement: TooltipStep['placement'],
  tooltipW: number,
  tooltipH: number
): { top: number; left: number } {
  if (!target) return { top: 80, left: 20 };
  const rect = target.getBoundingClientRect();
  const gap = 12;

  switch (placement) {
    case 'bottom':
      return {
        top: rect.bottom + gap,
        left: Math.min(
          Math.max(rect.left + rect.width / 2 - tooltipW / 2, 12),
          window.innerWidth - tooltipW - 12
        ),
      };
    case 'top':
      return {
        top: rect.top - tooltipH - gap,
        left: Math.min(
          Math.max(rect.left + rect.width / 2 - tooltipW / 2, 12),
          window.innerWidth - tooltipW - 12
        ),
      };
    case 'right':
      return {
        top: rect.top + rect.height / 2 - tooltipH / 2,
        left: rect.right + gap,
      };
    case 'left':
      return {
        top: rect.top + rect.height / 2 - tooltipH / 2,
        left: rect.left - tooltipW - gap,
      };
  }
}



export default function Onboarding() {
  const { step, visible, next, skip, total } = useOnboarding();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 80, left: 20 });

  const current = step !== null ? STEPS[step] : null;

  useEffect(() => {
    if (!current || !visible) return;

    const updatePos = () => {
      const target = document.querySelector(current.target);
      const tw = tooltipRef.current?.offsetWidth ?? 280;
      const th = tooltipRef.current?.offsetHeight ?? 120;
      setPos(getPosition(target, current.placement, tw, th));
    };

    updatePos();

    const target = document.querySelector(current.target);
    if (target) {
      const el = target as HTMLElement;
      el.style.outline = '2px solid var(--accent)';
      el.style.outlineOffset = '3px';
      el.style.borderRadius = '4px';
    }

    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);

    let ro: ResizeObserver | null = null;
    if (target) {
      ro = new ResizeObserver(updatePos);
      ro.observe(target);
      ro.observe(document.body);
    }

    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
      ro?.disconnect();
      if (target) {
        const el = target as HTMLElement;
        el.style.outline = '';
        el.style.outlineOffset = '';
      }
    };
  }, [current, visible]);

  if (!visible || !current || step === null) return null;

  return (
    <div ref={tooltipRef}>
      <OnboardingView
        step={step}
        total={total}
        current={current}
        pos={pos}
        onNext={next}
        onSkip={skip}
      />
    </div>
  );
}

export function resetOnboarding() {
  localStorage.removeItem(STORAGE_KEY);
}
