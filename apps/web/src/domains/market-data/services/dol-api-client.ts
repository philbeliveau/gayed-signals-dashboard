/**
 * DOL (Department of Labor) API Client
 * 
 * Provides access to employment and labor market data from the U.S. Department of Labor
 * Handles jobless claims, employment statistics, and labor market indicators
 */

export interface DOLDataPoint {
  year: string;
  period: string;
  periodName: string;
  value: string;
  footnotes?: Array<{
    code: string;
    text: string;
  }>;
}

export interface DOLSeriesData {
  seriesID: string;
  data: DOLDataPoint[];
}

export interface DOLApiResponse {
  status: string;
  responseTime: number;
  message: string[];
  Results?: {
    series: DOLSeriesData[];
  };
}

export interface DOLClientConfig {
  apiKey?: string;
  baseUrl?: string;
  rateLimit?: number; // requests per day
  version?: string;
}

export interface DOLRateLimitInfo {
  remaining: number;
  resetTime: number;
  lastRequest: number;
}

export interface DOLCacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

/**
 * DOL Employment Series IDs
 */
export const DOL_SERIES = {
  // Unemployment Insurance Claims
  INITIAL_CLAIMS: 'UIICLAIMS', // Initial Claims for Unemployment Insurance
  CONTINUED_CLAIMS: 'UICCLAIMS', // Continued Claims for Unemployment Insurance
  
  // Employment and Unemployment
  UNEMPLOYMENT_RATE: 'LNS14000000', // Unemployment Rate
  EMPLOYMENT_LEVEL: 'LNS12000000', // Employment Level
  CIVILIAN_LABOR_FORCE: 'LNS11000000', // Civilian Labor Force
  
  // Industry Employment
  TOTAL_NONFARM: 'CES0000000001', // Total Nonfarm Payrolls
  PRIVATE_PAYROLLS: 'CES0500000001', // Total Private Payrolls
  GOVERNMENT_EMPLOYMENT: 'CES9000000001', // Government Employment
  
  // Weekly Claims (State Level)
  WEEKLY_CLAIMS_NATIONAL: 'UIWEEKLY', // Weekly Unemployment Insurance Claims
  
  // Mass Layoffs (when available)
  MASS_LAYOFFS: 'MLMS', // Mass Layoff Statistics
} as const;

/**
 * DOL API Client for Employment and Labor Data
 */
export class DOLAPIClient {
  private config: DOLClientConfig;
  private rateLimitInfo: DOLRateLimitInfo;
  private cache: Map<string, DOLCacheEntry>;
  private readonly DEFAULT_TTL = 3600000; // 1 hour default cache
  private readonly DAILY_TTL = 86400000; // 24 hours for daily data
  private readonly WEEKLY_TTL = 604800000; // 7 days for weekly data

  constructor(config: DOLClientConfig = {}) {
    this.config = {
      baseUrl: 'https://api.dol.gov/v1',
      rateLimit: 200, // DOL allows 200 requests per day for free tier
      version: 'v1',
      ...config
    };

    this.rateLimitInfo = {
      remaining: this.config.rateLimit!,
      resetTime: Date.now() + 86400000, // Reset every 24 hours
      lastRequest: 0
    };

    this.cache = new Map();
  }

  /**
   * Check and enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Reset rate limit counter if day has passed
    if (now >= this.rateLimitInfo.resetTime) {
      this.rateLimitInfo.remaining = this.config.rateLimit!;
      this.rateLimitInfo.resetTime = now + 86400000;
    }

    // Check if we have remaining requests
    if (this.rateLimitInfo.remaining <= 0) {
      const waitTime = this.rateLimitInfo.resetTime - now;
      console.warn(`DOL API rate limit exceeded. Waiting ${Math.ceil(waitTime / 60000)} minutes...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Reset after waiting
      this.rateLimitInfo.remaining = this.config.rateLimit!;
      this.rateLimitInfo.resetTime = now + 86400000;
    }

    // Enforce minimum delay between requests (2 seconds)
    const timeSinceLastRequest = now - this.rateLimitInfo.lastRequest;
    if (timeSinceLastRequest < 2000) {
      await new Promise(resolve => setTimeout(resolve, 2000 - timeSinceLastRequest));
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
   * Make a request to the DOL API
   */
  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    await this.enforceRateLimit();

    const url = new URL(`${this.config.baseUrl}/${endpoint}`);
    
    // Add API key if provided
    if (this.config.apiKey) {
      params.key = this.config.apiKey;
    }

    // Add format parameter
    params.format = 'json';

