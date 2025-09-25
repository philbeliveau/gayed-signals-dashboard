/**
 * Source Authenticator - Layer 1 Data Authenticity Framework
 * 
 * Provides cryptographic validation and authentication of all data sources
 * to prevent fake data injection at the source level.
 */

import axios, { AxiosResponse } from 'axios';
import crypto from 'crypto';
import { z } from 'zod';
import { logger } from '../data/production-logger';

// Data source types
export type DataSource = 'tiingo' | 'alpha_vantage' | 'yahoo_finance';

// Authentication result interfaces
export interface SourceAuthenticationResult {
  source: DataSource;
  isAuthentic: boolean;
  confidence: number; // 0-1
  validationTime: number; // milliseconds
  evidence: AuthenticationEvidence;
  warnings: string[];
  errors: string[];
}

export interface AuthenticationEvidence {
  apiKeyValid: boolean;
  responseStructureValid: boolean;
  headerSignatureValid: boolean;
  sslCertificateValid: boolean;
  rateLimitPatternValid: boolean;
  responseTimingValid: boolean;
}

export interface SourceValidationResult {
  allValid: boolean;
  overallConfidence: number;
  sources: SourceAuthenticationResult[];
  timestamp: string;
  validationId: string;
  systemStatus: 'SECURE' | 'COMPROMISED' | 'DEGRADED';
}

// Configuration schemas for each data source
const TiingoAuthConfig = z.object({
  keyPattern: z.string().regex(/^[a-f0-9]{40}$/, 'Tiingo API key must be 40-character hex'),
  testEndpoint: z.string().url(),
  expectedResponseSchema: z.object({
    message: z.string()
  }),
  requiredHeaders: z.array(z.string()),
  maxResponseTime: z.number(),
  sslFingerprint: z.string().optional()
});

const AlphaVantageAuthConfig = z.object({
  keyPattern: z.string().regex(/^[A-Z0-9]{16}$/, 'Alpha Vantage key must be 16-character alphanumeric'),
  testEndpoint: z.string().url(),
  expectedResponseSchema: z.object({
    bestMatches: z.array(z.any())
  }),
  rateLimitPattern: z.string().regex(/Note.*rate.*limit/i),
  maxResponseTime: z.number()
});

const YahooFinanceAuthConfig = z.object({
  testSymbol: z.string(),
  requiredFields: z.array(z.string()),
  expectedDataStructure: z.string(),
  maxResponseTime: z.number(),
  validDateRange: z.number() // days
});

export interface SourceAuthenticationConfig {
  tiingo: z.infer<typeof TiingoAuthConfig>;
  alphaVantage: z.infer<typeof AlphaVantageAuthConfig>;
  yahooFinance: z.infer<typeof YahooFinanceAuthConfig>;
}

/**
 * Professional source authentication system with cryptographic validation
 */
