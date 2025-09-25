/**
 * Signal Orchestrator
 * 
 * Coordinates the calculation of all Michael Gayed's market regime signals
 * and provides consensus signal generation with intelligent aggregation.
 */

import type { Signal, ConsensusSignal, MarketData, SignalCalculationInput, SignalOrchestrationConfig } from '../types';
import { UtilitiesSpySignal } from './gayed-signals/utilities-spy';
import { LumberGoldSignal } from './gayed-signals/lumber-gold';
// Import other signals as they're migrated
// import { TreasuryCurveSignal } from './gayed-signals/treasury-curve';
// import { VixDefensiveSignal } from './gayed-signals/vix-defensive';
// import { SP500MASignal } from './gayed-signals/sp500-ma';

export class SignalOrchestrator {
  private static readonly REQUIRED_SYMBOLS = [
    'SPY',     // S&P 500 ETF (for utilities signal and MA signal)
    'XLU',     // Utilities ETF (for utilities signal)
    'WOOD',    // Lumber ETF proxy (alternative: lumber futures data)
    'GLD',     // Gold ETF (for lumber/gold signal)
    'IEF',     // 10-year Treasury ETF (for treasury curve signal)
    'TLT',     // 30-year Treasury ETF (for treasury curve signal)
    '^VIX'     // VIX volatility index (for VIX defensive signal)
  ];

  private static readonly DEFAULT_CONFIG: SignalOrchestrationConfig = {
    signals: {
      utilities_spy: { enabled: true, weight: 1.0, parameters: {} },
      lumber_gold: { enabled: true, weight: 1.0, parameters: {} },
      treasury_curve: { enabled: true, weight: 1.0, parameters: {} },
      vix_defensive: { enabled: true, weight: 1.0, parameters: {} },
      sp500_ma: { enabled: true, weight: 1.0, parameters: {} }
    },
    consensus: {
      method: 'majority',
      minimumSignals: 3
    }
  };

  /**
   * Get all required market data symbols for signal calculations
   */
  static getRequiredSymbols(): string[] {
    return [...this.REQUIRED_SYMBOLS];
  }

  /**
   * Calculate essential signals for fast mode (Utilities/SPY + S&P 500 MA)
   * These are the most important signals for quick market regime assessment
   */
  static calculateFastSignals(
    marketData: Record<string, MarketData[]>,
    config?: Partial<SignalOrchestrationConfig>
  ): Signal[] {
    const signals: Signal[] = [];
    
    try {
      // 1. Utilities/SPY Signal (most important for market regime)
      const utilitiesSignal = this.calculateUtilitiesSpySignal(marketData);
      if (utilitiesSignal) signals.push(utilitiesSignal);

      // 2. S&P 500 Moving Average Signal (trend following) - TODO: Implement
      // const sp500MASignal = this.calculateSP500MASignal(marketData);
      // if (sp500MASignal) signals.push(sp500MASignal);

    } catch (error) {
      console.error('Error calculating fast signals:', error);
    }

    return signals;
  }

  /**
   * Calculate all 5 Gayed signals from market data
   */
  static calculateAllSignals(
    input: SignalCalculationInput,
    config: SignalOrchestrationConfig = this.DEFAULT_CONFIG
  ): Signal[] {
    const { marketData } = input;
    const signals: Signal[] = [];
    
    try {
      // 1. Utilities/SPY Signal
      if (config.signals.utilities_spy.enabled) {
        const signal = this.calculateUtilitiesSpySignal(marketData);
        if (signal) signals.push(signal);
      }

      // 2. Lumber/Gold Signal  
      if (config.signals.lumber_gold.enabled) {
        const signal = this.calculateLumberGoldSignal(marketData);
        if (signal) signals.push(signal);
      }

      // 3. Treasury Curve Signal - TODO: Migrate and implement
      // if (config.signals.treasury_curve.enabled) {
      //   const signal = this.calculateTreasuryCurveSignal(marketData);
      //   if (signal) signals.push(signal);
      // }

      // 4. VIX Defensive Signal - TODO: Migrate and implement
      // if (config.signals.vix_defensive.enabled) {
      //   const signal = this.calculateVixDefensiveSignal(marketData);
      //   if (signal) signals.push(signal);
      // }

      // 5. S&P 500 Moving Average Signal - TODO: Migrate and implement
      // if (config.signals.sp500_ma.enabled) {
      //   const signal = this.calculateSP500MASignal(marketData);
      //   if (signal) signals.push(signal);
      // }

    } catch (error) {
      console.error('Error calculating all signals:', error);
    }

    return signals;
  }

