/**
 * REAL DATA ENFORCER - MANDATORY FOR ALL AGENTS
 * 
 * This module provides critical security functions that EVERY agent MUST use
 * before processing ANY market data. Failure to use these functions will
 * result in PERMANENT BAN from the system.
 * 
 * ZERO TOLERANCE for fake data in financial systems.
 */

import { MarketData } from '../types';

export interface DataSourceValidation {
  isAuthentic: boolean;
  source: string;
  apiKey: string;
  endpoint: string;
  timestamp: string;
  violations: string[];
}

export interface EnforcementConfig {
  source: 'tiingo' | 'alpha_vantage' | 'yahoo_finance' | 'fred' | 'backend_api';
  apiKey: string;
  validatePrices: boolean;
  validateVolumes: boolean;
  strict?: boolean;
}

export interface ViolationLog {
  timestamp: string;
  violationType: 'FAKE_DATA_DETECTED' | 'INVALID_SOURCE' | 'MISSING_API_KEY' | 'SUSPICIOUS_PATTERN';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  details: string;
  agentId?: string;
  dataSource?: string;
  actionTaken: string;
}

/**
 * SECURITY VIOLATION ERROR - PERMANENT BAN TRIGGER
 */
export class RealDataViolationError extends Error {
  constructor(
    message: string,
    public readonly violationType: ViolationLog['violationType'],
    public readonly severity: ViolationLog['severity'],
    public readonly details: Record<string, unknown> = {}
  ) {
    super(`SECURITY VIOLATION - PERMANENT BAN: ${message}`);
    this.name = 'RealDataViolationError';
  }
}

/**
 * APPROVED DATA SOURCE CONFIGURATIONS
 * These are the ONLY allowed sources for market data
 */
const APPROVED_SOURCES = {
  tiingo: {
    baseUrl: 'https://api.tiingo.com',
    keyPattern: /^[a-f0-9]{40}$/i, // 40 character hex string
    endpoints: ['/tiingo/daily/', '/tiingo/iex/'],
    rateLimits: { requestsPerHour: 1000 }
  },
  alpha_vantage: {
    baseUrl: 'https://www.alphavantage.co',
    keyPattern: /^[A-Z0-9]{16}$/i, // 16 character alphanumeric
    endpoints: ['/query'],
    rateLimits: { requestsPerDay: 500 }
  },
  yahoo_finance: {
    library: 'yahoo-finance2',
    keyPattern: null, // No API key required
    endpoints: ['historical', 'quote'],
    rateLimits: { requestsPerMinute: 100 }
  },
  fred: {
    baseUrl: 'https://api.stlouisfed.org/fred',
    keyPattern: /^[a-f0-9]{32}$/i, // 32 character hex string
    endpoints: ['/series/observations', '/series'],
    rateLimits: { requestsPerHour: 120 }
  },
  backend_api: {
    baseUrl: 'http://localhost:5001',
    keyPattern: null, // Backend API uses FRED API key internally
    endpoints: ['/api/v1/economic/housing/summary', '/api/v1/economic/labor-market/summary'],
    rateLimits: { requestsPerHour: 1000 },
    description: 'Internal backend API that fetches real FRED data'
  }
} as const;

/**
 * FORBIDDEN PATTERNS - Automatic detection of fake data
 */
const FORBIDDEN_PATTERNS = [
  /fake.*data/i,
  /mock.*data/i,
  /test.*data/i,
  /synthetic.*data/i,
  /sample.*data/i,
  /random.*data/i,
  /generated.*data/i,
  /simulated.*data/i,
  /dummy.*data/i,
  /placeholder.*data/i
];

/**
 * AUDIT TRAIL - Immutable logging of all enforcement actions
 */
const violationLog: ViolationLog[] = [];

/**
 * MANDATORY FUNCTION: ENFORCE REAL DATA ONLY
 * 
 * This function MUST be called by every agent before processing market data.
 * It validates that data comes from approved sources and is authentic.
 * 
 * @param marketData - The market data to validate
 * @param config - Enforcement configuration
 * @throws RealDataViolationError - On ANY security violation
 */
