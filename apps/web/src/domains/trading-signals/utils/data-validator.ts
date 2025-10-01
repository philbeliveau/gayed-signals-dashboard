/**
 * Signal Data Validator
 *
 * Validates that all trading signals use REAL data only.
 * Enforces "REAL DATA ONLY" policy from CLAUDE.md
 *
 * - NO SYNTHETIC DATA
 * - NO FALLBACK DATA
 * - NO ESTIMATIONS
 * - Explicit transparency when data unavailable
 */

import type { MarketData, Signal } from '../types';

export interface DataProvenanceRecord {
  source: 'yahoo-finance' | 'fred-api' | 'tiingo' | 'unknown';
  symbol: string;
  fetchedAt: Date;
  apiSuccess: boolean;
  dataPoints: number;
  validationPassed: boolean;
  errorMessage?: string;
}

export interface DataIntegrityReport {
  valid: boolean;
  provenance: DataProvenanceRecord[];
  issues: string[];
  warnings: string[];
  confidenceImpact: number; // 0-100, reduction in confidence due to missing data
  missingDataSources: string[];
  timestamp: Date;
}

export interface SignalValidationResult {
  signalType: string;
  dataIntegrityValid: boolean;
  hasRealDataSource: boolean;
  hasSyntheticMarkers: boolean;
  confidenceScore: number;
  issues: string[];
  metadata: Record<string, unknown>;
}

export class SignalDataValidator {
  private static readonly MINIMUM_DATA_POINTS = {
    'utilities_spy': 22,   // 21 lookback + 1
    'lumber_gold': 92,     // 91 lookback + 1
    'treasury_curve': 22,
    'vix_defensive': 22,
    'sp500_ma': 201        // 200 MA + 1
  };

  private static readonly REQUIRED_SYMBOLS_BY_SIGNAL: Record<string, string[]> = {
    'utilities_spy': ['SPY', 'XLU'],
    'lumber_gold': ['WOOD', 'GLD'],
    'treasury_curve': ['IEF', 'TLT'],
    'vix_defensive': ['^VIX', 'SPY'],
    'sp500_ma': ['SPY']
  };

  /**
   * Validates that market data comes from real sources only
   * NO SYNTHETIC DATA ALLOWED
   */
  static validateDataIntegrity(
    marketData: Record<string, MarketData[]>,
    requiredSymbols?: string[]
  ): DataIntegrityReport {
    const issues: string[] = [];
    const warnings: string[] = [];
    const provenance: DataProvenanceRecord[] = [];
    const missingDataSources: string[] = [];
    let confidenceImpact = 0;

    const symbolsToCheck = requiredSymbols || ['SPY', 'XLU', 'WOOD', 'GLD', 'IEF', 'TLT', '^VIX'];

    // Check each required symbol
    for (const symbol of symbolsToCheck) {
      if (!marketData[symbol] || marketData[symbol].length === 0) {
        issues.push(`❌ Missing real data for ${symbol} - API may have failed`);
        missingDataSources.push(symbol);
        confidenceImpact += 15; // Each missing symbol reduces confidence by 15%

        provenance.push({
          source: 'unknown',
          symbol,
          fetchedAt: new Date(),
          apiSuccess: false,
          dataPoints: 0,
          validationPassed: false,
          errorMessage: 'No data available'
        });
      } else {
        const data = marketData[symbol];
        const validation = this.validatePriceData(data);

        provenance.push({
          source: 'yahoo-finance',
          symbol,
          fetchedAt: new Date(),
          apiSuccess: true,
          dataPoints: data.length,
          validationPassed: validation.valid,
          errorMessage: validation.valid ? undefined : validation.error
        });

        if (!validation.valid) {
          issues.push(`❌ Invalid price data for ${symbol}: ${validation.error}`);
          confidenceImpact += 10;
        }

        // Check for synthetic data markers
        if (this.containsSyntheticMarkers(data)) {
          issues.push(`❌ SYNTHETIC DATA DETECTED in ${symbol} - POLICY VIOLATION`);
          confidenceImpact += 25;
        }

        // Warn if insufficient data points
        if (data.length < 252) { // Less than 1 year of trading days
          warnings.push(`⚠️ Insufficient historical data for ${symbol}: ${data.length} points (recommended: 252+)`);
          confidenceImpact += 5;
        }
      }
    }

    // Cap confidence impact at 100%
    confidenceImpact = Math.min(confidenceImpact, 100);

    return {
      valid: issues.length === 0,
      provenance,
      issues,
      warnings,
      confidenceImpact,
      missingDataSources,
      timestamp: new Date()
    };
  }

