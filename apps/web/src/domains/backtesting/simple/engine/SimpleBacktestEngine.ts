/**
 * Simple Backtest Engine
 * Story: 4.0j - Simple Gayed Signals Backtesting Platform
 *
 * Core backtesting logic:
 * 1. Calculate signal daily
 * 2. Determine position (Risk-On ETF vs Risk-Off ETF)
 * 3. Execute trades when signal changes
 * 4. Track daily portfolio value
 *
 * SIMPLE ONLY - No correlations, no Monte Carlo, no complex math
 */

import { SignalAdapter, SIGNAL_CONFIGS } from '../signals/SignalAdapter';
import type {
  BacktestConfig,
  BacktestResult,
  TradeRecord,
  DailyPortfolioValue,
  MarketDataPoint,
  Position,
} from './types';

export class SimpleBacktestEngine {
  /**
   * Run backtest for a specific signal
   *
   * @param config Backtest configuration
   * @param marketData Market data organized by symbol
   * @returns Complete backtest results
   */
  static runBacktest(
    config: BacktestConfig,
    marketData: Record<string, MarketDataPoint[]>
  ): BacktestResult {
    const { signalType, startDate, endDate, initialCapital } = config;

    // Get all trading dates from SPY (most liquid)
    const tradingDates = this.getTradingDates(marketData, startDate, endDate);

    if (tradingDates.length === 0) {
      throw new Error('No trading dates found in the specified range');
    }

    // Initialize tracking variables
    const trades: TradeRecord[] = [];
    const equityCurve: DailyPortfolioValue[] = [];
    let currentPosition: Position | null = null;
    let currentSymbol: string | null = null;
    let shares = 0;
    let cash = initialCapital;
    let portfolioValue = initialCapital;

    // Process each trading day
    for (const date of tradingDates) {
      // Calculate signal for this date
      const signal = SignalAdapter.calculateSignal(signalType, marketData, date);

      if (!signal) {
        // If signal calculation fails, maintain current position
        if (currentSymbol && currentPosition) {
          const price = this.getPrice(marketData, currentSymbol, date);
          if (price) {
            portfolioValue = cash + shares * price;
            equityCurve.push({
              date,
              value: portfolioValue,
              position: currentSymbol,
              signalValue: undefined,
            });
          }
        } else {
          // No position yet, just track cash
          equityCurve.push({
            date,
            value: cash,
            position: 'CASH',
          });
        }
        continue;
      }

      // Determine target position
      const targetSymbol = SignalAdapter.getPositionSymbol(signalType, signal.position);

      // Check if position change is needed
      if (currentPosition !== signal.position || currentSymbol !== targetSymbol) {
        // Close current position if any
        if (currentSymbol && shares > 0) {
          const sellPrice = this.getPrice(marketData, currentSymbol, date);
          if (sellPrice) {
            const sellValue = shares * sellPrice;
            cash += sellValue;

            trades.push({
              date,
              action: 'SELL',
              symbol: currentSymbol,
              price: sellPrice,
              reason: `Signal changed from ${currentPosition} to ${signal.position} (value: ${signal.rawValue.toFixed(4)})`,
              signalValue: signal.rawValue,
            });

            shares = 0;
          }
        }

        // Open new position
        const buyPrice = this.getPrice(marketData, targetSymbol, date);
        if (buyPrice && buyPrice > 0) {
          shares = Math.floor(cash / buyPrice);
          if (shares > 0) {
            const cost = shares * buyPrice;
            cash -= cost;

            trades.push({
              date,
              action: 'BUY',
              symbol: targetSymbol,
              price: buyPrice,
              reason: `Signal: ${signal.position} (value: ${signal.rawValue.toFixed(4)})`,
              signalValue: signal.rawValue,
            });

            currentPosition = signal.position;
            currentSymbol = targetSymbol;
          }
        }
      }

      // Update portfolio value
      if (currentSymbol && shares > 0) {
        const currentPrice = this.getPrice(marketData, currentSymbol, date);
        if (currentPrice) {
          portfolioValue = cash + shares * currentPrice;
        }
      } else {
        portfolioValue = cash;
      }

      equityCurve.push({
        date,
        value: portfolioValue,
        position: currentSymbol || 'CASH',
        signalValue: signal.rawValue,
      });
    }

    // Close final position
    if (currentSymbol && shares > 0) {
      const finalDate = tradingDates[tradingDates.length - 1];
      const finalPrice = this.getPrice(marketData, currentSymbol, finalDate);
      if (finalPrice) {
        const sellValue = shares * finalPrice;
        cash += sellValue;

        trades.push({
          date: finalDate,
          action: 'SELL',
          symbol: currentSymbol,
          price: finalPrice,
          reason: 'End of backtest period',
        });

        portfolioValue = cash;
      }
    }

    // Calculate metrics
    const metrics = this.calculateMetrics(
      initialCapital,
      portfolioValue,
      trades,
      equityCurve
    );

    return {
      config,
      metrics,
      trades,
      equityCurve,
      dataQuality: {
        score: 1.0, // Will be set by caller from MarketDataFetcher
        issues: [],
      },
    };
  }

