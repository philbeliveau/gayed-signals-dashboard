/**
 * Railway Backend V2 Signals Service
 * Story: 4.0h - Frontend Railway Backend Integration
 *
 * Type-safe wrapper for Railway backend /api/v2/signals endpoint
 * Provides query parameter building and response validation
 */

import { RailwayClient } from './railway-client';
import { SignalV2Response, SignalQueryParams } from './types';

export class SignalsV2Service {
  private client: RailwayClient;

  constructor(client?: RailwayClient) {
    this.client = client || new RailwayClient();
  }

  /**
   * Fetch signals from Railway backend V2 API
   *
   * @param params Query parameters for signal fetching
   * @returns V2 signal response with data quality metrics and provenance
   */
  async getSignals(params?: SignalQueryParams): Promise<SignalV2Response> {
    const queryString = this.buildQueryString(params);
    const endpoint = `/api/v2/signals${queryString}`;

    try {
      const response = await this.client.request<SignalV2Response>(
        endpoint
      );

      // Debug logging to see what we actually get
      console.log('[SignalsV2Service] Raw response from Railway:', JSON.stringify(response, null, 2));

      // Validate response structure
      this.validateResponse(response);

      console.log('[SignalsV2Service] Response validated successfully');
      return response;
    } catch (error) {
      console.error('[SignalsV2Service] Failed to fetch signals:', error);
      throw error;
    }
  }

  /**
   * Build query string from parameters
   */
  private buildQueryString(params?: SignalQueryParams): string {
    if (!params) return '';

    const searchParams = new URLSearchParams();

    if (params.fast !== undefined) {
      searchParams.set('fast', String(params.fast));
    }

    if (params.symbols && params.symbols.length > 0) {
      searchParams.set('symbols', params.symbols.join(','));
    }

    if (params.startDate) {
      searchParams.set('startDate', params.startDate);
    }

    if (params.endDate) {
      searchParams.set('endDate', params.endDate);
    }

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  /**
   * Validate V2 API response structure
   */
  private validateResponse(response: unknown): void {
    if (typeof response !== 'object' || response === null) {
      throw new Error('Invalid response: not an object');
    }

    const typedResponse = response as Record<string, unknown>;

    if (!('success' in typedResponse)) {
      throw new Error('Invalid response: missing success field');
    }

    if (!('data' in typedResponse)) {
      throw new Error('Invalid response: missing data field');
    }

    if (!('metadata' in typedResponse)) {
      throw new Error('Invalid response: missing metadata field');
    }

    if (!Array.isArray(typedResponse.data)) {
      throw new Error('Invalid response: data is not an array');
    }
  }
}
