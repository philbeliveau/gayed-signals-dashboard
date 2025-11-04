/**
 * Signal Adapter for Simple Backtesting
 * Story: 4.0j - Simple Gayed Signals Backtesting Platform
 *
 * Wraps existing signal calculators from data-pipeline domain
 * and maps their outputs to simple Risk-On/Risk-Off positions
 */

import { GayedSignalCalculator } from '@/domains/trading-signals/engines/gayed-signals/utilities-spy';
import { LumberGoldSignalCalculator } from '@/domains/trading-signals/engines/gayed-signals/lumber-gold';
import { TreasuryCurveSignalCalculator } from '@/domains/trading-signals/engines/gayed-signals/treasury-curve';
import { SP500MovingAverageSignalCalculator } from '@/domains/trading-signals/engines/gayed-signals/sp500-ma';
import { VixDefensiveSignalCalculator } from '@/domains/trading-signals/engines/gayed-signals/vix-defensive';

import type { SignalType, Position, SignalConfig, MarketDataPoint } from '../engine/types';

/**
 * Signal configurations for each Gayed signal
 */
export const SIGNAL_CONFIGS: Record<SignalType, SignalConfig> = {
  'utilities-spy': {
    type: 'utilities-spy',
    riskOnSymbol: 'SPY',
    riskOffSymbol: 'XLU',
    requiredSymbols: ['SPY', 'XLU'],
  },
  'lumber-gold': {
    type: 'lumber-gold',
    riskOnSymbol: 'SPY',
    riskOffSymbol: 'GLD',
    requiredSymbols: ['WOOD', 'GLD'],
  },
  'treasury-curve': {
    type: 'treasury-curve',
    riskOnSymbol: 'SPY',
    riskOffSymbol: 'TLT',
    requiredSymbols: ['IEF', 'TLT'],
  },
  'sp500-ma': {
    type: 'sp500-ma',
    riskOnSymbol: 'SPY',
    riskOffSymbol: 'IEF',
    requiredSymbols: ['SPY'],
  },
  'vix-defensive': {
    type: 'vix-defensive',
    riskOnSymbol: 'SPY',
    riskOffSymbol: 'TLT',
    requiredSymbols: ['VIXY'],
  },
};

export interface CalculatedSignal {
  position: Position;
  rawValue: number;
  confidence: number;
  date: string;
}

export class SignalAdapter {
  /**
   * Calculate signal for a specific date using market data
   *
   * @param signalType - Which Gayed signal to calculate
   * @param marketData - Historical market data by symbol
   * @param date - Date to calculate signal for
   * @returns Position (Risk-On or Risk-Off) with metadata
   */
  static calculateSignal(
    signalType: SignalType,
    marketData: Record<string, MarketDataPoint[]>,
    date: string
  ): CalculatedSignal | null {
    const config = SIGNAL_CONFIGS[signalType];

    // Get prices up to the specified date
    const priceData = this.getPricesUpToDate(marketData, config.requiredSymbols, date);

    if (!priceData) {
      return null;
    }

    // Calculate signal using appropriate calculator
    let signal;
    switch (signalType) {
      case 'utilities-spy':
        signal = GayedSignalCalculator.calculateUtilitiesSignal(
          priceData.XLU || [],
          priceData.SPY || []
        );
        break;

      case 'lumber-gold':
        signal = LumberGoldSignalCalculator.calculateLumberGoldSignal(
          priceData.WOOD || [],
          priceData.GLD || []
        );
        break;

      case 'treasury-curve':
        signal = TreasuryCurveSignalCalculator.calculateTreasuryCurveSignal(
          priceData.IEF || [],
          priceData.TLT || []
        );
        break;

      case 'sp500-ma':
        signal = SP500MovingAverageSignalCalculator.calculateSP500MASignal(
          priceData.SPY || []
        );
        break;

      case 'vix-defensive':
        signal = VixDefensiveSignalCalculator.calculateVixDefensiveSignal(
          priceData.VIXY || []
        );
        break;

      default:
        throw new Error(`Unknown signal type: ${signalType}`);
    }

    if (!signal) {
      return null;
    }

    // Map signal direction to position
    const position = this.mapSignalToPosition(signal.signal);

    return {
      position,
      rawValue: signal.rawValue,
      confidence: signal.confidence,
      date: date,
    };
  }

  /**
   * Get price arrays up to a specific date for required symbols
   */
  private static getPricesUpToDate(
    marketData: Record<string, MarketDataPoint[]>,
    requiredSymbols: string[],
    date: string
  ): Record<string, number[]> | null {
    const targetDate = new Date(date).getTime();
    const priceData: Record<string, number[]> = {};

    for (const symbol of requiredSymbols) {
      if (!marketData[symbol]) {
        console.warn(`[SignalAdapter] Missing market data for ${symbol}`);
        return null;
      }

      // Get all prices up to and including the target date
      const prices = marketData[symbol]
        .filter(point => new Date(point.date).getTime() <= targetDate)
        .map(point => point.close);

      if (prices.length === 0) {
        console.warn(`[SignalAdapter] No price data for ${symbol} up to ${date}`);
        return null;
      }

      priceData[symbol] = prices;
    }

    return priceData;
  }

  /**
   * Map signal direction to position
   */
  private static mapSignalToPosition(
    signalDirection: 'Risk-On' | 'Risk-Off' | 'Neutral'
  ): Position {
    if (signalDirection === 'Neutral') {
      // Default neutral to Risk-On
      return 'RISK_ON';
    }

    return signalDirection === 'Risk-On' ? 'RISK_ON' : 'RISK_OFF';
  }

  /**
   * Get the ETF symbol for a given position
   */
  static getPositionSymbol(signalType: SignalType, position: Position): string {
    const config = SIGNAL_CONFIGS[signalType];
    return position === 'RISK_ON' ? config.riskOnSymbol : config.riskOffSymbol;
  }

  /**
   * Get all required symbols for a signal type (including position symbols)
   */
  static getAllRequiredSymbols(signalType: SignalType): string[] {
    const config = SIGNAL_CONFIGS[signalType];
    const symbols = new Set([
      ...config.requiredSymbols,
      config.riskOnSymbol,
      config.riskOffSymbol,
    ]);
    return Array.from(symbols);
  }
}
