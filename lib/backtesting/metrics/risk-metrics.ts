import {
  RiskMetrics,
  VolatilityRegime,
  StressTestResult,
  MarketData
} from '../../types';

/**
 * Risk Calculator
 * 
 * Comprehensive calculation of risk metrics for backtesting results.
 * Implements advanced risk measurement techniques including:
 * 
 * - Value at Risk (VaR) calculations
 * - Expected Shortfall (Conditional VaR)
 * - Volatility analysis and regime detection
 * - Tail risk measures
 * - Correlation and diversification metrics
 * - Stress testing scenarios
 */
export class RiskCalculator {
  
  constructor() {}

  /**
   * Calculate comprehensive risk metrics
   */
  async calculateRiskMetrics(
    returns: number[],
    marketData?: Record<string, MarketData[]>
  ): Promise<RiskMetrics> {
    
    if (returns.length === 0) {
      return this.getEmptyRiskMetrics();
    }

    // Value at Risk calculations
    const varMetrics = this.calculateVaR(returns);
    
    // Volatility analysis
    const volatilityMetrics = this.calculateVolatilityMetrics(returns);
    
    // Tail risk measures
    const tailRiskMetrics = this.calculateTailRiskMetrics(returns);
    
    // Correlation analysis (if market data available)
    const correlationMetrics = marketData ? 
      this.calculateCorrelationMetrics(returns, marketData) : {};
    
    // Volatility regime detection
    const volatilityRegimes = this.detectVolatilityRegimes(returns);
    
    // Stress test scenarios
    const stressTestResults = this.generateStressTestResults(returns);
    
    return {
      // VaR metrics
      var95: varMetrics.var95,
      var99: varMetrics.var99,
      expectedShortfall95: varMetrics.expectedShortfall95,
      expectedShortfall99: varMetrics.expectedShortfall99,
      
      // Volatility metrics
      historicalVolatility: volatilityMetrics.historicalVolatility,
      realizedVolatility: volatilityMetrics.realizedVolatility,
      volatilitySkew: volatilityMetrics.volatilitySkew,
      volatilityKurtosis: volatilityMetrics.volatilityKurtosis,
      
      // Tail risk
      skewness: tailRiskMetrics.skewness,
      kurtosis: tailRiskMetrics.kurtosis,
      tailRatio: tailRiskMetrics.tailRatio,
      
      // Correlation and diversification
      correlationToMarket: correlationMetrics.correlationToMarket,
      averageCorrelation: correlationMetrics.averageCorrelation,
      diversificationRatio: correlationMetrics.diversificationRatio,
      
      // Regime analysis
      bearMarketReturn: this.calculateBearMarketReturn(returns),
      bullMarketReturn: this.calculateBullMarketReturn(returns),
      volatilityRegimes,
      
      // Stress tests
      stressTestResults
    };
  }

  /**
   * Calculate Value at Risk metrics
   */
  private calculateVaR(returns: number[]): {
    var95: number;
    var99: number;
    expectedShortfall95: number;
    expectedShortfall99: number;
  } {
    
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const n = sortedReturns.length;
    
    // Calculate VaR at different confidence levels
    const var95Index = Math.floor(n * 0.05);
    const var99Index = Math.floor(n * 0.01);
    
    const var95 = Math.abs(sortedReturns[var95Index] || 0);
    const var99 = Math.abs(sortedReturns[var99Index] || 0);
    
    // Expected Shortfall (Conditional VaR)
    const tail95 = sortedReturns.slice(0, var95Index + 1);
    const tail99 = sortedReturns.slice(0, var99Index + 1);
    
    const expectedShortfall95 = tail95.length > 0 ? 
      Math.abs(tail95.reduce((sum, r) => sum + r, 0) / tail95.length) : 0;
    
    const expectedShortfall99 = tail99.length > 0 ? 
      Math.abs(tail99.reduce((sum, r) => sum + r, 0) / tail99.length) : 0;
    
    return {
      var95,
      var99,
      expectedShortfall95,
      expectedShortfall99
    };
  }

