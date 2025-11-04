/**
 * Backtest Results Formatter
 * Story: 4.0j - Simple Gayed Signals Backtesting Platform
 *
 * Formats backtest results for display and charting
 */

import type { BacktestResult, PerformanceMetrics, TradeRecord, DailyPortfolioValue } from '../engine/types';

/**
 * Format for chart display (Plotly)
 */
export interface ChartData {
  data: any[];
  layout: any;
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
 * Format equity curve for Plotly chart with transaction markers and signal indicator
 */
export function formatEquityCurve(
  equityCurve: DailyPortfolioValue[],
  trades?: TradeRecord[],
  signalThreshold?: number
): ChartData {
  const dates = equityCurve.map(point => point.date);
  const portfolioValues = equityCurve.map(point => point.value);
  const signalValues = equityCurve.map(point => point.signalValue ?? null);
  const hasSignalData = signalValues.some(val => val !== null);

  const plotlyData: any[] = [];

  // Portfolio value line (primary y-axis)
  plotlyData.push({
    x: dates,
    y: portfolioValues,
    name: 'Portfolio Value',
    type: 'scatter',
    mode: 'lines',
    line: { color: 'rgb(59, 130, 246)', width: 2 },
    fill: 'tozeroy',
    fillcolor: 'rgba(59, 130, 246, 0.1)',
    yaxis: 'y',
    hovertemplate: '<b>Portfolio Value</b><br>Date: %{x}<br>Value: $%{y:,.2f}<extra></extra>',
  });

  // Signal indicator line (secondary y-axis)
  if (hasSignalData) {
    plotlyData.push({
      x: dates,
      y: signalValues,
      name: 'Signal Indicator',
      type: 'scatter',
      mode: 'lines',
      line: { color: 'rgb(147, 51, 234)', width: 2, dash: 'dash' },
      yaxis: 'y2',
      hovertemplate: '<b>Signal Indicator</b><br>Date: %{x}<br>Value: %{y:.4f}<extra></extra>',
    });

    // Threshold line (secondary y-axis)
    if (signalThreshold !== undefined) {
      plotlyData.push({
        x: dates,
        y: new Array(dates.length).fill(signalThreshold),
        name: `Threshold (${signalThreshold})`,
        type: 'scatter',
        mode: 'lines',
        line: { color: 'rgb(251, 146, 60)', width: 2, dash: 'dot' },
        yaxis: 'y2',
        hovertemplate: '<b>Threshold</b><br>Value: %{y:.2f}<extra></extra>',
      });
    }
  }

  // Transaction markers
  if (trades && trades.length > 0) {
    const buyTrades = trades.filter(t => t.action === 'BUY');
    const sellTrades = trades.filter(t => t.action === 'SELL');

    // Buy markers
    if (buyTrades.length > 0) {
      const buyDates = buyTrades.map(t => t.date);
      const buyValues = buyTrades.map(trade => {
        const idx = dates.indexOf(trade.date);
        return idx !== -1 ? portfolioValues[idx] : null;
      });

      plotlyData.push({
        x: buyDates,
        y: buyValues,
        name: 'Buy',
        type: 'scatter',
        mode: 'markers',
        marker: {
          color: 'rgb(34, 197, 94)',
          size: 12,
          symbol: 'triangle-up',
          line: { color: 'white', width: 1 },
        },
        yaxis: 'y',
        hovertemplate: '<b>BUY</b><br>Date: %{x}<br>Portfolio: $%{y:,.2f}<extra></extra>',
      });
    }

    // Sell markers
    if (sellTrades.length > 0) {
      const sellDates = sellTrades.map(t => t.date);
      const sellValues = sellTrades.map(trade => {
        const idx = dates.indexOf(trade.date);
        return idx !== -1 ? portfolioValues[idx] : null;
      });

      plotlyData.push({
        x: sellDates,
        y: sellValues,
        name: 'Sell',
        type: 'scatter',
        mode: 'markers',
        marker: {
          color: 'rgb(239, 68, 68)',
          size: 12,
          symbol: 'triangle-down',
          line: { color: 'white', width: 1 },
        },
        yaxis: 'y',
        hovertemplate: '<b>SELL</b><br>Date: %{x}<br>Portfolio: $%{y:,.2f}<extra></extra>',
      });
    }
  }

  // Layout configuration with dual y-axes
  const layout = {
    autosize: true,
    margin: { l: 80, r: 80, t: 20, b: 60 },
    hovermode: 'closest',
    showlegend: true,
    legend: {
      orientation: 'h',
      yanchor: 'bottom',
      y: 1.02,
      xanchor: 'right',
      x: 1,
    },
    xaxis: {
      title: 'Date',
      type: 'date',
      showgrid: true,
      gridcolor: 'rgba(128, 128, 128, 0.2)',
    },
    yaxis: {
      title: 'Portfolio Value ($)',
      showgrid: true,
      gridcolor: 'rgba(128, 128, 128, 0.2)',
      tickformat: '$,.0f',
      side: 'left',
    },
    yaxis2: hasSignalData ? {
      title: 'Signal Indicator',
      overlaying: 'y',
      side: 'right',
      showgrid: false,
      tickformat: '.2f',
    } : undefined,
    dragmode: 'zoom',
    plot_bgcolor: 'rgba(0, 0, 0, 0)',
    paper_bgcolor: 'rgba(0, 0, 0, 0)',
  };

  return {
    data: plotlyData,
    layout,
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
  signalThreshold?: number;
}

/**
 * Get signal threshold based on signal type
 */
function getSignalThreshold(signalType: string): number | undefined {
  // Map signal types to their thresholds
  const thresholds: Record<string, number> = {
    'lumber-gold': 1.0,
    'utilities-spy': 1.0,
    'treasury-curve': 1.0,
    'sp500-ma': 1.0, // Above/below 200-day MA
    'vix-defensive': 1.0,
  };

  return thresholds[signalType];
}

export function formatBacktestResult(result: BacktestResult): FormattedBacktestResult {
  const threshold = getSignalThreshold(result.config.signalType);

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
    equityCurve: formatEquityCurve(result.equityCurve, result.trades, threshold),
    trades: formatTradeHistory(result.trades),
    dataQuality: result.dataQuality,
    signalThreshold: threshold,
  };
}
