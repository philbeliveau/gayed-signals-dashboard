import { Signal, ConsensusSignal, MarketData } from '../types';
import { GayedSignalCalculator } from './utilities-spy';
import { LumberGoldSignalCalculator } from './lumber-gold';
import { TreasuryCurveSignalCalculator } from './treasury-curve';
import { VixDefensiveSignalCalculator } from './vix-defensive';
import { SP500MovingAverageSignalCalculator } from './sp500-ma';
import { SAFLAValidator, SafetyReport, ValidationConfig } from '../safety/safla-validator';

/**
 * Comprehensive Signal Orchestrator for Michael Gayed's Market Regime Signals
 * 
 * Calculates all 5 Gayed signals and generates consensus signals:
 * 1. Utilities/SPY Signal (Risk-On/Risk-Off based on utilities relative performance)
 * 2. Lumber/Gold Signal (Risk-On/Risk-Off based on lumber vs gold performance)  
 * 3. Treasury Curve Signal (Risk-On/Risk-Off based on 10Y vs 30Y performance)
 * 4. VIX Defensive Signal (Counter-intuitive: Low VIX = Risk-Off, High VIX = Risk-On)
 * 5. S&P 500 Moving Average Signal (Trend-following based on 50/200 day MAs)
 */
export class SignalOrchestrator {
  /**
   * Get all required market data symbols for signal calculations
   * @returns Array of ticker symbols needed for all signal calculations
   */
  public static getRequiredSymbols(): string[] {
    return [
      'SPY',     // S&P 500 ETF (for utilities signal and MA signal)
      'XLU',     // Utilities ETF (for utilities signal)
      'WOOD',    // Lumber ETF proxy (alternative: lumber futures data)
      'GLD',     // Gold ETF (for lumber/gold signal)
      'IEF',     // 10-year Treasury ETF (for treasury curve signal)
      'TLT',     // 30-year Treasury ETF (for treasury curve signal)
      '^VIX'     // VIX volatility index (for VIX defensive signal)
    ];
  }

  /**
   * Calculate all 5 Gayed signals from market data
   * @param marketData Record of symbol -> MarketData[] mappings
   * @returns Array of calculated signals (may contain nulls for failed calculations)
   */
  public static calculateAllSignals(
    marketData: Record<string, MarketData[]>
  ): (Signal | null)[] {
    const signals: (Signal | null)[] = [];
    
    try {
      // 1. Utilities/SPY Signal
      const utilitiesSignal = this.calculateUtilitiesSpySignal(marketData);
      signals.push(utilitiesSignal);

      // 2. Lumber/Gold Signal  
      const lumberGoldSignal = this.calculateLumberGoldSignal(marketData);
      signals.push(lumberGoldSignal);

      // 3. Treasury Curve Signal
      const treasurySignal = this.calculateTreasuryCurveSignal(marketData);
      signals.push(treasurySignal);

      // 4. VIX Defensive Signal
      const vixSignal = this.calculateVixDefensiveSignal(marketData);
      signals.push(vixSignal);

      // 5. S&P 500 Moving Average Signal
      const sp500MASignal = this.calculateSP500MASignal(marketData);
      signals.push(sp500MASignal);

    } catch (error) {
      console.error('Error calculating signals:', error);
    }

    return signals;
  }

