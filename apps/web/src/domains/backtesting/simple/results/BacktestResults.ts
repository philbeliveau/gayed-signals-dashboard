/**
 * Backtest Results Formatter
 * Story: 4.0j - Simple Gayed Signals Backtesting Platform
 *
 * Formats backtest results for display and charting
 */

import type { BacktestResult, PerformanceMetrics, TradeRecord, DailyPortfolioValue } from '../engine/types';

/**
 * Format for chart display
 */
export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
  }[];
}

/**
 * Format performance metrics for display
 */
export function formatPerformanceMetrics(metrics: PerformanceMetrics) {
  return {
    totalReturn: `${metrics.totalReturn >= 0 ? '+' : ''}${metrics.totalReturn.toFixed(2)}%`,
    numberOfTrades: metrics.numberOfTrades,
    winRate: `${metrics.winRate.toFixed(1)}%`,
    maxDrawdown: `${metrics.maxDrawdown.toFixed(2)}%`,
    finalValue: `$${metrics.finalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    initialValue: `$${metrics.initialValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  };
}

/**
 * Format equity curve for chart display
 */
export function formatEquityCurve(equityCurve: DailyPortfolioValue[]): ChartData {
  const labels = equityCurve.map(point => {
    const date = new Date(point.date);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  });

  const data = equityCurve.map(point => point.value);

  return {
    labels,
    datasets: [
      {
        label: 'Portfolio Value',
        data,
        borderColor: 'rgb(59, 130, 246)', // Blue
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
      },
    ],
  };
}

/**
 * Format trade history for display
 */
export interface FormattedTrade {
  date: string;
  action: string;
  symbol: string;
  price: string;
  reason: string;
  signalValue?: string;
}

export function formatTradeHistory(trades: TradeRecord[]): FormattedTrade[] {
  return trades.map(trade => ({
    date: new Date(trade.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }),
    action: trade.action,
    symbol: trade.symbol,
    price: `$${trade.price.toFixed(2)}`,
    reason: trade.reason,
    signalValue: trade.signalValue ? trade.signalValue.toFixed(4) : undefined,
  }));
}

/**
 * Generate summary statistics
 */
export interface SummaryStats {
  dateRange: string;
  tradingDays: number;
  averageDailyReturn: string;
  sharpeRatio?: string;
  bestDay: {
    date: string;
    return: string;
  };
  worstDay: {
    date: string;
    return: string;
  };
}

export function generateSummaryStats(
  equityCurve: DailyPortfolioValue[],
  startDate: string,
  endDate: string
): SummaryStats {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dateRange = `${start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;

  // Calculate daily returns
  const dailyReturns: { date: string; return: number }[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prevValue = equityCurve[i - 1].value;
    const currValue = equityCurve[i].value;
    const dailyReturn = ((currValue / prevValue) - 1) * 100;
    dailyReturns.push({
      date: equityCurve[i].date,
      return: dailyReturn,
    });
  }

  // Average daily return
  const avgDailyReturn = dailyReturns.length > 0
    ? dailyReturns.reduce((sum, r) => sum + r.return, 0) / dailyReturns.length
    : 0;

  // Best and worst days
  const sortedReturns = [...dailyReturns].sort((a, b) => b.return - a.return);
  const bestDay = sortedReturns[0] || { date: startDate, return: 0 };
  const worstDay = sortedReturns[sortedReturns.length - 1] || { date: startDate, return: 0 };

  return {
    dateRange,
    tradingDays: equityCurve.length,
    averageDailyReturn: `${avgDailyReturn >= 0 ? '+' : ''}${avgDailyReturn.toFixed(3)}%`,
    bestDay: {
      date: new Date(bestDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      return: `${bestDay.return >= 0 ? '+' : ''}${bestDay.return.toFixed(2)}%`,
    },
    worstDay: {
      date: new Date(worstDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      return: `${worstDay.return >= 0 ? '+' : ''}${worstDay.return.toFixed(2)}%`,
    },
  };
}

/**
 * Complete formatted result for API response
 */
export interface FormattedBacktestResult {
  config: {
    signalType: string;
    dateRange: string;
    initialCapital: string;
  };
  metrics: ReturnType<typeof formatPerformanceMetrics>;
  summary: SummaryStats;
  equityCurve: ChartData;
  trades: FormattedTrade[];
  dataQuality: {
    score: number;
    issues: string[];
  };
}

export function formatBacktestResult(result: BacktestResult): FormattedBacktestResult {
  return {
    config: {
      signalType: result.config.signalType,
      dateRange: `${result.config.startDate} to ${result.config.endDate}`,
      initialCapital: `$${result.config.initialCapital.toLocaleString('en-US')}`,
    },
    metrics: formatPerformanceMetrics(result.metrics),
    summary: generateSummaryStats(
      result.equityCurve,
      result.config.startDate,
      result.config.endDate
    ),
    equityCurve: formatEquityCurve(result.equityCurve),
    trades: formatTradeHistory(result.trades),
    dataQuality: result.dataQuality,
  };
}