  /**
   * Calculate volatility metrics
   */
  private calculateVolatilityMetrics(returns: number[]): {
    historicalVolatility: number;
    realizedVolatility: number;
    volatilitySkew: number;
    volatilityKurtosis: number;
  } {
    
    // Historical volatility (standard deviation of returns)
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const historicalVolatility = Math.sqrt(variance * 252); // Annualized
    
    // Realized volatility (using squared returns)
    const squaredReturns = returns.map(r => r * r);
    const realizedVolatility = Math.sqrt(squaredReturns.reduce((sum, r) => sum + r, 0) / squaredReturns.length * 252);
    
    // Volatility of volatility (volatility skew and kurtosis)
    const rollingVolatilities = this.calculateRollingVolatilities(returns, 21);
    const volatilitySkew = this.calculateSkewness(rollingVolatilities);
    const volatilityKurtosis = this.calculateKurtosis(rollingVolatilities);
    
    return {
      historicalVolatility,
      realizedVolatility,
      volatilitySkew,
      volatilityKurtosis
    };
  }

  /**
   * Calculate tail risk metrics
   */
  private calculateTailRiskMetrics(returns: number[]): {
    skewness: number;
    kurtosis: number;
    tailRatio: number;
  } {
    
    const skewness = this.calculateSkewness(returns);
    const kurtosis = this.calculateKurtosis(returns);
    const tailRatio = this.calculateTailRatio(returns);
    
    return {
      skewness,
      kurtosis,
      tailRatio
    };
  }

  /**
   * Calculate correlation metrics
   */
  private calculateCorrelationMetrics(
    returns: number[],
    marketData: Record<string, MarketData[]>
  ): {
    correlationToMarket?: number;
    averageCorrelation?: number;
    diversificationRatio?: number;
  } {
    
    // Extract market returns (SPY as proxy)
    const marketReturns = this.extractReturnsFromMarketData(marketData['SPY'] || []);
    
    if (marketReturns.length === 0) {
      return {};
    }
    
    // Align returns
    const minLength = Math.min(returns.length, marketReturns.length);
    const alignedReturns = returns.slice(-minLength);
    const alignedMarketReturns = marketReturns.slice(-minLength);
    
    // Correlation to market
    const correlationToMarket = this.calculateCorrelation(alignedReturns, alignedMarketReturns);
    
    // For diversification ratio, we'd need multiple asset returns
    // Simplified calculation here
    const diversificationRatio = Math.sqrt(1 - Math.pow(correlationToMarket, 2));
    
    return {
      correlationToMarket,
      averageCorrelation: correlationToMarket, // Simplified
      diversificationRatio
    };
  }

  /**
   * Detect volatility regimes
   */
  private detectVolatilityRegimes(returns: number[]): VolatilityRegime[] {
    
    const rollingVolatilities = this.calculateRollingVolatilities(returns, 21);
    
    if (rollingVolatilities.length === 0) {
      return [];
    }
    
    // Define thresholds based on historical volatility distribution
    const sortedVols = [...rollingVolatilities].sort((a, b) => a - b);
    const lowThreshold = sortedVols[Math.floor(sortedVols.length * 0.33)];
    const highThreshold = sortedVols[Math.floor(sortedVols.length * 0.67)];
    
    const regimes: VolatilityRegime[] = [
      {
        regime: 'low',
        threshold: lowThreshold,
        periods: this.identifyVolatilityPeriods(rollingVolatilities, 0, lowThreshold, returns)
      },
      {
        regime: 'medium',
        threshold: (lowThreshold + highThreshold) / 2,
        periods: this.identifyVolatilityPeriods(rollingVolatilities, lowThreshold, highThreshold, returns)
      },
      {
        regime: 'high',
        threshold: highThreshold,
        periods: this.identifyVolatilityPeriods(rollingVolatilities, highThreshold, Infinity, returns)
      }
    ];
    
    return regimes;
  }

  /**
   * Generate stress test results
   */
  private generateStressTestResults(returns: number[]): StressTestResult[] {
    
    const stressScenarios = [
      { name: 'Market Crash (-20%)', shockSize: -0.20 },
      { name: 'Flash Crash (-10%)', shockSize: -0.10 },
      { name: 'Volatility Spike (2x)', shockSize: 0, volMultiplier: 2 },
      { name: 'Extended Bear Market', shockSize: -0.30 },
      { name: 'Liquidity Crisis', shockSize: -0.15 }
    ];
    
    return stressScenarios.map(scenario => {
      // Simulate stress scenario
      const stressedReturns = this.applyStressScenario(returns, scenario);
      
      // Calculate metrics for stressed scenario
      const totalReturn = stressedReturns.reduce((product, r) => product * (1 + r), 1) - 1;
      const maxDrawdown = this.calculateMaxDrawdown(stressedReturns);
      const worstDay = Math.min(...stressedReturns);
      const recoveryTime = this.calculateRecoveryTime(stressedReturns);
      
      return {
        scenario: scenario.name,
        return: totalReturn,
        maxDrawdown,
        recoveryTime,
        worstDay
      };
    });
  }