  /**
   * Calculate consensus signal from individual signals
   * @param signals Array of individual signals (nulls are filtered out)
   * @returns ConsensusSignal with overall market regime assessment
   */
  public static calculateConsensusSignal(
    signals: (Signal | null)[]
  ): ConsensusSignal {
    // Filter out null signals
    const validSignals = signals.filter((signal): signal is Signal => signal !== null);
    
    if (validSignals.length === 0) {
      return {
        date: new Date().toISOString(),
        consensus: 'Mixed',
        confidence: 0.0,
        riskOnCount: 0,
        riskOffCount: 0,
        signals: []
      };
    }

    // Count signal types
    let riskOnCount = 0;
    let riskOffCount = 0;

    // Count each signal type
    validSignals.forEach(signal => {
      switch (signal.signal) {
        case 'Risk-On':
          riskOnCount++;
          break;
        case 'Risk-Off':
          riskOffCount++;
          break;
        case 'Neutral':
          // Neutral signals don't count towards either side
          break;
      }
    });

    // Determine consensus based on weighted votes
    let consensus: 'Risk-On' | 'Risk-Off' | 'Mixed';
    let consensusConfidence: number;

    const riskOnWeight = this.calculateWeightedSignalStrength(validSignals, 'Risk-On');
    const riskOffWeight = this.calculateWeightedSignalStrength(validSignals, 'Risk-Off');
    
    // Decision logic with confidence weighting
    const weightDifference = Math.abs(riskOnWeight - riskOffWeight);
    const strongConsensusThreshold = 0.3; // 30% weighted difference needed for strong consensus
    const minConsensusThreshold = 0.1;   // 10% minimum difference for any consensus

    if (weightDifference < minConsensusThreshold) {
      consensus = 'Mixed';
      consensusConfidence = Math.max(0.1, 1 - weightDifference * 2);
    } else if (riskOnWeight > riskOffWeight) {
      consensus = 'Risk-On';
      consensusConfidence = Math.min(0.9, 0.5 + weightDifference);
    } else {
      consensus = 'Risk-Off';
      consensusConfidence = Math.min(0.9, 0.5 + weightDifference);
    }

    // Boost confidence for strong consensus
    if (weightDifference > strongConsensusThreshold) {
      consensusConfidence = Math.min(consensusConfidence * 1.2, 1.0);
    }

    // Reduce confidence if we have too few signals
    if (validSignals.length < 3) {
      consensusConfidence *= 0.8;
    }

    return {
      date: new Date().toISOString(),
      consensus,
      confidence: Math.max(0.1, consensusConfidence),
      riskOnCount,
      riskOffCount,
      signals: validSignals
    };
  }

  /**
   * Calculate weighted signal strength for a specific signal type
   * @param signals Array of valid signals
   * @param signalType Target signal type to calculate weight for
   * @returns Weighted strength (0-1 scale)
   */
  private static calculateWeightedSignalStrength(
    signals: Signal[], 
    signalType: 'Risk-On' | 'Risk-Off'
  ): number {
    let weightedSum = 0;
    let totalWeight = 0;

    signals.forEach(signal => {
      if (signal.signal === signalType) {
        const confidence = signal.confidence;
        const strengthMultiplier = this.getStrengthMultiplier(signal.strength);
        const signalWeight = confidence * strengthMultiplier;
        
        weightedSum += signalWeight;
        totalWeight += confidence;
      }
    });

    return totalWeight > 0 ? weightedSum / signals.length : 0;
  }

  /**
   * Convert signal strength to numerical multiplier
   * @param strength Signal strength designation
   * @returns Numerical multiplier for weighting calculations
   */
  private static getStrengthMultiplier(strength: 'Strong' | 'Moderate' | 'Weak'): number {
    switch (strength) {
      case 'Strong': return 1.0;
      case 'Moderate': return 0.75;
      case 'Weak': return 0.5;
      default: return 0.5;
    }
  }

  /**
   * Calculate Utilities/SPY Signal
   */
  private static calculateUtilitiesSpySignal(
    marketData: Record<string, MarketData[]>
  ): Signal | null {
    try {
      const xluData = marketData['XLU'];
      const spyData = marketData['SPY'];
      
      if (!xluData || !spyData) {
        console.warn('Missing XLU or SPY data for utilities signal');
        return null;
      }

      const xluPrices = xluData.map(d => d.close);
      const spyPrices = spyData.map(d => d.close);

      return GayedSignalCalculator.calculateUtilitiesSignal(xluPrices, spyPrices);
    } catch (error) {
      console.error('Error calculating utilities/SPY signal:', error);
      return null;
    }
  }

  /**
   * Calculate Lumber/Gold Signal
   */
  private static calculateLumberGoldSignal(
    marketData: Record<string, MarketData[]>
  ): Signal | null {
    try {
      const lumberData = marketData['WOOD']; // Primary lumber proxy
      const goldData = marketData['GLD'];
      
      if (!lumberData || !goldData) {
        console.warn('Missing WOOD or GLD data for lumber/gold signal');
        return null;
      }

      const lumberPrices = lumberData.map(d => d.close);
      const goldPrices = goldData.map(d => d.close);

      return LumberGoldSignalCalculator.calculateLumberGoldSignal(lumberPrices, goldPrices);
    } catch (error) {
      console.error('Error calculating lumber/gold signal:', error);
      return null;
    }
  }

