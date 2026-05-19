// ─────────────────────────────────────────────────────────────────────────────
//  Helper Functions for Store
// ─────────────────────────────────────────────────────────────────────────────

import type { Suggestion } from './types';

export function computeAtrTrail(
  livePrice: number,
  suggestion: Suggestion | null,
  atrVals: (number | null)[],
  mult: number
): number | null {
  if (!suggestion || !livePrice) return null;
  const atr = (atrVals.filter((v) => v != null) as number[]).slice(-1)[0];
  if (!atr) return null;
  return suggestion.dir === 'long' ? livePrice - atr * mult : livePrice + atr * mult;
}

export function fireNotification(title: string, body: string) {
  if (typeof window === 'undefined') return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((p) => {
      if (p === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico' });
      }
    });
  }
}

export function playAlertSound(type: 'alert' | 'crossover' = 'alert') {
  if (typeof window === 'undefined') return;
  try {
    type BrowserWin = Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const w = window as unknown as BrowserWin;
    const AudioContextClass = w.AudioContext ?? w.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === 'crossover') {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else {
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.16);
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    }
    osc.onended = () => ctx.close();
  } catch {
    /* no AudioContext */
  }
}

export function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '',
    inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result.map((s) => s.replace(/^"|"$/g, ''));
}
