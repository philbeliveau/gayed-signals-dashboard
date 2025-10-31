/**
 * Unified Data Service
 * Story: 4.0a - Unified Data Service
 *
 * Single entry point for ALL external data fetching operations.
 * Provides failover, caching, validation, and provenance tracking.
 */

import { PrismaClient } from '../generated/client';
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
        name: 'YAHOO_FINANCE',
        endpoint: 'https://query1.finance.yahoo.com/v8/finance/chart',
        priority: 1,
        healthScore: 1.0,
      },
      {
        name: 'TIINGO',
        endpoint: 'https://api.tiingo.com/tiingo/daily',
        priority: 2,
        healthScore: 0.9,
      },
      {
        name: 'ALPHA_VANTAGE',
        endpoint: 'https://www.alphavantage.co/query',
        priority: 3,
        healthScore: 0.8,
      },
    ];

    for (const source of sources) {
      await this.prisma.dataSourceHealth.upsert({
        where: { name: source.name },
        update: {},
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

    if (sources.length === 0) {
      throw new Error('No healthy data sources available');
    }

    // Sort by priority and health score
    sources.sort((a, b) => {
      const scoreA = a.priority * Number(a.healthScore);
      const scoreB = b.priority * Number(b.healthScore);
      return scoreB - scoreA;
    });

    return {
      name: sources[0].name,
      endpoint: sources[0].endpoint,
      priority: sources[0].priority,
      healthScore: Number(sources[0].healthScore),
      circuitBreaker: this.getCircuitBreaker(sources[0].name),
    };
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

    return sources;
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
      // This would integrate with actual API clients
      // For now, returning mock structure
      this.logger.info(`Fetching from ${source.name}`, { symbols });

      // TODO: Implement actual API calls based on source.name
      // - YAHOO_FINANCE: Use yahoo-finance2
      // - TIINGO: Use Tiingo API client
      // - ALPHA_VANTAGE: Use Alpha Vantage client

      throw new Error('API client integration not yet implemented');
    });
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
      await this.prisma.$transaction(async (tx) => {
        // Store market data
        for (const item of data) {
          await tx.marketData.upsert({
            where: {
              symbol_date_source: {
                symbol: item.symbol,
                date: item.date,
                source: source.name,
              },
            },
            update: {
              open: item.open,
              high: item.high,
              low: item.low,
              close: item.close,
              volume: item.volume ? BigInt(item.volume) : null,
              validationStatus: quality.status,
              qualityScore: quality.score,
            },
            create: {
              symbol: item.symbol,
              date: item.date,
              open: item.open,
              high: item.high,
              low: item.low,
              close: item.close,
              volume: item.volume ? BigInt(item.volume) : null,
              source: source.name,
              validationStatus: quality.status,
              qualityScore: quality.score,
            },
          });
        }

        // Store provenance
        const firstItem = await tx.marketData.findFirst({
          where: {
            symbol: data[0].symbol,
            date: data[0].date,
            source: source.name,
          },
        });

        if (firstItem) {
          await tx.dataProvenance.create({
            data: {
              fetchId,
              marketDataId: firstItem.id,
              source: source.name,
              symbols: data.map((d) => d.symbol),
              apiSuccess: true,
              confidence: quality.confidence,
              requestMetadata: {
                endpoint: source.endpoint,
              },
              responseMetadata: {
                recordCount: data.length,
                processingTime: Date.now(),
              },
            },
          });
        }
      });

      this.logger.info('Data stored with provenance', { fetchId });
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