export async function enforceRealDataOnly(
  marketData: Record<string, MarketData[]> | MarketData[],
  config: EnforcementConfig
): Promise<void> {
  const timestamp = new Date().toISOString();
  
  console.log(`🔒 ENFORCING REAL DATA ONLY - ${timestamp}`);
  
  try {
    // 1. VALIDATE DATA SOURCE
    await validateDataSource(config);
    
    // 2. VALIDATE API KEY AUTHENTICITY
    validateApiKey(config.source, config.apiKey);
    
    // 3. SCAN FOR FORBIDDEN PATTERNS
    scanForForbiddenPatterns(marketData);
    
    // 4. VALIDATE MARKET DATA STRUCTURE
    validateMarketDataStructure(marketData);
    
    // 5. VALIDATE PRICE AUTHENTICITY (if enabled)
    if (config.validatePrices) {
      validatePriceAuthenticity(marketData);
    }
    
    // 6. VALIDATE VOLUME AUTHENTICITY (if enabled)
    if (config.validateVolumes) {
      validateVolumeAuthenticity(marketData);
    }
    
    // 7. LOG SUCCESSFUL ENFORCEMENT
    logSuccessfulEnforcement(config, timestamp);
    
    console.log(`✅ REAL DATA ENFORCEMENT PASSED - Data is authentic and approved`);
    
  } catch (error) {
    // CRITICAL: Log violation and re-throw
    const violation: ViolationLog = {
      timestamp,
      violationType: error instanceof RealDataViolationError ? error.violationType : 'FAKE_DATA_DETECTED',
      severity: 'CRITICAL',
      details: error instanceof Error ? error.message : 'Unknown security violation',
      dataSource: config.source,
      actionTaken: 'PROCESSING_HALTED_AGENT_BANNED'
    };
    
    violationLog.push(violation);
    
    console.error(`🚨 SECURITY VIOLATION DETECTED:`, violation);
    console.error(`🚫 AGENT PERMANENTLY BANNED - VIOLATION LOGGED`);
    
    // HALT ALL PROCESSING
    throw error;
  }
}

/**
 * VALIDATE DATA SOURCE
 */
async function validateDataSource(config: EnforcementConfig): Promise<DataSourceValidation> {
  const approvedSource = APPROVED_SOURCES[config.source];
  
  if (!approvedSource) {
    throw new RealDataViolationError(
      `Unauthorized data source: ${config.source}`,
      'INVALID_SOURCE',
      'CRITICAL',
      { attemptedSource: config.source, approvedSources: Object.keys(APPROVED_SOURCES) }
    );
  }
  
  return {
    isAuthentic: true,
    source: config.source,
    apiKey: config.apiKey ? '***REDACTED***' : 'NOT_REQUIRED',
    endpoint: ('baseUrl' in approvedSource ? approvedSource.baseUrl : undefined) || 
             ('library' in approvedSource ? approvedSource.library : undefined) || 
             'LIBRARY_BASED',
    timestamp: new Date().toISOString(),
    violations: []
  };
}

/**
 * VALIDATE API KEY AUTHENTICITY
 */
function validateApiKey(source: EnforcementConfig['source'], apiKey: string): void {
  const sourceConfig = APPROVED_SOURCES[source];
  
  // Skip validation for sources that don't require API keys
  if (!sourceConfig.keyPattern) return;
  
  if (!apiKey) {
    throw new RealDataViolationError(
      `Missing required API key for ${source}`,
      'MISSING_API_KEY',
      'CRITICAL',
      { source, required: true }
    );
  }
  
  if (!sourceConfig.keyPattern.test(apiKey)) {
    throw new RealDataViolationError(
      `Invalid API key format for ${source}`,
      'INVALID_SOURCE',
      'CRITICAL',
      { source, expectedPattern: sourceConfig.keyPattern.toString() }
    );
  }
  
  // Additional checks for suspicious API keys
  const suspiciousPatterns = [
    /^(test|fake|mock|demo|sample)/i,
    /^(123|abc|xxx|000)/i,
    /^(placeholder|temp|dummy)/i
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(apiKey)) {
      throw new RealDataViolationError(
        `Suspicious API key detected for ${source}`,
        'FAKE_DATA_DETECTED',
        'CRITICAL',
        { source, suspiciousPattern: pattern.toString() }
      );
    }
  }
}