  /**
   * Validate individual signal for data integrity
   */
  static validateSignal(signal: Signal, marketData: Record<string, MarketData[]>): SignalValidationResult {
    const issues: string[] = [];
    const requiredSymbols = this.REQUIRED_SYMBOLS_BY_SIGNAL[signal.type] || [];
    const minimumDataPoints = this.MINIMUM_DATA_POINTS[signal.type as keyof typeof this.MINIMUM_DATA_POINTS] || 22;

    // Check if signal has required data sources
    let hasRealDataSource = true;
    for (const symbol of requiredSymbols) {
      if (!marketData[symbol] || marketData[symbol].length < minimumDataPoints) {
        hasRealDataSource = false;
        issues.push(`Missing sufficient data for ${symbol} (need ${minimumDataPoints} points)`);
      }
    }

    // Check for synthetic markers in metadata
    const hasSyntheticMarkers = signal.metadata && 'synthetic' in signal.metadata;
    if (hasSyntheticMarkers) {
      issues.push('Signal metadata contains synthetic data markers');
    }

    // Validate confidence score consistency
    if (signal.confidence < 0 || signal.confidence > 1) {
      issues.push(`Invalid confidence score: ${signal.confidence} (must be 0-1)`);
    }

    // Check if signal was calculated with insufficient data
    if (!hasRealDataSource && signal.confidence > 0.3) {
      issues.push('Confidence too high for signal with missing data sources');
    }

    return {
      signalType: signal.type,
      dataIntegrityValid: issues.length === 0,
      hasRealDataSource,
      hasSyntheticMarkers,
      confidenceScore: signal.confidence,
      issues,
      metadata: signal.metadata || {}
    };
  }

  /**
   * Validate multiple signals and generate comprehensive report
   */
  static validateSignals(
    signals: Signal[],
    marketData: Record<string, MarketData[]>
  ): {
    allValid: boolean;
    signalResults: SignalValidationResult[];
    overallIntegrity: DataIntegrityReport;
    summary: string;
  } {
    const signalResults = signals.map(signal => this.validateSignal(signal, marketData));
    const overallIntegrity = this.validateDataIntegrity(marketData);

    const allValid = signalResults.every(r => r.dataIntegrityValid) && overallIntegrity.valid;

    const summary = this.generateValidationSummary(signalResults, overallIntegrity);

    return {
      allValid,
      signalResults,
      overallIntegrity,
      summary
    };
  }

  /**
   * Validate price data for authenticity and quality
   */
  private static validatePriceData(data: MarketData[]): { valid: boolean; error?: string } {
    if (!Array.isArray(data)) {
      return { valid: false, error: 'Data is not an array' };
    }

    if (data.length === 0) {
      return { valid: false, error: 'Data array is empty' };
    }

    // Check each data point
    for (let i = 0; i < data.length; i++) {
      const point = data[i];

      // Required fields
      if (!point.date) {
        return { valid: false, error: `Missing date field at index ${i}` };
      }

      if (!point.symbol) {
        return { valid: false, error: `Missing symbol field at index ${i}` };
      }

      if (typeof point.close !== 'number') {
        return { valid: false, error: `Invalid close price at index ${i}` };
      }

      // Validate price sanity
      if (point.close <= 0 || !isFinite(point.close)) {
        return { valid: false, error: `Invalid price value at index ${i}: ${point.close}` };
      }

      // Check for NaN
      if (isNaN(point.close)) {
        return { valid: false, error: `NaN price detected at index ${i}` };
      }
    }

    return { valid: true };
  }

  /**
   * Detect synthetic data patterns
   *
   * Real market data has natural characteristics:
   * - Price variance matches market volatility
   * - Dates are sequential trading days (no weekends/holidays on weekdays)
   * - Volume exists and varies
   * - Prices don't follow perfect mathematical patterns
   */
  private static containsSyntheticMarkers(data: MarketData[]): boolean {
    if (data.length < 10) {
      return false; // Too little data to determine
    }

    // Check 1: Suspiciously low variance (synthetic data often too uniform)
    const prices = data.map(d => d.close);
    const variance = this.calculateVariance(prices);
    const meanPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const coefficientOfVariation = Math.sqrt(variance) / meanPrice;

    // Real market data typically has CV > 0.001
    if (coefficientOfVariation < 0.0001) {
      console.warn('⚠️ Suspiciously low price variance detected - possible synthetic data');
      return true;
    }

    // Check 2: Perfect mathematical patterns (e.g., linear progression)
    const isPerfectLinear = this.checkPerfectLinearPattern(prices);
    if (isPerfectLinear) {
      console.warn('⚠️ Perfect linear pattern detected - possible synthetic data');
      return true;
    }

    // Check 3: Missing volume data (real market data should have volume)
    const hasVolume = data.some(d => d.volume && d.volume > 0);
    if (!hasVolume) {
      console.warn('⚠️ No volume data detected - possible synthetic data');
      return true;
    }

    return false;
  }

