/**
 * Signal Test Fixtures
 *
 * Realistic test data for signal-based integration tests
 */

import type { TestSignal } from '../helpers/test-utilities';

/**
 * Bullish signals fixture
 */
export const bullishSignals: TestSignal[] = [
  {
    id: 'signal-bullish-1',
    date: '2025-10-31',
    type: 'bullish',
    category: 'tech',
    content: 'Technology sector showing strong momentum with utilities underperforming SPY',
    confidence: 0.92,
    source: 'gayed-signals',
  },
  {
    id: 'signal-bullish-2',
    date: '2025-10-30',
    type: 'bullish',
    category: 'market',
    content: 'SPY breaking above 20-day moving average with increasing volume',
    confidence: 0.88,
    source: 'gayed-signals',
  },
  {
    id: 'signal-bullish-3',
    date: '2025-10-29',
    type: 'bullish',
    category: 'market',
    content: 'Risk-on environment confirmed by homebuilders outperformance',
    confidence: 0.85,
    source: 'gayed-signals',
  },
];

/**
 * Bearish signals fixture
 */
export const bearishSignals: TestSignal[] = [
  {
    id: 'signal-bearish-1',
    date: '2025-10-28',
    type: 'bearish',
    category: 'market',
    content: 'Utilities outperforming SPY signaling risk-off sentiment',
    confidence: 0.90,
    source: 'gayed-signals',
  },
  {
    id: 'signal-bearish-2',
    date: '2025-10-27',
    type: 'bearish',
    category: 'geopolitical',
    content: 'Geopolitical tensions rising as gold rallies above key resistance',
    confidence: 0.87,
    source: 'gayed-signals',
  },
];

/**
 * Neutral signals fixture
 */
export const neutralSignals: TestSignal[] = [
  {
    id: 'signal-neutral-1',
    date: '2025-10-26',
    type: 'neutral',
    category: 'market',
    content: 'Markets consolidating with no clear directional bias',
    confidence: 0.75,
    source: 'gayed-signals',
  },
];

/**
 * Mixed signals (all types)
 */
export const mixedSignals: TestSignal[] = [
  ...bullishSignals,
  ...bearishSignals,
  ...neutralSignals,
];

/**
 * Large dataset for pagination testing (150 signals)
 */
export const paginationSignals: TestSignal[] = Array.from({ length: 150 }, (_, i) => ({
  id: `signal-pagination-${i}`,
  date: new Date(2025, 9, 31 - Math.floor(i / 5)).toISOString().split('T')[0],
  type: i % 3 === 0 ? 'bullish' : i % 3 === 1 ? 'bearish' : 'neutral',
  category: i % 2 === 0 ? 'market' : 'tech',
  content: `Signal ${i} content for pagination testing`,
  confidence: 0.7 + (Math.random() * 0.3),
  source: 'gayed-signals',
}));

/**
 * Signals with quality issues for testing validation
 */
export const lowQualitySignals: TestSignal[] = [
  {
    id: 'signal-low-quality-1',
    date: '2025-10-25',
    type: 'bullish',
    category: 'market',
    content: '',  // Empty content
    confidence: 0.45,  // Low confidence
    source: 'test',
  },
  {
    id: 'signal-low-quality-2',
    date: '1900-01-01',  // Invalid date
    type: 'bearish',
    category: 'market',
    content: 'Suspicious signal with very old date',
    confidence: 0.50,
    source: 'unknown',
  },
];

/**
 * Real-world style signals for end-to-end testing
 */
export const realisticSignals: TestSignal[] = [
  {
    id: 'signal-real-utl-spy-1',
    date: '2025-10-31',
    type: 'bullish',
    category: 'utilities-spy',
    content: 'XLU/SPY ratio declining to 0.68, signaling risk-on market environment. Utilities underperformance suggests investor preference for growth over defensive sectors.',
    confidence: 0.93,
    source: 'gayed-20d-signal',
  },
  {
    id: 'signal-real-home-gold-1',
    date: '2025-10-30',
    type: 'bullish',
    category: 'homebuilders-gold',
    content: 'WOOD/GLD ratio expanding to 1.25, indicating economic optimism. Homebuilders outperforming gold signals confidence in housing market and economic growth.',
    confidence: 0.89,
    source: 'gayed-8mo-signal',
  },
  {
    id: 'signal-real-geopolitical-1',
    date: '2025-10-29',
    type: 'neutral',
    category: 'geopolitical',
    content: 'Gold trading sideways in tight range around $2,050. No clear directional signal as markets await clarity on geopolitical developments.',
    confidence: 0.72,
    source: 'geopolitical-monitor',
  },
];