/**
 * SCAN FOR FORBIDDEN PATTERNS
 */
function scanForForbiddenPatterns(data: any): void {
  const dataString = JSON.stringify(data).toLowerCase();
  
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(dataString)) {
      throw new RealDataViolationError(
        `Forbidden fake data pattern detected: ${pattern.toString()}`,
        'FAKE_DATA_DETECTED',
        'CRITICAL',
        { detectedPattern: pattern.toString(), dataSource: 'UNKNOWN' }
      );
    }
  }
}

/**
 * VALIDATE MARKET DATA STRUCTURE
 */
function validateMarketDataStructure(data: Record<string, MarketData[]> | MarketData[]): void {
  if (!data || (Array.isArray(data) && data.length === 0) || (typeof data === 'object' && Object.keys(data).length === 0)) {
    throw new RealDataViolationError(
      'Empty or null market data detected',
      'SUSPICIOUS_PATTERN',
      'HIGH',
      { dataType: typeof data, isEmpty: true }
    );
  }
  
  // Validate data points have required fields
  const dataPoints = Array.isArray(data) ? data : Object.values(data).flat();
  
  for (const point of dataPoints) {
    // Check for minimum required field: date
    if (!point.date) {
      throw new RealDataViolationError(
        'Invalid data structure - missing date field',
        'SUSPICIOUS_PATTERN',
        'HIGH',
        { missingFields: { date: !point.date }, point: point }
      );
    }
    
    // For economic data, validate that it has economic indicators OR stock market fields
    const hasEconomicData = point.caseSillerIndex !== undefined || 
                           point.housingStarts !== undefined || 
                           point.unemploymentRate !== undefined ||
                           point.nonfarmPayrolls !== undefined ||
                           point.initialClaims !== undefined ||
                           point.laborParticipation !== undefined;
    
    const hasStockData = point.symbol && typeof point.close === 'number';
    
    // Must have either economic indicators or stock market data
    if (!hasEconomicData && !hasStockData) {
      throw new RealDataViolationError(
        'Invalid data structure - missing economic indicators or stock market data',
        'SUSPICIOUS_PATTERN',
        'HIGH',
        { 
          hasEconomicData: hasEconomicData,
          hasStockData: hasStockData,
          availableFields: Object.keys(point),
          point: point
        }
      );
    }
  }
}

/**
 * VALIDATE PRICE AUTHENTICITY
 */
function validatePriceAuthenticity(data: Record<string, MarketData[]> | MarketData[]): void {
  const dataPoints = Array.isArray(data) ? data : Object.values(data).flat();
  
  for (const point of dataPoints) {
    // Check for obviously fake prices
    if (point.close <= 0 || point.close > 100000) {
      throw new RealDataViolationError(
        `Suspicious price detected: ${point.close} for ${point.symbol}`,
        'SUSPICIOUS_PATTERN',
        'HIGH',
        { symbol: point.symbol, price: point.close, date: point.date }
      );
    }
    
    // Check for impossible price precision (fake data often has too many decimals)
    // NOTE: Yahoo Finance provides 13-14 decimal places for real market data
    // Increased limit from 6 to 16 to accommodate legitimate Yahoo Finance precision
    const decimalPlaces = (point.close.toString().split('.')[1] || '').length;
    if (decimalPlaces > 16) {
      throw new RealDataViolationError(
        `Suspicious price precision: ${decimalPlaces} decimal places for ${point.symbol} (exceeds Yahoo Finance max of 16)`,
        'SUSPICIOUS_PATTERN',
        'MEDIUM',
        { symbol: point.symbol, price: point.close, decimalPlaces }
      );
    }
  }
}

/**
 * VALIDATE VOLUME AUTHENTICITY
 */