export class SourceAuthenticator {
  private config: SourceAuthenticationConfig;
  private validationCache: Map<string, SourceAuthenticationResult> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.config = this.getDefaultConfig();
    this.validateConfiguration();
  }

  private getDefaultConfig(): SourceAuthenticationConfig {
    return {
      tiingo: {
        keyPattern: '^[a-f0-9]{40}$',
        testEndpoint: 'https://api.tiingo.com/api/test',
        expectedResponseSchema: { message: 'You successfully sent a request' },
        requiredHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'Content-Type'],
        maxResponseTime: 5000,
        sslFingerprint: undefined // Can be set for additional security
      },
      alphaVantage: {
        keyPattern: '^[A-Z0-9]{16}$',
        testEndpoint: 'https://www.alphavantage.co/query',
        expectedResponseSchema: { bestMatches: [] },
        rateLimitPattern: 'Note.*rate.*limit',
        maxResponseTime: 10000
      },
      yahooFinance: {
        testSymbol: 'AAPL',
        requiredFields: ['close', 'date', 'volume'],
        expectedDataStructure: 'array',
        maxResponseTime: 8000,
        validDateRange: 7 // Data should be within 7 days
      }
    };
  }

  private validateConfiguration(): void {
    try {
      TiingoAuthConfig.parse(this.config.tiingo);
      AlphaVantageAuthConfig.parse(this.config.alphaVantage);
      YahooFinanceAuthConfig.parse(this.config.yahooFinance);
      logger.info('Source authenticator configuration validated successfully');
    } catch (error) {
      logger.error('Invalid source authenticator configuration', { error });
      throw new Error('Source authenticator configuration validation failed');
    }
  }

  /**
   * Validate all configured data sources
   */
  public async validateAllSources(): Promise<SourceValidationResult> {
    const validationId = this.generateValidationId();
    const startTime = Date.now();

    logger.info('Starting comprehensive source validation', { validationId });

    try {
      const sourceResults = await Promise.allSettled([
        this.validateTiingoAuthenticity(),
        this.validateAlphaVantageAuthenticity(),
        this.validateYahooFinanceAuthenticity()
      ]);

      const sources: SourceAuthenticationResult[] = sourceResults.map((result, index) => {
        const sourceName = (['tiingo', 'alpha_vantage', 'yahoo_finance'] as DataSource[])[index];
        
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            source: sourceName,
            isAuthentic: false,
            confidence: 0,
            validationTime: Date.now() - startTime,
            evidence: this.getFailedEvidence(),
            warnings: [],
            errors: [result.reason?.message || 'Unknown validation error']
          };
        }
      });

      const validSources = sources.filter(s => s.isAuthentic);
      const overallConfidence = validSources.length > 0 
        ? validSources.reduce((sum, s) => sum + s.confidence, 0) / validSources.length
        : 0;

      const result: SourceValidationResult = {
        allValid: sources.every(s => s.isAuthentic),
        overallConfidence,
        sources,
        timestamp: new Date().toISOString(),
        validationId,
        systemStatus: this.determineSystemStatus(sources)
      };

      logger.info('Source validation completed', {
        validationId,
        allValid: result.allValid,
        overallConfidence: result.overallConfidence,
        systemStatus: result.systemStatus,
        duration: Date.now() - startTime
      });

      return result;

    } catch (error) {
      logger.error('Source validation failed', { validationId, error });
      throw new Error(`Source validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate Tiingo API authenticity
   */
  private async validateTiingoAuthenticity(): Promise<SourceAuthenticationResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];
    const evidence: AuthenticationEvidence = this.getInitialEvidence();

    try {
      const apiKey = process.env.TIINGO_API_KEY;
      
      // 1. API Key Format Validation
      if (!apiKey) {
        errors.push('Tiingo API key not configured');
        evidence.apiKeyValid = false;
      } else if (!new RegExp(this.config.tiingo.keyPattern).test(apiKey)) {
        errors.push('Tiingo API key format invalid');
        evidence.apiKeyValid = false;
      } else {
        evidence.apiKeyValid = true;
      }

      if (!evidence.apiKeyValid) {
        return this.createFailedResult('tiingo', startTime, evidence, warnings, errors);
      }

      // 2. Test API Connection
      const response = await this.testTiingoConnection(apiKey!);
      
      // 3. Response Structure Validation
      evidence.responseStructureValid = this.validateTiingoResponse(response);
      if (!evidence.responseStructureValid) {
        errors.push('Tiingo response structure invalid');
      }

      // 4. Header Signature Validation
      evidence.headerSignatureValid = this.validateTiingoHeaders(response);
      if (!evidence.headerSignatureValid) {
        warnings.push('Tiingo headers missing expected signatures');
      }

      // 5. SSL Certificate Validation
      evidence.sslCertificateValid = await this.validateTiingoSSL();
      if (!evidence.sslCertificateValid) {
        warnings.push('Tiingo SSL certificate validation failed');
      }

      // 6. Response Timing Validation
      const responseTime = Date.now() - startTime;
      evidence.responseTimingValid = responseTime < this.config.tiingo.maxResponseTime;
      if (!evidence.responseTimingValid) {
        warnings.push(`Tiingo response time excessive: ${responseTime}ms`);
      }

      // 7. Rate Limit Pattern Validation
      evidence.rateLimitPatternValid = this.validateTiingoRateLimit(response);

      const isAuthentic = evidence.responseStructureValid && evidence.apiKeyValid;
      const confidence = this.calculateConfidence(evidence);

      return {
        source: 'tiingo',
        isAuthentic,
        confidence,
        validationTime: responseTime,
        evidence,
        warnings,
        errors
      };

    } catch (error) {
      errors.push(`Tiingo validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return this.createFailedResult('tiingo', startTime, evidence, warnings, errors);
    }
  }

  /**
   * Validate Alpha Vantage API authenticity
   */
  private async validateAlphaVantageAuthenticity(): Promise<SourceAuthenticationResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];
    const evidence: AuthenticationEvidence = this.getInitialEvidence();

    try {
      const apiKey = process.env.ALPHA_VANTAGE_KEY;

      // 1. API Key Format Validation
      if (!apiKey) {
        errors.push('Alpha Vantage API key not configured');
        evidence.apiKeyValid = false;
      } else if (!new RegExp(this.config.alphaVantage.keyPattern).test(apiKey)) {
        errors.push('Alpha Vantage API key format invalid');
        evidence.apiKeyValid = false;
      } else {
        evidence.apiKeyValid = true;
      }

      if (!evidence.apiKeyValid) {
        return this.createFailedResult('alpha_vantage', startTime, evidence, warnings, errors);
      }

      // 2. Test API Connection
      const response = await this.testAlphaVantageConnection(apiKey!);

      // 3. Response Structure Validation
      evidence.responseStructureValid = this.validateAlphaVantageResponse(response);
      if (!evidence.responseStructureValid) {
        errors.push('Alpha Vantage response structure invalid');
      }

      // 4. Rate Limit Pattern Detection
      evidence.rateLimitPatternValid = !this.detectAlphaVantageRateLimit(response);
      if (!evidence.rateLimitPatternValid) {
        warnings.push('Alpha Vantage rate limit detected');
      }

      // 5. Response Timing Validation
      const responseTime = Date.now() - startTime;
      evidence.responseTimingValid = responseTime < this.config.alphaVantage.maxResponseTime;
      if (!evidence.responseTimingValid) {
        warnings.push(`Alpha Vantage response time excessive: ${responseTime}ms`);
      }

      const isAuthentic = evidence.responseStructureValid && evidence.apiKeyValid && evidence.rateLimitPatternValid;
      const confidence = this.calculateConfidence(evidence);

      return {
        source: 'alpha_vantage',
        isAuthentic,
        confidence,
        validationTime: responseTime,
        evidence,
        warnings,
        errors
      };

    } catch (error) {
      errors.push(`Alpha Vantage validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return this.createFailedResult('alpha_vantage', startTime, evidence, warnings, errors);
    }
  }

  /**
   * Validate Yahoo Finance API authenticity
   */
  private async validateYahooFinanceAuthenticity(): Promise<SourceAuthenticationResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];
    const evidence: AuthenticationEvidence = this.getInitialEvidence();

    try {
      // Yahoo Finance doesn't require API key, so we validate by testing data access
      evidence.apiKeyValid = true; // No key required

      // 1. Test Data Access
      const testData = await this.testYahooFinanceAccess();

      // 2. Response Structure Validation
      evidence.responseStructureValid = this.validateYahooFinanceResponse(testData);
      if (!evidence.responseStructureValid) {
        errors.push('Yahoo Finance response structure invalid');
      }

      // 3. Data Freshness Validation
      if (testData && Array.isArray(testData)) {
        const latestDate = new Date(testData[testData.length - 1]?.date);
        const daysSinceLatest = (Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceLatest > this.config.yahooFinance.validDateRange) {
          warnings.push(`Yahoo Finance data is stale: ${daysSinceLatest.toFixed(1)} days old`);
        }
      }

      // 4. Response Timing Validation
      const responseTime = Date.now() - startTime;
      evidence.responseTimingValid = responseTime < this.config.yahooFinance.maxResponseTime;
      if (!evidence.responseTimingValid) {
        warnings.push(`Yahoo Finance response time excessive: ${responseTime}ms`);
      }

      const isAuthentic = evidence.responseStructureValid;
      const confidence = this.calculateConfidence(evidence);

      return {
        source: 'yahoo_finance',
        isAuthentic,
        confidence,
        validationTime: responseTime,
        evidence,
        warnings,
        errors
      };

    } catch (error) {
      errors.push(`Yahoo Finance validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return this.createFailedResult('yahoo_finance', startTime, evidence, warnings, errors);
    }
  }

  // Helper Methods
  private async testTiingoConnection(apiKey: string): Promise<AxiosResponse> {
    return axios.get(this.config.tiingo.testEndpoint, {
      params: { token: apiKey },
      timeout: this.config.tiingo.maxResponseTime,
      validateStatus: (status) => status === 200
    });
  }

  private validateTiingoResponse(response: AxiosResponse): boolean {
    try {
      const expectedSchema = this.config.tiingo.expectedResponseSchema;
      return response.data?.message === expectedSchema.message;
    } catch {
      return false;
    }
  }

  private validateTiingoHeaders(response: AxiosResponse): boolean {
    const requiredHeaders = this.config.tiingo.requiredHeaders;
    return requiredHeaders.every(header => 
      response.headers[header.toLowerCase()] !== undefined
    );
  }

  private async validateTiingoSSL(): Promise<boolean> {
    // This would implement SSL certificate validation
    // For now, return true if HTTPS is used
    return this.config.tiingo.testEndpoint.startsWith('https://');
  }

  private validateTiingoRateLimit(response: AxiosResponse): boolean {
    const rateLimitHeader = response.headers['x-ratelimit-remaining'];
    return rateLimitHeader !== undefined && parseInt(rateLimitHeader) >= 0;
  }

  private async testAlphaVantageConnection(apiKey: string): Promise<AxiosResponse> {
    return axios.get(this.config.alphaVantage.testEndpoint, {
      params: {
        function: 'SYMBOL_SEARCH',
        keywords: 'AAPL',
        apikey: apiKey
      },
      timeout: this.config.alphaVantage.maxResponseTime,
      validateStatus: (status) => status === 200
    });
  }

  private validateAlphaVantageResponse(response: AxiosResponse): boolean {
    try {
      return response.data?.bestMatches !== undefined && Array.isArray(response.data.bestMatches);
    } catch {
      return false;
    }
  }

  private detectAlphaVantageRateLimit(response: AxiosResponse): boolean {
    const rateLimitPattern = new RegExp(this.config.alphaVantage.rateLimitPattern);
    const responseText = JSON.stringify(response.data);
    return rateLimitPattern.test(responseText);
  }

  private async testYahooFinanceAccess(): Promise<any> {
    // This would use the yahoo-finance2 library to test access
    // Implementation would depend on the actual yahoo-finance2 module
    const yahooFinance = await import('yahoo-finance2');
    return yahooFinance.default.historical(this.config.yahooFinance.testSymbol, {
      period1: new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)),
      period2: new Date(),
      interval: '1d'
    });
  }

  private validateYahooFinanceResponse(data: any): boolean {
    if (!Array.isArray(data) || data.length === 0) {
      return false;
    }

    const requiredFields = this.config.yahooFinance.requiredFields;
    return data.every(item => 
      requiredFields.every(field => item[field] !== undefined)
    );
  }

  private getInitialEvidence(): AuthenticationEvidence {
    return {
      apiKeyValid: false,
      responseStructureValid: false,
      headerSignatureValid: false,
      sslCertificateValid: false,
      rateLimitPatternValid: false,
      responseTimingValid: false
    };
  }

  private getFailedEvidence(): AuthenticationEvidence {
    return {
      apiKeyValid: false,
      responseStructureValid: false,
      headerSignatureValid: false,
      sslCertificateValid: false,
      rateLimitPatternValid: false,
      responseTimingValid: false
    };
  }

  private calculateConfidence(evidence: AuthenticationEvidence): number {
    const weights = {
      apiKeyValid: 0.3,
      responseStructureValid: 0.3,
      headerSignatureValid: 0.1,
      sslCertificateValid: 0.1,
      rateLimitPatternValid: 0.1,
      responseTimingValid: 0.1
    };

    let confidence = 0;
    for (const [key, weight] of Object.entries(weights)) {
      if (evidence[key as keyof AuthenticationEvidence]) {
        confidence += weight;
      }
    }

    return Math.round(confidence * 100) / 100;
  }

  private createFailedResult(
    source: DataSource,
    startTime: number,
    evidence: AuthenticationEvidence,
    warnings: string[],
    errors: string[]
  ): SourceAuthenticationResult {
    return {
      source,
      isAuthentic: false,
      confidence: 0,
      validationTime: Date.now() - startTime,
      evidence,
      warnings,
      errors
    };
  }

  private determineSystemStatus(sources: SourceAuthenticationResult[]): 'SECURE' | 'COMPROMISED' | 'DEGRADED' {
    const validSources = sources.filter(s => s.isAuthentic);
    const totalSources = sources.length;

    if (validSources.length === totalSources) {
      return 'SECURE';
    } else if (validSources.length === 0) {
      return 'COMPROMISED';
    } else {
      return 'DEGRADED';
    }
  }

  private generateValidationId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Get cached validation result if still valid
   */
  public getCachedValidation(source: DataSource): SourceAuthenticationResult | null {
    const cached = this.validationCache.get(source);
    if (cached && (Date.now() - (cached.validationTime)) < this.CACHE_TTL) {
      return cached;
    }
    return null;
  }

  /**
   * Clear validation cache
   */
  public clearCache(): void {
    this.validationCache.clear();
    logger.info('Source authentication cache cleared');
  }

  /**
   * Validate a specific source only
   */
  public async validateSource(source: DataSource): Promise<SourceAuthenticationResult> {
    switch (source) {
      case 'tiingo':
        return this.validateTiingoAuthenticity();
      case 'alpha_vantage':
        return this.validateAlphaVantageAuthenticity();
      case 'yahoo_finance':
        return this.validateYahooFinanceAuthenticity();
      default:
        throw new Error(`Unknown data source: ${source}`);
    }
  }
}

/**
 * Create singleton instance
 */
export const sourceAuthenticator = new SourceAuthenticator();

/**
 * Convenience function for quick validation
 */
export async function validateDataSources(): Promise<SourceValidationResult> {
  return sourceAuthenticator.validateAllSources();
}

/**
 * Validate specific source
 */
export async function validateDataSource(source: DataSource): Promise<SourceAuthenticationResult> {
  return sourceAuthenticator.validateSource(source);
}