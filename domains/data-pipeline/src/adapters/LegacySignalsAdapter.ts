/**
 * Legacy Signals Adapter
 * Story: 4.0e - API Route Consolidation
 *
 * Provides backward compatibility for legacy signal API endpoints
 * by transforming V2 API responses to legacy formats
 */

import { SignalData, SignalOrchestratorResult } from '../services/SignalOrchestratorV2';

// ============================================================================
// Legacy Response Formats
// ============================================================================

/**
 * Legacy V1 Signal Format (from /api/signals)
 */
export interface LegacySignalResponse {
  success: boolean;
  signals: Array<{
    id: number;
    name: string;
    type: string;
    date: string;
    value: number;
    strength?: number;
    status: string;
    confidence?: number;
  }>;
  count: number;
  timestamp: string;
}

/**
 * Legacy Unified Content Format (from /api/content/unified)
 */
export interface LegacyUnifiedContentResponse {
  success: boolean;
  content: Array<{
    id: number;
    title: string;
    type: string;
    published_date: string;
    value: number;
    sentiment: string;
    metadata?: any;
  }>;
  total: number;
  timestamp: string;
}

// ============================================================================
// LegacySignalsAdapter Implementation
// ============================================================================

export class LegacySignalsAdapter {
  /**
   * Transform V2 response to legacy V1 signals format
   */
  transformToV1(v2Response: SignalOrchestratorResult): LegacySignalResponse {
    return {
      success: v2Response.success,
      signals: v2Response.data.map(signal => ({
        id: signal.id,
        name: signal.signalName,
        type: signal.signalType,
        date: signal.calculationDate.toISOString().split('T')[0], // YYYY-MM-DD
        value: signal.signalValue,
        strength: signal.signalStrength,
        status: signal.signalStatus,
        confidence: signal.confidenceScore,
      })),
      count: v2Response.data.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Transform V2 response to legacy unified content format
   */
  transformToUnifiedContent(v2Response: SignalOrchestratorResult): LegacyUnifiedContentResponse {
    return {
      success: v2Response.success,
      content: v2Response.data.map(signal => ({
        id: signal.id,
        title: signal.signalName,
        type: signal.signalType,
        published_date: signal.calculationDate.toISOString(),
        value: signal.signalValue,
        sentiment: this.mapStatusToSentiment(signal.signalStatus),
        metadata: {
          strength: signal.signalStrength,
          confidence: signal.confidenceScore,
          quality: signal.dataQualityScore,
          calculationVersion: signal.calculationVersion,
        },
      })),
      total: v2Response.data.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Add deprecation headers to response
   */
  addDeprecationHeaders(headers: Record<string, string>): Record<string, string> {
    return {
      ...headers,
      'X-API-Deprecated': 'true',
      'X-API-Sunset-Date': '2025-06-01', // 6 months from now
      'X-API-Migration-Guide': 'https://github.com/gayed-signals/dashboard/docs/migration/v1-to-v2.md',
      'Warning': '299 - "This API version is deprecated. Migrate to /api/v2/signals by 2025-06-01"',
    };
  }

  /**
   * Transform legacy V1 query parameters to V2 format
   */
  transformV1QueryToV2(legacyQuery: {
    from?: string;
    to?: string;
    type?: string;
    limit?: string;
  }): {
    dateFrom?: Date;
    dateTo?: Date;
    types?: string[];
    limit?: number;
  } {
    const v2Query: any = {};

    if (legacyQuery.from) {
      v2Query.dateFrom = new Date(legacyQuery.from);
    }

    if (legacyQuery.to) {
      v2Query.dateTo = new Date(legacyQuery.to);
    }

    if (legacyQuery.type) {
      // Legacy API used singular 'type', V2 uses plural 'types' array
      v2Query.types = [legacyQuery.type];
    }

    if (legacyQuery.limit) {
      v2Query.limit = parseInt(legacyQuery.limit, 10);
    }

    return v2Query;
  }

  /**
   * Helper: Map signal status to sentiment
   */
  private mapStatusToSentiment(status: string): string {
    const statusMap: Record<string, string> = {
      'bullish': 'positive',
      'bearish': 'negative',
      'neutral': 'neutral',
      'defensive': 'cautious',
    };

    return statusMap[status.toLowerCase()] || 'neutral';
  }
}
