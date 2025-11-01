/**
 * Unified Signals API Client
 *
 * Automatically routes requests to Railway backend or local API based on feature flags.
 * Handles authentication, retries, and error handling.
 */

import { RailwayClient } from './railway-client';
import { isRailwayBackendAvailable, logMigrationMetric } from '../feature-flags';

export interface Signal {
  id: string;
  name: string;
  type: string;
  signal: 'Risk-On' | 'Risk-Off' | 'Neutral';
  strength: 'Strong' | 'Moderate' | 'Weak';
  confidence: number;
  value: number;
  description: string;
  timestamp: string;
}

export interface ConsensusSignal {
  consensus: 'Risk-On' | 'Risk-Off' | 'Mixed';
  confidence: number;
  riskOnCount: number;
  riskOffCount: number;
  signals: Signal[];
}

export interface SignalsResponse {
  signals: Signal[];
  consensus: ConsensusSignal;
  metadata: {
    timestamp: string;
    symbolCount?: number;
    signalCount?: number;
    dataSource: string;
    fastMode?: boolean;
    cached?: boolean;
  };
}

export interface SignalsOptions {
  fast?: boolean;
}

/**
 * Transform Railway backend signal format to frontend format
 */
function transformRailwaySignal(railwaySignal: any): Signal {
  // Map Railway signal status to frontend format
  const statusMap: Record<string, 'Risk-On' | 'Risk-Off' | 'Neutral'> = {
    'risk_on': 'Risk-On',
    'risk_off': 'Risk-Off',
    'neutral': 'Neutral',
  };

  // Map signal strength (0-1) to Weak/Moderate/Strong
  let strength: 'Weak' | 'Moderate' | 'Strong' = 'Moderate';
  if (railwaySignal.signalStrength < 0.4) strength = 'Weak';
  else if (railwaySignal.signalStrength > 0.7) strength = 'Strong';

  return {
    id: railwaySignal.id?.toString() || railwaySignal.signalName,
    name: formatSignalName(railwaySignal.signalName),
    type: railwaySignal.signalName, // utilities_spy, lumber_gold, etc.
    signal: statusMap[railwaySignal.signalStatus] || 'Neutral',
    strength,
    confidence: railwaySignal.confidenceScore,
    value: railwaySignal.signalValue,
    description: generateSignalDescription(railwaySignal),
    timestamp: railwaySignal.calculationTimestamp || railwaySignal.calculationDate,
  };
}

/**
 * Format signal name for display
 */
function formatSignalName(name: string): string {
  const nameMap: Record<string, string> = {
    'utilities_spy': 'Utilities/SPY Ratio',
    'lumber_gold': 'Lumber/Gold Ratio',
    'treasury_curve': 'Treasury Curve Slope',
    'vix_defensive': 'VIX Defensive Signal',
    'sp500_ma': 'S&P 500 Moving Average',
  };
  return nameMap[name] || name.replace(/_/g, ' ').toUpperCase();
}

/**
 * Generate signal description
 */
function generateSignalDescription(signal: any): string {
  const status = signal.signalStatus.replace('_', '-');
  return `${formatSignalName(signal.signalName)} is showing ${status} with ${(signal.confidenceScore * 100).toFixed(0)}% confidence (quality: ${(signal.dataQualityScore * 100).toFixed(0)}%)`;
}

/**
 * Fetch signals from Railway backend or local API
 */