    // Add additional parameters
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value.toString());
      }
    }

    console.log(`🔄 DOL API Request: ${url.pathname}${url.search}`);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'Housing-Labor-Market-Analysis/1.0',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`DOL API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Check if API returned an error
      if (data.status === 'REQUEST_NOT_PROCESSED') {
        throw new Error(`DOL API request not processed: ${data.message.join(', ')}`);
      }

      console.log(`✅ DOL API Success: Retrieved data for ${endpoint}`);
      return data;

    } catch (error) {
      console.error('❌ DOL API Error:', error);
      throw new Error(`Failed to fetch from DOL API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get unemployment insurance claims data
   */
  async getUnemploymentClaims(options: {
    year?: number;
    startYear?: number;
    endYear?: number;
    stateCode?: string; // 2-letter state code
  } = {}): Promise<{
    initialClaims: DOLDataPoint[];
    continuedClaims: DOLDataPoint[];
  }> {
    const cacheKey = `unemployment_claims_${JSON.stringify(options)}`;
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      console.log('🚀 Returning cached DOL unemployment claims data');
      return cachedData;
    }

    try {
      // DOL Statistics API for unemployment insurance
      const endpoint = 'statistics/UI_CLAIMS';
      
      const params: Record<string, any> = {
        catalog: true,
        region: options.stateCode || 'US', // Default to national data
      };

      if (options.year) {
        params.year = options.year;
      } else {
        // Default to current year and previous year
        const currentYear = new Date().getFullYear();
        params.startyear = options.startYear || (currentYear - 1);
        params.endyear = options.endYear || currentYear;
      }

      const response = await this.makeRequest(endpoint, params);

      // Process the response - DOL API structure varies by endpoint
      const processedData = this.processUnemploymentClaimsResponse(response);

      // Cache for 1 hour (unemployment claims are weekly data)
      this.setCachedData(cacheKey, processedData, this.DEFAULT_TTL);

      return processedData;

    } catch (error) {
      console.error('❌ Error fetching DOL unemployment claims:', error);
      throw error;
    }
  }

  /**
   * Get employment statistics (BLS data via DOL)
   */
  async getEmploymentStatistics(options: {
    seriesId?: string;
    year?: number;
    startYear?: number;
    endYear?: number;
  } = {}): Promise<DOLDataPoint[]> {
    const cacheKey = `employment_stats_${JSON.stringify(options)}`;
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      console.log('🚀 Returning cached DOL employment statistics');
      return cachedData;
    }

    try {
      const endpoint = 'statistics/BLS_NUMBERS';
      
      const params: Record<string, any> = {
        catalog: true,
        series_id: options.seriesId || DOL_SERIES.TOTAL_NONFARM
      };

      if (options.year) {
        params.year = options.year;
      } else {
        const currentYear = new Date().getFullYear();
        params.startyear = options.startYear || (currentYear - 2);
        params.endyear = options.endYear || currentYear;
      }

      const response = await this.makeRequest(endpoint, params);
      
      const processedData = this.processEmploymentStatsResponse(response);

      // Cache for 24 hours (employment data is monthly)
      this.setCachedData(cacheKey, processedData, this.DAILY_TTL);

      return processedData;

    } catch (error) {
      console.error('❌ Error fetching DOL employment statistics:', error);
      throw error;
    }
  }

  /**
   * Get weekly jobless claims (most recent data)
   */
  async getWeeklyJoblessClaims(): Promise<{
    initialClaims: number;
    continuedClaims: number;
    claimsDate: string;
    fourWeekAverage: number;
  }> {
    const cacheKey = 'weekly_jobless_claims_latest';
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      console.log('🚀 Returning cached weekly jobless claims');
      return cachedData;
    }

    try {
      // Get recent unemployment claims data
      const currentYear = new Date().getFullYear();
      const claimsData = await this.getUnemploymentClaims({
        startYear: currentYear,
        endYear: currentYear
      });

      // Process the most recent data
      const latestInitial = this.getLatestValue(claimsData.initialClaims);
      const latestContinued = this.getLatestValue(claimsData.continuedClaims);

      // Calculate 4-week moving average for initial claims
      const fourWeekAverage = this.calculateFourWeekAverage(claimsData.initialClaims);

      const result = {
        initialClaims: latestInitial.value,
        continuedClaims: latestContinued.value,
        claimsDate: latestInitial.date,
        fourWeekAverage
      };

      // Cache for 1 hour (claims data updates weekly)
      this.setCachedData(cacheKey, result, this.DEFAULT_TTL);

      return result;

    } catch (error) {
      console.error('❌ Error fetching weekly jobless claims:', error);
      throw error;
    }
  }

  /**
   * Get state-level unemployment data
   */
  async getStateUnemploymentData(stateCode: string): Promise<{
    unemploymentRate: DOLDataPoint[];
    initialClaims: DOLDataPoint[];
  }> {
    const cacheKey = `state_unemployment_${stateCode}`;
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      console.log(`🚀 Returning cached unemployment data for ${stateCode}`);
      return cachedData;
    }

    try {
      // Get unemployment claims for specific state
      const claimsData = await this.getUnemploymentClaims({ stateCode });
      
      // Get employment statistics for state (if available)
      const employmentData = await this.getEmploymentStatistics({
        seriesId: `LAUST${this.getStateCode(stateCode)}0000000003` // State unemployment rate series
      });

      const result = {
        unemploymentRate: employmentData,
        initialClaims: claimsData.initialClaims
      };

      // Cache for 24 hours
      this.setCachedData(cacheKey, result, this.DAILY_TTL);

      return result;

    } catch (error) {
      console.error(`❌ Error fetching state unemployment data for ${stateCode}:`, error);
      throw error;
    }
  }

  /**
   * Process unemployment claims API response
   */
  private processUnemploymentClaimsResponse(response: any): {
    initialClaims: DOLDataPoint[];
    continuedClaims: DOLDataPoint[];
  } {
    const result = {
      initialClaims: [] as DOLDataPoint[],
      continuedClaims: [] as DOLDataPoint[]
    };

    try {
      // DOL API response structure varies - adapt as needed
      if (response.data && Array.isArray(response.data)) {
        for (const item of response.data) {
          if (item.series_title?.toLowerCase().includes('initial')) {
            result.initialClaims.push({
              year: item.year || '',
              period: item.period || '',
              periodName: item.period_name || '',
              value: item.value || '0'
            });
          } else if (item.series_title?.toLowerCase().includes('continued')) {
            result.continuedClaims.push({
              year: item.year || '',
              period: item.period || '',
              periodName: item.period_name || '',
              value: item.value || '0'
            });
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Error processing unemployment claims response:', error);
    }

    return result;
  }

  /**
   * Process employment statistics API response
   */
  private processEmploymentStatsResponse(response: any): DOLDataPoint[] {
    const result: DOLDataPoint[] = [];

    try {
      if (response.data && Array.isArray(response.data)) {
        for (const item of response.data) {
          result.push({
            year: item.year || '',
            period: item.period || '',
            periodName: item.period_name || '',
            value: item.value || '0',
            footnotes: item.footnotes || []
          });
        }
      }
    } catch (error) {
      console.warn('⚠️ Error processing employment statistics response:', error);
    }

    return result;
  }

  /**
   * Get the latest value from a data series
   */
  private getLatestValue(data: DOLDataPoint[]): { value: number; date: string } {
    if (!data || data.length === 0) {
      return { value: 0, date: '' };
    }

    // Sort by year and period to get most recent
    const sorted = data.sort((a, b) => {
      const yearDiff = parseInt(b.year) - parseInt(a.year);
      if (yearDiff !== 0) return yearDiff;
      return parseInt(b.period.replace('M', '')) - parseInt(a.period.replace('M', ''));
    });

    const latest = sorted[0];
    return {
      value: parseFloat(latest.value) || 0,
      date: `${latest.year}-${latest.period}`
    };
  }

  /**
   * Calculate 4-week moving average for initial claims
   */
  private calculateFourWeekAverage(data: DOLDataPoint[]): number {
    if (!data || data.length < 4) return 0;

    // Get the last 4 weeks of data
    const sorted = data
      .filter(d => !isNaN(parseFloat(d.value)))
      .sort((a, b) => {
        const yearDiff = parseInt(b.year) - parseInt(a.year);
        if (yearDiff !== 0) return yearDiff;
        return parseInt(b.period.replace('M', '')) - parseInt(a.period.replace('M', ''));
      })
      .slice(0, 4);

    const sum = sorted.reduce((acc, item) => acc + parseFloat(item.value), 0);
    return sum / sorted.length;
  }

  /**
   * Convert state abbreviation to BLS state code
   */
  private getStateCode(stateAbbr: string): string {
    const stateCodes: Record<string, string> = {
      'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06',
      'CO': '08', 'CT': '09', 'DE': '10', 'FL': '12', 'GA': '13',
      'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18', 'IA': '19',
      'KS': '20', 'KY': '21', 'LA': '22', 'ME': '23', 'MD': '24',
      'MA': '25', 'MI': '26', 'MN': '27', 'MS': '28', 'MO': '29',
      'MT': '30', 'NE': '31', 'NV': '32', 'NH': '33', 'NJ': '34',
      'NM': '35', 'NY': '36', 'NC': '37', 'ND': '38', 'OH': '39',
      'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45',
      'SD': '46', 'TN': '47', 'TX': '48', 'UT': '49', 'VT': '50',
      'VA': '51', 'WA': '53', 'WV': '54', 'WI': '55', 'WY': '56'
    };

    return stateCodes[stateAbbr.toUpperCase()] || '00';
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(): DOLRateLimitInfo {
    return { ...this.rateLimitInfo };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ DOL API cache cleared');
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
 * Default DOL API client instance
 */
export function createDOLClient(apiKey?: string): DOLAPIClient {
  return new DOLAPIClient({ apiKey });
}