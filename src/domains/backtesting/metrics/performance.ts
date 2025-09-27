import {
  PerformanceMetrics,
  RollingMetrics,
  TimeSeries,
  Trade,
  Position
} from '../../types';

/**
 * Performance Calculator
 * 
 * Comprehensive calculation of performance metrics for backtesting results.
 * Implements industry-standard financial performance metrics including:
 * 
 * - Return metrics (total, annualized, risk-adjusted)
 * - Risk metrics (volatility, drawdowns, VaR)
 * - Trading metrics (win rate, profit factor, etc.)
 * - Time-based analysis (rolling metrics, periodicity)
 * - Benchmark comparison metrics
 */
export class PerformanceCalculator {
  
  constructor() {}

  /**
   * Calculate comprehensive performance metrics from returns series
   */
  calculatePerformanceMetrics(
    returns: number[],
    trades: Trade[] = [],
    positions: Position[] = [],
    riskFreeRate: number = 0.02,
    benchmarkReturns?: number[]
  ): PerformanceMetrics {
    
    if (returns.length === 0) {
      return this.getEmptyPerformanceMetrics();
    }

    // Basic return metrics
    const basicMetrics = this.calculateBasicMetrics(returns);
    
    // Risk-adjusted return metrics
    const riskAdjustedMetrics = this.calculateRiskAdjustedMetrics(
      returns,
      riskFreeRate,
      basicMetrics
    );
    
    // Drawdown metrics
    const drawdownMetrics = this.calculateDrawdownMetrics(returns);
    
    // Trading metrics (if trades available)
    const tradingMetrics = trades.length > 0 ? 
      this.calculateTradingMetrics(trades) : 
      this.getDefaultTradingMetrics();
    
    // Consistency metrics
    const consistencyMetrics = this.calculateConsistencyMetrics(returns);
    
    // Benchmark comparison (if available)
    const benchmarkMetrics = benchmarkReturns ? 
      this.calculateBenchmarkMetrics(returns, benchmarkReturns, riskFreeRate) : 
      {};
    
    // Time-based analysis
    const timeBasedMetrics = this.calculateTimeBasedMetrics(returns);
    
    // Rolling metrics
    const rollingMetrics = this.calculateRollingMetrics(returns, 21); // 21-day rolling
    
    return {
      // Basic return metrics
      totalReturn: basicMetrics.totalReturn,
      annualizedReturn: basicMetrics.annualizedReturn,
      volatility: basicMetrics.volatility,
      
      // Risk-adjusted return metrics
      sharpeRatio: riskAdjustedMetrics.sharpeRatio,
      sortinoRatio: riskAdjustedMetrics.sortinoRatio,
      calmarRatio: riskAdjustedMetrics.calmarRatio,
      informationRatio: (benchmarkMetrics as any).informationRatio || 0,
      
      // Drawdown metrics
      maxDrawdown: drawdownMetrics.maxDrawdown,
      maxDrawdownDuration: drawdownMetrics.maxDrawdownDuration,
      averageDrawdown: drawdownMetrics.averageDrawdown,
      recoveryTime: drawdownMetrics.recoveryTime,
      
      // Trading metrics
      totalTrades: tradingMetrics.totalTrades,
      winRate: tradingMetrics.winRate,
      averageWin: tradingMetrics.averageWin,
      averageLoss: tradingMetrics.averageLoss,
      profitFactor: tradingMetrics.profitFactor,
      
      // Consistency metrics
      bestMonth: consistencyMetrics.bestMonth,
      worstMonth: consistencyMetrics.worstMonth,
      positiveMonths: consistencyMetrics.positiveMonths,
      consecutiveWins: tradingMetrics.consecutiveWins,
      consecutiveLosses: tradingMetrics.consecutiveLosses,
      
      // Benchmark comparison
      alpha: (benchmarkMetrics as any).alpha || 0,
      beta: (benchmarkMetrics as any).beta || 0,
      trackingError: (benchmarkMetrics as any).trackingError || 0,
      
      // Time-based analysis
      monthlyReturns: timeBasedMetrics.monthlyReturns,
      yearlyReturns: timeBasedMetrics.yearlyReturns,
      
      // Rolling metrics
      rollingMetrics
    };
  }

  /**
   * Calculate basic return metrics
   */
  private calculateBasicMetrics(returns: number[]): {
    totalReturn: number;
    annualizedReturn: number;
    volatility: number;
  } {
    
    // Total return (compounded)
    const totalReturn = returns.reduce((product, r) => product * (1 + r), 1) - 1;
    
    // Annualized return
    const periodYears = returns.length / 252; // Assuming daily returns
    const annualizedReturn = periodYears > 0 ? 
      Math.pow(1 + totalReturn, 1 / periodYears) - 1 : 0;
    
    // Volatility (annualized)
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance * 252); // Annualized
    
