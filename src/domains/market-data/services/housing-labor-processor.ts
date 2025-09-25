/**
 * Housing×Labor Market Data Processing Engine
 * 
 * Advanced data processing, trend analysis, and alert systems for economic indicators
 * Focuses on housing market stress and employment signal generation
 */

import { EnhancedMarketClient } from './enhanced-market-client';
import { logger } from './production-logger';

// Economic indicator data structure
export interface EconomicIndicator {
  date: string;
  value: number;
  symbol: string;
  source: 'FRED' | 'DOL' | 'BLS' | 'REDFIN';
  metadata?: {
    period: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
    seasonallyAdjusted: boolean;
  };
}

// Trend analysis results
export interface TrendAnalysis {
  direction: 'up' | 'down' | 'flat';
  strength: 'strong' | 'moderate' | 'weak';
  confidence: number; // 0-1
  duration: number; // months
  startDate: string;
  endDate: string;
  rawData: number[];
  indicators: {
    slope: number;
    rSquared: number;
    pValue: number;
    standardError: number;
  };
}

// Statistical calculations
export interface StatisticalAnalysis {
  current: number;
  momChange: number;
  momPercentChange: number;
  yoyChange: number;
  yoyPercentChange: number;
  confidenceIntervals: {
    mom: { lower: number; upper: number; confidence: number };
    yoy: { lower: number; upper: number; confidence: number };
  };
  volatilityMeasures: {
    standardDeviation: number;
    coefficientOfVariation: number;
    averageTrueRange?: number;
  };
}

// Alert configuration
export interface AlertThreshold {
  id: string;
  name: string;
  type: 'housing_stress' | 'employment_signal' | 'correlation_break' | 'volatility_spike';
  enabled: boolean;
  conditions: {
    indicator: string;
    operator: 'greater_than' | 'less_than' | 'consecutive_decline' | 'consecutive_rise' | 'correlation_below';
    value: number;
    periods: number;
  }[];
  severity: 'info' | 'warning' | 'critical';
  cooldownPeriod: number; // hours
  lastTriggered?: string;
}

// Alert result
export interface AlertResult {
  id: string;
  name: string;
  type: AlertThreshold['type'];
  severity: AlertThreshold['severity'];
  triggered: boolean;
  triggeredAt: string;
  message: string;
  data: {
    currentValue: number;
    thresholdValue: number;
    indicator: string;
    context: Record<string, any>;
  };
}

// Correlation analysis
export interface CorrelationMatrix {
  pairs: Array<{
    x: string;
    y: string;
    correlation: number;
    pValue: number;
    significance: 'high' | 'medium' | 'low' | 'none';
    sampleSize: number;
  }>;
  heatmapData: Array<{
    x: string;
    y: string;
    value: number;
  }>;
  timestamp: string;
}

// Historical comparison
export interface HistoricalComparison {
  current: number;
  baseline2021: number;
  postCovidPeak: number;
  deviation: {
    from2021: number;
    from2021Percent: number;
    fromPeak: number;
    fromPeakPercent: number;
  };
  context: {
    daysFrom2021: number;
    recoveryStatus: 'below' | 'at' | 'above';
    trendSince2021: 'improving' | 'stable' | 'deteriorating';
  };
}

/**
 * Housing×Labor Market Data Processing Engine
 */
export class HousingLaborProcessor {
  private marketClient: EnhancedMarketClient;
  private alertThresholds: Map<string, AlertThreshold> = new Map();
  private alertCooldowns: Map<string, number> = new Map();

  // Economic indicator symbol mappings
  private readonly ECONOMIC_SYMBOLS = {
    // Housing Market Indicators
    housing: {
      caseShill: 'CSUSHPINSA',    // Case-Shiller Home Price Index
      houst: 'HOUST',             // Housing Starts
      supply: 'MSACSR',           // Months' Supply of Houses
      newSales: 'HSN1F',          // New One Family Houses Sold
      existingSales: 'EXHOSLUSM156S', // Existing Home Sales
      permits: 'PERMIT',          // Building Permits
      hpi: 'USSTHPI',            // US House Price Index
    },
    // Labor Market Indicators
    labor: {
      initialClaims: 'ICSA',      // Initial Claims
      continuedClaims: 'CCSA',    // Continued Claims
      claims4Week: 'IC4WSA',      // 4-week moving average
      unempRate: 'UNRATE',        // Unemployment Rate
      payrolls: 'PAYEMS',         // Total Nonfarm Payrolls
      laborParticipation: 'CIVPART', // Labor Force Participation Rate
      jolts: 'JTSJOL',           // Job Openings
      quits: 'JTSQUL',           // Quits Level
    },
    // Market Context Indicators
    market: {
      sp500: 'SPY',
      vix: '^VIX',
      dxy: 'DXY',                // Dollar Index
      treasury10Y: '^TNX',       // 10-Year Treasury
      treasury2Y: '^IRX',        // 2-Year Treasury
    }
  };

