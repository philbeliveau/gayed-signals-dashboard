/**
 * SignalOrchestratorV2 - Intelligent Signal Data Orchestration
 * Story: 4.0e - API Route Consolidation
 *
 * Orchestrates signal data retrieval with intelligent source selection,
 * quality scoring, failover, and multi-tier caching.
 *
 * Source Priority (Waterfall Pattern):
 * 1. Railway PostgreSQL (Primary - SignalHistory table)
 * 2. Railway Redis (Fast cache fallback)
 * 3. In-memory cache (Fastest but limited)
 */

import { PrismaClient, SignalHistory } from '@prisma/client';
import { Logger } from '../../services/Logger';
import { CircuitBreaker } from '../../services/CircuitBreaker';
import type Redis from 'ioredis';
import { createRedisClient, CACHE_PREFIXES, CACHE_TTL } from '../config/redis';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface SignalQueryParams {
  dateFrom?: Date;
  dateTo?: Date;
  types?: string[];         // ["timing", "momentum", "volatility"]
  categories?: string[];    // Signal names like ["gayed_8_month", "gayed_20d"]
  limit?: number;           // 1-100, default 50
  cursor?: string;          // Pagination cursor (ISO date string)
  sortBy?: 'date' | 'priority' | 'relevance';
  sortOrder?: 'asc' | 'desc';
  includeMetadata?: boolean;
}

export interface SignalData {
  id: number;
  signalName: string;
  signalType: string;
  calculationDate: Date;
  calculationTimestamp: Date;
  signalValue: number;
  signalStrength?: number;
  confidenceScore?: number;
  dataQualityScore?: number;
  signalStatus: string;
  previousStatus?: string;
  statusChanged: boolean;
  inputData?: any;
  intermediateValues?: any;
  calculationParams?: any;
  marketDataIds?: number[];
  provenanceIds?: number[];
  calculationVersion?: string;
}

export interface DataQualityMetrics {
  freshnessScore: number;    // 0-1, based on timestamp
  completenessScore: number; // 0-1, required fields present
  consistencyScore: number;  // 0-1, data format validation
  overallScore: number;      // Average of above
}

export interface SourceHealthStatus {
  name: string;
  available: boolean;
  responseTime?: number;
  errorRate: number;
  circuitBreakerOpen: boolean;
  lastSuccess?: Date;
  lastFailure?: Date;
}

export interface SignalOrchestratorResult {
  success: boolean;
  data: SignalData[];
  metadata: {
    count: number;
    hasMore: boolean;
    nextCursor?: string;
    sources: {
      primary: string;
      fallbacksUsed: string[];
      failedSources: string[];
    };
    quality: DataQualityMetrics;
    timing: {
      totalMs: number;
      sourceMs: Record<string, number>;
    };
  };
}

interface CacheEntry {
  data: SignalData[];
  timestamp: Date;
  quality: DataQualityMetrics;
  expiresAt: Date;
}

// ============================================================================
// SignalOrchestratorV2 Implementation
// ============================================================================

export class SignalOrchestratorV2 {
  private prisma: PrismaClient;
  private logger: Logger;
  private redis: Redis | null;

  // Circuit breakers for each data source
  private postgresCircuitBreaker: CircuitBreaker;
  private redisCircuitBreaker: CircuitBreaker;

  // In-memory cache (LRU-style, limited size)
  private memoryCache: Map<string, CacheEntry> = new Map();
  private readonly MEMORY_CACHE_SIZE = 100;
  private readonly MEMORY_CACHE_TTL_MS = 60 * 1000; // 1 minute

  // Source timeouts (in ms)
  private readonly POSTGRES_TIMEOUT = 5000;  // 5s
  private readonly REDIS_TIMEOUT = 2000;     // 2s

  constructor() {
    this.prisma = new PrismaClient();
    this.logger = new Logger('SignalOrchestratorV2');
    this.redis = createRedisClient();

    // Initialize circuit breakers
    this.postgresCircuitBreaker = new CircuitBreaker({
      name: 'PostgreSQL',
      threshold: 5,
      timeout: 60000, // 1 minute
    });

    this.redisCircuitBreaker = new CircuitBreaker({
      name: 'Redis',
      threshold: 5,
      timeout: 30000, // 30 seconds
    });

    // Connect to Redis if available
    if (this.redis) {
      this.redis.connect().catch((error: Error) => {
        this.logger.error('Failed to connect to Redis:', error);
        this.redis = null;
      });
    }
  }