  /**
   * Calculate variance of price array
   */
  private static calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    return squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Check if prices follow a perfect linear pattern (synthetic indicator)
   */
  private static checkPerfectLinearPattern(prices: number[]): boolean {
    if (prices.length < 5) return false;

    // Calculate differences between consecutive prices
    const diffs: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      diffs.push(prices[i] - prices[i - 1]);
    }

    // Check if differences are suspiciously consistent
    const diffVariance = this.calculateVariance(diffs);
    const meanDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;

    // If variance of differences is near zero, it's a perfect linear pattern
    if (Math.abs(meanDiff) > 0.01 && diffVariance < 0.0001) {
      return true;
    }

    return false;
  }

  /**
   * Generate human-readable validation summary
   */
  private static generateValidationSummary(
    signalResults: SignalValidationResult[],
    overallIntegrity: DataIntegrityReport
  ): string {
    const lines: string[] = [];

    lines.push('=== SIGNAL DATA INTEGRITY VALIDATION ===\n');

    // Overall status
    if (overallIntegrity.valid && signalResults.every(r => r.dataIntegrityValid)) {
      lines.push('✅ STATUS: ALL VALIDATIONS PASSED\n');
    } else {
      lines.push('❌ STATUS: VALIDATION FAILURES DETECTED\n');
    }

    // Data sources
    lines.push('📊 DATA SOURCES:');
    overallIntegrity.provenance.forEach(p => {
      const status = p.apiSuccess ? '✅' : '❌';
      lines.push(`  ${status} ${p.symbol}: ${p.dataPoints} points from ${p.source}`);
    });

    // Issues
    if (overallIntegrity.issues.length > 0) {
      lines.push('\n❌ ISSUES:');
      overallIntegrity.issues.forEach(issue => lines.push(`  ${issue}`));
    }

    // Warnings
    if (overallIntegrity.warnings.length > 0) {
      lines.push('\n⚠️ WARNINGS:');
      overallIntegrity.warnings.forEach(warning => lines.push(`  ${warning}`));
    }

    // Missing data impact
    if (overallIntegrity.missingDataSources.length > 0) {
      lines.push(`\n⚠️ CONFIDENCE IMPACT: -${overallIntegrity.confidenceImpact}%`);
      lines.push(`Missing data sources: ${overallIntegrity.missingDataSources.join(', ')}`);
    }

    // Signal-specific results
    lines.push('\n📈 SIGNAL VALIDATION:');
    signalResults.forEach(result => {
      const status = result.dataIntegrityValid ? '✅' : '❌';
      lines.push(`  ${status} ${result.signalType}: confidence=${result.confidenceScore.toFixed(2)}`);
      if (result.issues.length > 0) {
        result.issues.forEach(issue => lines.push(`      - ${issue}`));
      }
    });

    return lines.join('\n');
  }

  /**
   * Check if FRED API is available and returning real data
   */
  static async validateFREDConnection(fredApiKey?: string): Promise<{
    connected: boolean;
    message: string;
    testSeriesData?: { date: string; value: number }[];
  }> {
    try {
      const { FREDAPIClient, EMPLOYMENT_SERIES } = await import('@/domains/market-data/services/fred-api-client');

      if (!fredApiKey && !process.env.FRED_API_KEY) {
        return {
          connected: false,
          message: '❌ FRED_API_KEY not configured - economic data unavailable'
        };
      }

      const client = new FREDAPIClient({ apiKey: fredApiKey || process.env.FRED_API_KEY! });
      const testData = await client.getSeriesObservations(EMPLOYMENT_SERIES.UNEMPLOYMENT_RATE, { limit: 5 });

      if (!testData || testData.length === 0) {
        return {
          connected: false,
          message: '❌ FRED API connected but returned no data'
        };
      }

      return {
        connected: true,
        message: `✅ FRED API connected - retrieved ${testData.length} test data points`,
        testSeriesData: testData.map(d => ({
          date: d.date,
          value: typeof d.value === 'number' ? d.value : parseFloat(d.value as string)
        }))
      };

    } catch (error) {
      return {
        connected: false,
        message: `❌ FRED API connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}
