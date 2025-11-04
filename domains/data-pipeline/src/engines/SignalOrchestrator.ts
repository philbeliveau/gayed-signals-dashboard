/**
 * Signal Orchestrator for Railway Backend
 * Simplified version - calculates all 5 Gayed signals and consensus
 */

import { Signal, ConsensusSignal, MarketData } from '../types/signals';
import { GayedSignalCalculator } from './signal-calculators/utilities-spy';
import { LumberGoldSignalCalculator } from './signal-calculators/lumber-gold';
import { TreasuryCurveSignalCalculator } from './signal-calculators/treasury-curve';
import { VixDefensiveSignalCalculator } from './signal-calculators/vix-defensive';
import { SP500MovingAverageSignalCalculator } from './signal-calculators/sp500-ma';

export class SignalOrchestrator {
  /**
   * Get all required market data symbols
   */
  public static getRequiredSymbols(): string[] {
    return [
      'SPY',     // S&P 500 ETF
      'XLU',     // Utilities ETF
      'WOOD',    // Lumber ETF proxy
      'GLD',     // Gold ETF
      'IEF',     // 10-year Treasury ETF
      'TLT',     // 30-year Treasury ETF
      'VIXY'     // VIX Short-Term Futures ETF (Tiingo supports VIXY, not ^VIX)
    ];
  }

  /**
   * Calculate all 5 Gayed signals from market data
   */
  public static calculateAllSignals(
    marketData: Record<string, MarketData[]>
  ): (Signal | null)[] {
    const signals: (Signal | null)[] = [];

    try {
      // 1. Utilities/SPY Signal
      signals.push(this.calculateUtilitiesSpySignal(marketData));

      // 2. Lumber/Gold Signal
      signals.push(this.calculateLumberGoldSignal(marketData));

      // 3. Treasury Curve Signal
      signals.push(this.calculateTreasuryCurveSignal(marketData));

      // 4. VIX Defensive Signal
      signals.push(this.calculateVixDefensiveSignal(marketData));

      // 5. S&P 500 Moving Average Signal
      signals.push(this.calculateSP500MASignal(marketData));

    } catch (error: any) {
      console.error('Error calculating signals:', error);
    }

    return signals;
  }

  /**
   * Calculate consensus signal from individual signals
   */
  public static calculateConsensusSignal(
    signals: (Signal | null)[]
  ): ConsensusSignal {
    // Filter out null signals
    const validSignals = signals.filter((signal): signal is Signal => signal !== null);

    if (validSignals.length === 0) {
      return {
        consensus: 'Mixed',
        confidence: 0.0,
        riskOnCount: 0,
        riskOffCount: 0,
        neutralCount: 0,
        signals: [],
        timestamp: new Date().toISOString()
      };
    }

    // Count signal types
    let riskOnCount = 0;
    let riskOffCount = 0;
    let neutralCount = 0;

    validSignals.forEach(signal => {
      switch (signal.signal) {
        case 'Risk-On':
          riskOnCount++;
          break;
        case 'Risk-Off':
          riskOffCount++;
          break;
        case 'Neutral':
          neutralCount++;
          break;
      }
    });

    // Determine consensus
    let consensus: 'Risk-On' | 'Risk-Off' | 'Mixed';
    const riskOnWeight = this.calculateWeightedSignalStrength(validSignals, 'Risk-On');
    const riskOffWeight = this.calculateWeightedSignalStrength(validSignals, 'Risk-Off');

    const weightDifference = Math.abs(riskOnWeight - riskOffWeight);
    const minConsensusThreshold = 0.1;

    if (weightDifference < minConsensusThreshold) {
      consensus = 'Mixed';
    } else if (riskOnWeight > riskOffWeight) {
      consensus = 'Risk-On';
    } else {
      consensus = 'Risk-Off';
    }

    // Calculate confidence
    let consensusConfidence = Math.min(0.9, 0.5 + weightDifference);
    if (validSignals.length < 3) {
      consensusConfidence *= 0.8;
    }

    return {
      consensus,
      confidence: Math.max(0.1, consensusConfidence),
      riskOnCount,
      riskOffCount,
      neutralCount,
      signals: validSignals,
      timestamp: new Date().toISOString()
    };
  }

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

