/**
 * Unified Signal Fetching with Railway Backend Fallback
 * Story: 4.0h - Frontend Railway Backend Integration
 *
 * Provides graceful fallback: Railway backend → local API
 * with migration metrics tracking
 */

import { SignalsV2Service } from './signals-v2';
import { SignalsAdapter } from '../adapters/signals-adapter';
import {
  USE_RAILWAY_BACKEND,
  isRailwayBackendAvailable,
  logMigrationMetric,
} from '../feature-flags';
import { performanceMonitor } from './performance-monitor';
import type { Signal, ConsensusSignal } from '@/domains/trading-signals/types';

/**
 * Options for signal fetching
 */
export interface FetchSignalsOptions {
  fast?: boolean;
  symbols?: string[];
  useCache?: boolean;
}

/**
 * Signal response format
 */
export interface SignalResponse {
  signals: Signal[];
  consensus: ConsensusSignal;
  metadata: {
    calculatedAt: string;
    dataSource: string;
    cached: boolean;
    quality?: {
      averageScore: number;
      issues: string[];
    };
  };
}

/**
 * Fetch signals with automatic fallback
 *
 * Flow:
 * 1. If Railway backend enabled and available → try Railway V2 API
 * 2. If Railway fails or disabled → fallback to local API
 * 3. Track migration metrics for both paths
 */
export async function fetchSignalsWithFallback(
  options: FetchSignalsOptions = {}
): Promise<SignalResponse> {
  const startTime = Date.now();

  // Try Railway backend if enabled
  if (USE_RAILWAY_BACKEND && isRailwayBackendAvailable()) {
    try {
      console.log('[Signal Fetch] Attempting Railway backend V2 API...');

      const v2Service = new SignalsV2Service();
      const v2Response = await v2Service.getSignals({
        fast: options.fast,
        symbols: options.symbols,
      });

      const adapted = SignalsAdapter.toLegacyFormat(v2Response);
      const duration = Date.now() - startTime;

      logMigrationMetric('railway', true, {
        endpoint: '/api/v2/signals',
        duration,
      });

      // Record performance metric
      performanceMonitor.record({
        endpoint: '/api/v2/signals',
        duration,
        cached: adapted.metadata.cached,
        source: 'railway',
        timestamp: new Date().toISOString(),
        success: true,
      });

      console.log(
        `[Signal Fetch] Railway backend succeeded in ${duration}ms (cached: ${adapted.metadata.cached})`
      );

      return adapted;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      console.warn(
        `[Signal Fetch] Railway backend failed after ${duration}ms:`,
        errorMessage
      );
      console.warn('[Signal Fetch] Falling back to local API...');

      logMigrationMetric('railway', false, {
        endpoint: '/api/v2/signals',
        duration,
        error: errorMessage,
      });

      // Record failed Railway attempt
      performanceMonitor.record({
        endpoint: '/api/v2/signals',
        duration,
        cached: false,
        source: 'railway',
        timestamp: new Date().toISOString(),
        success: false,
      });

      // Fall through to local API
    }
  }

  // Fallback: Use local API
  try {
    const localStartTime = Date.now();
    const apiUrl = options.fast ? '/api/signals?fast=true' : '/api/signals';

    console.log(`[Signal Fetch] Using local API: ${apiUrl}`);

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Local API error: ${response.status}`);
    }

    const data = await response.json();
    const duration = Date.now() - localStartTime;

    logMigrationMetric('local', true, {
      endpoint: apiUrl,
      duration,
    });

    // Record local API performance
    performanceMonitor.record({
      endpoint: apiUrl,
      duration,
      cached: data.metadata?.cached || false,
      source: 'local',
      timestamp: new Date().toISOString(),
      success: true,
    });

    console.log(`[Signal Fetch] Local API succeeded in ${duration}ms`);

    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logMigrationMetric('local', false, {
      endpoint: '/api/signals',
      duration,
      error: errorMessage,
    });

    console.error('[Signal Fetch] Both Railway and local API failed:', error);
    throw new Error(
      `Failed to fetch signals from all sources: ${errorMessage}`
    );
  }
}

/**
 * Force Railway backend fetch (no fallback)
 * Useful for testing Railway backend specifically
 */
export async function fetchSignalsFromRailway(
  options: FetchSignalsOptions = {}
): Promise<SignalResponse> {
  if (!isRailwayBackendAvailable()) {
    throw new Error('Railway backend not available');
  }

  const v2Service = new SignalsV2Service();
  const v2Response = await v2Service.getSignals({
    fast: options.fast,
    symbols: options.symbols,
  });

  return SignalsAdapter.toLegacyFormat(v2Response);
}

/**
 * Force local API fetch (no Railway)
 * Useful for testing local API specifically
 */
export async function fetchSignalsFromLocal(
  options: FetchSignalsOptions = {}
): Promise<SignalResponse> {
  const apiUrl = options.fast ? '/api/signals?fast=true' : '/api/signals';
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`Local API error: ${response.status}`);
  }

  return await response.json();
}