  /**
   * Generate consensus signal from individual signals
   */
  static calculateConsensusSignal(
    signals: Signal[],
    config: SignalOrchestrationConfig = this.DEFAULT_CONFIG
  ): ConsensusSignal {
    const validSignals = signals.filter(s => s !== null);
    
    if (validSignals.length < config.consensus.minimumSignals) {
      return {
        consensus: 'Mixed',
        confidence: 0.0,
        riskOnCount: 0,
        riskOffCount: 0,
        neutralCount: 0,
        signals: validSignals,
        timestamp: new Date().toISOString()
      };
    }

    // Count signals by direction
    const riskOnCount = validSignals.filter(s => s.signal === 'Risk-On').length;
    const riskOffCount = validSignals.filter(s => s.signal === 'Risk-Off').length;
    const neutralCount = validSignals.filter(s => s.signal === 'Neutral').length;

    // Determine consensus based on method
    let consensus: 'Risk-On' | 'Risk-Off' | 'Mixed';
    let confidence: number;

    switch (config.consensus.method) {
      case 'majority':
        ({ consensus, confidence } = this.calculateMajorityConsensus(
          riskOnCount, riskOffCount, neutralCount, validSignals.length
        ));
        break;
        
      case 'weighted':
        ({ consensus, confidence } = this.calculateWeightedConsensus(
          validSignals, config
        ));
        break;
        
      case 'confidence-based':
        ({ consensus, confidence } = this.calculateConfidenceBasedConsensus(
          validSignals
        ));
        break;
        
      default:
        ({ consensus, confidence } = this.calculateMajorityConsensus(
          riskOnCount, riskOffCount, neutralCount, validSignals.length
        ));
    }

    return {
      consensus,
      confidence,
      riskOnCount,
      riskOffCount,
      neutralCount,
      signals: validSignals,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate Utilities/SPY signal
   */
  private static calculateUtilitiesSpySignal(marketData: Record<string, MarketData[]>): Signal | null {
    const xluData = marketData['XLU'];
    const spyData = marketData['SPY'];
    
    if (!xluData || !spyData) {
      return null;
    }
    
    return UtilitiesSpySignal.calculateFromMarketData(xluData, spyData);
  }

  /**
   * Calculate Lumber/Gold signal
   */
  private static calculateLumberGoldSignal(marketData: Record<string, MarketData[]>): Signal | null {
    const lumberData = marketData['WOOD']; // Using WOOD ETF as lumber proxy
    const goldData = marketData['GLD'];
    
    if (!lumberData || !goldData) {
      return null;
    }
    
    return LumberGoldSignal.calculateFromMarketData(lumberData, goldData);
  }

  /**
   * Calculate majority consensus
   */
  private static calculateMajorityConsensus(
    riskOnCount: number, 
    riskOffCount: number, 
    neutralCount: number, 
    totalSignals: number
  ): { consensus: 'Risk-On' | 'Risk-Off' | 'Mixed', confidence: number } {
    const majority = totalSignals / 2;
    
    if (riskOnCount > majority) {
      return {
        consensus: 'Risk-On',
        confidence: riskOnCount / totalSignals
      };
    } else if (riskOffCount > majority) {
      return {
        consensus: 'Risk-Off', 
        confidence: riskOffCount / totalSignals
      };
    } else {
      return {
        consensus: 'Mixed',
        confidence: Math.max(riskOnCount, riskOffCount) / totalSignals
      };
    }
  }

  /**
   * Calculate weighted consensus based on signal weights
   */
  private static calculateWeightedConsensus(
    signals: Signal[],
    config: SignalOrchestrationConfig
  ): { consensus: 'Risk-On' | 'Risk-Off' | 'Mixed', confidence: number } {
    let riskOnWeight = 0;
    let riskOffWeight = 0;
    let totalWeight = 0;

    for (const signal of signals) {
      const signalConfig = config.signals[signal.type];
      const weight = signalConfig?.weight || 1.0;
      
      totalWeight += weight;
      
      if (signal.signal === 'Risk-On') {
        riskOnWeight += weight;
      } else if (signal.signal === 'Risk-Off') {
        riskOffWeight += weight;
      }
      // Neutral signals don't add to either weight
    }

    const riskOnRatio = riskOnWeight / totalWeight;
    const riskOffRatio = riskOffWeight / totalWeight;

    if (riskOnRatio > 0.5) {
      return { consensus: 'Risk-On', confidence: riskOnRatio };
    } else if (riskOffRatio > 0.5) {
      return { consensus: 'Risk-Off', confidence: riskOffRatio };
    } else {
      return { consensus: 'Mixed', confidence: Math.max(riskOnRatio, riskOffRatio) };
    }
  }

  /**
   * Calculate confidence-based consensus (higher confidence signals have more influence)
   */
  private static calculateConfidenceBasedConsensus(
    signals: Signal[]
  ): { consensus: 'Risk-On' | 'Risk-Off' | 'Mixed', confidence: number } {
    let riskOnConfidence = 0;
    let riskOffConfidence = 0;
    let totalConfidence = 0;

    for (const signal of signals) {
      const confidence = signal.confidence;
      
      totalConfidence += confidence;
      
      if (signal.signal === 'Risk-On') {
        riskOnConfidence += confidence;
      } else if (signal.signal === 'Risk-Off') {
        riskOffConfidence += confidence;
      }
    }

    if (totalConfidence === 0) {
      return { consensus: 'Mixed', confidence: 0 };
    }

    const riskOnRatio = riskOnConfidence / totalConfidence;
    const riskOffRatio = riskOffConfidence / totalConfidence;

    if (riskOnRatio > 0.5) {
      return { consensus: 'Risk-On', confidence: riskOnRatio };
    } else if (riskOffRatio > 0.5) {
      return { consensus: 'Risk-Off', confidence: riskOffRatio };
    } else {
      return { consensus: 'Mixed', confidence: Math.max(riskOnRatio, riskOffRatio) };
    }
  }

  /**
   * Get orchestrator configuration and status
   */
  static getConfiguration(): {
    signalsImplemented: string[];
    signalsPlanned: string[];
    consensusMethods: string[];
    minimumDataRequirements: Record<string, number>;
  } {
    return {
      signalsImplemented: ['utilities_spy', 'lumber_gold'],
      signalsPlanned: ['treasury_curve', 'vix_defensive', 'sp500_ma'],
      consensusMethods: ['majority', 'weighted', 'confidence-based'],
      minimumDataRequirements: {
        'utilities_spy': 22, // 21 + 1 days
        'lumber_gold': 92,   // 91 + 1 days  
        'treasury_curve': 22,
        'vix_defensive': 22,
        'sp500_ma': 201      // 200 + 1 days for moving average
      }
    };
  }
}