  private static getStrengthMultiplier(strength: 'Strong' | 'Moderate' | 'Weak'): number {
    switch (strength) {
      case 'Strong': return 1.0;
      case 'Moderate': return 0.75;
      case 'Weak': return 0.5;
      default: return 0.5;
    }
  }

  private static calculateUtilitiesSpySignal(
    marketData: Record<string, MarketData[]>
  ): Signal | null {
    try {
      const xluData = marketData['XLU'];
      const spyData = marketData['SPY'];

      if (!xluData || xluData.length === 0) {
        console.warn('Utilities/SPY signal failed: Missing XLU data', {
          availableSymbols: Object.keys(marketData),
          xluDataPoints: xluData?.length || 0
        });
        return null;
      }

      if (!spyData || spyData.length === 0) {
        console.warn('Utilities/SPY signal failed: Missing SPY data', {
          availableSymbols: Object.keys(marketData),
          spyDataPoints: spyData?.length || 0
        });
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

  private static calculateLumberGoldSignal(
    marketData: Record<string, MarketData[]>
  ): Signal | null {
    try {
      const lumberData = marketData['WOOD'];
      const goldData = marketData['GLD'];

      if (!lumberData || lumberData.length === 0) {
        console.warn('Lumber/Gold signal failed: Missing WOOD data', {
          availableSymbols: Object.keys(marketData),
          woodDataPoints: lumberData?.length || 0
        });
        return null;
      }

      if (!goldData || goldData.length === 0) {
        console.warn('Lumber/Gold signal failed: Missing GLD data', {
          availableSymbols: Object.keys(marketData),
          gldDataPoints: goldData?.length || 0
        });
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

  private static calculateTreasuryCurveSignal(
    marketData: Record<string, MarketData[]>
  ): Signal | null {
    try {
      const ty10Data = marketData['IEF'];
      const ty30Data = marketData['TLT'];

      if (!ty10Data || ty10Data.length === 0) {
        console.warn('Treasury Curve signal failed: Missing IEF data', {
          availableSymbols: Object.keys(marketData),
          iefDataPoints: ty10Data?.length || 0
        });
        return null;
      }

      if (!ty30Data || ty30Data.length === 0) {
        console.warn('Treasury Curve signal failed: Missing TLT data', {
          availableSymbols: Object.keys(marketData),
          tltDataPoints: ty30Data?.length || 0
        });
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

  private static calculateVixDefensiveSignal(
    marketData: Record<string, MarketData[]>
  ): Signal | null {
    try {
      const vixData = marketData['VIXY'];

      if (!vixData || vixData.length === 0) {
        console.warn('VIX Defensive signal failed: Missing VIXY data', {
          availableSymbols: Object.keys(marketData),
          vixyDataPoints: vixData?.length || 0
        });
        return null;
      }

      const vixPrices = vixData.map(d => d.close);
      return VixDefensiveSignalCalculator.calculateVixDefensiveSignal(vixPrices);
    } catch (error) {
      console.error('Error calculating VIX defensive signal:', error);
      return null;
    }
  }

  private static calculateSP500MASignal(
    marketData: Record<string, MarketData[]>
  ): Signal | null {
    try {
      const spyData = marketData['SPY'];

      if (!spyData || spyData.length === 0) {
        console.warn('S&P 500 MA signal failed: Missing SPY data', {
          availableSymbols: Object.keys(marketData),
          spyDataPoints: spyData?.length || 0
        });
        return null;
      }

      const spyPrices = spyData.map(d => d.close);
      return SP500MovingAverageSignalCalculator.calculateSP500MASignal(spyPrices);
    } catch (error) {
      console.error('Error calculating S&P 500 MA signal:', error);
      return null;
    }
  }
}