export async function fetchSignals(options: SignalsOptions = {}): Promise<SignalsResponse> {
  const startTime = Date.now();
  const useRailway = isRailwayBackendAvailable();

  console.log(`[Signal Fetch] Using ${useRailway ? 'Railway backend' : 'local API'}: ${useRailway ? process.env.NEXT_PUBLIC_RAILWAY_BACKEND_URL : '/api/signals'}`);

  try {
    if (useRailway) {
      // Use Railway backend V2 API
      const railwayClient = new RailwayClient();
      const endpoint = `/api/v2/signals${options.fast ? '?fast=true' : ''}`;

      const response = await railwayClient.request<any>(endpoint, {
        method: 'GET',
      });

      // Transform Railway format to frontend format
      const signals = (response.data || []).map(transformRailwaySignal);

      // Calculate consensus from transformed signals
      const riskOnCount = signals.filter(s => s.signal === 'Risk-On').length;
      const riskOffCount = signals.filter(s => s.signal === 'Risk-Off').length;
      const totalSignals = signals.length;

      let consensus: 'Risk-On' | 'Risk-Off' | 'Mixed' = 'Mixed';
      if (riskOnCount > totalSignals / 2) consensus = 'Risk-On';
      else if (riskOffCount > totalSignals / 2) consensus = 'Risk-Off';

      const confidence = Math.max(riskOnCount, riskOffCount) / totalSignals;

      logMigrationMetric('railway', true, {
        endpoint: '/api/v2/signals',
        duration: Date.now() - startTime,
      });

      return {
        signals,
        consensus: {
          consensus,
          confidence,
          riskOnCount,
          riskOffCount,
          signals,
        },
        metadata: {
          timestamp: response.timestamp || new Date().toISOString(),
          symbolCount: totalSignals,
          signalCount: totalSignals,
          dataSource: 'railway_backend',
          fastMode: options.fast,
          cached: response.metadata?.timing?.cached,
        },
      };
    } else {
      // Fallback to local Next.js API route
      const response = await fetch(`/api/signals${options.fast ? '?fast=true' : ''}`);

      if (!response.ok) {
        throw new Error(`Signals API failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      logMigrationMetric('local', true, {
        endpoint: '/api/signals',
        duration: Date.now() - startTime,
      });

      return data;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logMigrationMetric(useRailway ? 'railway' : 'local', false, {
      endpoint: useRailway ? '/api/v2/signals' : '/api/signals',
      duration: Date.now() - startTime,
      error: errorMessage,
    });

    // If Railway fails, try local fallback
    if (useRailway) {
      console.warn('[Signal Fetch] Railway backend failed, falling back to local API:', errorMessage);

      try {
        const response = await fetch(`/api/signals${options.fast ? '?fast=true' : ''}`);

        if (!response.ok) {
          throw new Error(`Local API also failed: ${response.status}`);
        }

        const data = await response.json();

        logMigrationMetric('local', true, {
          endpoint: '/api/signals (fallback)',
          duration: Date.now() - startTime,
        });

        return data;
      } catch (fallbackError) {
        console.error('[Signal Fetch] Local API fallback also failed:', fallbackError);
        throw error; // Throw original Railway error
      }
    }

    throw error;
  }
}

/**
 * Fetch historical data for a specific symbol
 */
export async function fetchHistoricalData(
  symbol: string,
  startDate: string,
  endDate: string
): Promise<any> {
  const startTime = Date.now();
  const useRailway = isRailwayBackendAvailable();

  try {
    if (useRailway) {
      const railwayClient = new RailwayClient();
      const response = await railwayClient.request<any>(
        `/api/v2/market-data/historical?symbol=${symbol}&startDate=${startDate}&endDate=${endDate}`,
        {
          method: 'GET',
        }
      );

      logMigrationMetric('railway', true, {
        endpoint: '/api/v2/market-data/historical',
        duration: Date.now() - startTime,
      });

      return response.data;
    } else {
      const response = await fetch('/api/signals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol,
          startDate,
          endDate,
          requestHistorical: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Historical data API failed: ${response.status}`);
      }

      const data = await response.json();

      logMigrationMetric('local', true, {
        endpoint: '/api/signals (POST)',
        duration: Date.now() - startTime,
      });

      return data;
    }
  } catch (error) {
    logMigrationMetric(useRailway ? 'railway' : 'local', false, {
      endpoint: useRailway ? '/api/v2/market-data/historical' : '/api/signals (POST)',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}