  /**
   * Fetch signals with intelligent source selection and failover
   */
  async fetchSignals(params: SignalQueryParams): Promise<SignalOrchestratorResult> {
    const startTime = Date.now();
    const timings: Record<string, number> = {};
    const failedSources: string[] = [];
    const fallbacksUsed: string[] = [];

    let data: SignalData[] | null = null;
    let primarySource = '';
    let quality: DataQualityMetrics | null = null;

    // Generate cache key from query params
    const cacheKey = this.generateCacheKey(params);

    // Step 1: Try in-memory cache (fastest)
    const memoryStart = Date.now();
    const cachedResult = this.getFromMemoryCache(cacheKey);
    timings['memory'] = Date.now() - memoryStart;

    if (cachedResult) {
      this.logger.info('Cache hit: in-memory', { cacheKey });
      primarySource = 'memory_cache';
      data = cachedResult.data;
      quality = cachedResult.quality;
    }

    // Step 2: Try Railway PostgreSQL (primary source)
    if (!data && this.postgresCircuitBreaker.canAttempt()) {
      const pgStart = Date.now();
      try {
        data = await this.fetchFromPostgres(params);
        timings['postgresql'] = Date.now() - pgStart;

        if (data && data.length > 0) {
          primarySource = 'railway_postgresql';
          quality = this.calculateDataQuality(data);
          this.postgresCircuitBreaker.recordSuccess();

          // Cache successful result in both Redis and memory
          await this.storeInRedis(cacheKey, data, quality);
          this.setMemoryCache(cacheKey, data, quality);
        }
      } catch (error: any) {
        timings['postgresql'] = Date.now() - pgStart;
        this.postgresCircuitBreaker.recordFailure();
        failedSources.push('railway_postgresql');
        this.logger.error('PostgreSQL query failed', {
          error: error.message,
          circuitBreakerOpen: !this.postgresCircuitBreaker.canAttempt()
        });
      }
    } else if (!data) {
      failedSources.push('railway_postgresql (circuit breaker open)');
    }

    // Step 3: Try Railway Redis (fallback cache)
    if (!data && this.redisCircuitBreaker.canAttempt()) {
      const redisStart = Date.now();
      try {
        data = await this.fetchFromRedis(cacheKey);
        timings['redis'] = Date.now() - redisStart;

        if (data && data.length > 0) {
          fallbacksUsed.push('railway_redis');
          primarySource = 'railway_redis';
          quality = this.calculateDataQuality(data);
          this.redisCircuitBreaker.recordSuccess();

          // Cache in memory for faster access next time
          this.setMemoryCache(cacheKey, data, quality);
        }
      } catch (error: any) {
        timings['redis'] = Date.now() - redisStart;
        this.redisCircuitBreaker.recordFailure();
        failedSources.push('railway_redis');
        this.logger.error('Redis query failed', { error: error.message });
      }
    } else if (!data) {
      failedSources.push('railway_redis (circuit breaker open)');
    }

    // Step 4: Return result or error
    const totalMs = Date.now() - startTime;

    if (!data || data.length === 0) {
      return {
        success: false,
        data: [],
        metadata: {
          count: 0,
          hasMore: false,
          sources: {
            primary: 'none',
            fallbacksUsed,
            failedSources,
          },
          quality: {
            freshnessScore: 0,
            completenessScore: 0,
            consistencyScore: 0,
            overallScore: 0,
          },
          timing: {
            totalMs,
            sourceMs: timings,
          },
        },
      };
    }

    // Determine pagination
    const hasMore = data.length === params.limit;
    const nextCursor = hasMore && data.length > 0
      ? data[data.length - 1].calculationDate.toISOString()
      : undefined;

    return {
      success: true,
      data,
      metadata: {
        count: data.length,
        hasMore,
        nextCursor,
        sources: {
          primary: primarySource,
          fallbacksUsed,
          failedSources,
        },
        quality: quality || this.calculateDataQuality(data),
        timing: {
          totalMs,
          sourceMs: timings,
        },
      },
    };
  }

  /**
   * Fetch signals from Railway PostgreSQL
   */
  private async fetchFromPostgres(params: SignalQueryParams): Promise<SignalData[]> {
    const {
      dateFrom,
      dateTo,
      types,
      categories,
      limit = 50,
      cursor,
      sortBy = 'date',
      sortOrder = 'desc',
    } = params;

    // Build Prisma where clause
    const where: any = {
      deletedAt: null, // Exclude soft-deleted records
    };

    if (dateFrom || dateTo) {
      where.calculationDate = {};
      if (dateFrom) where.calculationDate.gte = dateFrom;
      if (dateTo) where.calculationDate.lte = dateTo;
    }

    if (cursor) {
      // Cursor-based pagination
      where.calculationDate = {
        ...where.calculationDate,
        [sortOrder === 'desc' ? 'lt' : 'gt']: new Date(cursor),
      };
    }

    if (types && types.length > 0) {
      where.signalType = { in: types };
    }

    if (categories && categories.length > 0) {
      where.signalName = { in: categories };
    }

    // Build orderBy clause
    const orderBy: any = {};
    if (sortBy === 'date') {
      orderBy.calculationDate = sortOrder;
    } else if (sortBy === 'priority') {
      // Use confidence score as proxy for priority
      orderBy.confidenceScore = sortOrder;
    } else if (sortBy === 'relevance') {
      // Use data quality score as proxy for relevance
      orderBy.dataQualityScore = sortOrder;
    }

    // Execute query with timeout
    const queryPromise = this.prisma.signalHistory.findMany({
      where,
      orderBy,
      take: limit,
    });

    const results = await this.withTimeout(
      queryPromise,
      this.POSTGRES_TIMEOUT,
      'PostgreSQL query timeout'
    );

    // Transform Prisma results to SignalData
    return results.map(this.transformPrismaToSignalData);
  }

