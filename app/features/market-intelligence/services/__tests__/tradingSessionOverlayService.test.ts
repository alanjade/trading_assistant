import { describe, expect, it } from 'vitest';

import {
  buildTradingSessionOverlays,
  getTradingSessionsForTimestamp,
  type TradingSessionDefinition,
} from '../tradingSessionOverlayService';

const hour = 60 * 60 * 1000;
const dayStart = Date.UTC(2026, 4, 26, 0);

describe('tradingSessionOverlayService', () => {
  const sessions: TradingSessionDefinition[] = [
    { id: 'regular', label: 'Regular', startHourUtc: 8, endHourUtc: 16, color: 'green' },
    { id: 'overnight', label: 'Overnight', startHourUtc: 22, endHourUtc: 2, color: 'blue' },
  ];

  it('should detect regular and overnight sessions by UTC hour', () => {
    expect(getTradingSessionsForTimestamp(dayStart + 9 * hour, sessions).map((session) => session.id)).toEqual([
      'regular',
    ]);
    expect(getTradingSessionsForTimestamp(dayStart + 23 * hour, sessions).map((session) => session.id)).toEqual([
      'overnight',
    ]);
    expect(getTradingSessionsForTimestamp(dayStart + hour, sessions).map((session) => session.id)).toEqual([
      'overnight',
    ]);
  });

  it('should build contiguous overlay intervals for active candles', () => {
    const candles = Array.from({ length: 24 }, (_, index) => ({
      o: 100,
      h: 101,
      l: 99,
      c: 100,
      v: 1000,
      t: dayStart + index * hour,
    }));

    const overlays = buildTradingSessionOverlays(candles, sessions);
    const regular = overlays.find((overlay) => overlay.sessionId === 'regular');
    const overnight = overlays.filter((overlay) => overlay.sessionId === 'overnight');

    expect(regular).toMatchObject({ startIndex: 8, endIndex: 15, candleCount: 8 });
    expect(overnight).toHaveLength(2);
    expect(overnight[0]).toMatchObject({ startIndex: 0, endIndex: 1 });
    expect(overnight[1]).toMatchObject({ startIndex: 22, endIndex: 23 });
  });
});