    return {
      totalReturn,
      annualizedReturn,
      volatility
    };
  }

  /**
   * Calculate risk-adjusted return metrics
   */
  private calculateRiskAdjustedMetrics(
    returns: number[],
    riskFreeRate: number,
    basicMetrics: { annualizedReturn: number; volatility: number }
  ): {
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;
  } {
    
    // Sharpe Ratio
    const excessReturn = basicMetrics.annualizedReturn - riskFreeRate;
    const sharpeRatio = basicMetrics.volatility > 0 ? excessReturn / basicMetrics.volatility : 0;
    
    // Sortino Ratio (downside volatility)
    const downsideReturns = returns.filter(r => r < 0);
    const downsideVariance = downsideReturns.length > 0 ? 
      downsideReturns.reduce((sum, r) => sum + r * r, 0) / downsideReturns.length : 0;
    const downsideVolatility = Math.sqrt(downsideVariance * 252);
    const sortinoRatio = downsideVolatility > 0 ? excessReturn / downsideVolatility : 0;
    
    // Calmar Ratio (return / max drawdown)
    const maxDrawdown = this.calculateMaxDrawdown(returns);
    const calmarRatio = maxDrawdown > 0 ? basicMetrics.annualizedReturn / maxDrawdown : 0;
    
    return {
      sharpeRatio,
      sortinoRatio,
      calmarRatio
    };
  }

  /**
   * Calculate drawdown metrics
   */
  private calculateDrawdownMetrics(returns: number[]): {
    maxDrawdown: number;
    maxDrawdownDuration: number;
    averageDrawdown: number;
    recoveryTime: number;
  } {
    
    const drawdowns: number[] = [];
    const drawdownDurations: number[] = [];
    const recoveryTimes: number[] = [];
    
    let peak = 0;
    let cumulativeReturn = 0;
    let drawdownStart = -1;
    let currentDrawdown = 0;
    let maxDrawdown = 0;
    let maxDrawdownDuration = 0;
    
    for (let i = 0; i < returns.length; i++) {
      cumulativeReturn = (1 + cumulativeReturn) * (1 + returns[i]) - 1;
      
      if (cumulativeReturn > peak) {
        // New peak reached
        if (drawdownStart >= 0) {
          // End of drawdown period
          const duration = i - drawdownStart;
          drawdownDurations.push(duration);
          
          // Calculate recovery time (time from max drawdown to recovery)
          const recoveryTime = duration; // Simplified - would need more complex calculation
          recoveryTimes.push(recoveryTime);
          
          drawdownStart = -1;
        }
        peak = cumulativeReturn;
        currentDrawdown = 0;
      } else {
        // In drawdown
        if (drawdownStart < 0) {
          drawdownStart = i;
        }
        
        currentDrawdown = (peak - cumulativeReturn) / (1 + peak);
        drawdowns.push(currentDrawdown);
        
        if (currentDrawdown > maxDrawdown) {
          maxDrawdown = currentDrawdown;
        }
      }
    }
    
    // Handle ongoing drawdown
    if (drawdownStart >= 0) {
      const duration = returns.length - drawdownStart;
      drawdownDurations.push(duration);
    }
    
    maxDrawdownDuration = drawdownDurations.length > 0 ? Math.max(...drawdownDurations) : 0;
    const averageDrawdown = drawdowns.length > 0 ? 
      drawdowns.reduce((sum, dd) => sum + dd, 0) / drawdowns.length : 0;
    const averageRecoveryTime = recoveryTimes.length > 0 ? 
      recoveryTimes.reduce((sum, rt) => sum + rt, 0) / recoveryTimes.length : 0;
    
    return {
      maxDrawdown,
      maxDrawdownDuration,
      averageDrawdown,
      recoveryTime: averageRecoveryTime
    };
  }

  /**
   * Calculate trading-specific metrics
   */
  private calculateTradingMetrics(trades: Trade[]): {
    totalTrades: number;
    winRate: number;
    averageWin: number;
    averageLoss: number;
    profitFactor: number;
    consecutiveWins: number;
    consecutiveLosses: number;
  } {
    
    const completedTrades = trades.filter(t => t.pnl !== undefined);
    const totalTrades = completedTrades.length;
    
    if (totalTrades === 0) {
      return this.getDefaultTradingMetrics();
    }
    
    // Win/Loss analysis
    const winningTrades = completedTrades.filter(t => t.pnl! > 0);
    const losingTrades = completedTrades.filter(t => t.pnl! < 0);
    
    const winRate = (winningTrades.length / totalTrades) * 100;
    
    const averageWin = winningTrades.length > 0 ? 
      winningTrades.reduce((sum, t) => sum + t.pnl!, 0) / winningTrades.length : 0;
    
    const averageLoss = losingTrades.length > 0 ? 
      losingTrades.reduce((sum, t) => sum + t.pnl!, 0) / losingTrades.length : 0;
    
    // Profit Factor (gross profit / gross loss)
    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl!, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl!, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;
    
    // Consecutive wins/losses
    const { consecutiveWins, consecutiveLosses } = this.calculateConsecutiveWinsLosses(completedTrades);
    
    return {
      totalTrades,
      winRate,
      averageWin,
      averageLoss,
      profitFactor,
      consecutiveWins,
      consecutiveLosses
    };
  }

  /**
   * Calculate consistency metrics
   */
  private calculateConsistencyMetrics(returns: number[]): {
    bestMonth: number;
    worstMonth: number;
    positiveMonths: number;
  } {
    
    // Group returns by month (simplified - assumes daily data)
    const monthlyReturns = this.groupReturnsByMonth(returns);
    
    if (monthlyReturns.length === 0) {
      return {
        bestMonth: 0,
        worstMonth: 0,
        positiveMonths: 0
      };
    }
    
    const bestMonth = Math.max(...monthlyReturns);
    const worstMonth = Math.min(...monthlyReturns);
    const positiveMonths = (monthlyReturns.filter(r => r > 0).length / monthlyReturns.length) * 100;
    
    return {
      bestMonth,
      worstMonth,
      positiveMonths
    };
  }

  /**
   * Calculate benchmark comparison metrics
   */
  private calculateBenchmarkMetrics(
    returns: number[],
    benchmarkReturns: number[],
    riskFreeRate: number
  ): {
    alpha: number;
    beta: number;
    trackingError: number;
    informationRatio: number;
  } {
    
    const minLength = Math.min(returns.length, benchmarkReturns.length);
    const alignedReturns = returns.slice(0, minLength);
    const alignedBenchmark = benchmarkReturns.slice(0, minLength);
    
    // Calculate beta using linear regression
    const { alpha, beta } = this.calculateLinearRegression(alignedReturns, alignedBenchmark, riskFreeRate);
    
    // Tracking error (standard deviation of excess returns)
    const excessReturns = alignedReturns.map((r, i) => r - alignedBenchmark[i]);
    const trackingError = this.calculateStandardDeviation(excessReturns) * Math.sqrt(252);
    
    // Information ratio (average excess return / tracking error)
    const averageExcessReturn = excessReturns.reduce((sum, er) => sum + er, 0) / excessReturns.length;
    const informationRatio = trackingError > 0 ? (averageExcessReturn * 252) / trackingError : 0;
    
    return {
      alpha,
      beta,
      trackingError,
      informationRatio
    };
  }

  /**
   * Calculate time-based metrics
   */
  private calculateTimeBasedMetrics(returns: number[]): {
    monthlyReturns: TimeSeries<number>;
    yearlyReturns: TimeSeries<number>;
  } {
    
    // Simplified monthly and yearly returns
    const monthlyReturns = this.groupReturnsByMonth(returns);
    const yearlyReturns = this.groupReturnsByYear(returns);
    
    return {
      monthlyReturns: {
        dates: monthlyReturns.map((_, i) => `2024-${(i + 1).toString().padStart(2, '0')}-01`),
        values: monthlyReturns,
        frequency: 'monthly'
      },
      yearlyReturns: {
        dates: yearlyReturns.map((_, i) => `${2020 + i}-01-01`),
        values: yearlyReturns,
        frequency: 'daily'
      }
    };
  }

  /**
   * Calculate rolling metrics
   */
  private calculateRollingMetrics(returns: number[], window: number): RollingMetrics {
    
    const rollingReturns: number[] = [];
    const rollingVolatility: number[] = [];
    const rollingSharpe: number[] = [];
    const rollingDrawdown: number[] = [];
    const dates: string[] = [];
    
    for (let i = window - 1; i < returns.length; i++) {
      const windowReturns = returns.slice(i - window + 1, i + 1);
      
      // Rolling return (compounded)
      const rollingReturn = windowReturns.reduce((product, r) => product * (1 + r), 1) - 1;
      rollingReturns.push(rollingReturn);
      
      // Rolling volatility
      const avgReturn = windowReturns.reduce((sum, r) => sum + r, 0) / windowReturns.length;
      const variance = windowReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / windowReturns.length;
      const volatility = Math.sqrt(variance * 252);
      rollingVolatility.push(volatility);
      
      // Rolling Sharpe ratio
      const sharpe = volatility > 0 ? (avgReturn * 252) / volatility : 0;
      rollingSharpe.push(sharpe);
      
      // Rolling max drawdown
      const drawdown = this.calculateMaxDrawdown(windowReturns);
      rollingDrawdown.push(drawdown);
      
      // Date for this window
      const date = new Date();
      date.setDate(date.getDate() - (returns.length - i - 1));
      dates.push(date.toISOString().split('T')[0]);
    }
    
    return {
      window,
      returns: {
        dates,
        values: rollingReturns,
        frequency: 'daily'
      },
      volatility: {
        dates,
        values: rollingVolatility,
        frequency: 'daily'
      },
      sharpeRatio: {
        dates,
        values: rollingSharpe,
        frequency: 'daily'
      },
      maxDrawdown: {
        dates,
        values: rollingDrawdown,
        frequency: 'daily'
      }
    };
  }

  /**
   * Utility methods
   */
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

  private calculateConsecutiveWinsLosses(trades: Trade[]): {
    consecutiveWins: number;
    consecutiveLosses: number;
  } {
    
    let consecutiveWins = 0;
    let consecutiveLosses = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    
    for (const trade of trades) {
      if (trade.pnl! > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        consecutiveWins = Math.max(consecutiveWins, currentWinStreak);
      } else if (trade.pnl! < 0) {
        currentLossStreak++;
        currentWinStreak = 0;
        consecutiveLosses = Math.max(consecutiveLosses, currentLossStreak);
      }
    }
    
    return { consecutiveWins, consecutiveLosses };
  }

  private groupReturnsByMonth(returns: number[]): number[] {
    // Simplified - assumes 21 trading days per month
    const monthlyReturns: number[] = [];
    const daysPerMonth = 21;
    
    for (let i = 0; i < returns.length; i += daysPerMonth) {
      const monthReturns = returns.slice(i, i + daysPerMonth);
      const monthlyReturn = monthReturns.reduce((product, r) => product * (1 + r), 1) - 1;
      monthlyReturns.push(monthlyReturn);
    }
    
    return monthlyReturns;
  }

  private groupReturnsByYear(returns: number[]): number[] {
    // Simplified - assumes 252 trading days per year
    const yearlyReturns: number[] = [];
    const daysPerYear = 252;
    
    for (let i = 0; i < returns.length; i += daysPerYear) {
      const yearReturns = returns.slice(i, i + daysPerYear);
      const yearlyReturn = yearReturns.reduce((product, r) => product * (1 + r), 1) - 1;
      yearlyReturns.push(yearlyReturn);
    }
    
    return yearlyReturns;
  }

  private calculateLinearRegression(
    dependent: number[],
    independent: number[],
    riskFreeRate: number
  ): { alpha: number; beta: number } {
    
    const n = dependent.length;
    
    // Convert to excess returns
    const excessDependent = dependent.map(r => r - riskFreeRate / 252);
    const excessIndependent = independent.map(r => r - riskFreeRate / 252);
    
    const sumX = excessIndependent.reduce((sum, x) => sum + x, 0);
    const sumY = excessDependent.reduce((sum, y) => sum + y, 0);
    const sumXY = excessIndependent.reduce((sum, x, i) => sum + x * excessDependent[i], 0);
    const sumXX = excessIndependent.reduce((sum, x) => sum + x * x, 0);
    
    const beta = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const alpha = (sumY - beta * sumX) / n;
    
    return { alpha: alpha * 252, beta }; // Annualize alpha
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }

  private getDefaultTradingMetrics() {
    return {
      totalTrades: 0,
      winRate: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0
    };
  }

  private getEmptyPerformanceMetrics(): PerformanceMetrics {
    return {
      totalReturn: 0,
      annualizedReturn: 0,
      volatility: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      maxDrawdown: 0,
      maxDrawdownDuration: 0,
      averageDrawdown: 0,
      recoveryTime: 0,
      totalTrades: 0,
      winRate: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: 0,
      bestMonth: 0,
      worstMonth: 0,
      positiveMonths: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      monthlyReturns: { dates: [], values: [], frequency: 'monthly' },
      yearlyReturns: { dates: [], values: [], frequency: 'daily' },
      rollingMetrics: {
        window: 21,
        returns: { dates: [], values: [], frequency: 'daily' },
        volatility: { dates: [], values: [], frequency: 'daily' },
        sharpeRatio: { dates: [], values: [], frequency: 'daily' },
        maxDrawdown: { dates: [], values: [], frequency: 'daily' }
      }
    };
  }
}