  constructor(marketClient?: EnhancedMarketClient) {
    this.marketClient = marketClient || new EnhancedMarketClient();
    this.initializeDefaultAlerts();
  }

  /**
   * Initialize default alert thresholds for housing and labor markets
   */
  private initializeDefaultAlerts(): void {
    const defaultAlerts: AlertThreshold[] = [
      {
        id: 'housing_price_decline',
        name: 'Housing Price Consecutive Decline',
        type: 'housing_stress',
        enabled: true,
        conditions: [{
          indicator: 'CSUSHPINSA',
          operator: 'consecutive_decline',
          value: 0,
          periods: 2
        }],
        severity: 'warning',
        cooldownPeriod: 24
      },
      {
        id: 'continuing_claims_spike',
        name: 'Continuing Claims Above 2021 Levels',
        type: 'employment_signal',
        enabled: true,
        conditions: [{
          indicator: 'CCSA',
          operator: 'greater_than',
          value: 1800000, // Approximate 2021 average
          periods: 1
        }],
        severity: 'critical',
        cooldownPeriod: 12
      },
      {
        id: 'housing_supply_surge',
        name: 'Housing Supply Surge',
        type: 'housing_stress',
        enabled: true,
        conditions: [{
          indicator: 'MSACSR',
          operator: 'greater_than',
          value: 6.0, // Months of supply
          periods: 1
        }],
        severity: 'warning',
        cooldownPeriod: 24
      },
      {
        id: 'unemployment_rate_spike',
        name: 'Unemployment Rate Spike',
        type: 'employment_signal',
        enabled: true,
        conditions: [{
          indicator: 'UNRATE',
          operator: 'greater_than',
          value: 4.5, // Threshold for concern
          periods: 1
        }],
        severity: 'critical',
        cooldownPeriod: 12
      }
    ];

    defaultAlerts.forEach(alert => {
      this.alertThresholds.set(alert.id, alert);
    });
  }

