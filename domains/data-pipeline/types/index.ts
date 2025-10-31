/**
 * Core types for the Unified Data Pipeline
 * Story: 4.0a - Unified Data Service
 */

export interface FetchOptions {
  useCache?: boolean;
  cacheTTL?: number;
  fallbackEnabled?: boolean;
  requireProvenance?: boolean;
  timeout?: number;
  retryAttempts?: number;
}

export interface MarketData {
  id?: string;
  symbol: string;
  date: Date;
  open?: number;
  high?: number;
  low?: number;
  close: number;
  volume?: number;
  source?: string;
  fetchTimestamp?: Date;
  validationStatus?: string;
  qualityScore?: number;
}

export interface DataQuality {
  score: number;
  status: 'VALID' | 'WARNING' | 'INVALID';
  confidence: number;
  isStale?: boolean;
  isFailover?: boolean;
  issues?: string[];
}

export interface ProvenanceRecord {
  fetchId: string;
  source: string;
  symbols: string[];
  fetchedAt: Date;
  apiSuccess: boolean;
  errorMessage?: string;
  confidence: number;
  requestMetadata?: Record<string, any>;
  responseMetadata?: Record<string, any>;
}

export interface MarketDataResult {
  data: MarketData[];
  source: string;
  quality: DataQuality;
  provenance: ProvenanceRecord;
  cached: boolean;
  timestamp: Date;
}

export interface DataSource {
  name: string;
  endpoint: string;
  priority: number;
  healthScore: number;
  circuitBreaker?: any;
  params?: Record<string, any>;
}

export interface DataSourceHealth {
  name: string;
  endpoint: string;
  priority: number;
  healthScore: number;
  lastSuccess: Date | null;
  lastFailure: Date | null;
  errorRate: number;
  enabled: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  score: number;
  errors?: string[];
  warnings?: string[];
}

export interface CircuitBreakerConfig {
  name: string;
  threshold: number;
  timeout: number;
  onOpen?: () => void;
  onHalfOpen?: () => void;
}

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}
