import { MarketData, Signal, ConsensusSignal } from '../types';

/**
 * SAFLA (Safety-First Lightweight Architecture) Validator
 * 
 * Comprehensive safety validation for financial calculations and trading logic.
 * Critical for production deployment of financial systems.
 */

export interface ValidationConfig {
  // Data Quality Thresholds
  minDataPoints: number;
  maxDataAge: number; // hours
  maxMissingDataPercent: number;
  
  // Price Range Validation
  priceRanges: Record<string, { min: number; max: number }>;
  maxDailyChangePercent: number;
  
  // Signal Validation
  maxSignalDeviation: number;
  minConfidenceThreshold: number;
  
  // Circuit Breaker Settings
  maxConsecutiveFailures: number;
  cooldownPeriod: number; // minutes
  
  // Rate Limiting
  maxValidationsPerMinute: number;
  maxValidationsPerHour: number;
}

export interface ValidationResult {
  isValid: boolean;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'data_integrity' | 'calculation' | 'market_data' | 'signal_logic' | 'risk_boundary';
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  correctionSuggestion?: string;
}

export interface SafetyReport {
  overallStatus: 'safe' | 'warning' | 'unsafe';
  validationResults: ValidationResult[];
  circuitBreakerStatus: 'active' | 'inactive' | 'cooling_down';
  riskScore: number; // 0-100
  recommendations: string[];
  auditTrail: AuditEntry[];
}

export interface AuditEntry {
  timestamp: string;
  operation: string;
  result: 'success' | 'failure' | 'warning';
  details: Record<string, unknown>;
  userId?: string;
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number;
  cooldownUntil: number;
}

export interface RateLimitState {
  validationsThisMinute: number;
  validationsThisHour: number;
  minuteStartTime: number;
  hourStartTime: number;
}

/**
 * SAFLA Validator Error Types
 */
export class SAFLAValidationError extends Error {
  constructor(
    message: string,
    public readonly category: ValidationResult['category'],
    public readonly severity: ValidationResult['severity'],
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SAFLAValidationError';
  }
}

export class SAFLACircuitBreakerError extends Error {
  constructor(message: string, public readonly cooldownUntil: number) {
    super(message);
    this.name = 'SAFLACircuitBreakerError';
  }
}

export class SAFLARateLimitError extends Error {
  constructor(message: string, public readonly resetTime: number) {
    super(message);
    this.name = 'SAFLARateLimitError';
  }
}

/**
 * SAFLA Validator Main Class
 */
export class SAFLAValidator {
  private static instance: SAFLAValidator;
  private config: ValidationConfig;
  private circuitBreakerState: CircuitBreakerState;
  private rateLimitState: RateLimitState;
  private auditTrail: AuditEntry[] = [];
  
  private constructor(config?: Partial<ValidationConfig>) {
    this.config = this.getDefaultConfig();
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.circuitBreakerState = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: 0,
      cooldownUntil: 0
    };
    
