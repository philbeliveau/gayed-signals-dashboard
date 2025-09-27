/**
 * Economic Data Pipeline
 * 
 * Real-time data ingestion and validation pipeline for economic indicators
 * Supports FRED, DOL, BLS, and other economic data sources
 */

import axios, { AxiosResponse } from 'axios';
import { EconomicIndicator } from './housing-labor-processor';
import { logger } from './production-logger';
import { validateChartData, ValidationResult } from '../../src/utils/dataValidation';

// Data source configuration
export interface DataSourceConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  rateLimitMs: number;
  maxRetries: number;
  timeout: number;
  headers?: Record<string, string>;
}

// Data fetch request
export interface DataFetchRequest {
  symbol: string;
  source: DataSource;
  startDate?: string;
  endDate?: string;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  seasonallyAdjusted?: boolean;
}

// Data source types
export type DataSource = 'FRED' | 'DOL' | 'BLS' | 'CENSUS' | 'REDFIN' | 'CACHE';

// Pipeline statistics
export interface PipelineStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cacheHits: number;
  cacheMisses: number;
  averageResponseTime: number;
  dataPointsFetched: number;
  lastUpdateTime: string;
  sourceStats: Record<DataSource, {
    requests: number;
    successes: number;
    failures: number;
    avgResponseTime: number;
    rateLimitHits: number;
  }>;
}

// Data quality metrics
export interface DataQualityMetrics {
  completeness: number; // 0-1
  freshness: number; // Days since last update
  accuracy: number; // 0-1 based on validation
  consistency: number; // 0-1 based on expected patterns
  outliers: number; // Count of outliers detected
  validationErrors: string[];
  qualityScore: number; // Overall 0-100 score
}

// Cache entry
interface CacheEntry {
  data: EconomicIndicator[];
  timestamp: number;
  source: DataSource;
  ttl: number; // Time to live in milliseconds
  quality: DataQualityMetrics;
}

// API response interfaces
interface FREDResponse {
  realtime_start: string;
  realtime_end: string;
  observation_start: string;
  observation_end: string;
  units: string;
  output_type: number;
  file_type: string;
  order_by: string;
  sort_order: string;
  count: number;
  offset: number;
  limit: number;
  observations: Array<{
    realtime_start: string;
    realtime_end: string;
    date: string;
    value: string;
  }>;
}

interface DOLResponse {
  status: string;
  responseTime: number;
  message: string[];
  Results: {
    series: Array<{
      seriesID: string;
      data: Array<{
        year: string;
        period: string;
        periodName: string;
        value: string;
        footnotes: Array<{ code: string; text: string }>;
      }>;
    }>;
  };
}

interface BLSResponse {
  status: string;
  responseTime: number;
  message: string[];
  Results: {
    series: Array<{
      seriesID: string;
      data: Array<{
        year: string;
        period: string;
        periodName: string;
        value: string;
        footnotes: Array<{ code: string; text: string }>;
      }>;
    }>;
  };
}

/**
 * Economic Data Pipeline
 */
export class EconomicDataPipeline {
  private dataSourceConfigs: Map<DataSource, DataSourceConfig> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private stats!: PipelineStats; // Initialized in constructor
  private lastRequestTimes: Map<DataSource, number> = new Map();

  // Economic indicator metadata
  private indicatorMetadata = {
    // Housing indicators
    'CSUSHPINSA': { name: 'Case-Shiller Home Price Index', frequency: 'monthly', lag: 2 },
    'HOUST': { name: 'Housing Starts', frequency: 'monthly', lag: 1 },
    'MSACSR': { name: 'Months Supply of Houses', frequency: 'monthly', lag: 1 },
    'HSN1F': { name: 'New Home Sales', frequency: 'monthly', lag: 1 },
    'EXHOSLUSM156S': { name: 'Existing Home Sales', frequency: 'monthly', lag: 1 },
    'PERMIT': { name: 'Building Permits', frequency: 'monthly', lag: 1 },
    'USSTHPI': { name: 'US House Price Index', frequency: 'quarterly', lag: 1 },
    
    // Labor indicators
    'ICSA': { name: 'Initial Claims', frequency: 'weekly', lag: 0 },
    'CCSA': { name: 'Continued Claims', frequency: 'weekly', lag: 1 },
    'IC4WSA': { name: '4-week Average Claims', frequency: 'weekly', lag: 0 },
    'UNRATE': { name: 'Unemployment Rate', frequency: 'monthly', lag: 1 },
    'PAYEMS': { name: 'Nonfarm Payrolls', frequency: 'monthly', lag: 1 },
    'CIVPART': { name: 'Labor Force Participation', frequency: 'monthly', lag: 1 },
    'JTSJOL': { name: 'Job Openings', frequency: 'monthly', lag: 2 },
    'JTSQUL': { name: 'Quits Level', frequency: 'monthly', lag: 2 }
  };