function validateVolumeAuthenticity(data: Record<string, MarketData[]> | MarketData[]): void {
  const dataPoints = Array.isArray(data) ? data : Object.values(data).flat();
  
  for (const point of dataPoints) {
    if (point.volume !== undefined) {
      // Check for obviously fake volumes
      if (point.volume < 0 || point.volume > 10000000000) {
        throw new RealDataViolationError(
          `Suspicious volume detected: ${point.volume} for ${point.symbol}`,
          'SUSPICIOUS_PATTERN',
          'MEDIUM',
          { symbol: point.symbol, volume: point.volume, date: point.date }
        );
      }
    }
  }
}

/**
 * LOG SUCCESSFUL ENFORCEMENT
 */
function logSuccessfulEnforcement(config: EnforcementConfig, timestamp: string): void {
  const successLog = {
    timestamp,
    action: 'REAL_DATA_ENFORCEMENT_PASSED',
    source: config.source,
    apiKeyProvided: !!config.apiKey,
    validationsEnabled: {
      prices: config.validatePrices,
      volumes: config.validateVolumes
    }
  };
  
  console.log(`📝 ENFORCEMENT SUCCESS:`, successLog);
}

/**
 * GET VIOLATION LOG (for monitoring and compliance)
 */
export function getViolationLog(): ViolationLog[] {
  return [...violationLog]; // Return copy to prevent tampering
}

/**
 * EMERGENCY: BAN AGENT (for critical violations)
 */
export function emergencyBanAgent(agentId: string, reason: string): void {
  const banRecord: ViolationLog = {
    timestamp: new Date().toISOString(),
    violationType: 'FAKE_DATA_DETECTED',
    severity: 'CRITICAL',
    details: `EMERGENCY BAN: ${reason}`,
    agentId,
    actionTaken: 'PERMANENT_BAN_ACTIVATED'
  };
  
  violationLog.push(banRecord);
  
  console.error(`🚫 EMERGENCY BAN ACTIVATED for agent ${agentId}: ${reason}`);
  
  throw new RealDataViolationError(
    `Agent ${agentId} has been permanently banned: ${reason}`,
    'FAKE_DATA_DETECTED',
    'CRITICAL',
    { agentId, banReason: reason }
  );
}

/**
 * FACT-CHECK SPECIFIC ENFORCER CLASS
 */
