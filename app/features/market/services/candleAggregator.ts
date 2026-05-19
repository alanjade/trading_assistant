import type { Candle } from '@/lib/indicators';

export interface CandleWithCompletion extends Candle {
  complete?: boolean;
}

export class CandleAggregator {
  private incompleteCandle: CandleWithCompletion | null = null;

  process(candle: CandleWithCompletion): { add?: Candle; update?: Candle } {
    const result: { add?: Candle; update?: Candle } = {};

    if (candle.complete) {
      // Completed candle - finalize any pending incomplete candle
      if (this.incompleteCandle && this.incompleteCandle.t !== candle.t) {
        result.add = { ...this.incompleteCandle };
      }
      result.add = candle;
      this.incompleteCandle = null;
    } else {
      // Incomplete candle - update the preview
      this.incompleteCandle = candle;
      result.update = candle;
    }

    return result;
  }

  reset(): void {
    this.incompleteCandle = null;
  }

  getIncomplete(): CandleWithCompletion | null {
    return this.incompleteCandle;
  }
}