    this.rateLimitState = {
      validationsThisMinute: 0,
      validationsThisHour: 0,
      minuteStartTime: Date.now(),
      hourStartTime: Date.now()
    };
  }

  public static getInstance(config?: Partial<ValidationConfig>): SAFLAValidator {
    if (!SAFLAValidator.instance) {
      SAFLAValidator.instance = new SAFLAValidator(config);
    }
    return SAFLAValidator.instance;
  }

  /**
   * Default SAFLA Configuration
   */
  private getDefaultConfig(): ValidationConfig {
    return {
      minDataPoints: 21, // Minimum for signal calculations
      maxDataAge: 24, // 24 hours
      maxMissingDataPercent: 5, // 5% missing data tolerance
      
      priceRanges: {
        'SPY': { min: 50, max: 1000 },
        'XLU': { min: 20, max: 200 },
        'WOOD': { min: 10, max: 500 },
        'GLD': { min: 50, max: 500 },
        'IEF': { min: 50, max: 200 },
        'TLT': { min: 50, max: 300 },
        '^VIX': { min: 5, max: 100 }
      },
      maxDailyChangePercent: 25, // 25% max daily change
      
      maxSignalDeviation: 5.0, // Maximum allowed signal raw value deviation
      minConfidenceThreshold: 0.05, // Minimum confidence for valid signals
      
      maxConsecutiveFailures: 3,
      cooldownPeriod: 5, // 5 minutes
      
      maxValidationsPerMinute: 100,
      maxValidationsPerHour: 1000
    };
  }

  /**
   * Core Safety Validation Methods
   */

  /**
   * 1. Data Integrity Checks
   */
  public validateDataIntegrity(marketData: Record<string, MarketData[]>): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    for (const [symbol, data] of Object.entries(marketData)) {
      // Check data completeness
      if (!data || data.length === 0) {
        results.push({
          isValid: false,
          severity: 'error',
          category: 'data_integrity',
          message: `No data available for symbol ${symbol}`,
          timestamp: new Date().toISOString(),
          correctionSuggestion: 'Ensure data source is available and fetch process is working'
        });
        continue;
      }

      // Check minimum data points
      if (data.length < this.config.minDataPoints) {
        results.push({
          isValid: false,
          severity: 'warning',
          category: 'data_integrity',
          message: `Insufficient data points for ${symbol}: ${data.length} < ${this.config.minDataPoints}`,
          details: { symbol, dataPoints: data.length, required: this.config.minDataPoints },
          timestamp: new Date().toISOString(),
          correctionSuggestion: 'Increase data collection period or reduce minimum requirements'
        });
      }

      // Check for missing/null values
      const invalidEntries = data.filter(d => 
        !d.close || 
        d.close <= 0 || 
        !isFinite(d.close) || 
        isNaN(d.close) ||
        !d.date ||
        !d.symbol
      );

      const missingPercent = (invalidEntries.length / data.length) * 100;
      if (missingPercent > this.config.maxMissingDataPercent) {
        results.push({
          isValid: false,
          severity: 'error',
          category: 'data_integrity',
          message: `High missing data percentage for ${symbol}: ${missingPercent.toFixed(2)}%`,
          details: { symbol, missingPercent, invalidEntries: invalidEntries.length },
          timestamp: new Date().toISOString(),
          correctionSuggestion: 'Check data source quality and implement data cleaning'
        });
      }

      // Check data freshness
      const latestDate = new Date(data[data.length - 1]?.date);
      const ageInHours = (Date.now() - latestDate.getTime()) / (1000 * 60 * 60);
      if (ageInHours > this.config.maxDataAge) {
        results.push({
          isValid: false,
          severity: 'warning',
          category: 'data_integrity',
          message: `Stale data for ${symbol}: ${ageInHours.toFixed(1)} hours old`,
          details: { symbol, ageInHours, latestDate: latestDate.toISOString() },
          timestamp: new Date().toISOString(),
          correctionSuggestion: 'Update data feed or increase fetch frequency'
        });
      }

      // Check for data consistency (symbol matching)
      const symbolMismatches = data.filter(d => d.symbol !== symbol);
      if (symbolMismatches.length > 0) {
        results.push({
          isValid: false,
          severity: 'error',
          category: 'data_integrity',
          message: `Symbol mismatch detected in ${symbol} data`,
          details: { expectedSymbol: symbol, mismatches: symbolMismatches.length },
          timestamp: new Date().toISOString(),
          correctionSuggestion: 'Verify data mapping and symbol consistency'
        });
      }
    }

    return results;
  }

  /**
   * 2. Market Data Validation
   */
  public validateMarketData(marketData: Record<string, MarketData[]>): ValidationResult[] {
    const results: ValidationResult[] = [];

    for (const [symbol, data] of Object.entries(marketData)) {
      if (!data || data.length === 0) continue;

      const priceRange = this.config.priceRanges[symbol];
      if (!priceRange) {
        results.push({
          isValid: false,
          severity: 'warning',
          category: 'market_data',
          message: `No price range validation configured for ${symbol}`,
          details: { symbol },
          timestamp: new Date().toISOString(),
          correctionSuggestion: 'Add price range configuration for this symbol'
        });
        continue;
      }

      // Validate price ranges
      const priceViolations = data.filter(d => 
        d.close < priceRange.min || d.close > priceRange.max
      );

      if (priceViolations.length > 0) {
        results.push({
          isValid: false,
          severity: 'error',
          category: 'market_data',
          message: `Price range violations for ${symbol}`,
          details: { 
            symbol, 
            violations: priceViolations.length, 
            range: priceRange,
            examples: priceViolations.slice(0, 5).map(d => ({ date: d.date, price: d.close }))
          },
          timestamp: new Date().toISOString(),
          correctionSuggestion: 'Review data source for price accuracy or adjust price ranges'
        });
      }

      // Check for extreme daily changes
      for (let i = 1; i < data.length; i++) {
        const prevPrice = data[i - 1].close;
        const currentPrice = data[i].close;
        const changePercent = Math.abs((currentPrice - prevPrice) / prevPrice) * 100;

        if (changePercent > this.config.maxDailyChangePercent) {
          results.push({
            isValid: false,
            severity: 'warning',
            category: 'market_data',
            message: `Extreme daily price change for ${symbol}`,
            details: { 
              symbol, 
              date: data[i].date, 
              changePercent: changePercent.toFixed(2), 
              prevPrice, 
              currentPrice 
            },
            timestamp: new Date().toISOString(),
            correctionSuggestion: 'Verify if this represents a stock split, merger, or data error'
          });
        }
      }

      // Check for suspicious price patterns
      const suspiciousPatterns = this.detectSuspiciousPricePatterns(data);
      if (suspiciousPatterns.length > 0) {
        results.push({
          isValid: false,
          severity: 'warning',
          category: 'market_data',
          message: `Suspicious price patterns detected for ${symbol}`,
          details: { symbol, patterns: suspiciousPatterns },
          timestamp: new Date().toISOString(),
          correctionSuggestion: 'Investigate data source for potential issues'
        });
      }
    }

    return results;
  }

  /**
   * 3. Financial Calculation Validation
   */
  public validateFinancialCalculations(
    marketData: Record<string, MarketData[]>, 
    signals: (Signal | null)[]
  ): ValidationResult[] {
    const results: ValidationResult[] = [];

    // Cross-validate signal calculations
    const validSignals = signals.filter((s): s is Signal => s !== null);
    
    for (const signal of validSignals) {
      // Validate raw values are within reasonable bounds
      if (!isFinite(signal.rawValue) || isNaN(signal.rawValue)) {
        results.push({
          isValid: false,
          severity: 'error',
          category: 'calculation',
          message: `Invalid raw value in ${signal.type} signal`,
          details: { signalType: signal.type, rawValue: signal.rawValue },
          timestamp: new Date().toISOString(),
          correctionSuggestion: 'Check calculation logic for division by zero or invalid operations'
        });
        continue;
      }

      // Check for extreme deviations
      if (Math.abs(signal.rawValue) > this.config.maxSignalDeviation) {
        results.push({
          isValid: false,
          severity: 'warning',
          category: 'calculation',
          message: `Extreme signal value for ${signal.type}`,
          details: { 
            signalType: signal.type, 
            rawValue: signal.rawValue, 
            maxAllowed: this.config.maxSignalDeviation 
          },
          timestamp: new Date().toISOString(),
          correctionSuggestion: 'Review market conditions or adjust signal parameters'
        });
      }

      // Validate confidence values
      if (signal.confidence < 0 || signal.confidence > 1) {
        results.push({
          isValid: false,
          severity: 'error',
          category: 'calculation',
          message: `Invalid confidence value for ${signal.type}`,
          details: { signalType: signal.type, confidence: signal.confidence },
          timestamp: new Date().toISOString(),
          correctionSuggestion: 'Ensure confidence calculations return values between 0 and 1'
        });
      }

      // Check minimum confidence threshold
      if (signal.confidence < this.config.minConfidenceThreshold) {
        results.push({
          isValid: false,
          severity: 'warning',
          category: 'calculation',
          message: `Low confidence signal for ${signal.type}`,
          details: { 
            signalType: signal.type, 
            confidence: signal.confidence, 
            threshold: this.config.minConfidenceThreshold 
          },
          timestamp: new Date().toISOString(),
          correctionSuggestion: 'Consider filtering out low-confidence signals or adjusting thresholds'
        });
      }

      // Validate signal consistency with raw value
      const expectedSignal = this.calculateExpectedSignal(signal.type, signal.rawValue);
      if (expectedSignal && expectedSignal !== signal.signal) {
        results.push({
          isValid: false,
          severity: 'error',
          category: 'calculation',
          message: `Signal logic inconsistency for ${signal.type}`,
          details: { 
            signalType: signal.type, 
            actualSignal: signal.signal, 
            expectedSignal, 
            rawValue: signal.rawValue 
          },
          timestamp: new Date().toISOString(),
          correctionSuggestion: 'Review signal calculation logic for consistency'
        });
      }
    }

    // Validate that we have adequate signal coverage
    const requiredSignalTypes = ['utilities_spy', 'lumber_gold', 'treasury_curve', 'vix_defensive', 'sp500_ma'];
    const availableSignalTypes = validSignals.map(s => s.type);
    const missingSignalTypes = requiredSignalTypes.filter(type => !availableSignalTypes.includes(type));

    if (missingSignalTypes.length > 2) {
      results.push({
        isValid: false,
        severity: 'warning',
        category: 'calculation',
        message: 'Insufficient signal coverage for reliable consensus',
        details: { missingSignalTypes, availableCount: validSignals.length },
        timestamp: new Date().toISOString(),
        correctionSuggestion: 'Investigate why multiple signals failed to calculate'
      });
    }

    return results;
  }

  /**
   * 4. Signal Logic Validation
   */
  public validateSignalLogic(signals: (Signal | null)[], consensus: ConsensusSignal): ValidationResult[] {
    const results: ValidationResult[] = [];
    const validSignals = signals.filter((s): s is Signal => s !== null);

    // Validate consensus calculation
    const expectedRiskOnCount = validSignals.filter(s => s.signal === 'Risk-On').length;
    const expectedRiskOffCount = validSignals.filter(s => s.signal === 'Risk-Off').length;

    if (consensus.riskOnCount !== expectedRiskOnCount || consensus.riskOffCount !== expectedRiskOffCount) {
      results.push({
        isValid: false,
        severity: 'error',
        category: 'signal_logic',
        message: 'Consensus signal count mismatch',
        details: { 
          expectedRiskOn: expectedRiskOnCount, 
          actualRiskOn: consensus.riskOnCount,
          expectedRiskOff: expectedRiskOffCount, 
          actualRiskOff: consensus.riskOffCount 
        },
        timestamp: new Date().toISOString(),
        correctionSuggestion: 'Review consensus calculation logic'
      });
    }

    // Validate consensus logic
    const majorityType = expectedRiskOnCount > expectedRiskOffCount ? 'Risk-On' : 
                        expectedRiskOffCount > expectedRiskOnCount ? 'Risk-Off' : 'Mixed';
    
    if (validSignals.length >= 3 && Math.abs(expectedRiskOnCount - expectedRiskOffCount) >= 2) {
      if (consensus.consensus === 'Mixed' && majorityType !== 'Mixed') {
        results.push({
          isValid: false,
          severity: 'warning',
          category: 'signal_logic',
          message: 'Consensus shows Mixed when clear majority exists',
          details: { 
            expectedConsensus: majorityType, 
            actualConsensus: consensus.consensus,
            riskOnCount: expectedRiskOnCount,
            riskOffCount: expectedRiskOffCount
          },
          timestamp: new Date().toISOString(),
          correctionSuggestion: 'Review consensus threshold logic'
        });
      }
    }

    // Check for conflicting signals that should be investigated
    const highConfidenceConflicts = this.detectHighConfidenceConflicts(validSignals);
    if (highConfidenceConflicts.length > 0) {
      results.push({
        isValid: true, // Not invalid, but noteworthy
        severity: 'info',
        category: 'signal_logic',
        message: 'High-confidence conflicting signals detected',
        details: { conflicts: highConfidenceConflicts },
        timestamp: new Date().toISOString(),
        correctionSuggestion: 'Review market conditions causing signal divergence'
      });
    }

    return results;
  }

  /**
   * 5. Risk Boundary Validation
   */
  public validateRiskBoundaries(
    marketData: Record<string, MarketData[]>, 
    signals: (Signal | null)[], 
    consensus: ConsensusSignal
  ): ValidationResult[] {
    const results: ValidationResult[] = [];

    // Check for dangerous market conditions
    const vixData = marketData['^VIX'];
    if (vixData && vixData.length > 0) {
      const currentVix = vixData[vixData.length - 1].close;
      
      // Extreme VIX conditions
      if (currentVix > 50) {
        results.push({
          isValid: false,
          severity: 'critical',
          category: 'risk_boundary',
          message: 'Extreme market volatility detected',
          details: { vixLevel: currentVix, threshold: 50 },
          timestamp: new Date().toISOString(),
          correctionSuggestion: 'Consider implementing additional risk controls or position sizing adjustments'
        });
      } else if (currentVix < 10) {
        results.push({
          isValid: false,
          severity: 'warning',
          category: 'risk_boundary',
          message: 'Unusually low volatility may indicate complacency',
          details: { vixLevel: currentVix, threshold: 10 },
          timestamp: new Date().toISOString(),
          correctionSuggestion: 'Monitor for potential volatility regime change'
        });
      }
    }

    // Check consensus confidence for high-risk scenarios
    if (consensus.confidence > 0.8 && consensus.consensus !== 'Mixed') {
      const validSignals = signals.filter((s): s is Signal => s !== null);
      const strongSignals = validSignals.filter(s => s.strength === 'Strong');
      
      if (strongSignals.length < 2) {
        results.push({
          isValid: false,
          severity: 'warning',
          category: 'risk_boundary',
          message: 'High consensus confidence with insufficient strong signals',
          details: { 
            consensusConfidence: consensus.confidence, 
            strongSignalCount: strongSignals.length 
          },
          timestamp: new Date().toISOString(),
          correctionSuggestion: 'Verify that high confidence is justified by signal strength'
        });
      }
    }

    // Risk concentration check
    const riskConcentration = this.calculateRiskConcentration(signals);
    if (riskConcentration > 0.8) {
      results.push({
        isValid: false,
        severity: 'warning',
        category: 'risk_boundary',
        message: 'High risk concentration in signal types',
        details: { riskConcentration },
        timestamp: new Date().toISOString(),
        correctionSuggestion: 'Consider diversification across different signal methodologies'
      });
    }

    return results;
  }

  /**
   * Comprehensive Safety Validation
   */
  public async validateComprehensive(
    marketData: Record<string, MarketData[]>,
    signals: (Signal | null)[],
    consensus: ConsensusSignal
  ): Promise<SafetyReport> {
    // Check rate limiting
    this.checkRateLimit();
    
    // Check circuit breaker
    this.checkCircuitBreaker();

    const allResults: ValidationResult[] = [];
    let hasErrors = false;

    try {
      // Run all validation checks
      const dataIntegrityResults = this.validateDataIntegrity(marketData);
      const marketDataResults = this.validateMarketData(marketData);
      const calculationResults = this.validateFinancialCalculations(marketData, signals);
      const signalLogicResults = this.validateSignalLogic(signals, consensus);
      const riskBoundaryResults = this.validateRiskBoundaries(marketData, signals, consensus);

      allResults.push(
        ...dataIntegrityResults,
        ...marketDataResults,
        ...calculationResults,
        ...signalLogicResults,
        ...riskBoundaryResults
      );

      // Check for errors
      hasErrors = allResults.some(r => r.severity === 'error' || r.severity === 'critical');

      // Log successful validation
      this.addAuditEntry('comprehensive_validation', hasErrors ? 'warning' : 'success', {
        validationCount: allResults.length,
        errorCount: allResults.filter(r => r.severity === 'error' || r.severity === 'critical').length
      });

    } catch (error) {
      hasErrors = true;
      allResults.push({
        isValid: false,
        severity: 'critical',
        category: 'data_integrity',
        message: `Validation system error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        correctionSuggestion: 'Check validation system integrity'
      });

      this.addAuditEntry('comprehensive_validation', 'failure', { error: error instanceof Error ? error.message : 'Unknown error' });
    }

    // Update circuit breaker state
    if (hasErrors) {
      this.recordFailure();
    } else {
      this.recordSuccess();
    }

    // Generate safety report
    const report: SafetyReport = {
      overallStatus: this.determineOverallStatus(allResults),
      validationResults: allResults,
      circuitBreakerStatus: this.getCircuitBreakerStatus(),
      riskScore: this.calculateRiskScore(allResults),
      recommendations: this.generateRecommendations(allResults),
      auditTrail: this.getRecentAuditEntries(10)
    };

    return report;
  }

  /**
   * Fallback Mechanisms
   */
  public getSafeDefaults(): {
    marketData: Record<string, MarketData[]>;
    signals: Signal[];
    consensus: ConsensusSignal;
  } {
    const safeDate = new Date().toISOString();
    
    return {
      marketData: {},
      signals: [],
      consensus: {
        date: safeDate,
        consensus: 'Mixed',
        confidence: 0.1,
        riskOnCount: 0,
        riskOffCount: 0,
        signals: []
      }
    };
  }

  /**
   * Utility Methods
   */
  private detectSuspiciousPricePatterns(data: MarketData[]): string[] {
    const patterns: string[] = [];
    const prices = data.map(d => d.close);

    // Detect repeated identical prices
    const identicalCount = prices.reduce((acc, price, index) => {
      if (index > 0 && price === prices[index - 1]) {
        acc++;
      }
      return acc;
    }, 0);

    if (identicalCount > prices.length * 0.1) {
      patterns.push('excessive_identical_prices');
    }

    // Detect step function patterns (sudden level shifts)
    for (let i = 1; i < prices.length; i++) {
      const changePercent = Math.abs((prices[i] - prices[i - 1]) / prices[i - 1]);
      if (changePercent > 0.5) { // 50% change
        patterns.push('sudden_level_shift');
        break;
      }
    }

    return patterns;
  }

  private calculateExpectedSignal(
    signalType: string, 
    rawValue: number
  ): 'Risk-On' | 'Risk-Off' | 'Neutral' | null {
    switch (signalType) {
      case 'utilities_spy':
      case 'lumber_gold':
      case 'treasury_curve':
        return rawValue > 1.0 ? 'Risk-Off' : 'Risk-On';
      case 'vix_defensive':
        return rawValue > 20 ? 'Risk-On' : 'Risk-Off'; // Counter-intuitive VIX logic
      case 'sp500_ma':
        return rawValue > 1.0 ? 'Risk-On' : 'Risk-Off';
      default:
        return null;
    }
  }

  private detectHighConfidenceConflicts(signals: Signal[]): Array<{ signal1: Signal; signal2: Signal }> {
    const conflicts: Array<{ signal1: Signal; signal2: Signal }> = [];
    const highConfidenceThreshold = 0.7;

    for (let i = 0; i < signals.length; i++) {
      for (let j = i + 1; j < signals.length; j++) {
        const s1 = signals[i];
        const s2 = signals[j];
        
        if (s1.confidence > highConfidenceThreshold && 
            s2.confidence > highConfidenceThreshold &&
            s1.signal !== s2.signal && 
            s1.signal !== 'Neutral' && 
            s2.signal !== 'Neutral') {
          conflicts.push({ signal1: s1, signal2: s2 });
        }
      }
    }

    return conflicts;
  }

  private calculateRiskConcentration(signals: (Signal | null)[]): number {
    const validSignals = signals.filter((s): s is Signal => s !== null);
    if (validSignals.length === 0) return 0;

    const typeGroups: Record<string, number> = {};
    validSignals.forEach(signal => {
      const category = this.getSignalCategory(signal.type);
      typeGroups[category] = (typeGroups[category] || 0) + 1;
    });

    const maxConcentration = Math.max(...Object.values(typeGroups));
    return maxConcentration / validSignals.length;
  }

  private getSignalCategory(signalType: string): string {
    switch (signalType) {
      case 'utilities_spy': return 'sector_rotation';
      case 'lumber_gold': return 'commodity_based';
      case 'treasury_curve': return 'fixed_income';
      case 'vix_defensive': return 'volatility_based';
      case 'sp500_ma': return 'trend_following';
      default: return 'unknown';
    }
  }

  private checkRateLimit(): void {
    const now = Date.now();
    
    // Reset counters if time windows have passed
    if (now - this.rateLimitState.minuteStartTime > 60000) {
      this.rateLimitState.validationsThisMinute = 0;
      this.rateLimitState.minuteStartTime = now;
    }
    
    if (now - this.rateLimitState.hourStartTime > 3600000) {
      this.rateLimitState.validationsThisHour = 0;
      this.rateLimitState.hourStartTime = now;
    }

    // Check limits before incrementing
    if (this.rateLimitState.validationsThisMinute >= this.config.maxValidationsPerMinute) {
      throw new SAFLARateLimitError(
        'Rate limit exceeded: too many validations per minute',
        this.rateLimitState.minuteStartTime + 60000
      );
    }

    if (this.rateLimitState.validationsThisHour >= this.config.maxValidationsPerHour) {
      throw new SAFLARateLimitError(
        'Rate limit exceeded: too many validations per hour',
        this.rateLimitState.hourStartTime + 3600000
      );
    }

    // Increment counters after checking limits
    this.rateLimitState.validationsThisMinute++;
    this.rateLimitState.validationsThisHour++;
  }

  private checkCircuitBreaker(): void {
    const now = Date.now();
    
    if (this.circuitBreakerState.isOpen) {
      if (now < this.circuitBreakerState.cooldownUntil) {
        throw new SAFLACircuitBreakerError(
          'Circuit breaker is open due to repeated failures',
          this.circuitBreakerState.cooldownUntil
        );
      } else {
        // Reset circuit breaker after cooldown
        this.circuitBreakerState.isOpen = false;
        this.circuitBreakerState.failureCount = 0;
      }
    }
  }

  private recordFailure(): void {
    this.circuitBreakerState.failureCount++;
    this.circuitBreakerState.lastFailureTime = Date.now();

    if (this.circuitBreakerState.failureCount >= this.config.maxConsecutiveFailures) {
      this.circuitBreakerState.isOpen = true;
      this.circuitBreakerState.cooldownUntil = Date.now() + (this.config.cooldownPeriod * 60000);
    }
  }

  private recordSuccess(): void {
    this.circuitBreakerState.failureCount = 0;
  }

  private getCircuitBreakerStatus(): 'active' | 'inactive' | 'cooling_down' {
    if (this.circuitBreakerState.isOpen) {
      return Date.now() < this.circuitBreakerState.cooldownUntil ? 'cooling_down' : 'active';
    }
    return 'inactive';
  }

  private determineOverallStatus(results: ValidationResult[]): 'safe' | 'warning' | 'unsafe' {
    const hasCritical = results.some(r => r.severity === 'critical');
    const hasError = results.some(r => r.severity === 'error');
    const hasWarning = results.some(r => r.severity === 'warning');

    if (hasCritical) return 'unsafe';
    if (hasError) return 'unsafe';
    if (hasWarning) return 'warning';
    return 'safe';
  }

  private calculateRiskScore(results: ValidationResult[]): number {
    let score = 0;
    
    results.forEach(result => {
      switch (result.severity) {
        case 'critical': score += 25; break;
        case 'error': score += 15; break;
        case 'warning': score += 5; break;
        case 'info': score += 1; break;
      }
    });

    return Math.min(score, 100);
  }

  private generateRecommendations(results: ValidationResult[]): string[] {
    const recommendations = new Set<string>();
    
    results.forEach(result => {
      if (result.correctionSuggestion) {
        recommendations.add(result.correctionSuggestion);
      }
    });

    // Add general recommendations based on patterns
    const errorCategories = results.filter(r => r.severity === 'error' || r.severity === 'critical')
                                  .map(r => r.category);
    
    if (errorCategories.includes('data_integrity')) {
      recommendations.add('Implement robust data validation and cleaning processes');
    }
    
    if (errorCategories.includes('market_data')) {
      recommendations.add('Review data source reliability and implement data quality monitoring');
    }

    return Array.from(recommendations);
  }

  private addAuditEntry(operation: string, result: 'success' | 'failure' | 'warning', details: Record<string, unknown>): void {
    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      operation,
      result,
      details
    };

    this.auditTrail.push(entry);
    
    // Keep only last 1000 entries
    if (this.auditTrail.length > 1000) {
      this.auditTrail = this.auditTrail.slice(-1000);
    }
  }

  private getRecentAuditEntries(count: number = 10): AuditEntry[] {
    return this.auditTrail.slice(-count);
  }

  /**
   * Static convenience methods
   */
  public static async validateSystem(
    marketData: Record<string, MarketData[]>,
    signals: (Signal | null)[],
    consensus: ConsensusSignal,
    config?: Partial<ValidationConfig>
  ): Promise<SafetyReport> {
    const validator = SAFLAValidator.getInstance(config);
    return validator.validateComprehensive(marketData, signals, consensus);
  }

  public static validateQuick(marketData: Record<string, MarketData[]>): ValidationResult[] {
    const validator = SAFLAValidator.getInstance();
    return validator.validateDataIntegrity(marketData);
  }
}

// Export convenience functions
export const validateSystem = SAFLAValidator.validateSystem;
export const validateQuick = SAFLAValidator.validateQuick;