  /**
   * Calculate Treasury Curve Signal
   */
  private static calculateTreasuryCurveSignal(
    marketData: Record<string, MarketData[]>
  ): Signal | null {
    try {
      const ty10Data = marketData['IEF']; // 10-year Treasury ETF
      const ty30Data = marketData['TLT']; // 30-year Treasury ETF
      
      if (!ty10Data || !ty30Data) {
        console.warn('Missing IEF or TLT data for treasury curve signal');
        return null;
      }

      const ty10Prices = ty10Data.map(d => d.close);
      const ty30Prices = ty30Data.map(d => d.close);

      return TreasuryCurveSignalCalculator.calculateTreasuryCurveSignal(ty10Prices, ty30Prices);
    } catch (error) {
      console.error('Error calculating treasury curve signal:', error);
      return null;
    }
  }

  /**
   * Calculate VIX Defensive Signal
   */
  private static calculateVixDefensiveSignal(
    marketData: Record<string, MarketData[]>
  ): Signal | null {
    try {
      const vixData = marketData['^VIX'];
      
      if (!vixData) {
        console.warn('Missing VIX data for VIX defensive signal');
        return null;
      }

      const vixPrices = vixData.map(d => d.close);

      const signal = VixDefensiveSignalCalculator.calculateVixDefensiveSignal(vixPrices);
      
      // Fix signal type to match interface
      if (signal) {
        return {
          ...signal,
          type: 'vix_defensive'
        } as Signal;
      }
      
      return signal;
    } catch (error) {
      console.error('Error calculating VIX defensive signal:', error);
      return null;
    }
  }

  /**
   * Calculate S&P 500 Moving Average Signal
   */
  private static calculateSP500MASignal(
    marketData: Record<string, MarketData[]>
  ): Signal | null {
    try {
      const spyData = marketData['SPY'];
      
      if (!spyData) {
        console.warn('Missing SPY data for S&P 500 MA signal');
        return null;
      }

      const spyPrices = spyData.map(d => d.close);

      return SP500MovingAverageSignalCalculator.calculateSP500MASignal(spyPrices);
    } catch (error) {
      console.error('Error calculating S&P 500 MA signal:', error);
      return null;
    }
  }

  /**
   * Validate market data completeness for signal calculations
   * @param marketData Market data record
   * @returns Validation result with missing symbols and data quality info
   */
  public static validateMarketData(
    marketData: Record<string, MarketData[]>
  ): {
    isValid: boolean;
    missingSymbols: string[];
    dataQuality: Record<string, { length: number; hasGaps: boolean; latestDate: string }>;
    warnings: string[];
  } {
    const requiredSymbols = this.getRequiredSymbols();
    const missingSymbols: string[] = [];
    const dataQuality: Record<string, { length: number; hasGaps: boolean; latestDate: string }> = {};
    const warnings: string[] = [];

    // Check for missing symbols
    requiredSymbols.forEach(symbol => {
      if (!marketData[symbol] || marketData[symbol].length === 0) {
        missingSymbols.push(symbol);
      } else {
        const data = marketData[symbol];
        const length = data.length;
        const latestDate = data[data.length - 1]?.date || 'unknown';
        
        // Simple gap detection (check for null/zero prices)
        const hasGaps = data.some(d => !d.close || d.close <= 0);
        
        dataQuality[symbol] = { length, hasGaps, latestDate };
        
        // Add warnings for data quality issues
        if (length < 250) {
          warnings.push(`${symbol}: Insufficient data (${length} points, need 250+ for reliable signals)`);
        }
        if (hasGaps) {
          warnings.push(`${symbol}: Data contains gaps or invalid prices`);
        }
      }
    });

    return {
      isValid: missingSymbols.length === 0,
      missingSymbols,
      dataQuality,
      warnings
    };
  }

