/**
 * Railway Backend V2 Economic Data Service
 * Story: 4.0h - Frontend Railway Backend Integration
 *
 * Type-safe wrapper for Railway backend /api/v1/economic endpoints
 * Provides query parameter building and response validation
 * CRITICAL: Follows Railway backend pattern - frontend MUST use this wrapper
 */

import { RailwayClient } from './railway-client';

// ============================================================================
// Economic Data Types
// ============================================================================

export interface EconomicDataPoint {
  date: string;
  [key: string]: string | number | undefined; // Dynamic fields based on indicator type
}

// Railway backend returns flat structure: { timeSeries, metadata, alerts }
// We wrap it in our standard format for consistency
export interface RailwayEconomicResponse {
  timeSeries?: EconomicDataPoint[];
  laborData?: EconomicDataPoint[];
  housingData?: EconomicDataPoint[];
  alerts?: Alert[];
  metadata: {
    timestamp: string;
    dataSource: string;
    period: string;
    fastMode?: boolean;
    dataPoints: number;
    region?: string;
    fallbackReason?: string;
  };
}

export interface EconomicDataResponse {
  success: boolean;
  data: {
    timeSeries?: EconomicDataPoint[];
    laborData?: EconomicDataPoint[];
    housingData?: EconomicDataPoint[];
    alerts?: Alert[];
    metadata: {
      timestamp: string;
      dataSource: string;
      period: string;
      fastMode?: boolean;
      dataPoints: number;
      region?: string;
      fallbackReason?: string;
    };
  };
}

export interface Alert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | 'info' | 'warning';
  message: string;
  timestamp?: string;
}

export interface EconomicDataQueryParams {
  period?: string; // '3m', '6m', '12m', '24m', '5y', '10y', '20y', 'max'
  fast?: boolean;
  region?: string; // For housing data
  category: 'labor' | 'housing';
}

// ============================================================================
// Service Implementation
// ============================================================================

export class EconomicDataV2Service {
  private client: RailwayClient;

  constructor(client?: RailwayClient) {
    this.client = client || new RailwayClient();
  }

  /**
   * Fetch economic data from Railway backend V2 API
   *
   * @param params Query parameters for economic data fetching
   * @returns Economic data response with quality metrics and provenance
   */
  async getEconomicData(
    params: EconomicDataQueryParams
  ): Promise<EconomicDataResponse> {
    const queryString = this.buildQueryString(params);
    const endpoint = `/api/v1/economic/${params.category === 'labor' ? 'labor-market' : 'housing-market'}${queryString}`;

    try {
      // Railway backend economic endpoints return flat structure: { timeSeries, metadata, alerts }
      // RailwayClient just passes through the JSON, so we get the flat structure
      const response = await this.client.request<RailwayEconomicResponse>(
        endpoint
      );

      // RailwayClient may wrap it or pass through - handle both cases
      let flatResponse: RailwayEconomicResponse;
      
      if ('data' in response && typeof response.data === 'object' && 'metadata' in response.data) {
        // Wrapped format from RailwayClient
        flatResponse = response.data as unknown as RailwayEconomicResponse;
      } else if ('metadata' in response) {
        // Flat format directly from backend
        flatResponse = response as unknown as RailwayEconomicResponse;
      } else {
        throw new Error('Unexpected response format from Railway backend');
      }

      // Validate and wrap in standard format
      this.validateResponse(flatResponse);

      return {
        success: true,
        data: {
          timeSeries: flatResponse.timeSeries || flatResponse.laborData || flatResponse.housingData,
          laborData: params.category === 'labor' ? (flatResponse.timeSeries || flatResponse.laborData) : undefined,
          housingData: params.category === 'housing' ? (flatResponse.timeSeries || flatResponse.housingData) : undefined,
          alerts: flatResponse.alerts || [],
          metadata: flatResponse.metadata,
        },
      };
    } catch (error) {
      console.error('[EconomicDataV2Service] Failed to fetch economic data:', error);
      throw error;
    }
  }

  /**
   * Build query string from parameters
   */
  private buildQueryString(params: EconomicDataQueryParams): string {
    const searchParams = new URLSearchParams();

    if (params.period) {
      searchParams.set('period', params.period);
    }

    if (params.fast !== undefined) {
      searchParams.set('fast', String(params.fast));
    }

    if (params.region) {
      searchParams.set('region', params.region);
    }

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  /**
   * Validate Railway backend response structure
   * Backend returns flat structure: { timeSeries, metadata, alerts }
   */
  private validateResponse(response: unknown): asserts response is RailwayEconomicResponse | EconomicDataResponse {
    if (typeof response !== 'object' || response === null) {
      throw new Error('Invalid response: not an object');
    }

    const typedResponse = response as Record<string, unknown>;

    // Check if wrapped format (from RailwayClient) or flat format (from backend)
    if ('data' in typedResponse) {
      // Wrapped format
      const data = typedResponse.data as Record<string, unknown>;
      if (!('metadata' in data)) {
        throw new Error('Invalid response: missing metadata field');
      }
      const hasTimeSeries = 'timeSeries' in data || 'laborData' in data || 'housingData' in data;
      if (!hasTimeSeries) {
        throw new Error('Invalid response: missing time series data');
      }
    } else {
      // Flat format (direct from backend)
      if (!('metadata' in typedResponse)) {
        throw new Error('Invalid response: missing metadata field');
      }
      const hasTimeSeries = 'timeSeries' in typedResponse || 'laborData' in typedResponse || 'housingData' in typedResponse;
      if (!hasTimeSeries) {
        throw new Error('Invalid response: missing time series data');
      }
    }
  }
}

