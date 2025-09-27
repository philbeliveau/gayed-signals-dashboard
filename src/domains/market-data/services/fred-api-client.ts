/**
 * FRED (Federal Reserve Economic Data) API Client
 * 
 * Provides access to economic data from the Federal Reserve Bank of St. Louis
 * Handles housing market data, employment data, and macroeconomic indicators
 */

export interface FREDDataPoint {
  date: string;
  value: string | number;
  realtime_start?: string;
  realtime_end?: string;
}

export interface FREDApiResponse {
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
  observations: FREDDataPoint[];
}

export interface FREDSeriesInfo {
  id: string;
  realtime_start: string;
  realtime_end: string;
  title: string;
  observation_start: string;
  observation_end: string;
  frequency: string;
  frequency_short: string;
  units: string;
  units_short: string;
  seasonal_adjustment: string;
  seasonal_adjustment_short: string;
  last_updated: string;
  popularity: number;
  notes: string;
}

export interface FREDClientConfig {
  apiKey: string;
  baseUrl?: string;
  rateLimit?: number; // requests per hour
}

export interface RateLimitInfo {
  remaining: number;
  resetTime: number;
  lastRequest: number;
}

export interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

/**
 * Housing Market Series IDs
 */
export const HOUSING_SERIES = {
  CASE_SHILLER: 'CSUSHPINSA', // Case-Shiller U.S. National Home Price Index
  HOUSING_STARTS: 'HOUST', // Housing Starts: Total: New Privately Owned Housing Units Started
  MONTHS_SUPPLY: 'MSACSR', // Monthly Supply of Houses in the United States
  NEW_HOME_SALES: 'HSN1F', // New One Family Houses Sold: United States
  EXISTING_HOME_SALES: 'EXHOSLUSM495S', // Existing Home Sales
  HOUSING_PERMITS: 'PERMIT', // New Private Housing Units Authorized by Building Permits
  MORTGAGE_RATES: 'MORTGAGE30US', // 30-Year Fixed Rate Mortgage Average in the United States
  HOUSE_PRICE_INDEX: 'USSTHPI' // All-Transactions House Price Index for the United States
} as const;

/**
 * Employment Series IDs
 */
export const EMPLOYMENT_SERIES = {
  UNEMPLOYMENT_RATE: 'UNRATE', // Unemployment Rate
  NONFARM_PAYROLLS: 'PAYEMS', // All Employees, Total Nonfarm
  INITIAL_CLAIMS: 'ICSA', // Initial Claims
  CONTINUED_CLAIMS: 'CCSA', // Continued Claims (Insured Unemployment)
  CLAIMS_4WK_AVG: 'IC4WSA', // 4-Week Moving Average of Initial Claims
  LABOR_PARTICIPATION: 'CIVPART', // Labor Force Participation Rate
  EMPLOYMENT_POPULATION: 'EMRATIO', // Employment-Population Ratio
  JOBLESS_RATE: 'UNEMPLOY', // Unemployed
  JOB_OPENINGS: 'JTSJOL', // Job Openings: Total Nonfarm
  QUITS_RATE: 'JTSQUR' // Quits: Total Nonfarm
} as const;

/**
 * FRED API Client for Economic Data
 */
export class FREDAPIClient {
  private config: FREDClientConfig;
  private rateLimitInfo: RateLimitInfo;
  private cache: Map<string, CacheEntry>;
  private readonly DEFAULT_TTL = 3600000; // 1 hour default cache
  private readonly DAILY_TTL = 86400000; // 24 hours for daily data
  private readonly MONTHLY_TTL = 2592000000; // 30 days for monthly data

  constructor(config: FREDClientConfig) {
    this.config = {
      baseUrl: 'https://api.stlouisfed.org/fred',
      rateLimit: 120, // FRED allows 120 requests per hour
      ...config
    };

    this.rateLimitInfo = {
      remaining: this.config.rateLimit!,
      resetTime: Date.now() + 3600000, // Reset every hour
      lastRequest: 0
    };

    this.cache = new Map();
  }