  /**
   * SAFLA-Enhanced Signal Calculation with Comprehensive Safety Validation
   * 
   * This method provides production-ready signal calculation with full safety validation,
   * circuit breakers, audit logging, and fallback mechanisms.
   * 
   * @param marketData Market data for all required symbols
   * @param config Optional SAFLA validation configuration
   * @param enableSafetyMode Whether to use safe defaults on validation failures
   * @returns Promise resolving to signals, consensus, and comprehensive safety report
   */
  public static async calculateSignalsWithSafety(
    marketData: Record<string, MarketData[]>,
    config?: Partial<ValidationConfig>,
    enableSafetyMode: boolean = true
  ): Promise<{
    signals: (Signal | null)[];
    consensus: ConsensusSignal;
    safetyReport: SafetyReport;
    usedSafeDefaults: boolean;
  }> {
    const validator = SAFLAValidator.getInstance(config);
    let signals: (Signal | null)[] = [];
    let consensus: ConsensusSignal;
    let usedSafeDefaults = false;

    try {
      // Step 1: Calculate signals using existing logic
      signals = this.calculateAllSignals(marketData);
      consensus = this.calculateConsensusSignal(signals);

      // Step 2: Comprehensive safety validation
      const safetyReport = await validator.validateComprehensive(marketData, signals, consensus);

      // Step 3: Handle safety issues
      if (safetyReport.overallStatus === 'unsafe') {
        if (enableSafetyMode) {
          console.warn('SAFLA: Unsafe conditions detected, using safe defaults');
          const safeDefaults = validator.getSafeDefaults();
          signals = safeDefaults.signals;
          consensus = safeDefaults.consensus;
          usedSafeDefaults = true;

          // Log safety override
          console.warn('SAFLA Safety Override:', {
            riskScore: safetyReport.riskScore,
            criticalIssues: safetyReport.validationResults.filter(r => r.severity === 'critical').length,
            recommendations: safetyReport.recommendations
          });
        } else {
          // Throw error when safety mode is disabled and validation fails
          const criticalIssues = safetyReport.validationResults.filter(r => r.severity === 'critical' || r.severity === 'error');
          throw new Error(`SAFLA validation failed with ${criticalIssues.length} critical issues. Safety mode disabled.`);
        }
      }

      return {
        signals,
        consensus,
        safetyReport,
        usedSafeDefaults
      };

    } catch (error) {
      console.error('SAFLA: Critical error in signal calculation:', error);
      
      if (enableSafetyMode) {
        const safeDefaults = validator.getSafeDefaults();
        const emergencyReport: SafetyReport = {
          overallStatus: 'unsafe',
          validationResults: [{
            isValid: false,
            severity: 'critical',
            category: 'data_integrity',
            message: `Critical system error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date().toISOString(),
            correctionSuggestion: 'Investigate system integrity and data sources'
          }],
          circuitBreakerStatus: 'inactive',
          riskScore: 100,
          recommendations: ['Emergency system review required'],
          auditTrail: []
        };

        return {
          signals: safeDefaults.signals,
          consensus: safeDefaults.consensus,
          safetyReport: emergencyReport,
          usedSafeDefaults: true
        };
      } else {
        throw error;
      }
    }
  }

  /**
   * Quick Safety Validation
   * 
   * Performs rapid data integrity checks without full SAFLA validation.
   * Useful for high-frequency validation scenarios.
   * 
   * @param marketData Market data to validate
   * @returns Basic validation results
   */
  public static quickSafetyCheck(marketData: Record<string, MarketData[]>): {
    isValid: boolean;
    criticalIssues: number;
    warnings: number;
    summary: string;
  } {
    try {
      const validator = SAFLAValidator.getInstance();
      const results = validator.validateDataIntegrity(marketData);
      
      const criticalIssues = results.filter(r => r.severity === 'critical' || r.severity === 'error').length;
      const warnings = results.filter(r => r.severity === 'warning').length;
      const isValid = criticalIssues === 0;

      let summary: string;
      if (criticalIssues > 0) {
        summary = `${criticalIssues} critical issues detected`;
      } else if (warnings > 0) {
        summary = `Data validation passed with ${warnings} warnings`;
      } else {
        summary = 'Data validation passed';
      }

      return {
        isValid,
        criticalIssues,
        warnings,
        summary
      };
    } catch (error) {
      return {
        isValid: false,
        criticalIssues: 1,
        warnings: 0,
        summary: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Production-Ready Signal Orchestration
   * 
   * Main entry point for production systems. Combines all safety features:
   * - Comprehensive SAFLA validation
   * - Circuit breaker protection
   * - Rate limiting
   * - Audit logging
   * - Automatic fallbacks
   * 
   * @param marketData Market data for all required symbols
   * @param options Configuration options
   * @returns Production-ready signal results with safety guarantees
   */
  public static async orchestrateSignalsProduction(
    marketData: Record<string, MarketData[]>,
    options: {
      safetyConfig?: Partial<ValidationConfig>;
      enableFallbacks?: boolean;
      logLevel?: 'error' | 'warn' | 'info' | 'debug';
      maxRetries?: number;
    } = {}
  ): Promise<{
    signals: (Signal | null)[];
    consensus: ConsensusSignal;
    metadata: {
      safetyReport: SafetyReport;
      usedSafeDefaults: boolean;
      retryCount: number;
      processingTime: number;
      dataQuality: Record<string, unknown>;
    };
  }> {
    const startTime = Date.now();
    const {
      safetyConfig,
      enableFallbacks = true,
      logLevel = 'warn',
      maxRetries = 2
    } = options;

    let retryCount = 0;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Pre-validation quick check
        const quickCheck = this.quickSafetyCheck(marketData);
        if (logLevel === 'debug' || (logLevel === 'info' && !quickCheck.isValid)) {
          console.log(`SAFLA Quick Check: ${quickCheck.summary}`);
        }

        // Full signal calculation with safety
        const result = await this.calculateSignalsWithSafety(
          marketData,
          safetyConfig,
          enableFallbacks
        );

        // Success - return results with metadata
        const processingTime = Date.now() - startTime;
        const dataQuality = this.assessDataQuality(marketData);

        if (logLevel === 'debug' || (logLevel === 'info' && result.usedSafeDefaults)) {
          console.log(`SAFLA Production Orchestration completed:`, {
            processingTime,
            safetyStatus: result.safetyReport.overallStatus,
            usedSafeDefaults: result.usedSafeDefaults,
            retryCount
          });
        }

        return {
          signals: result.signals,
          consensus: result.consensus,
          metadata: {
            safetyReport: result.safetyReport,
            usedSafeDefaults: result.usedSafeDefaults,
            retryCount,
            processingTime,
            dataQuality
          }
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        retryCount = attempt;
        
        if (logLevel !== 'error') {
          console.warn(`SAFLA: Attempt ${attempt + 1} failed:`, lastError.message);
        }

        // Don't retry on circuit breaker or rate limit errors
        if (lastError.name === 'SAFLACircuitBreakerError' || lastError.name === 'SAFLARateLimitError') {
          break;
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    // All retries failed
    if (enableFallbacks) {
      console.error(`SAFLA: All attempts failed, using emergency fallbacks. Last error:`, lastError?.message);
      
      const validator = SAFLAValidator.getInstance(safetyConfig);
      const safeDefaults = validator.getSafeDefaults();
      const processingTime = Date.now() - startTime;

      const emergencyReport: SafetyReport = {
        overallStatus: 'unsafe',
        validationResults: [{
          isValid: false,
          severity: 'critical',
          category: 'data_integrity',
          message: `Production orchestration failed after ${maxRetries + 1} attempts: ${lastError?.message}`,
          timestamp: new Date().toISOString(),
          correctionSuggestion: 'Emergency system review and potential data source investigation required'
        }],
        circuitBreakerStatus: 'inactive',
        riskScore: 100,
        recommendations: ['Immediate system review required', 'Check data sources and connectivity'],
        auditTrail: []
      };

      return {
        signals: safeDefaults.signals,
        consensus: safeDefaults.consensus,
        metadata: {
          safetyReport: emergencyReport,
          usedSafeDefaults: true,
          retryCount,
          processingTime,
          dataQuality: {}
        }
      };
    } else {
      throw lastError || new Error('Production orchestration failed');
    }
  }

  /**
   * Assess overall data quality for metadata
   */
  private static assessDataQuality(marketData: Record<string, MarketData[]>): Record<string, unknown> {
    const requiredSymbols = this.getRequiredSymbols();
    const symbolCoverage = Object.keys(marketData).filter(symbol => 
      requiredSymbols.includes(symbol) && marketData[symbol].length > 0
    ).length / requiredSymbols.length;

    let totalDataPoints = 0;
    let validDataPoints = 0;
    let latestTimestamp = 0;

    Object.values(marketData).forEach(data => {
      data.forEach(point => {
        totalDataPoints++;
        if (point.close > 0 && isFinite(point.close) && !isNaN(point.close)) {
          validDataPoints++;
        }
        const timestamp = new Date(point.date).getTime();
        if (timestamp > latestTimestamp) {
          latestTimestamp = timestamp;
        }
      });
    });

    const dataIntegrity = totalDataPoints > 0 ? validDataPoints / totalDataPoints : 0;
    const dataFreshness = latestTimestamp > 0 ? (Date.now() - latestTimestamp) / (1000 * 60 * 60) : 999; // Hours

    return {
      symbolCoverage,
      dataIntegrity,
      dataFreshness: Math.round(dataFreshness * 10) / 10,
      totalDataPoints,
      validDataPoints,
      latestDataTimestamp: new Date(latestTimestamp).toISOString()
    };
  }
}

// Re-export individual calculators for direct access if needed
export {
  GayedSignalCalculator,
  LumberGoldSignalCalculator,  
  TreasuryCurveSignalCalculator,
  VixDefensiveSignalCalculator,
  SP500MovingAverageSignalCalculator
};

// Export types for convenience
export type { Signal, ConsensusSignal, MarketData } from '../types';