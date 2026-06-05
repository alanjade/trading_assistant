import { describe, expect, it } from 'vitest';

import {
  analyzeMarketSentiment,
  calculateEconomicCalendarRisk,
  fetchMarketIntelligenceSnapshot,
  summarizeNewsFeed,
  type EconomicCalendarEvent,
  type NewsItem,
  type SentimentSignal,
} from '../marketIntelligenceService';

describe('marketIntelligenceService', () => {
  describe('analyzeMarketSentiment', () => {
    it('should aggregate weighted sentiment signals', () => {
      const signals: SentimentSignal[] = [
        { source: 'fear-greed', score: 0.7, confidence: 0.9, weight: 2, timestamp: 1 },
        { source: 'social', score: 0.3, confidence: 0.8, weight: 1, symbol: 'BTCUSDT', timestamp: 2 },
        { source: 'flow', score: -0.1, confidence: 0.5, weight: 1, symbol: 'ETHUSDT', timestamp: 3 },
      ];

      const result = analyzeMarketSentiment(signals);

      expect(result.score).toBeGreaterThan(35);
      expect(result.label).toBe('bullish');
      expect(result.confidence).toBeCloseTo(0.775);
      expect(result.contributors[0].source).toBe('fear-greed');
      expect(result.symbolScores.BTCUSDT).toBe(30);
      expect(result.symbolScores.ETHUSDT).toBe(-10);
    });

    it('should return neutral when no signals are available', () => {
      const result = analyzeMarketSentiment([]);

      expect(result.score).toBe(0);
      expect(result.label).toBe('neutral');
      expect(result.confidence).toBe(0);
    });
  });

  describe('calculateEconomicCalendarRisk', () => {
    const now = Date.UTC(2026, 4, 26, 12);
    const events: EconomicCalendarEvent[] = [
      {
        id: 'cpi',
        title: 'US CPI',
        country: 'United States',
        currency: 'USD',
        impact: 'high',
        timestamp: now + 60 * 60 * 1000,
      },
      {
        id: 'eur',
        title: 'Eurogroup Meeting',
        country: 'European Union',
        currency: 'EUR',
        impact: 'medium',
        timestamp: now + 2 * 60 * 60 * 1000,
      },
      {
        id: 'old',
        title: 'Prior PMI',
        country: 'United States',
        currency: 'USD',
        impact: 'low',
        timestamp: now - 60 * 60 * 1000,
      },
    ];

    it('should filter upcoming events and score relevant calendar risk', () => {
      const result = calculateEconomicCalendarRisk(events, now, 24 * 60 * 60 * 1000, ['USD']);

      expect(result.upcoming).toHaveLength(1);
      expect(result.highImpactCount).toBe(1);
      expect(result.riskScore).toBe(60);
      expect(result.nextHighImpactEvent?.id).toBe('cpi');
    });
  });

  describe('summarizeNewsFeed', () => {
    const news: NewsItem[] = [
      {
        id: '1',
        title: 'Bitcoin ETF inflows accelerate',
        source: 'Desk',
        symbols: ['BTCUSDT'],
        publishedAt: 3,
        tone: 'positive',
        relevance: 0.9,
      },
      {
        id: '2',
        title: 'Exchange outage hits altcoins',
        source: 'Wire',
        symbols: ['ETHUSDT'],
        publishedAt: 2,
        tone: 'negative',
        relevance: 0.8,
      },
      {
        id: '3',
        title: 'Bitcoin volatility cools',
        source: 'Desk',
        symbols: ['BTCUSDT'],
        publishedAt: 1,
        tone: 'neutral',
        relevance: 0.4,
      },
    ];

    it('should filter news by symbol and rank top stories by relevance', () => {
      const result = summarizeNewsFeed(news, 'BTCUSDT', 1);

      expect(result.items).toHaveLength(2);
      expect(result.positiveCount).toBe(1);
      expect(result.neutralCount).toBe(1);
      expect(result.sentimentScore).toBe(69);
      expect(result.topStories).toHaveLength(1);
      expect(result.topStories[0].id).toBe('1');
    });
  });

  describe('fetchMarketIntelligenceSnapshot', () => {
    it('should compose sentiment, calendar, and news adapters', async () => {
      const now = Date.UTC(2026, 4, 26, 12);
      const snapshot = await fetchMarketIntelligenceSnapshot(
        {
          fetchSentimentSignals: async () => [
            { source: 'social', score: 0.5, confidence: 1, symbol: 'BTCUSDT', timestamp: now },
          ],
          fetchEconomicCalendar: async () => [
            {
              id: 'fed',
              title: 'Fed Minutes',
              country: 'United States',
              currency: 'USD',
              impact: 'high',
              timestamp: now + 1000,
            },
          ],
          fetchNewsFeed: async () => [
            {
              id: 'btc',
              title: 'Bitcoin breaks higher',
              source: 'Wire',
              symbols: ['BTCUSDT'],
              publishedAt: now,
              tone: 'positive',
              relevance: 1,
            },
          ],
        },
        { now, relevantCurrencies: ['USD'], symbol: 'BTCUSDT' }
      );

      expect(snapshot.sentiment.label).toBe('bullish');
      expect(snapshot.calendar.highImpactCount).toBe(1);
      expect(snapshot.news.positiveCount).toBe(1);
    });
  });
});
