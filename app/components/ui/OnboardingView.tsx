import React from 'react';

export type TooltipStep = {
  id: string;
  target: string;
  title: string;
  body: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
};

export function Arrow({ placement }: { placement: TooltipStep['placement'] }) {
  const size = 7;
  const color = 'var(--accent)';
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
  };
  const styles: Record<string, React.CSSProperties> = {
    bottom: {
      ...base,
      top: -size,
      left: '50%',
      transform: 'translateX(-50%)',
      borderLeft: `${size}px solid transparent`,
      borderRight: `${size}px solid transparent`,
      borderBottom: `${size}px solid ${color}`,
    },
    top: {
      ...base,
      bottom: -size,
      left: '50%',
      transform: 'translateX(-50%)',
      borderLeft: `${size}px solid transparent`,
      borderRight: `${size}px solid transparent`,
      borderTop: `${size}px solid ${color}`,
    },
    right: {
      ...base,
      left: -size,
      top: '50%',
      transform: 'translateY(-50%)',
      borderTop: `${size}px solid transparent`,
      borderBottom: `${size}px solid transparent`,
      borderRight: `${size}px solid ${color}`,
    },
    left: {
      ...base,
      right: -size,
      top: '50%',
      transform: 'translateY(-50%)',
      borderTop: `${size}px solid transparent`,
      borderBottom: `${size}px solid transparent`,
      borderLeft: `${size}px solid ${color}`,
    },
  };
  return <div style={styles[placement]} />;
}

export default function OnboardingView({
  step,
  total,
  current,
  pos,
  onNext,
  onSkip,
}: {
  step: number;
  total: number;
  current: TooltipStep;
  pos: { top: number; left: number };
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-[8000] bg-black/35 pointer-events-none" />

      <div
        className="fixed z-[8001] w-[280px] bg-bg2 border border-accent rounded p-3.5 shadow-[0_8px_40px_rgba(0,0,0,0.5)] animate-onboard-in"
        style={{ top: pos.top, left: pos.left }}
      >
        <Arrow placement={current.placement} />

        <div className="flex justify-between items-center mb-2">
          <span className="text-9px font-mono text-accent uppercase tracking-widest">
            Step {step + 1} of {total}
          </span>
          <button
            type="button"
            onClick={onSkip}
            className="text-9px font-mono text-text3 bg-transparent border-0 cursor-pointer hover:text-text2"
          >
            Skip tour
          </button>
        </div>

        <div className="flex gap-1 mb-2.5">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`h-0.5 flex-1 rounded-sm transition-colors ${i <= step ? 'bg-accent' : 'bg-bg4'}`}
            />
          ))}
        </div>

        <div className="text-xs font-mono font-bold text-text mb-1.5">{current.title}</div>
        <div className="text-11px font-mono text-text2 leading-relaxed mb-3.5">{current.body}</div>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onNext}
            className="px-4 py-1.5 text-11px font-mono font-bold rounded-sm cursor-pointer border border-accent bg-green-bg text-accent"
          >
            {step === total - 1 ? 'Done ✓' : 'Next →'}
          </button>
        </div>
      </div>
    </>
  );
}
