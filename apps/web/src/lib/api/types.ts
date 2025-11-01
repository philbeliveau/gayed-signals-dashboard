/**
 * Railway Backend API Type Definitions
 * Story: 4.0h - Frontend Railway Backend Integration
 */

// ============================================================================
// Configuration Types
// ============================================================================

export interface RailwayConfig {
  baseURL: string;
  apiKey: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

// ============================================================================
// Response Types
// ============================================================================

export interface RailwayResponse<T> {
  success: boolean;
  data: T;
  metadata: ResponseMetadata;
}

export interface ResponseMetadata {
  sources: {
    primary: string;
    failedSources: string[];
  };
  quality: {
    averageScore: number;
    issues: string[];
  };
  timing: {
    totalMs: number;
    cached: boolean;
  };
}

// ============================================================================
// Signal Types (V2 API Format)
// ============================================================================

export interface SignalV2Response {
  success: boolean;
  data: SignalV2[];
  metadata: ResponseMetadata;
}

export interface SignalV2 {
  type: string;
  signal: 'Risk-On' | 'Risk-Off' | 'Neutral';
  strength: 'Strong' | 'Moderate' | 'Weak';
  confidence: number;
  rawValue: number;
  date: string;
  provenance: DataProvenance;
}

export interface DataProvenance {
  sources: ProvenanceSource[];
  validationPassed: boolean;
  confidenceReduction: number;
  missingDataSources: string[];
}

export interface ProvenanceSource {
  name: string;
  symbols: string[];
  fetchedAt: string;
  dataPoints: number;
  apiSuccess: boolean;
}

// ============================================================================
// Query Parameters
// ============================================================================

export interface SignalQueryParams {
  fast?: boolean;
  symbols?: string[];
  startDate?: string;
  endDate?: string;
}

// ============================================================================
// Error Types
// ============================================================================

export class RailwayAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'RailwayAPIError';
  }
}

export class RailwayTimeoutError extends Error {
  constructor(message: string = 'Railway API request timeout') {
    super(message);
    this.name = 'RailwayTimeoutError';
  }
}

export class RailwayNetworkError extends Error {
  constructor(message: string = 'Railway API network error') {
    super(message);
    this.name = 'RailwayNetworkError';
  }
}