  /**
   * Check and enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Reset rate limit counter if hour has passed
    if (now >= this.rateLimitInfo.resetTime) {
      this.rateLimitInfo.remaining = this.config.rateLimit!;
      this.rateLimitInfo.resetTime = now + 3600000;
    }

    // Check if we have remaining requests
    if (this.rateLimitInfo.remaining <= 0) {
      const waitTime = this.rateLimitInfo.resetTime - now;
      console.warn(`FRED API rate limit exceeded. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Reset after waiting
      this.rateLimitInfo.remaining = this.config.rateLimit!;
      this.rateLimitInfo.resetTime = now + 3600000;
    }

    // Enforce minimum delay between requests (1 second)
    const timeSinceLastRequest = now - this.rateLimitInfo.lastRequest;
    if (timeSinceLastRequest < 1000) {
      await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastRequest));
    }

    this.rateLimitInfo.remaining--;
    this.rateLimitInfo.lastRequest = Date.now();
  }

  /**
   * Get cached data if available and not expired
   */
  private getCachedData(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Cache data with TTL
   */
  private setCachedData(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Make a request to the FRED API
   */
  private async makeRequest(endpoint: string, params: Record<string, string> = {}): Promise<any> {
    await this.enforceRateLimit();

    const url = new URL(`${this.config.baseUrl}/${endpoint}`);
    url.searchParams.set('api_key', this.config.apiKey);
    url.searchParams.set('file_type', 'json');

    // Add additional parameters
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    console.log(`🔄 FRED API Request: ${url.pathname}${url.search}`);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'Housing-Labor-Market-Analysis/1.0',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`FRED API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ FRED API Success: Retrieved data for ${endpoint}`);
      return data;

    } catch (error) {
      console.error('❌ FRED API Error:', error);
      throw new Error(`Failed to fetch from FRED API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get series observations (time series data)
   */
  async getSeriesObservations(
    seriesId: string, 
    options: {
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
      sortOrder?: 'asc' | 'desc';
      transform?: 'lin' | 'chg' | 'ch1' | 'pch' | 'pc1' | 'pca' | 'cch' | 'cca' | 'log';
    } = {}
  ): Promise<FREDDataPoint[]> {
    // Check cache first
    const cacheKey = `series_${seriesId}_${JSON.stringify(options)}`;
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      console.log(`🚀 Returning cached FRED data for series: ${seriesId}`);
      return cachedData;
    }

    const params: Record<string, string> = {
      series_id: seriesId
    };

    if (options.startDate) params.observation_start = options.startDate;
    if (options.endDate) params.observation_end = options.endDate;
    if (options.limit) params.limit = options.limit.toString();
    if (options.offset) params.offset = options.offset.toString();
    if (options.sortOrder) params.sort_order = options.sortOrder;
    if (options.transform) params.units = options.transform;

    try {
      const response: FREDApiResponse = await this.makeRequest('series/observations', params);
      
      if (!response.observations || response.observations.length === 0) {
        console.warn(`⚠️ No data returned for FRED series: ${seriesId}`);
        return [];
      }

      // Filter out invalid data points
      const validObservations = response.observations
        .filter(obs => obs.value !== '.' && obs.value !== null && obs.value !== undefined)
        .map(obs => ({
          ...obs,
          value: typeof obs.value === 'string' ? parseFloat(obs.value) : obs.value
        }));

      // Cache with appropriate TTL based on series frequency
      const ttl = this.determineCacheTTL(seriesId);
      this.setCachedData(cacheKey, validObservations, ttl);

      return validObservations;

    } catch (error) {
      console.error(`❌ Error fetching FRED series ${seriesId}:`, error);
      throw error;
    }
  }

  /**
   * Get series information/metadata
   */
  async getSeriesInfo(seriesId: string): Promise<FREDSeriesInfo> {
    const cacheKey = `info_${seriesId}`;
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await this.makeRequest('series', { series_id: seriesId });
      
      if (!response.seriess || response.seriess.length === 0) {
        throw new Error(`No series information found for: ${seriesId}`);
      }

      const seriesInfo = response.seriess[0];
      
      // Cache series info for longer period (24 hours)
      this.setCachedData(cacheKey, seriesInfo, this.DAILY_TTL);
      
      return seriesInfo;

    } catch (error) {
      console.error(`❌ Error fetching FRED series info for ${seriesId}:`, error);
      throw error;
    }
  }

  /**
   * Get multiple series data in batch
   */
  async getBatchSeriesData(
    seriesIds: string[],
    options: {
      startDate?: string;
      endDate?: string;
      limit?: number;
    } = {}
  ): Promise<Record<string, FREDDataPoint[]>> {
    console.log(`📊 Fetching batch FRED data for ${seriesIds.length} series`);
    
    const results: Record<string, FREDDataPoint[]> = {};
    
    // Process in batches to respect rate limits
    const batchSize = 5;
    for (let i = 0; i < seriesIds.length; i += batchSize) {
      const batch = seriesIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (seriesId) => {
        try {
          const data = await this.getSeriesObservations(seriesId, options);
          return { seriesId, data };
        } catch (error) {
          console.error(`❌ Error fetching series ${seriesId}:`, error);
          return { seriesId, data: [] };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      for (const { seriesId, data } of batchResults) {
        results[seriesId] = data;
      }

      // Small delay between batches
      if (i + batchSize < seriesIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Get all housing market data
   */
  async getHousingMarketData(options: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}): Promise<Record<string, FREDDataPoint[]>> {
    console.log('🏠 Fetching comprehensive housing market data from FRED...');
    
    const housingSeries = Object.values(HOUSING_SERIES);
    return await this.getBatchSeriesData(housingSeries, options);
  }

  /**
   * Get all employment market data
   */
  async getEmploymentMarketData(options: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}): Promise<Record<string, FREDDataPoint[]>> {
    console.log('💼 Fetching comprehensive employment market data from FRED...');
    
    const employmentSeries = Object.values(EMPLOYMENT_SERIES);
    return await this.getBatchSeriesData(employmentSeries, options);
  }

  /**
   * Get latest values for key indicators
   */
  async getLatestIndicators(): Promise<{
    housing: Record<string, { value: number; date: string }>;
    employment: Record<string, { value: number; date: string }>;
  }> {
    console.log('📈 Fetching latest economic indicators...');

    const [housingData, employmentData] = await Promise.all([
      this.getHousingMarketData({ limit: 1 }),
      this.getEmploymentMarketData({ limit: 1 })
    ]);

    const extractLatest = (data: Record<string, FREDDataPoint[]>) => {
      const latest: Record<string, { value: number; date: string }> = {};
      
      for (const [series, points] of Object.entries(data)) {
        if (points.length > 0) {
          const latestPoint = points[points.length - 1];
          latest[series] = {
            value: typeof latestPoint.value === 'number' ? latestPoint.value : parseFloat(latestPoint.value as string),
            date: latestPoint.date
          };
        }
      }
      
      return latest;
    };

    return {
      housing: extractLatest(housingData),
      employment: extractLatest(employmentData)
    };
  }

  /**
   * Determine appropriate cache TTL based on series characteristics
   */
  private determineCacheTTL(seriesId: string): number {
    // Monthly data series - cache for longer
    const monthlySeries = [
      'CSUSHPINSA', 'HOUST', 'MSACSR', 'HSN1F', 'UNRATE', 'PAYEMS', 'CIVPART'
    ];
    
    // Weekly data series - shorter cache
    const weeklySeries = [
      'ICSA', 'CCSA', 'IC4WSA'
    ];

    if (monthlySeries.includes(seriesId)) {
      return this.MONTHLY_TTL;
    } else if (weeklySeries.includes(seriesId)) {
      return this.DEFAULT_TTL; // 1 hour for weekly data
    } else {
      return this.DAILY_TTL; // Default to daily TTL
    }
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(): RateLimitInfo {
    return { ...this.rateLimitInfo };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ FRED API cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    this.cleanupCache();
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

/**
 * Default FRED API client instance
 */
export function createFREDClient(apiKey?: string): FREDAPIClient {
  const key = apiKey || process.env.FRED_API_KEY;
  
  if (!key) {
    throw new Error('FRED API key is required. Set FRED_API_KEY environment variable or pass as parameter.');
  }

  return new FREDAPIClient({ apiKey: key });
}