  /**
   * Fetch signals from Railway Redis cache
   * Implements fast caching layer between PostgreSQL and memory cache
   */
  private async fetchFromRedis(cacheKey: string): Promise<SignalData[] | null> {
    if (!this.redis) {
      this.logger.debug('Redis not available, skipping cache lookup');
      return null;
    }

    // Check circuit breaker
    if (!this.redisCircuitBreaker.canAttempt()) {
      this.logger.warn('Redis circuit breaker open, skipping');
      return null;
    }

    try {
      const redisKey = `${CACHE_PREFIXES.QUERY}${cacheKey}`;

      // Set timeout for Redis query
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), this.REDIS_TIMEOUT);
      });

      const fetchPromise = this.redis.get(redisKey);
      const cached = await Promise.race([fetchPromise, timeoutPromise]);

      if (!cached) {
        this.logger.debug(`Redis cache miss: ${cacheKey}`);
        return null;
      }

      // Parse cached data
      const cacheEntry = JSON.parse(cached) as CacheEntry;

      // Check if cache entry is still valid
      if (new Date(cacheEntry.expiresAt) < new Date()) {
        this.logger.debug(`Redis cache expired: ${cacheKey}`);
        // Delete expired entry
        await this.redis.del(redisKey).catch(() => {
          // Ignore deletion errors
        });
        return null;
      }

      // Reconstruct Date objects (JSON.parse converts them to strings)
      const data = cacheEntry.data.map((signal: any) => ({
        ...signal,
        calculationDate: new Date(signal.calculationDate),
        calculationTimestamp: new Date(signal.calculationTimestamp),
      }));

      this.logger.info(`Redis cache hit: ${cacheKey} (${data.length} signals)`);
      this.redisCircuitBreaker.recordSuccess();
      return data;

    } catch (error) {
      this.logger.error('Redis fetch error:', error);
      this.redisCircuitBreaker.recordFailure();
      return null;
    }
  }

  /**
   * Store signals in Railway Redis cache
   * Caches query results with configurable TTL
   */
  private async storeInRedis(cacheKey: string, data: SignalData[], quality: DataQualityMetrics): Promise<void> {
    if (!this.redis || !this.redisCircuitBreaker.canAttempt()) {
      return;
    }

    try {
      const redisKey = `${CACHE_PREFIXES.QUERY}${cacheKey}`;
      const expiresAt = new Date(Date.now() + (CACHE_TTL.QUERY_RESULT * 1000));

      const cacheEntry: CacheEntry = {
        data,
        timestamp: new Date(),
        quality,
        expiresAt,
      };

      // Store with TTL
      await this.redis.setex(
        redisKey,
        CACHE_TTL.QUERY_RESULT,
        JSON.stringify(cacheEntry)
      );

      this.logger.debug(`Stored in Redis cache: ${cacheKey} (${data.length} signals, TTL: ${CACHE_TTL.QUERY_RESULT}s)`);
      this.redisCircuitBreaker.recordSuccess();

    } catch (error) {
      this.logger.error('Redis store error:', error);
      this.redisCircuitBreaker.recordFailure();
      // Don't throw - cache failures shouldn't break the request
    }
  }

  /**
   * Calculate data quality metrics for signal data
   */
  private calculateDataQuality(data: SignalData[]): DataQualityMetrics {
    if (data.length === 0) {
      return {
        freshnessScore: 0,
        completenessScore: 0,
        consistencyScore: 0,
        overallScore: 0,
      };
    }

    // Freshness score: based on how recent the calculation timestamp is
    const now = new Date();
    const freshnessScores = data.map(signal => {
      const ageMs = now.getTime() - signal.calculationTimestamp.getTime();
      const ageHours = ageMs / (1000 * 60 * 60);

      // Fresh if < 1 hour, stale if > 24 hours
      if (ageHours < 1) return 1.0;
      if (ageHours > 24) return 0.0;
      return 1.0 - (ageHours / 24);
    });
    const freshnessScore = freshnessScores.reduce((a, b) => a + b, 0) / data.length;

    // Completeness score: check if required fields are present
    const completenessScores = data.map(signal => {
      let score = 0;
      const requiredFields = 8;

      if (signal.signalName) score++;
      if (signal.signalType) score++;
      if (signal.calculationDate) score++;
      if (signal.signalValue !== undefined) score++;
      if (signal.signalStatus) score++;
      if (signal.confidenceScore !== undefined) score++;
      if (signal.dataQualityScore !== undefined) score++;
      if (signal.calculationTimestamp) score++;

      return score / requiredFields;
    });
    const completenessScore = completenessScores.reduce((a, b) => a + b, 0) / data.length;

    // Consistency score: use stored data quality scores
    const consistencyScores = data
      .filter(s => s.dataQualityScore !== undefined && s.dataQualityScore !== null)
      .map(s => Number(s.dataQualityScore));

    const consistencyScore = consistencyScores.length > 0
      ? consistencyScores.reduce((a, b) => a + b, 0) / consistencyScores.length
      : 0.5; // Default to neutral if no quality scores

    const overallScore = (freshnessScore + completenessScore + consistencyScore) / 3;

    return {
      freshnessScore: Math.round(freshnessScore * 10000) / 10000,
      completenessScore: Math.round(completenessScore * 10000) / 10000,
      consistencyScore: Math.round(consistencyScore * 10000) / 10000,
      overallScore: Math.round(overallScore * 10000) / 10000,
    };
  }

  /**
   * Get health status of all data sources
   */
  async getSourcesHealth(): Promise<SourceHealthStatus[]> {
    return [
      {
        name: 'railway_postgresql',
        available: this.postgresCircuitBreaker.canAttempt(),
        errorRate: this.postgresCircuitBreaker.getErrorRate(),
        circuitBreakerOpen: !this.postgresCircuitBreaker.canAttempt(),
        lastSuccess: this.postgresCircuitBreaker.getLastSuccess(),
        lastFailure: this.postgresCircuitBreaker.getLastFailure(),
      },
      {
        name: 'railway_redis',
        available: this.redisCircuitBreaker.canAttempt(),
        errorRate: this.redisCircuitBreaker.getErrorRate(),
        circuitBreakerOpen: !this.redisCircuitBreaker.canAttempt(),
        lastSuccess: this.redisCircuitBreaker.getLastSuccess(),
        lastFailure: this.redisCircuitBreaker.getLastFailure(),
      },
    ];
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private generateCacheKey(params: SignalQueryParams): string {
    return JSON.stringify({
      dateFrom: params.dateFrom?.toISOString(),
      dateTo: params.dateTo?.toISOString(),
      types: params.types?.sort(),
      categories: params.categories?.sort(),
      limit: params.limit,
      cursor: params.cursor,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    });
  }

  private getFromMemoryCache(key: string): CacheEntry | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    const now = new Date();
    if (now > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry;
  }

  private setMemoryCache(key: string, data: SignalData[], quality: DataQualityMetrics): void {
    // Implement LRU eviction if cache is full
    if (this.memoryCache.size >= this.MEMORY_CACHE_SIZE) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.MEMORY_CACHE_TTL_MS);

    this.memoryCache.set(key, {
      data,
      timestamp: now,
      quality,
      expiresAt,
    });
  }

  private transformPrismaToSignalData(prismaSignal: SignalHistory): SignalData {
    return {
      id: prismaSignal.id,
      signalName: prismaSignal.signalName,
      signalType: prismaSignal.signalType,
      calculationDate: prismaSignal.calculationDate,
      calculationTimestamp: prismaSignal.calculationTimestamp,
      signalValue: Number(prismaSignal.signalValue),
      signalStrength: prismaSignal.signalStrength ? Number(prismaSignal.signalStrength) : undefined,
      confidenceScore: prismaSignal.confidenceScore ? Number(prismaSignal.confidenceScore) : undefined,
      dataQualityScore: prismaSignal.dataQualityScore ? Number(prismaSignal.dataQualityScore) : undefined,
      signalStatus: prismaSignal.signalStatus,
      previousStatus: prismaSignal.previousStatus || undefined,
      statusChanged: prismaSignal.statusChanged,
      inputData: prismaSignal.inputData,
      intermediateValues: prismaSignal.intermediateValues,
      calculationParams: prismaSignal.calculationParams,
      marketDataIds: prismaSignal.marketDataIds,
      provenanceIds: prismaSignal.provenanceIds,
      calculationVersion: prismaSignal.calculationVersion || undefined,
    };
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
      ),
    ]);
  }

  /**
   * Disconnect from data sources
   * Properly closes PostgreSQL, Redis, and clears memory cache
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();

    if (this.redis) {
      try {
        await this.redis.quit();
        this.logger.info('Redis connection closed');
      } catch (error) {
        this.logger.error('Error closing Redis connection:', error);
      }
    }

    this.memoryCache.clear();
  }
}