  constructor() {
    this.initializeDataSources();
    this.initializeStats();
    this.startCacheCleanup();
  }

  /**
   * Initialize data source configurations
   */
  private initializeDataSources(): void {
    this.dataSourceConfigs.set('FRED', {
      name: 'Federal Reserve Economic Data',
      baseUrl: 'https://api.stlouisfed.org/fred',
      apiKey: process.env.FRED_API_KEY,
      rateLimitMs: 1000, // 1 second between requests
      maxRetries: 3,
      timeout: 30000,
      headers: {
        'User-Agent': 'Economic-Data-Pipeline/1.0'
      }
    });

    this.dataSourceConfigs.set('DOL', {
      name: 'Department of Labor API',
      baseUrl: 'https://api.dol.gov/v1',
      apiKey: process.env.DOL_API_KEY,
      rateLimitMs: 2000, // 2 seconds between requests
      maxRetries: 3,
      timeout: 30000
    });

    this.dataSourceConfigs.set('BLS', {
      name: 'Bureau of Labor Statistics',
      baseUrl: 'https://api.bls.gov/publicAPI/v2',
      apiKey: process.env.BLS_API_KEY,
      rateLimitMs: 500, // 0.5 seconds between requests
      maxRetries: 3,
      timeout: 30000
    });

    this.dataSourceConfigs.set('CENSUS', {
      name: 'US Census Bureau',
      baseUrl: 'https://api.census.gov/data',
      apiKey: process.env.CENSUS_API_KEY,
      rateLimitMs: 1000,
      maxRetries: 3,
      timeout: 30000
    });
  }