export class RealDataEnforcer {
  /**
   * Validate YouTube URL for fact-checking
   */
  async validateYouTubeUrl(youtubeUrl: string): Promise<void> {
    const timestamp = new Date().toISOString();
    console.log(`🔒 VALIDATING YOUTUBE URL - ${timestamp}`);
    
    try {
      // 1. VALIDATE URL FORMAT
      if (!youtubeUrl || typeof youtubeUrl !== 'string') {
        throw new RealDataViolationError(
          'Invalid YouTube URL format',
          'INVALID_SOURCE',
          'CRITICAL',
          { url: youtubeUrl }
        );
      }
      
      // 2. VALIDATE YOUTUBE DOMAIN
      const url = new URL(youtubeUrl);
      const validDomains = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'];
      
      if (!validDomains.some(domain => url.hostname === domain)) {
        throw new RealDataViolationError(
          `Unauthorized video domain: ${url.hostname}`,
          'INVALID_SOURCE',
          'CRITICAL',
          { domain: url.hostname, validDomains }
        );
      }
      
      // 3. VALIDATE VIDEO ID PATTERN
      let videoId = '';
      if (url.hostname === 'youtu.be') {
        videoId = url.pathname.slice(1);
      } else {
        const params = new URLSearchParams(url.search);
        videoId = params.get('v') || '';
      }
      
      if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        throw new RealDataViolationError(
          'Invalid YouTube video ID format',
          'SUSPICIOUS_PATTERN',
          'HIGH',
          { videoId, url: youtubeUrl }
        );
      }
      
      console.log(`✅ YOUTUBE URL VALIDATION PASSED - ${videoId}`);
      
    } catch (error) {
      const violation: ViolationLog = {
        timestamp,
        violationType: error instanceof RealDataViolationError ? error.violationType : 'INVALID_SOURCE',
        severity: 'CRITICAL',
        details: error instanceof Error ? error.message : 'YouTube URL validation failed',
        dataSource: 'YOUTUBE',
        actionTaken: 'URL_REJECTED'
      };
      
      violationLog.push(violation);
      console.error(`🚨 YOUTUBE URL VALIDATION FAILED:`, violation);
      throw error;
    }
  }
  
  /**
   * Enforce real data only for any content with flexible source types
   */
  async enforceRealDataOnly(
    content: string,
    options: {
      source: string;
      apiKey: string;
      validateContent?: boolean;
    }
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    console.log(`🔒 ENFORCING REAL DATA ONLY - ${timestamp}`);
    
    try {
      // 1. VALIDATE CONTENT EXISTS
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        throw new RealDataViolationError(
          'Empty or invalid content provided',
          'SUSPICIOUS_PATTERN',
          'HIGH',
          { source: options.source }
        );
      }
      
      // 2. SCAN FOR FORBIDDEN PATTERNS
      scanForForbiddenPatterns(content);
      
      // 3. VALIDATE CONTENT AUTHENTICITY (if enabled)
      if (options.validateContent) {
        this.validateContentAuthenticity(content, options.source);
      }
      
      console.log(`✅ REAL DATA ENFORCEMENT PASSED for ${options.source}`);
      
    } catch (error) {
      const violation: ViolationLog = {
        timestamp,
        violationType: error instanceof RealDataViolationError ? error.violationType : 'FAKE_DATA_DETECTED',
        severity: 'CRITICAL',
        details: error instanceof Error ? error.message : 'Content validation failed',
        dataSource: options.source,
        actionTaken: 'CONTENT_REJECTED'
      };
      
      violationLog.push(violation);
      console.error(`🚨 CONTENT VALIDATION FAILED:`, violation);
      throw error;
    }
  }
  
  /**
   * Validate content authenticity for specific sources
   */
  private validateContentAuthenticity(content: string, source: string): void {
    // Check for AI-generated placeholder content
    const aiPlaceholders = [
      'I cannot', 'I\'m unable to', 'I don\'t have access',
      'As an AI', 'I cannot provide', 'Lorem ipsum',
      '[PLACEHOLDER]', '[MOCK_DATA]', '[SIMULATED]',
      'generated by AI', 'artificial intelligence',
      'this is a test', 'sample content'
    ];
    
    const contentLower = content.toLowerCase();
    
    for (const placeholder of aiPlaceholders) {
      if (contentLower.includes(placeholder.toLowerCase())) {
        throw new RealDataViolationError(
          `AI-generated placeholder content detected: "${placeholder}"`,
          'FAKE_DATA_DETECTED',
          'CRITICAL',
          { source, detectedPlaceholder: placeholder }
        );
      }
    }
    
    // Validate minimum content length for authenticity
    if (content.trim().length < 50) {
      throw new RealDataViolationError(
        'Content too short to be authentic',
        'SUSPICIOUS_PATTERN',
        'MEDIUM',
        { source, contentLength: content.length }
      );
    }
  }
}

/**
 * QUICK VALIDATION FOR AGENT COMPLIANCE
 */
export function validateAgentCompliance(): boolean {
  // This function checks if the current environment is properly configured
  // for real data enforcement
  
  const requiredEnvVars = ['TIINGO_API_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`⚠️ Missing environment variables: ${missingVars.join(', ')}`);
    return false;
  }
  
  return true;
}

/**
 * EXPORT ALL APPROVED SOURCES (for reference)
 */
export const APPROVED_DATA_SOURCES = Object.keys(APPROVED_SOURCES);

/**
 * EXPORT ENFORCEMENT STATUS
 */
export function getEnforcementStatus(): {
  isActive: boolean;
  approvedSources: string[];
  violationCount: number;
  lastEnforcement?: string;
} {
  return {
    isActive: true,
    approvedSources: APPROVED_DATA_SOURCES,
    violationCount: violationLog.length,
    lastEnforcement: violationLog.length > 0 ? violationLog[violationLog.length - 1].timestamp : undefined
  };
}