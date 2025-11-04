/**
 * Railway Backend V2 Market Data Service
 * Story: 4.0j - Simple Gayed Signals Backtesting Platform
 *
 * Type-safe wrapper for Railway backend /api/v2/market-data endpoint
 * Provides query parameter building and response validation
 */

import { RailwayClient } from './railway-client';

// ============================================================================
// Market Data Types
// ============================================================================

export interface MarketDataPoint {
  symbol: string;
  date: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

export interface MarketDataResponse {
  success: boolean;
  result: {
    data: MarketDataPoint[];
    source: string;
    quality: {
      score: number;
      issues: string[];
    };
    provenance: {
      fetchId: string;
      source: string;
      timestamp: string;
      symbols: string[];
      success: boolean;
    };
    cached: boolean;
    timestamp: Date;
  };
  timestamp: string;
}

export interface MarketDataQueryParams {
  symbols: string[];
  useCache?: boolean;
  fallbackEnabled?: boolean;
  startDate?: string;  // YYYY-MM-DD format for historical data
  endDate?: string;    // YYYY-MM-DD format for historical data
  limit?: number;      // Maximum number of data points to return
}

// ============================================================================
// Service Implementation
// ============================================================================

export class MarketDataV2Service {
  private client: RailwayClient;

  constructor(client?: RailwayClient) {
    this.client = client || new RailwayClient();
  }

  /**
   * Fetch market data from Railway backend V2 API
   *
   * @param params Query parameters for market data fetching
   * @returns Market data response with quality metrics and provenance
   */
  async getMarketData(
    params: MarketDataQueryParams
  ): Promise<MarketDataResponse> {
    const queryString = this.buildQueryString(params);
    const endpoint = `/api/v2/market-data${queryString}`;

    try {
      const response = await this.client.request<MarketDataResponse>(endpoint);

      // Validate response structure
      this.validateResponse(response);

      return response;
    } catch (error) {
      console.error('[MarketDataV2Service] Failed to fetch market data:', error);
      throw error;
    }
  }

  /**
   * Build query string from parameters
   */
  private buildQueryString(params: MarketDataQueryParams): string {
    const searchParams = new URLSearchParams();

    if (params.symbols && params.symbols.length > 0) {
      searchParams.set('symbols', params.symbols.join(','));
    }

    if (params.useCache !== undefined) {
      searchParams.set('useCache', String(params.useCache));
    }

    if (params.fallbackEnabled !== undefined) {
      searchParams.set('fallbackEnabled', String(params.fallbackEnabled));
    }

    // Add date range for historical data (Story 4.0j)
    if (params.startDate) {
      searchParams.set('startDate', params.startDate);
    }

    if (params.endDate) {
      searchParams.set('endDate', params.endDate);
    }

    if (params.limit !== undefined) {
      searchParams.set('limit', String(params.limit));
    }

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  /**
   * Validate V2 API response structure with defensive fallbacks
   */
  private validateResponse(response: unknown): asserts response is MarketDataResponse {
    if (typeof response !== 'object' || response === null) {
      throw new Error('Invalid response: not an object');
    }

    const typedResponse = response as Record<string, unknown>;

    if (!('success' in typedResponse)) {
      throw new Error('Invalid response: missing success field');
    }

    if (!('result' in typedResponse)) {
      throw new Error('Invalid response: missing result field');
    }

    const result = typedResponse.result as Record<string, unknown>;

    if (!('data' in result)) {
      throw new Error('Invalid response: missing data field in result');
    }

    if (!Array.isArray(result.data)) {
      throw new Error('Invalid response: data is not an array');
    }

    // Defensive validation for quality metrics (Story 4.0j - DEV-001 fix)
    // Railway backend may have different response formats across versions
    if (!('quality' in result) || typeof result.quality !== 'object' || result.quality === null) {
      console.warn(
        '[MarketDataV2Service] Quality metrics missing from Railway response - applying degraded quality score'
      );

      // Apply default degraded quality metrics to allow graceful operation
      // Quality score 0.5 indicates data is usable but may have gaps
      result.quality = {
        score: 0.5,
        status: 'DEGRADED',
        confidence: 0.5,
        issues: ['Quality metrics unavailable from backend - using degraded default']
      };
    }

    const quality = result.quality as Record<string, unknown>;

    // Validate or default quality score
    if (typeof quality.score !== 'number') {
      console.warn('[MarketDataV2Service] Quality score invalid - defaulting to 0.5');
      quality.score = 0.5;
    }

    // Enforce minimum quality threshold (warn only, don't block)
    if (quality.score < 0.8) {
      console.warn(
        `[MarketDataV2Service] Low quality data: score ${quality.score}. ` +
        `Issues: ${JSON.stringify(quality.issues || [])}`
      );
    }
  }
}