  /**
   * Initialize statistics tracking
   */
  private initializeStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      dataPointsFetched: 0,
      lastUpdateTime: new Date().toISOString(),
      sourceStats: {
        FRED: { requests: 0, successes: 0, failures: 0, avgResponseTime: 0, rateLimitHits: 0 },
        DOL: { requests: 0, successes: 0, failures: 0, avgResponseTime: 0, rateLimitHits: 0 },
        BLS: { requests: 0, successes: 0, failures: 0, avgResponseTime: 0, rateLimitHits: 0 },
        CENSUS: { requests: 0, successes: 0, failures: 0, avgResponseTime: 0, rateLimitHits: 0 },
        REDFIN: { requests: 0, successes: 0, failures: 0, avgResponseTime: 0, rateLimitHits: 0 },
        CACHE: { requests: 0, successes: 0, failures: 0, avgResponseTime: 0, rateLimitHits: 0 }
      }
    };
  }

  /**
   * Fetch economic data for multiple indicators
   */
  public async fetchEconomicData(requests: DataFetchRequest[]): Promise<Record<string, EconomicIndicator[]>> {
    const results: Record<string, EconomicIndicator[]> = {};

    logger.info('Starting economic data fetch', { 
      requestCount: requests.length,
      symbols: requests.map(r => r.symbol)
    });

    // Process requests in parallel with rate limiting
    const promises = requests.map(async (request) => {
      try {
        const data = await this.fetchSingleIndicator(request);
        return { symbol: request.symbol, data };
      } catch (error) {
        logger.error(`Failed to fetch data for ${request.symbol}`, { error });
        return { symbol: request.symbol, data: [] };
      }
    });

    const resolvedData = await Promise.all(promises);

    for (const { symbol, data } of resolvedData) {
      results[symbol] = data;
    }

    logger.info('Economic data fetch completed', {
      successfulSymbols: Object.keys(results).filter(s => results[s].length > 0).length,
      totalSymbols: requests.length
    });

    return results;
  }

  /**
   * Fetch data for single economic indicator
   */
  private async fetchSingleIndicator(request: DataFetchRequest): Promise<EconomicIndicator[]> {
    const cacheKey = this.generateCacheKey(request);
    
    // Check cache first
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      this.updateStats('CACHE', true, 0);
      return cachedData;
    }

    // Ensure rate limiting
    await this.enforceRateLimit(request.source);

    const startTime = Date.now();
    
    try {
      let data: EconomicIndicator[];
      
      switch (request.source) {
        case 'FRED':
          data = await this.fetchFromFRED(request);
          break;
        case 'DOL':
          data = await this.fetchFromDOL(request);
          break;
        case 'BLS':
          data = await this.fetchFromBLS(request);
          break;
        case 'CENSUS':
          data = await this.fetchFromCensus(request);
          break;
        default:
          throw new Error(`Unsupported data source: ${request.source}`);
      }

      // Validate data quality
      const qualityMetrics = this.assessDataQuality(data, request);
      
      // Cache the data
      this.setCachedData(cacheKey, data, request.source, qualityMetrics);
      
      const responseTime = Date.now() - startTime;
      this.updateStats(request.source, true, responseTime);
      
      return data;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateStats(request.source, false, responseTime);
      throw error;
    }
  }

  /**
   * Fetch data from FRED API
   */
  private async fetchFromFRED(request: DataFetchRequest): Promise<EconomicIndicator[]> {
    const config = this.dataSourceConfigs.get('FRED')!;
    
    if (!config.apiKey) {
      throw new Error('FRED API key not configured');
    }

    const url = `${config.baseUrl}/series/observations`;
    const params = {
      series_id: request.symbol,
      api_key: config.apiKey,
      file_type: 'json',
      start_date: request.startDate || '2020-01-01',
      end_date: request.endDate || new Date().toISOString().split('T')[0]
    };

    const response: AxiosResponse<FREDResponse> = await axios.get(url, {
      params,
      timeout: config.timeout,
      headers: config.headers
    });

    if (!response.data.observations) {
      throw new Error('Invalid FRED API response format');
    }

    return response.data.observations
      .filter(obs => obs.value && obs.value !== '.' && !isNaN(parseFloat(obs.value)))
      .map(obs => ({
        date: obs.date,
        value: parseFloat(obs.value),
        symbol: request.symbol,
        source: 'FRED' as const,
        metadata: {
          period: obs.date,
          frequency: request.frequency || 'monthly',
          seasonallyAdjusted: request.seasonallyAdjusted || false
        }
      }));
  }

  /**
   * Fetch data from DOL API
   */
  private async fetchFromDOL(request: DataFetchRequest): Promise<EconomicIndicator[]> {
    const config = this.dataSourceConfigs.get('DOL')!;
    
    if (!config.apiKey) {
      throw new Error('DOL API key not configured');
    }

    const url = `${config.baseUrl}/statistics/BLS_Numbers`;
    const params = {
      KEY: config.apiKey,
      series_id: request.symbol,
      start_year: request.startDate ? new Date(request.startDate).getFullYear() : 2020,
      end_year: request.endDate ? new Date(request.endDate).getFullYear() : new Date().getFullYear()
    };

    const response: AxiosResponse<DOLResponse> = await axios.get(url, {
      params,
      timeout: config.timeout
    });

    if (response.data.status !== 'REQUEST_SUCCEEDED') {
      throw new Error(`DOL API error: ${response.data.message?.join(', ')}`);
    }

    const results: EconomicIndicator[] = [];
    
    for (const series of response.data.Results.series) {
      for (const dataPoint of series.data) {
        if (dataPoint.value && dataPoint.value !== '.' && !isNaN(parseFloat(dataPoint.value))) {
          // Convert BLS period format to date
          const date = this.convertBLSPeriodToDate(dataPoint.year, dataPoint.period);
          
          results.push({
            date,
            value: parseFloat(dataPoint.value),
            symbol: request.symbol,
            source: 'DOL' as const,
            metadata: {
              period: `${dataPoint.year}-${dataPoint.period}`,
              frequency: request.frequency || 'monthly',
              seasonallyAdjusted: request.seasonallyAdjusted || false
            }
          });
        }
      }
    }

    return results.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Fetch data from BLS API
   */
  private async fetchFromBLS(request: DataFetchRequest): Promise<EconomicIndicator[]> {
    const config = this.dataSourceConfigs.get('BLS')!;
    
    const url = `${config.baseUrl}/timeseries/data/`;
    const payload = {
      seriesid: [request.symbol],
      startyear: request.startDate ? new Date(request.startDate).getFullYear().toString() : '2020',
      endyear: request.endDate ? new Date(request.endDate).getFullYear().toString() : new Date().getFullYear().toString(),
      registrationkey: config.apiKey
    };

    const response: AxiosResponse<BLSResponse> = await axios.post(url, payload, {
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.status !== 'REQUEST_SUCCEEDED') {
      throw new Error(`BLS API error: ${response.data.message?.join(', ')}`);
    }

    const results: EconomicIndicator[] = [];
    
    for (const series of response.data.Results.series) {
      for (const dataPoint of series.data) {
        if (dataPoint.value && dataPoint.value !== '.' && !isNaN(parseFloat(dataPoint.value))) {
          const date = this.convertBLSPeriodToDate(dataPoint.year, dataPoint.period);
          
          results.push({
            date,
            value: parseFloat(dataPoint.value),
            symbol: request.symbol,
            source: 'BLS' as const,
            metadata: {
              period: `${dataPoint.year}-${dataPoint.period}`,
              frequency: request.frequency || 'monthly',
              seasonallyAdjusted: request.seasonallyAdjusted || false
            }
          });
        }
      }
    }

    return results.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Fetch data from Census API
   */
  private async fetchFromCensus(request: DataFetchRequest): Promise<EconomicIndicator[]> {
    // Census API implementation would go here
    // For now, return empty array
    logger.warn('Census API not yet implemented', { symbol: request.symbol });
    return [];
  }

  /**
   * Convert BLS period format to ISO date
   */
  private convertBLSPeriodToDate(year: string, period: string): string {
    const yearNum = parseInt(year);
    
    // Handle different period formats
    if (period.startsWith('M')) {
      // Monthly data (M01, M02, etc.)
      const month = parseInt(period.substring(1));
      return new Date(yearNum, month - 1, 1).toISOString().split('T')[0];
    } else if (period.startsWith('Q')) {
      // Quarterly data (Q01, Q02, etc.)
      const quarter = parseInt(period.substring(1));
      const month = (quarter - 1) * 3 + 1;
      return new Date(yearNum, month - 1, 1).toISOString().split('T')[0];
    } else {
      // Annual data
      return new Date(yearNum, 0, 1).toISOString().split('T')[0];
    }
  }

  /**
   * Assess data quality
   */
  private assessDataQuality(data: EconomicIndicator[], request: DataFetchRequest): DataQualityMetrics {
    if (data.length === 0) {
      return {
        completeness: 0,
        freshness: 999,
        accuracy: 0,
        consistency: 0,
        outliers: 0,
        validationErrors: ['No data available'],
        qualityScore: 0
      };
    }

    const validationResult = validateChartData(data, ['date', 'value'], {
      sortByDate: true,
      removeDuplicates: true
    });

    // Calculate freshness (days since last update)
    const latestDate = new Date(data[data.length - 1].date);
    const now = new Date();
    const freshness = Math.floor((now.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate completeness (percentage of expected data points)
    const expectedFrequency = this.indicatorMetadata[request.symbol as keyof typeof this.indicatorMetadata]?.frequency || 'monthly';
    const expectedPoints = this.calculateExpectedDataPoints(request.startDate, request.endDate, expectedFrequency);
    const completeness = Math.min(data.length / expectedPoints, 1);

    // Detect outliers using z-score method
    const values = data.map(d => d.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
    const outliers = values.filter(val => Math.abs(val - mean) > 3 * std).length;

    // Calculate overall quality score
    const completenessScore = completeness * 30;
    const freshnessScore = Math.max(0, 30 - freshness) * 30 / 30;
    const accuracyScore = validationResult.valid ? 25 : 0;
    const consistencyScore = Math.max(0, 15 - outliers);
    const qualityScore = completenessScore + freshnessScore + accuracyScore + consistencyScore;

    return {
      completeness,
      freshness,
      accuracy: validationResult.valid ? 1 : 0,
      consistency: 1 - (outliers / data.length),
      outliers,
      validationErrors: validationResult.errors.concat(validationResult.warnings),
      qualityScore: Math.round(qualityScore)
    };
  }

  /**
   * Calculate expected data points based on frequency
   */
  private calculateExpectedDataPoints(startDate?: string, endDate?: string, frequency: string = 'monthly'): number {
    const start = startDate ? new Date(startDate) : new Date('2020-01-01');
    const end = endDate ? new Date(endDate) : new Date();
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    switch (frequency) {
      case 'daily':
        return Math.floor(diffDays * 0.71); // Account for weekends
      case 'weekly':
        return Math.floor(diffDays / 7);
      case 'monthly':
        return Math.floor(diffDays / 30.44);
      case 'quarterly':
        return Math.floor(diffDays / 91.31);
      case 'annual':
        return Math.floor(diffDays / 365.25);
      default:
        return Math.floor(diffDays / 30.44);
    }
  }

  /**
   * Cache management
   */
  private generateCacheKey(request: DataFetchRequest): string {
    return `${request.source}_${request.symbol}_${request.startDate}_${request.endDate}_${request.frequency}`;
  }

  private getCachedData(cacheKey: string): EconomicIndicator[] | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) {
      this.stats.cacheMisses++;
      return null;
    }

    // Check if cache is still valid
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(cacheKey);
      this.stats.cacheMisses++;
      return null;
    }

    this.stats.cacheHits++;
    return cached.data;
  }

  private setCachedData(
    cacheKey: string, 
    data: EconomicIndicator[], 
    source: DataSource, 
    quality: DataQualityMetrics
  ): void {
    // Determine TTL based on data frequency and quality
    let ttl = 15 * 60 * 1000; // Default 15 minutes
    
    if (quality.freshness > 7) {
      ttl = 60 * 60 * 1000; // 1 hour for stale data
    } else if (quality.qualityScore > 80) {
      ttl = 5 * 60 * 1000; // 5 minutes for high quality data
    }

    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      source,
      ttl,
      quality
    });
  }

  /**
   * Rate limiting
   */
  private async enforceRateLimit(source: DataSource): Promise<void> {
    const config = this.dataSourceConfigs.get(source);
    if (!config) return;

    const lastRequest = this.lastRequestTimes.get(source) || 0;
    const timeSinceLastRequest = Date.now() - lastRequest;

    if (timeSinceLastRequest < config.rateLimitMs) {
      const waitTime = config.rateLimitMs - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTimes.set(source, Date.now());
  }

  /**
   * Update statistics
   */
  private updateStats(source: DataSource, success: boolean, responseTime: number): void {
    this.stats.totalRequests++;
    this.stats.lastUpdateTime = new Date().toISOString();

    const sourceStats = this.stats.sourceStats[source];
    sourceStats.requests++;

    if (success) {
      this.stats.successfulRequests++;
      sourceStats.successes++;
    } else {
      this.stats.failedRequests++;
      sourceStats.failures++;
    }

    // Update average response time
    const totalResponseTime = sourceStats.avgResponseTime * (sourceStats.requests - 1) + responseTime;
    sourceStats.avgResponseTime = totalResponseTime / sourceStats.requests;

    // Update overall average
    const overallTotal = this.stats.averageResponseTime * (this.stats.totalRequests - 1) + responseTime;
    this.stats.averageResponseTime = overallTotal / this.stats.totalRequests;
  }

  /**
   * Start cache cleanup background process
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        logger.info(`Cache cleanup: removed ${cleaned} expired entries`);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Get pipeline statistics
   */
  public getStats(): PipelineStats {
    return { ...this.stats };
  }

  /**
   * Get data quality metrics for cached data
   */
  public getDataQualityMetrics(): Record<string, DataQualityMetrics> {
    const metrics: Record<string, DataQualityMetrics> = {};
    
    for (const [key, entry] of this.cache.entries()) {
      metrics[key] = entry.quality;
    }
    
    return metrics;
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
    logger.info('Pipeline cache cleared');
  }

  /**
   * Get supported indicators
   */
  public getSupportedIndicators(): Record<string, any> {
    return this.indicatorMetadata;
  }
}

/**
 * Create default economic data pipeline
 */
export function createEconomicDataPipeline(): EconomicDataPipeline {
  return new EconomicDataPipeline();
}