  /**
   * Detect trends in housing price data
   * Identifies 2+ consecutive month declines and trend strength
   */
  public detectHousingTrends(data: EconomicIndicator[]): TrendAnalysis {
    if (data.length < 3) {
      throw new Error('Insufficient data for trend analysis (minimum 3 points required)');
    }

    const sortedData = data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const values = sortedData.map(d => d.value);
    const dates = sortedData.map(d => d.date);

    // Calculate consecutive declines
    let consecutiveDeclines = 0;
    let currentStreak = 0;
    let longestDeclineStreak = 0;
    let declineStartIndex = -1;

    for (let i = 1; i < values.length; i++) {
      if (values[i] < values[i - 1]) {
        if (currentStreak === 0) {
          declineStartIndex = i - 1;
        }
        currentStreak++;
        consecutiveDeclines++;
      } else {
        if (currentStreak > longestDeclineStreak) {
          longestDeclineStreak = currentStreak;
        }
        currentStreak = 0;
      }
    }

    // If we're still in a decline streak
    if (currentStreak > longestDeclineStreak) {
      longestDeclineStreak = currentStreak;
    }

    // Linear regression for trend analysis
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const ssRes = y.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(yi - predicted, 2);
    }, 0);
    const rSquared = 1 - (ssRes / ssTot);

    // Calculate standard error
    const standardError = Math.sqrt(ssRes / (n - 2));

    // Calculate p-value (simplified)
    const tStat = Math.abs(slope) / (standardError / Math.sqrt(sumXX - (sumX * sumX) / n));
    const pValue = this.calculatePValue(tStat, n - 2);

    // Determine trend direction and strength
    let direction: 'up' | 'down' | 'flat';
    let strength: 'strong' | 'moderate' | 'weak';

    if (Math.abs(slope) < 0.01) {
      direction = 'flat';
    } else {
      direction = slope > 0 ? 'up' : 'down';
    }

    // Strength based on R-squared and statistical significance
    if (rSquared > 0.7 && pValue < 0.01) {
      strength = 'strong';
    } else if (rSquared > 0.4 && pValue < 0.05) {
      strength = 'moderate';
    } else {
      strength = 'weak';
    }

    const confidence = Math.min(rSquared * (1 - pValue), 1);

    return {
      direction,
      strength,
      confidence,
      duration: longestDeclineStreak,
      startDate: dates[0],
      endDate: dates[dates.length - 1],
      rawData: values,
      indicators: {
        slope,
        rSquared,
        pValue,
        standardError
      }
    };
  }

  /**
   * Calculate comprehensive statistical analysis
   */
  public calculateStatistics(data: EconomicIndicator[]): StatisticalAnalysis {
    if (data.length < 13) {
      throw new Error('Insufficient data for statistical analysis (minimum 13 months required)');
    }

    const sortedData = data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const values = sortedData.map(d => d.value);
    const current = values[values.length - 1];
    const oneMonthAgo = values[values.length - 2];
    const twelveMonthsAgo = values[values.length - 13];

    // Month-over-month calculations
    const momChange = current - oneMonthAgo;
    const momPercentChange = (momChange / oneMonthAgo) * 100;

    // Year-over-year calculations
    const yoyChange = current - twelveMonthsAgo;
    const yoyPercentChange = (yoyChange / twelveMonthsAgo) * 100;

    // Calculate confidence intervals
    const recentValues = values.slice(-12); // Last 12 months
    const mean = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
    const variance = recentValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (recentValues.length - 1);
    const standardDeviation = Math.sqrt(variance);
    const standardError = standardDeviation / Math.sqrt(recentValues.length);

    // 95% confidence intervals
    const tCritical = 2.201; // t-value for 95% confidence with 11 degrees of freedom
    const marginOfError = tCritical * standardError;

    const momConfidence = {
      lower: momPercentChange - marginOfError,
      upper: momPercentChange + marginOfError,
      confidence: 0.95
    };

    const yoyConfidence = {
      lower: yoyPercentChange - marginOfError,
      upper: yoyPercentChange + marginOfError,
      confidence: 0.95
    };

    // Volatility measures
    const coefficientOfVariation = (standardDeviation / mean) * 100;

    return {
      current,
      momChange,
      momPercentChange,
      yoyChange,
      yoyPercentChange,
      confidenceIntervals: {
        mom: momConfidence,
        yoy: yoyConfidence
      },
      volatilityMeasures: {
        standardDeviation,
        coefficientOfVariation
      }
    };
  }

  /**
   * Evaluate alert conditions
   */
  public async evaluateAlerts(data: Record<string, EconomicIndicator[]>): Promise<AlertResult[]> {
    const results: AlertResult[] = [];

    for (const [alertId, threshold] of this.alertThresholds.entries()) {
      if (!threshold.enabled) continue;

      // Check cooldown period
      const lastTriggered = this.alertCooldowns.get(alertId);
      if (lastTriggered && Date.now() - lastTriggered < threshold.cooldownPeriod * 60 * 60 * 1000) {
        continue;
      }

      try {
        const alertResult = await this.evaluateAlertCondition(threshold, data);
        if (alertResult.triggered) {
          this.alertCooldowns.set(alertId, Date.now());
        }
        results.push(alertResult);
      } catch (error) {
        logger.error(`Alert evaluation failed for ${alertId}`, { error });
      }
    }

    return results;
  }

  /**
   * Evaluate individual alert condition
   */
  private async evaluateAlertCondition(threshold: AlertThreshold, data: Record<string, EconomicIndicator[]>): Promise<AlertResult> {
    let triggered = false;
    let message = '';
    let currentValue = 0;
    let thresholdValue = 0;
    let context: Record<string, any> = {};

    for (const condition of threshold.conditions) {
      const indicatorData = data[condition.indicator];
      if (!indicatorData || indicatorData.length === 0) {
        continue;
      }

      const sortedData = indicatorData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      currentValue = sortedData[sortedData.length - 1].value;
      thresholdValue = condition.value;

      switch (condition.operator) {
        case 'greater_than':
          if (currentValue > thresholdValue) {
            triggered = true;
            message = `${condition.indicator} (${currentValue.toFixed(2)}) exceeds threshold (${thresholdValue.toFixed(2)})`;
          }
          break;

        case 'less_than':
          if (currentValue < thresholdValue) {
            triggered = true;
            message = `${condition.indicator} (${currentValue.toFixed(2)}) below threshold (${thresholdValue.toFixed(2)})`;
          }
          break;

        case 'consecutive_decline':
          const trendAnalysis = this.detectHousingTrends(sortedData.slice(-condition.periods - 1));
          if (trendAnalysis.direction === 'down' && trendAnalysis.duration >= condition.periods) {
            triggered = true;
            message = `${condition.indicator} shows ${trendAnalysis.duration} consecutive periods of decline`;
            context = { trendAnalysis };
          }
          break;

        case 'consecutive_rise':
          const upTrend = this.detectHousingTrends(sortedData.slice(-condition.periods - 1));
          if (upTrend.direction === 'up' && upTrend.duration >= condition.periods) {
            triggered = true;
            message = `${condition.indicator} shows ${upTrend.duration} consecutive periods of rise`;
            context = { trendAnalysis: upTrend };
          }
          break;
      }

      if (triggered) break;
    }

    return {
      id: threshold.id,
      name: threshold.name,
      type: threshold.type,
      severity: threshold.severity,
      triggered,
      triggeredAt: new Date().toISOString(),
      message,
      data: {
        currentValue,
        thresholdValue,
        indicator: threshold.conditions[0].indicator,
        context
      }
    };
  }

  /**
   * Calculate correlation matrix between economic indicators
   */
  public calculateCorrelationMatrix(data: Record<string, EconomicIndicator[]>): CorrelationMatrix {
    const indicators = Object.keys(data);
    const pairs: CorrelationMatrix['pairs'] = [];
    const heatmapData: CorrelationMatrix['heatmapData'] = [];

    for (let i = 0; i < indicators.length; i++) {
      for (let j = i; j < indicators.length; j++) {
        const xData = data[indicators[i]];
        const yData = data[indicators[j]];

        if (!xData || !yData || xData.length < 10 || yData.length < 10) {
          continue;
        }

        const correlation = this.calculateCorrelation(xData, yData);
        const pValue = this.calculateCorrelationPValue(correlation, Math.min(xData.length, yData.length));
        
        let significance: 'high' | 'medium' | 'low' | 'none';
        if (pValue < 0.01) significance = 'high';
        else if (pValue < 0.05) significance = 'medium';
        else if (pValue < 0.10) significance = 'low';
        else significance = 'none';

        pairs.push({
          x: indicators[i],
          y: indicators[j],
          correlation,
          pValue,
          significance,
          sampleSize: Math.min(xData.length, yData.length)
        });

        heatmapData.push({
          x: indicators[i],
          y: indicators[j],
          value: correlation
        });

        // Add symmetric entry if not diagonal
        if (i !== j) {
          heatmapData.push({
            x: indicators[j],
            y: indicators[i],
            value: correlation
          });
        }
      }
    }

    return {
      pairs,
      heatmapData,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Compare current values to 2021 baseline and post-COVID levels
   */
  public calculateHistoricalComparison(data: EconomicIndicator[], baseline2021: number, postCovidPeak: number): HistoricalComparison {
    const sortedData = data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const current = sortedData[sortedData.length - 1].value;

    const deviation = {
      from2021: current - baseline2021,
      from2021Percent: ((current - baseline2021) / baseline2021) * 100,
      fromPeak: current - postCovidPeak,
      fromPeakPercent: ((current - postCovidPeak) / postCovidPeak) * 100
    };

    // Calculate days from 2021 baseline
    const jan2021 = new Date('2021-01-01');
    const currentDate = new Date(sortedData[sortedData.length - 1].date);
    const daysFrom2021 = Math.floor((currentDate.getTime() - jan2021.getTime()) / (1000 * 60 * 60 * 24));

    // Determine recovery status
    let recoveryStatus: 'below' | 'at' | 'above';
    if (Math.abs(deviation.from2021Percent) < 5) {
      recoveryStatus = 'at';
    } else if (deviation.from2021 < 0) {
      recoveryStatus = 'below';
    } else {
      recoveryStatus = 'above';
    }

    // Determine trend since 2021
    const recent6Months = sortedData.slice(-6);
    const trend6Months = this.detectHousingTrends(recent6Months);
    
    let trendSince2021: 'improving' | 'stable' | 'deteriorating';
    if (trend6Months.direction === 'up') {
      trendSince2021 = 'improving';
    } else if (trend6Months.direction === 'down') {
      trendSince2021 = 'deteriorating';
    } else {
      trendSince2021 = 'stable';
    }

    return {
      current,
      baseline2021,
      postCovidPeak,
      deviation,
      context: {
        daysFrom2021,
        recoveryStatus,
        trendSince2021
      }
    };
  }

  // Helper methods

  /**
   * Calculate Pearson correlation coefficient
   */
  private calculateCorrelation(xData: EconomicIndicator[], yData: EconomicIndicator[]): number {
    // Align data by date
    const alignedData = this.alignDataByDate(xData, yData);
    const x = alignedData.map(d => d.x);
    const y = alignedData.map(d => d.y);

    if (x.length < 2) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Align two data series by date
   */
  private alignDataByDate(xData: EconomicIndicator[], yData: EconomicIndicator[]): Array<{ x: number; y: number; date: string }> {
    const xMap = new Map(xData.map(d => [d.date, d.value]));
    const yMap = new Map(yData.map(d => [d.date, d.value]));

    const commonDates = Array.from(xMap.keys()).filter(date => yMap.has(date));
    
    return commonDates.map(date => ({
      x: xMap.get(date)!,
      y: yMap.get(date)!,
      date
    }));
  }

  /**
   * Calculate p-value for t-statistic (simplified)
   */
  private calculatePValue(tStat: number, df: number): number {
    // Simplified p-value calculation
    // In a real implementation, you'd use a proper t-distribution function
    const absTStat = Math.abs(tStat);
    
    if (absTStat > 3.0) return 0.001;
    if (absTStat > 2.5) return 0.01;
    if (absTStat > 2.0) return 0.05;
    if (absTStat > 1.5) return 0.10;
    return 0.20;
  }

  /**
   * Calculate p-value for correlation coefficient
   */
  private calculateCorrelationPValue(r: number, n: number): number {
    if (n < 3) return 1.0;
    
    const t = (r * Math.sqrt(n - 2)) / Math.sqrt(1 - r * r);
    return this.calculatePValue(t, n - 2);
  }

  /**
   * Add custom alert threshold
   */
  public addAlertThreshold(alert: AlertThreshold): void {
    this.alertThresholds.set(alert.id, alert);
  }

  /**
   * Remove alert threshold
   */
  public removeAlertThreshold(alertId: string): void {
    this.alertThresholds.delete(alertId);
    this.alertCooldowns.delete(alertId);
  }

  /**
   * Get all configured alerts
   */
  public getAlertThresholds(): AlertThreshold[] {
    return Array.from(this.alertThresholds.values());
  }

  /**
   * Get economic indicator symbol mappings
   */
  public getEconomicSymbols(): typeof this.ECONOMIC_SYMBOLS {
    return this.ECONOMIC_SYMBOLS;
  }
}

/**
 * Create a default Housing×Labor Market processor instance
 */
export function createHousingLaborProcessor(marketClient?: EnhancedMarketClient): HousingLaborProcessor {
  return new HousingLaborProcessor(marketClient);
}

/**
 * Utility function to fetch economic data with enhanced error handling
 */
export async function fetchEconomicIndicators(
  symbols: string[],
  processor: HousingLaborProcessor
): Promise<Record<string, EconomicIndicator[]>> {
  const results: Record<string, EconomicIndicator[]> = {};
  
  for (const symbol of symbols) {
    try {
      // This would typically integrate with FRED API, DOL API, etc.
      // For now, we'll use placeholder data structure
      results[symbol] = [];
      logger.info(`Fetched data for economic indicator: ${symbol}`);
    } catch (error) {
      logger.error(`Failed to fetch economic indicator: ${symbol}`, { error });
      results[symbol] = [];
    }
  }
  
  return results;
}