import type { Candle } from '@/lib/indicators';

export interface TradingSessionDefinition {
  id: string;
  label: string;
  startHourUtc: number;
  endHourUtc: number;
  color: string;
}

export interface TradingSessionOverlay {
  sessionId: string;
  label: string;
  color: string;
  startTime: number;
  endTime: number;
  startIndex: number;
  endIndex: number;
  candleCount: number;
}

export const DEFAULT_TRADING_SESSIONS: TradingSessionDefinition[] = [
  { id: 'asia', label: 'Asia', startHourUtc: 0, endHourUtc: 8, color: 'rgba(77, 163, 255, 0.14)' },
  { id: 'london', label: 'London', startHourUtc: 7, endHourUtc: 16, color: 'rgba(0, 229, 160, 0.12)' },
  { id: 'new-york', label: 'New York', startHourUtc: 13, endHourUtc: 22, color: 'rgba(255, 184, 46, 0.12)' },
  { id: 'rollover', label: 'Rollover', startHourUtc: 22, endHourUtc: 0, color: 'rgba(255, 61, 90, 0.1)' },
];

export function getTradingSessionsForTimestamp(
  timestamp: number,
  sessions: TradingSessionDefinition[] = DEFAULT_TRADING_SESSIONS
): TradingSessionDefinition[] {
  const hour = new Date(timestamp).getUTCHours();
  return sessions.filter((session) => isHourInSession(hour, session));
}

export function buildTradingSessionOverlays(
  candles: Candle[],
  sessions: TradingSessionDefinition[] = DEFAULT_TRADING_SESSIONS
): TradingSessionOverlay[] {
  const overlays: TradingSessionOverlay[] = [];
  const activeBySession = new Map<string, TradingSessionOverlay>();

  candles.forEach((candle, index) => {
    const activeSessions = new Set(getTradingSessionsForTimestamp(candle.t, sessions).map((session) => session.id));

    for (const session of sessions) {
      const active = activeSessions.has(session.id);
      const current = activeBySession.get(session.id);

      if (active && !current) {
        activeBySession.set(session.id, {
          sessionId: session.id,
          label: session.label,
          color: session.color,
          startTime: candle.t,
          endTime: candle.t,
          startIndex: index,
          endIndex: index,
          candleCount: 1,
        });
      } else if (active && current) {
        current.endTime = candle.t;
        current.endIndex = index;
        current.candleCount += 1;
      } else if (!active && current) {
        overlays.push(current);
        activeBySession.delete(session.id);
      }
    }
  });

  overlays.push(...activeBySession.values());
  return overlays.sort((a, b) => a.startTime - b.startTime || a.sessionId.localeCompare(b.sessionId));
}

function isHourInSession(hour: number, session: TradingSessionDefinition): boolean {
  if (session.startHourUtc === session.endHourUtc) return true;
  if (session.startHourUtc < session.endHourUtc) {
    return hour >= session.startHourUtc && hour < session.endHourUtc;
  }
  return hour >= session.startHourUtc || hour < session.endHourUtc;
}
