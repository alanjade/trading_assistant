export type SentimentLabel = 'fear' | 'bearish' | 'neutral' | 'bullish' | 'euphoria';
export type EconomicImpact = 'low' | 'medium' | 'high';
export type NewsTone = 'negative' | 'neutral' | 'positive';

export interface SentimentSignal {
  source: string;
  score: number;
  confidence: number;
  weight?: number;
  symbol?: string;
  timestamp: number;
}

export interface MarketSentimentResult {
  score: number;
  label: SentimentLabel;
  confidence: number;
  contributors: SentimentSignal[];
  symbolScores: Record<string, number>;
}

export interface EconomicCalendarEvent {
  id: string;
  title: string;
  country: string;
  currency: string;
  impact: EconomicImpact;
  timestamp: number;
  previous?: number;
  forecast?: number;
  actual?: number;
  source?: string;
}

export interface EconomicCalendarRisk {
  upcoming: EconomicCalendarEvent[];
  highImpactCount: number;
  riskScore: number;
  nextHighImpactEvent: EconomicCalendarEvent | null;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  url?: string;
  symbols?: string[];
  publishedAt: number;
  tone: NewsTone;
  relevance: number;
}

export interface NewsFeedSummary {
  items: NewsItem[];
  sentimentScore: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  topStories: NewsItem[];
}

export interface MarketIntelligenceAdapter {
  fetchSentimentSignals?(): Promise<SentimentSignal[]>;
  fetchEconomicCalendar?(): Promise<EconomicCalendarEvent[]>;
  fetchNewsFeed?(): Promise<NewsItem[]>;
}

export interface MarketIntelligenceSnapshot {
  sentiment: MarketSentimentResult;
  calendar: EconomicCalendarRisk;
  news: NewsFeedSummary;
}

export function analyzeMarketSentiment(signals: SentimentSignal[]): MarketSentimentResult {
  if (signals.length === 0) {
    return { score: 0, label: 'neutral', confidence: 0, contributors: [], symbolScores: {} };
  }

  const rawScore = weightedSentimentScore(signals);
  const symbolScores = buildSymbolScores(signals);

  return {
    score: Math.round(rawScore * 100),
    label: labelSentiment(rawScore),
    confidence: sentimentConfidence(signals),
    contributors: [...signals].sort((a, b) => b.confidence * (b.weight ?? 1) - a.confidence * (a.weight ?? 1)),
    symbolScores,
  };
}

export function calculateEconomicCalendarRisk(
  events: EconomicCalendarEvent[],
  now = Date.now(),
  lookaheadMs = 24 * 60 * 60 * 1000,
  relevantCurrencies: string[] = []
): EconomicCalendarRisk {
  const currencySet = new Set(relevantCurrencies.map((currency) => currency.toUpperCase()));
  const upcoming = events
    .filter((event) => event.timestamp >= now && event.timestamp <= now + lookaheadMs)
    .filter((event) => currencySet.size === 0 || currencySet.has(event.currency.toUpperCase()))
    .sort((a, b) => a.timestamp - b.timestamp);
  const highImpactCount = upcoming.filter((event) => event.impact === 'high').length;
  const totalImpact = upcoming.reduce((sum, event) => sum + impactWeight(event.impact), 0);

  return {
    upcoming,
    highImpactCount,
    riskScore: Math.min(100, Math.round(totalImpact * 20)),
    nextHighImpactEvent: upcoming.find((event) => event.impact === 'high') ?? null,
  };
}

export function summarizeNewsFeed(items: NewsItem[], symbol?: string, limit = 5): NewsFeedSummary {
  const filtered = symbol
    ? items.filter((item) => item.symbols?.some((itemSymbol) => itemSymbol.toUpperCase() === symbol.toUpperCase()))
    : items;
  const sorted = [...filtered].sort((a, b) => b.publishedAt - a.publishedAt);
  const positiveCount = sorted.filter((item) => item.tone === 'positive').length;
  const negativeCount = sorted.filter((item) => item.tone === 'negative').length;
  const neutralCount = sorted.length - positiveCount - negativeCount;
  const weightedScore = weightedNewsScore(sorted);

  return {
    items: sorted,
    sentimentScore: Math.round(weightedScore * 100),
    positiveCount,
    negativeCount,
    neutralCount,
    topStories: [...sorted].sort((a, b) => b.relevance - a.relevance || b.publishedAt - a.publishedAt).slice(0, limit),
  };
}

export async function fetchMarketIntelligenceSnapshot(
  adapter: MarketIntelligenceAdapter,
  options: {
    now?: number;
    lookaheadMs?: number;
    relevantCurrencies?: string[];
    symbol?: string;
  } = {}
): Promise<MarketIntelligenceSnapshot> {
  const [signals, events, news] = await Promise.all([
    adapter.fetchSentimentSignals?.() ?? Promise.resolve([]),
    adapter.fetchEconomicCalendar?.() ?? Promise.resolve([]),
    adapter.fetchNewsFeed?.() ?? Promise.resolve([]),
  ]);

  return {
    sentiment: analyzeMarketSentiment(signals),
    calendar: calculateEconomicCalendarRisk(events, options.now, options.lookaheadMs, options.relevantCurrencies),
    news: summarizeNewsFeed(news, options.symbol),
  };
}

function buildSymbolScores(signals: SentimentSignal[]): Record<string, number> {
  const grouped = new Map<string, SentimentSignal[]>();

  for (const signal of signals) {
    if (!signal.symbol) continue;
    const key = signal.symbol.toUpperCase();
    grouped.set(key, [...(grouped.get(key) ?? []), signal]);
  }

  return Object.fromEntries(
    [...grouped.entries()].map(([symbol, symbolSignals]) => [symbol, Math.round(weightedSentimentScore(symbolSignals) * 100)])
  );
}

function weightedSentimentScore(signals: SentimentSignal[]): number {
  const weighted = signals.map((signal) => {
    const weight = Math.max(0, signal.weight ?? 1);
    const confidence = clamp(signal.confidence, 0, 1);
    return {
      effectiveWeight: weight * confidence,
      normalizedScore: clamp(signal.score, -1, 1),
    };
  });
  const totalWeight = weighted.reduce((sum, item) => sum + item.effectiveWeight, 0);
  return totalWeight > 0
    ? weighted.reduce((sum, item) => sum + item.normalizedScore * item.effectiveWeight, 0) / totalWeight
    : 0;
}

function sentimentConfidence(signals: SentimentSignal[]): number {
  const totalConfiguredWeight = signals.reduce((sum, signal) => sum + Math.max(0, signal.weight ?? 1), 0);
  const totalEffectiveWeight = signals.reduce(
    (sum, signal) => sum + Math.max(0, signal.weight ?? 1) * clamp(signal.confidence, 0, 1),
    0
  );
  return totalConfiguredWeight > 0 ? round(totalEffectiveWeight / totalConfiguredWeight, 4) : 0;
}

function labelSentiment(score: number): SentimentLabel {
  if (score <= -0.6) return 'fear';
  if (score < -0.2) return 'bearish';
  if (score < 0.2) return 'neutral';
  if (score < 0.6) return 'bullish';
  return 'euphoria';
}

function impactWeight(impact: EconomicImpact): number {
  if (impact === 'high') return 3;
  if (impact === 'medium') return 1.5;
  return 0.5;
}

function weightedNewsScore(items: NewsItem[]): number {
  const weighted = items.map((item) => ({
    score: item.tone === 'positive' ? 1 : item.tone === 'negative' ? -1 : 0,
    weight: clamp(item.relevance, 0, 1),
  }));
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  return totalWeight > 0 ? weighted.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}
