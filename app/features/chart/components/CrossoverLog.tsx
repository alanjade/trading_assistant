'use client';

import { memo } from 'react';
import { fmtPrice } from '@/lib/indicators';
import { useStore } from '@/lib/store';

function CrossoverLogContent() {
  const { crossovers } = useStore();
  const displayItems = Math.min(crossovers.length, 50);
  const recentCrossovers = [...crossovers].reverse().slice(0, displayItems);

  return (
    <div className="bg-bg2 border border-border rounded p-3 mb-2.5">
      <div className="text-10px font-mono font-semibold text-text2 tracking-wide uppercase mb-2">
        EMA Crossovers
      </div>
      <div className="flex flex-col gap-1">
        {!recentCrossovers.length ? (
          <span className="text-10px font-mono text-text3 italic">
            No crossovers detected in recent data.
          </span>
        ) : (
          recentCrossovers.map((x, idx) => {
            const ago = Math.round((Date.now() - x.time) / 60000);
            const agoStr =
              ago < 1 ? 'just now' : ago < 60 ? `${ago}m ago` : `${Math.round(ago / 60)}h ago`;
            const label =
              x.type === 'bull' ? 'EMA9 crossed above EMA20' : 'EMA9 crossed below EMA20';
            const isBull = x.type === 'bull';
            const colorClass = isBull ? 'text-green' : 'text-red';
            const dotClass = isBull ? 'bg-green' : 'bg-red';

            return (
              <div
                key={idx}
                className="flex items-center gap-2 text-10px font-mono px-2 py-1 rounded-sm bg-bg3 border border-border"
              >
                <div className={`w-[7px] h-[7px] rounded-full shrink-0 ${dotClass}`} />
                <span className={`font-semibold ${colorClass}`}>{isBull ? '▲' : '▼'}</span>
                <span>{label}</span>
                <span className="text-text2">{fmtPrice(x.price)}</span>
                <span className="text-text3 ml-auto">{agoStr}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default memo(CrossoverLogContent);