  /**
   * Utility methods
   */
  private calculateSkewness(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev === 0) return 0;
    
    const n = values.length;
    const skewnessSum = values.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 3), 0);
    
    return (n / ((n - 1) * (n - 2))) * skewnessSum;
  }

  private calculateKurtosis(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev === 0) return 0;
    
    const n = values.length;
    const kurtosisSum = values.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 4), 0);
    
    return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * kurtosisSum - (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3));
  }

  private calculateTailRatio(returns: number[]): number {
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const length = sortedReturns.length;
    
    const bottomTail = sortedReturns.slice(0, Math.floor(length * 0.05));
    const topTail = sortedReturns.slice(Math.floor(length * 0.95));
    
    const avgBottomTail = bottomTail.reduce((sum, r) => sum + r, 0) / bottomTail.length || 0;
    const avgTopTail = topTail.reduce((sum, r) => sum + r, 0) / topTail.length || 0;
    
    return avgTopTail !== 0 ? Math.abs(avgBottomTail / avgTopTail) : 0;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const meanX = x.reduce((sum, val) => sum + val, 0) / x.length;
    const meanY = y.reduce((sum, val) => sum + val, 0) / y.length;
    
    let numerator = 0;
    let sumXSquared = 0;
    let sumYSquared = 0;
    
    for (let i = 0; i < x.length; i++) {
      const deltaX = x[i] - meanX;
      const deltaY = y[i] - meanY;
      
      numerator += deltaX * deltaY;
      sumXSquared += deltaX * deltaX;
      sumYSquared += deltaY * deltaY;
    }
    
    const denominator = Math.sqrt(sumXSquared * sumYSquared);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateRollingVolatilities(returns: number[], window: number): number[] {
    const rollingVols: number[] = [];
    
    for (let i = window - 1; i < returns.length; i++) {
      const windowReturns = returns.slice(i - window + 1, i + 1);
      const mean = windowReturns.reduce((sum, r) => sum + r, 0) / windowReturns.length;
      const variance = windowReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / windowReturns.length;
      const volatility = Math.sqrt(variance * 252);
      rollingVols.push(volatility);
    }
    
    return rollingVols;
  }

  private extractReturnsFromMarketData(marketData: MarketData[]): number[] {
    const returns: number[] = [];
    
    for (let i = 1; i < marketData.length; i++) {
      const currentPrice = marketData[i].close;
      const previousPrice = marketData[i - 1].close;
      const dailyReturn = (currentPrice - previousPrice) / previousPrice;
      returns.push(dailyReturn);
    }
    
    return returns;
  }

  private identifyVolatilityPeriods(
    rollingVolatilities: number[],
    minThreshold: number,
    maxThreshold: number,
    returns: number[]
  ): Array<{
    start: string;
    end: string;
    return: number;
    volatility: number;
  }> {
    
    const periods: Array<{
      start: string;
      end: string;
      return: number;
      volatility: number;
    }> = [];
    
    let periodStart = -1;
    let periodReturns: number[] = [];
    let periodVols: number[] = [];
    
    for (let i = 0; i < rollingVolatilities.length; i++) {
      const vol = rollingVolatilities[i];
      
      if (vol >= minThreshold && vol < maxThreshold) {
        if (periodStart === -1) {
          periodStart = i;
          periodReturns = [];
          periodVols = [];
        }
        periodReturns.push(returns[i + 20] || 0); // Offset for rolling window
        periodVols.push(vol);
      } else if (periodStart !== -1) {
        // End of period
        const periodReturn = periodReturns.reduce((product, r) => product * (1 + r), 1) - 1;
        const avgVolatility = periodVols.reduce((sum, v) => sum + v, 0) / periodVols.length;
        
        periods.push({
          start: this.getDateString(periodStart),
          end: this.getDateString(i - 1),
          return: periodReturn,
          volatility: avgVolatility
        });
        
        periodStart = -1;
      }
    }
    
    return periods;
  }

  private applyStressScenario(
    returns: number[],
    scenario: { name: string; shockSize: number; volMultiplier?: number }
  ): number[] {
    
    const stressedReturns = [...returns];
    
    if (scenario.shockSize !== 0) {
      // Apply shock to first few days
      for (let i = 0; i < Math.min(5, stressedReturns.length); i++) {
        stressedReturns[i] += scenario.shockSize / 5; // Spread shock over 5 days
      }
    }
    
    if (scenario.volMultiplier) {
      // Increase volatility
      const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      for (let i = 0; i < stressedReturns.length; i++) {
        const excess = stressedReturns[i] - mean;
        stressedReturns[i] = mean + excess * scenario.volMultiplier;
      }
    }
    
    return stressedReturns;
  }

  private calculateMaxDrawdown(returns: number[]): number {
    let peak = 0;
    let maxDrawdown = 0;
    let cumulativeReturn = 0;
    
    for (const r of returns) {
      cumulativeReturn = (1 + cumulativeReturn) * (1 + r) - 1;
      if (cumulativeReturn > peak) {
        peak = cumulativeReturn;
      }
      const drawdown = (peak - cumulativeReturn) / (1 + peak);
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    return maxDrawdown;
  }

  private calculateRecoveryTime(returns: number[]): number {
    // Simplified recovery time calculation
    // In practice, this would calculate time to recover from maximum drawdown
    const maxDrawdownIndex = this.findMaxDrawdownIndex(returns);
    
    if (maxDrawdownIndex === -1) return 0;
    
    // Look for recovery after max drawdown
    let cumulativeFromDrawdown = 0;
    const drawdownValue = this.getCumulativeReturnAtIndex(returns, maxDrawdownIndex);
    
    for (let i = maxDrawdownIndex; i < returns.length; i++) {
      cumulativeFromDrawdown = (1 + cumulativeFromDrawdown) * (1 + returns[i]) - 1;
      if (cumulativeFromDrawdown >= Math.abs(drawdownValue)) {
        return i - maxDrawdownIndex;
      }
    }
    
    return -1; // Did not recover
  }

  private findMaxDrawdownIndex(returns: number[]): number {
    let peak = 0;
    let maxDrawdown = 0;
    let maxDrawdownIndex = -1;
    let cumulativeReturn = 0;
    
    for (let i = 0; i < returns.length; i++) {
      cumulativeReturn = (1 + cumulativeReturn) * (1 + returns[i]) - 1;
      if (cumulativeReturn > peak) {
        peak = cumulativeReturn;
      }
      const drawdown = (peak - cumulativeReturn) / (1 + peak);
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownIndex = i;
      }
    }
    
    return maxDrawdownIndex;
  }

  private getCumulativeReturnAtIndex(returns: number[], index: number): number {
    let cumulativeReturn = 0;
    
    for (let i = 0; i <= index; i++) {
      cumulativeReturn = (1 + cumulativeReturn) * (1 + returns[i]) - 1;
    }
    
    return cumulativeReturn;
  }

  private calculateBearMarketReturn(returns: number[]): number {
    // Simplified - identify bear market periods and calculate returns
    // In practice, this would use more sophisticated regime detection
    const negativeReturns = returns.filter(r => r < -0.01); // Days with > 1% loss
    
    if (negativeReturns.length === 0) return 0;
    
    return negativeReturns.reduce((product, r) => product * (1 + r), 1) - 1;
  }

  private calculateBullMarketReturn(returns: number[]): number {
    // Simplified - identify bull market periods and calculate returns
    const positiveReturns = returns.filter(r => r > 0.01); // Days with > 1% gain
    
    if (positiveReturns.length === 0) return 0;
    
    return positiveReturns.reduce((product, r) => product * (1 + r), 1) - 1;
  }

  private getDateString(index: number): string {
    const date = new Date();
    date.setDate(date.getDate() - (1000 - index));
    return date.toISOString().split('T')[0];
  }

  private getEmptyRiskMetrics(): RiskMetrics {
    return {
      var95: 0,
      var99: 0,
      expectedShortfall95: 0,
      expectedShortfall99: 0,
      historicalVolatility: 0,
      realizedVolatility: 0,
      volatilitySkew: 0,
      volatilityKurtosis: 0,
      skewness: 0,
      kurtosis: 0,
      tailRatio: 0,
      volatilityRegimes: [],
      stressTestResults: []
    };
  }
}