  /**
   * Get sorted trading dates from market data
   */
  private static getTradingDates(
    marketData: Record<string, MarketDataPoint[]>,
    startDate: string,
    endDate: string
  ): string[] {
    // Use SPY as reference for trading dates (most liquid)
    const spyData = marketData['SPY'];
    if (!spyData || spyData.length === 0) {
      throw new Error('SPY data required for trading dates');
    }

    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    const dates = spyData
      .filter(point => {
        const date = new Date(point.date).getTime();
        return date >= start && date <= end;
      })
      .map(point => point.date)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    return dates;
  }

  /**
   * Get price for a symbol on a specific date
   */
  private static getPrice(
    marketData: Record<string, MarketDataPoint[]>,
    symbol: string,
    date: string
  ): number | null {
    const symbolData = marketData[symbol];
    if (!symbolData) return null;

    const point = symbolData.find(p => p.date === date);
    return point ? point.close : null;
  }

  /**
   * Calculate performance metrics
   */
  private static calculateMetrics(
    initialCapital: number,
    finalValue: number,
    trades: TradeRecord[],
    equityCurve: DailyPortfolioValue[]
  ) {
    // Total return
    const totalReturn = ((finalValue / initialCapital) - 1) * 100;

    // Number of trades (count buy transactions)
    const numberOfTrades = trades.filter(t => t.action === 'BUY').length;

    // Win rate (percentage of profitable trades)
    const winRate = this.calculateWinRate(trades);

    // Maximum drawdown
    const maxDrawdown = this.calculateMaxDrawdown(equityCurve);

    return {
      totalReturn,
      numberOfTrades,
      winRate,
      maxDrawdown,
      finalValue,
      initialValue: initialCapital,
    };
  }

  /**
   * Calculate win rate from trades
   */
  private static calculateWinRate(trades: TradeRecord[]): number {
    // Group trades into round trips (buy + sell pairs)
    const roundTrips: { buyPrice: number; sellPrice: number }[] = [];
    let pendingBuy: TradeRecord | null = null;

    for (const trade of trades) {
      if (trade.action === 'BUY') {
        pendingBuy = trade;
      } else if (trade.action === 'SELL' && pendingBuy) {
        roundTrips.push({
          buyPrice: pendingBuy.price,
          sellPrice: trade.price,
        });
        pendingBuy = null;
      }
    }

    if (roundTrips.length === 0) return 0;

    const profitableTrades = roundTrips.filter(rt => rt.sellPrice > rt.buyPrice).length;
    return (profitableTrades / roundTrips.length) * 100;
  }

  /**
   * Calculate maximum drawdown
   */
  private static calculateMaxDrawdown(equityCurve: DailyPortfolioValue[]): number {
    let maxDrawdown = 0;
    let peak = equityCurve[0]?.value || 0;

    for (const point of equityCurve) {
      if (point.value > peak) {
        peak = point.value;
      }

      const drawdown = ((peak - point.value) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }
}
