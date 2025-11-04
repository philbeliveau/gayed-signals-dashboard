/**
 * Unified Data Service
 * Story: 4.0a - Unified Data Service
 *
 * Single entry point for ALL external data fetching operations.
 * Provides failover, caching, validation, and provenance tracking.
 */

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from './Logger';
import { CircuitBreaker } from './CircuitBreaker';
import {
  FetchOptions,
  MarketData,
  MarketDataResult,
  DataSource,
  DataSourceHealth,
  DataQuality,
  ProvenanceRecord,
} from '../types';
import yahooFinance from 'yahoo-finance2';
import axios from 'axios';

export class UnifiedDataService {
  private prisma: PrismaClient;
  private redis: Redis;
  private logger: Logger;
  private circuitBreakers: Map<string, CircuitBreaker>;
  private initialized: boolean = false;

  constructor() {
    this.logger = new Logger('UnifiedDataService');
    this.circuitBreakers = new Map();

    // Initialize Prisma with Railway connection
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL, // Internal Railway URL
        },
      },
    });

    // Initialize Redis
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error', { error: err.message });
    });
  }

  /**
   * Initialize data sources in the database
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.prisma.$connect();
      this.logger.info('Connected to Railway PostgreSQL');

      // Seed initial data sources
      await this.seedDataSources();

      this.initialized = true;
      this.logger.info('UnifiedDataService initialized');
    } catch (error) {
      this.logger.error('Failed to initialize service', { error });
      throw error;
    }
  }

  /**
   * Seed data sources into database
   */
  private async seedDataSources(): Promise<void> {
    const sources = [
      {
        name: 'TIINGO',
        endpoint: 'https://api.tiingo.com/tiingo/daily',
        priority: 1,
        healthScore: 1.0,
      },
      // Yahoo Finance disabled - API compatibility issues
      // Alpha Vantage removed - unreliable and rate limited
    ];

    for (const source of sources) {
      await this.prisma.dataSourceHealth.upsert({
        where: { name: source.name },
        update: {
          priority: source.priority,
          healthScore: source.healthScore,
          endpoint: source.endpoint,
        },
        create: source,
      });
    }

    this.logger.info('Data sources seeded');
  }

  /**
   * Primary method for fetching market data
   * This is the ONLY method that should be used to get external data
   */
  async fetchMarketData(
    symbols: string[],
    options: FetchOptions = {}
  ): Promise<MarketDataResult> {
    const startTime = Date.now();
    const fetchId = this.generateFetchId();

    try {
      this.logger.info('Fetching market data', { symbols, options, fetchId });

      // Step 1: Check cache if enabled
      if (options.useCache !== false) {
        const cached = await this.checkCache(symbols);
        if (cached && !this.isCacheStale(cached, options.cacheTTL)) {
          this.logger.info('Cache hit', { fetchId });
          return { ...cached, cached: true };
        }
      }

      // Step 2: Try primary data source
      const primarySource = await this.selectBestSource(symbols);

      try {
        const data = await this.fetchFromSource(
          primarySource,
          symbols,
          options
        );

        // Step 3: Validate data quality
        const quality = await this.validateDataQuality(data);

        // Step 4: Store in database with provenance
        await this.storeWithProvenance(data, primarySource, fetchId, quality);

        // Step 5: Update cache
        await this.updateCache(symbols, data);

        // Step 6: Return with full metadata
        return {
          data,
          source: primarySource.name,
          quality,
          provenance: await this.createProvenanceRecord(
            fetchId,
            primarySource,
            symbols,
            true
          ),
          cached: false,
          timestamp: new Date(),
        };
      } catch (primaryError: any) {
        this.logger.warn('Primary source failed', {
          source: primarySource.name,
          error: primaryError.message,
          fetchId,
        });

        // Step 7: Failover to secondary sources
        if (options.fallbackEnabled !== false) {
          return await this.attemptFailover(symbols, options, fetchId);
        }

        throw primaryError;
      }
    } catch (error: any) {
      this.logger.error('Failed to fetch market data', {
        error: error.message,
        fetchId,
      });

      // Step 8: Last resort - serve stale cache if available
      const staleCache = await this.checkCache(symbols);
      if (staleCache) {
        this.logger.warn('Serving stale cache due to errors', { fetchId });
        return {
          ...staleCache,
          cached: true,
          quality: { ...staleCache.quality, isStale: true },
        };
      }

      throw error;
    } finally {
      // Step 9: Record metrics
      const duration = Date.now() - startTime;
      await this.recordMetrics(fetchId, duration);
    }
  }

  /**
   * Health check for Railway
   */
  async healthCheck(): Promise<{ status: string; checks: any }> {
    const checks: any = {
      database: false,
      redis: false,
      dataSources: [],
    };

    try {
      // Check database
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = true;

      // Check Redis
      await this.redis.ping();
      checks.redis = true;

      // Check data sources
      const sources = await this.getHealthyDataSources();
      checks.dataSources = sources.map((s) => ({
        name: s.name,
        healthy: s.healthScore > 0.5,
        score: Number(s.healthScore),
      }));

      return {
        status: 'healthy',
        checks,
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        checks,
      };
    }
  }

  /**
   * Generate unique fetch ID
   */
  private generateFetchId(): string {
    return uuidv4();
  }

  /**
   * Check Redis cache for market data
   */
  private async checkCache(
    symbols: string[]
  ): Promise<MarketDataResult | null> {
    try {
      const cacheKey = this.buildCacheKey(symbols);
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      return null;
    } catch (error: any) {
      this.logger.warn('Cache check failed', { error: error.message });
      return null;
    }
  }

  /**
   * Update Redis cache with market data
   */
  private async updateCache(
    symbols: string[],
    data: MarketData[]
  ): Promise<void> {
    try {
      const cacheKey = this.buildCacheKey(symbols);
      const cacheTTL = 300; // 5 minutes

      const cacheValue = JSON.stringify({
        data,
        timestamp: new Date(),
      });

      await this.redis.setex(cacheKey, cacheTTL, cacheValue);
      this.logger.debug('Cache updated', { symbols });
    } catch (error: any) {
      this.logger.warn('Cache update failed', { error: error.message });
    }
  }

  /**
   * Build cache key from symbols
   */
  private buildCacheKey(symbols: string[]): string {
    return `market:data:${symbols.sort().join(',')}`;
  }

  /**
   * Check if cached data is stale
   */
  private isCacheStale(
    cached: MarketDataResult,
    maxAge?: number
  ): boolean {
    if (!maxAge) return false;

    const age = Date.now() - cached.timestamp.getTime();
    return age > maxAge * 1000;
  }

  /**
   * Select best available data source based on health scores
   */
  private async selectBestSource(symbols: string[]): Promise<DataSource> {
    const sources = await this.getHealthyDataSources();

    // DIAGNOSTIC: Log all available sources
    this.logger.info('[Source Selection] Available sources:', {
      count: sources.length,
      sources: sources.map(s => ({
        name: s.name,
        priority: s.priority,
        healthScore: Number(s.healthScore),
        enabled: s.enabled,
        errorRate: Number(s.errorRate)
      }))
    });

    if (sources.length === 0) {
      this.logger.error('[Source Selection] No healthy data sources available!');
      throw new Error('No healthy data sources available');
    }

    // Sort by priority and health score
    // Lower priority number = higher importance, so divide health by priority
    sources.sort((a, b) => {
      const scoreA = Number(a.healthScore) / a.priority;
      const scoreB = Number(b.healthScore) / b.priority;
      return scoreB - scoreA;
    });

    const selectedSource = {
      name: sources[0].name,
      endpoint: sources[0].endpoint,
      priority: sources[0].priority,
      healthScore: Number(sources[0].healthScore),
      circuitBreaker: this.getCircuitBreaker(sources[0].name),
    };

    // DIAGNOSTIC: Log selected source
    this.logger.info('[Source Selection] Selected data source:', {
      name: selectedSource.name,
      priority: selectedSource.priority,
      healthScore: selectedSource.healthScore,
      circuitBreakerState: selectedSource.circuitBreaker?.getState()
    });

    return selectedSource;
  }

  /**
   * Get healthy data sources from Railway PostgreSQL
   */
  private async getHealthyDataSources(): Promise<DataSourceHealth[]> {
    const sources = await this.prisma.dataSourceHealth.findMany({
      where: {
        enabled: true,
        healthScore: {
          gt: 0.5,
        },
      },
      orderBy: {
        priority: 'asc',
      },
    });

    // Convert Prisma Decimal to number for type compatibility
    return sources.map((s: any) => ({
      ...s,
      healthScore: Number(s.healthScore),
      errorRate: Number(s.errorRate),
    }));
  }

  /**
   * Fetch data from specific source
   */
  private async fetchFromSource(
    source: DataSource,
    symbols: string[],
    options: FetchOptions
  ): Promise<MarketData[]> {
    const breaker = this.getCircuitBreaker(source.name);

    return breaker.execute(async () => {
      this.logger.info(`[Data Fetch] Fetching from ${source.name}`, {
        symbols,
        options: {
          useCache: options.useCache,
          limit: options.limit,
          startDate: options.startDate?.toISOString(),
          endDate: options.endDate?.toISOString()
        }
      });

      let data: MarketData[];
      switch (source.name) {
        case 'YAHOO_FINANCE':
          data = await this.fetchFromYahoo(symbols, options);
          break;
        case 'TIINGO':
          data = await this.fetchFromTiingo(symbols, options);
          break;
        case 'ALPHA_VANTAGE':
          data = await this.fetchFromAlphaVantage(symbols, options);
          break;
        default:
          throw new Error(`Unknown data source: ${source.name}`);
      }

      // DIAGNOSTIC: Log fetch results
      const dataBySymbol = data.reduce((acc, item) => {
        acc[item.symbol] = (acc[item.symbol] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      this.logger.info(`[Data Fetch] ${source.name} returned data:`, {
        totalDataPoints: data.length,
        symbolCounts: dataBySymbol,
        requestedSymbols: symbols,
        missingSymbols: symbols.filter(s => !dataBySymbol[s]),
        dateRange: data.length > 0 ? {
          earliest: data[data.length - 1]?.date,
          latest: data[0]?.date
        } : 'no data'
      });

      return data;
    });
  }

  /**
   * Fetch data from Yahoo Finance using yahoo-finance2
   * DISABLED due to API compatibility issues
   */
  private async fetchFromYahoo(
    symbols: string[],
    options: FetchOptions
  ): Promise<MarketData[]> {
    // Yahoo Finance has API compatibility issues with TypeScript
    // Disabled for now - rely on Tiingo as primary source
    this.logger.warn('Yahoo Finance called but is disabled due to API issues');
    throw new Error('Yahoo Finance is temporarily disabled');
  }

  /**
   * Fetch data from Tiingo
   */
  private async fetchFromTiingo(
    symbols: string[],
    options: FetchOptions
  ): Promise<MarketData[]> {
    const apiKey = process.env.TIINGO_API_KEY;
    if (!apiKey) {
      this.logger.error('[Tiingo] API key not configured!');
      throw new Error('TIINGO_API_KEY not configured');
    }

    this.logger.info('[Tiingo] Starting fetch', {
      symbols,
      apiKeyConfigured: !!apiKey,
      apiKeyPrefix: apiKey.substring(0, 8) + '...'
    });

    const marketData: MarketData[] = [];

    for (const symbol of symbols) {
      try {
        // Build params with optional date range support
        const params: any = {
          resampleFreq: 'daily',
          columns: 'open,high,low,close,volume',
        };

        // Add date range if specified for historical data
        if (options.startDate) {
          params.startDate = options.startDate.toISOString().split('T')[0];
        }
        if (options.endDate) {
          params.endDate = options.endDate.toISOString().split('T')[0];
        }

        this.logger.info(`[Tiingo] Fetching ${symbol}`, { params });

        const response = await axios.get(
          `https://api.tiingo.com/tiingo/daily/${symbol}/prices`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Token ${apiKey}`,
            },
            params,
          }
        );

        const dataPoints = response.data;
        if (!dataPoints || dataPoints.length === 0) {
          this.logger.warn(`[Tiingo] No data returned for ${symbol}`);
          continue;
        }

        this.logger.info(`[Tiingo] ${symbol} success:`, {
          dataPoints: dataPoints.length,
          dateRange: {
            earliest: dataPoints[dataPoints.length - 1]?.date,
            latest: dataPoints[0]?.date
          }
        });

        // Determine which data points to process based on request type
        // Story 4.0j fix: Historical data should return full range, not just latest point
        let pointsToProcess: any[];

        if (options.startDate || options.endDate) {
          // Historical data request - return all points in date range
          pointsToProcess = dataPoints;
          this.logger.info(`[Tiingo] ${symbol} historical mode: processing all ${dataPoints.length} points`);
        } else if (options.limit) {
          // Limit specified without date range - return latest N points
          pointsToProcess = dataPoints.slice(0, options.limit);
          this.logger.info(`[Tiingo] ${symbol} limit mode: processing latest ${options.limit} points`);
        } else {
          // No date range, no limit - return only latest point (default behavior)
          pointsToProcess = [dataPoints[0]];
          this.logger.info(`[Tiingo] ${symbol} latest mode: processing 1 point`);
        }

        // Apply additional limit if specified AND in historical mode
        // This allows limiting very large historical ranges (e.g., "last 5 years but max 1000 points")
        let finalPoints = pointsToProcess;
        if (options.limit && (options.startDate || options.endDate) && pointsToProcess.length > options.limit) {
          finalPoints = pointsToProcess.slice(0, options.limit);
          this.logger.info(`[Tiingo] ${symbol} applying limit: ${finalPoints.length}/${pointsToProcess.length} points`);
        }

        this.logger.info(`[Tiingo] ${symbol} final count: ${finalPoints.length} points`);

        // Convert all data points to MarketData format
        for (const point of finalPoints) {
          marketData.push({
            symbol,
            date: new Date(point.date),
            close: point.close,
            open: point.open,
            high: point.high,
            low: point.low,
            volume: point.volume,
            source: 'TIINGO',
          });
        }
      } catch (error: any) {
        this.logger.error(`[Tiingo] Error for ${symbol}`, {
          error: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
        throw error;
      }
    }

    this.logger.info('[Tiingo] Fetch complete', {
      totalSymbolsRequested: symbols.length,
      totalDataPointsReturned: marketData.length,
      symbolsWithData: [...new Set(marketData.map(d => d.symbol))],
    });

    return marketData;
  }

  /**
   * Fetch data from Alpha Vantage (DEPRECATED - not reliable)
   * Keeping as empty fallback only
   */
  private async fetchFromAlphaVantage(
    symbols: string[],
    options: FetchOptions
  ): Promise<MarketData[]> {
    // Alpha Vantage is unreliable and rate limited
    // Return empty array to force fallback to other sources
    this.logger.warn('Alpha Vantage called but is deprecated, returning empty data');
    return [];
  }

  /**
   * Validate data quality
   */
  private async validateDataQuality(
    data: MarketData[]
  ): Promise<DataQuality> {
    // Basic validation - will be enhanced in Story 4.0c
    const score = data.length > 0 ? 0.9 : 0.0;

    return {
      score,
      status: score >= 0.8 ? 'VALID' : score >= 0.5 ? 'WARNING' : 'INVALID',
      confidence: score,
      issues: [],
    };
  }

  /**
   * Store data in Railway PostgreSQL with full provenance
   */
  private async storeWithProvenance(
    data: MarketData[],
    source: DataSource,
    fetchId: string,
    quality: DataQuality
  ): Promise<void> {
    if (data.length === 0) return;

    try {
      // Process in batches to avoid transaction timeout
      const BATCH_SIZE = 100;

      for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);

        await this.prisma.$transaction(async (tx: any) => {
          // Store market data batch
          for (const item of batch) {
            await tx.marketData.upsert({
            where: {
              unique_market_data: {
                symbol: item.symbol,
                dataType: 'price',
                timestamp: item.date,
              },
            },
            update: {
              open: item.open,
              high: item.high,
              low: item.low,
              close: item.close,
              volume: item.volume ? BigInt(item.volume) : null,
              date: item.date,
            },
            create: {
              symbol: item.symbol,
              dataType: 'price',
              timestamp: item.date,
              date: item.date,
              open: item.open,
              high: item.high,
              low: item.low,
              close: item.close,
              volume: item.volume ? BigInt(item.volume) : null,
            },
          });
        }

          // Store provenance for this batch (only on first batch)
          if (i === 0) {
            await tx.dataProvenance.create({
              data: {
                sourceSystem: source.name,
                sourceEndpoint: source.endpoint,
                requestTimestamp: new Date(),
                responseTimestamp: new Date(),
                responseStatus: 200,
                recordsReceived: data.length,
                recordsValid: data.length,
                recordsInvalid: 0,
                transformationApplied: 'raw',
                status: 'completed',
              },
            });
          }
        }, {
          maxWait: 10000, // Wait up to 10s for transaction slot
          timeout: 30000  // Transaction timeout 30s
        });
      }

      this.logger.info('Data stored with provenance', {
        fetchId,
        totalRecords: data.length,
        batches: Math.ceil(data.length / BATCH_SIZE)
      });
    } catch (error: any) {
      this.logger.error('Failed to store data', { error: error.message });
      throw error;
    }
  }

  /**
   * Create provenance record
   */
  private async createProvenanceRecord(
    fetchId: string,
    source: DataSource,
    symbols: string[],
    success: boolean,
    error?: string
  ): Promise<ProvenanceRecord> {
    return {
      fetchId,
      source: source.name,
      symbols,
      fetchedAt: new Date(),
      apiSuccess: success,
      errorMessage: error,
      confidence: success ? 0.95 : 0.0,
      requestMetadata: {
        endpoint: source.endpoint,
      },
      responseMetadata: {
        timestamp: new Date(),
      },
    };
  }

  /**
   * Attempt failover through secondary sources
   */
  private async attemptFailover(
    symbols: string[],
    options: FetchOptions,
    fetchId: string
  ): Promise<MarketDataResult> {
    const sources = await this.getHealthyDataSources();

    for (let i = 1; i < sources.length; i++) {
      const source: DataSource = {
        name: sources[i].name,
        endpoint: sources[i].endpoint,
        priority: sources[i].priority,
        healthScore: Number(sources[i].healthScore),
      };

      try {
        this.logger.info(`Attempting failover to ${source.name}`, { fetchId });

        const data = await this.fetchFromSource(source, symbols, options);
        const quality = await this.validateDataQuality(data);

        await this.storeWithProvenance(data, source, fetchId, quality);

        return {
          data,
          source: source.name,
          quality: { ...quality, isFailover: true },
          provenance: await this.createProvenanceRecord(
            fetchId,
            source,
            symbols,
            true
          ),
          cached: false,
          timestamp: new Date(),
        };
      } catch (error: any) {
        this.logger.warn(`Failover to ${source.name} failed`, {
          error: error.message,
          fetchId,
        });
        continue;
      }
    }

    throw new Error('All data sources failed');
  }

  /**
   * Get or create circuit breaker for source
   */
  private getCircuitBreaker(sourceName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(sourceName)) {
      this.circuitBreakers.set(
        sourceName,
        new CircuitBreaker({
          name: sourceName,
          threshold: 5,
          timeout: 60000, // 1 minute
          onOpen: () =>
            this.logger.warn(`Circuit breaker opened for ${sourceName}`),
          onHalfOpen: () =>
            this.logger.info(`Circuit breaker half-open for ${sourceName}`),
        })
      );
    }

    return this.circuitBreakers.get(sourceName)!;
  }

  /**
   * Record performance metrics
   */
  private async recordMetrics(fetchId: string, duration: number): Promise<void> {
    this.logger.info('Request metrics', { fetchId, duration });
    // TODO: Implement metrics collection (Story 4.0f)
  }

  /**
   * Cleanup resources
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
    await this.redis.quit();
    this.logger.info('UnifiedDataService disconnected');
  }
}
