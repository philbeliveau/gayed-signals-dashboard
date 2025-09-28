/**
 * Graceful Degradation System
 * 
 * Provides intelligent fallback mechanisms to maintain service availability
 * when individual components or data sources fail, ensuring the best possible
 * user experience under adverse conditions.
 */

import { Signal, ConsensusSignal, MarketData } from '../types';
import { riskManager, AlertLevel } from './risk-manager';

export interface DegradationLevel {
  level: 'full' | 'partial' | 'minimal' | 'emergency';
  description: string;
  availableFeatures: string[];
  disabledFeatures: string[];
  dataReliability: number; // 0-100
}

export interface ServiceStatus {
  dataFetching: 'healthy' | 'degraded' | 'failed';
  signalCalculation: 'healthy' | 'degraded' | 'failed';
  consensus: 'healthy' | 'degraded' | 'failed';
  alerts: 'healthy' | 'degraded' | 'failed';
}

export interface DegradedResponse<T> {
  data: T;
  degradationLevel: DegradationLevel;
  warnings: string[];
  fallbacksUsed: string[];
  reliability: number;
  timestamp: Date;
}

export interface PartialSignalResult {
  availableSignals: Signal[];
  failedSignals: Array<{
    type: string;
    error: string;
    fallbackUsed?: boolean;
  }>;
  dataCompleteness: Record<string, number>; // Symbol -> percentage of data available
}

/**
 * Service Degradation Manager
 */
export class GracefulDegradationManager {
  private currentDegradationLevel: DegradationLevel;
  private serviceStatus: ServiceStatus;
  private fallbackStrategies = new Map<string, () => Promise<unknown>>();
  private emergencyData: Record<string, MarketData[]> = {};

  constructor() {
    this.currentDegradationLevel = this.getFullServiceLevel();
    this.serviceStatus = {
      dataFetching: 'healthy',
      signalCalculation: 'healthy',
      consensus: 'healthy',
      alerts: 'healthy'
    };
    this.initializeFallbackStrategies();
    this.loadEmergencyData();
  }

  /**
   * Initialize fallback strategies for each service
   */
  private initializeFallbackStrategies(): void {
    // Data fetching fallback
    this.fallbackStrategies.set('dataFetching', async () => {
      return this.provideEmergencyData();
    });

    // Signal calculation fallback
    this.fallbackStrategies.set('signalCalculation', async () => {
      return this.provideSimplifiedSignals();
    });

    // Consensus fallback
    this.fallbackStrategies.set('consensus', async () => {
      return this.provideBasicConsensus();
    });
  }

  /**
   * Process market data with graceful degradation
   */
  async processMarketDataWithDegradation(
    symbols: string[],
    marketDataFetcher: () => Promise<Record<string, MarketData[]>>
  ): Promise<DegradedResponse<Record<string, MarketData[]>>> {
    const warnings: string[] = [];
    const fallbacksUsed: string[] = [];
    let reliability = 100;

    try {
      // Attempt normal data fetching
      const data = await marketDataFetcher();
      
      // Validate data completeness
      const completeness = this.validateDataCompleteness(data, symbols);
      
      if (completeness.percentage < 100) {
        warnings.push(`Data incomplete: ${completeness.percentage.toFixed(1)}% of requested symbols available`);
        reliability = completeness.percentage;
        
        if (completeness.percentage < 50) {
          // Use emergency data for missing symbols
          const emergencyData = await this.provideEmergencyData(completeness.missingSymbols);
          Object.assign(data, emergencyData);
          fallbacksUsed.push('emergency_data');
          reliability = Math.max(reliability, 60); // Emergency data provides some reliability
        }
      }

      const degradationLevel = this.calculateDegradationLevel(reliability, warnings.length);
      
      return {
        data,
        degradationLevel,
        warnings,
        fallbacksUsed,
        reliability,
        timestamp: new Date()
      };

    } catch (error) {
      // Complete failure - use emergency data
      warnings.push(`Primary data source failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      try {
        const emergencyData = await this.provideEmergencyData(symbols);
        fallbacksUsed.push('complete_emergency_fallback');
        reliability = 30; // Emergency data is low reliability
        
        const degradationLevel = this.calculateDegradationLevel(reliability, warnings.length);
        
        return {
          data: emergencyData,
          degradationLevel,
          warnings,
          fallbacksUsed,
          reliability,
          timestamp: new Date()
        };
      } catch (emergencyError) {
        // Complete system failure
        warnings.push(`Emergency data also failed: ${emergencyError instanceof Error ? emergencyError.message : 'Unknown error'}`);
        reliability = 0;
        
        return {
          data: {},
          degradationLevel: this.getEmergencyLevel(),
          warnings,
          fallbacksUsed: ['complete_failure'],
          reliability,
          timestamp: new Date()
        };
      }
    }
  }

  /**
   * Calculate signals with graceful degradation
   */
  async calculateSignalsWithDegradation(
    marketData: Record<string, MarketData[]>,
    signalCalculators: Record<string, (data: Record<string, MarketData[]>) => Signal[]>
  ): Promise<DegradedResponse<PartialSignalResult>> {
    const warnings: string[] = [];
    const fallbacksUsed: string[] = [];
    const availableSignals: Signal[] = [];
    const failedSignals: Array<{ type: string; error: string; fallbackUsed?: boolean }> = [];
    
    let totalReliability = 0;

    // Attempt to calculate each signal type
    for (const [signalType, calculator] of Object.entries(signalCalculators)) {
      try {
        const signals = calculator(marketData);
        if (signals.length > 0) {
          availableSignals.push(...signals);
          totalReliability += 100;
        } else {
          warnings.push(`No signals generated for ${signalType}`);
          totalReliability += 50; // Partial credit for successful calculation with no results
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        failedSignals.push({ type: signalType, error: errorMessage });
        
        // Try fallback calculation
        try {
          const fallbackSignals = await this.calculateFallbackSignal(signalType, marketData);
          if (fallbackSignals.length > 0) {
            availableSignals.push(...fallbackSignals);
            failedSignals[failedSignals.length - 1].fallbackUsed = true;
            fallbacksUsed.push(`${signalType}_fallback`);
            totalReliability += 70; // Fallback has lower reliability
          } else {
            totalReliability += 20; // Minimal credit for attempted fallback
          }
        } catch {
          warnings.push(`Both primary and fallback calculations failed for ${signalType}`);
          totalReliability += 0;
        }
      }
    }

    const averageReliability = totalReliability / Object.keys(signalCalculators).length;
    const dataCompleteness = this.calculateDataCompleteness(marketData);
    
    const degradationLevel = this.calculateDegradationLevel(averageReliability, warnings.length);

    return {
      data: {
        availableSignals,
        failedSignals,
        dataCompleteness
      },
      degradationLevel,
      warnings,
      fallbacksUsed,
      reliability: averageReliability,
      timestamp: new Date()
    };
  }

  /**
   * Calculate consensus with graceful degradation
   */
  async calculateConsensusWithDegradation(
    signals: Signal[],
    consensusCalculator: (signals: Signal[]) => ConsensusSignal
  ): Promise<DegradedResponse<ConsensusSignal | null>> {
    const warnings: string[] = [];
    const fallbacksUsed: string[] = [];
    let reliability = 100;

    if (signals.length === 0) {
      warnings.push('No signals available for consensus calculation');
      return {
        data: null,
        degradationLevel: this.getEmergencyLevel(),
        warnings,
        fallbacksUsed,
        reliability: 0,
        timestamp: new Date()
      };
    }

    try {
      const consensus = consensusCalculator(signals);
      
      // Adjust reliability based on signal count and confidence
      if (signals.length < 3) {
        warnings.push('Limited signals available for consensus (< 3)');
        reliability = 70;
      }
      
      if (consensus.confidence < 0.6) {
        warnings.push('Low consensus confidence');
        reliability = Math.min(reliability, 60);
      }

      const degradationLevel = this.calculateDegradationLevel(reliability, warnings.length);

      return {
        data: consensus,
        degradationLevel,
        warnings,
        fallbacksUsed,
        reliability,
        timestamp: new Date()
      };

    } catch (error) {
      warnings.push(`Consensus calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Try simplified consensus
      try {
        const simplifiedConsensus = this.calculateSimplifiedConsensus(signals);
        fallbacksUsed.push('simplified_consensus');
        reliability = 50;
        
        return {
          data: simplifiedConsensus,
          degradationLevel: this.calculateDegradationLevel(reliability, warnings.length),
          warnings,
          fallbacksUsed,
          reliability,
          timestamp: new Date()
        };
      } catch (fallbackError) {
        warnings.push(`Simplified consensus also failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
        
        return {
          data: null,
          degradationLevel: this.getEmergencyLevel(),
          warnings,
          fallbacksUsed,
          reliability: 0,
          timestamp: new Date()
        };
      }
    }
  }

  /**
   * Provide emergency data when all data sources fail
   */
  private async provideEmergencyData(symbols?: string[]): Promise<Record<string, MarketData[]>> {
    const targetSymbols = symbols || ['SPY', 'XLU', 'GLD', 'VIX', 'TLT', 'IEF', 'LBS'];
    const emergencyData: Record<string, MarketData[]> = {};

    for (const symbol of targetSymbols) {
      if (this.emergencyData[symbol]) {
        emergencyData[symbol] = this.emergencyData[symbol];
      } else {
        // Generate minimal synthetic data
        emergencyData[symbol] = this.generateMinimalSyntheticData(symbol);
      }
    }

    riskManager.emit('alert', {
      id: `emergency_data_${Date.now()}`,
      level: AlertLevel.CRITICAL,
      message: 'Using emergency data due to complete data source failure',
      timestamp: new Date(),
      metadata: { symbols: targetSymbols }
    });

    return emergencyData;
  }

  /**
   * Calculate fallback signal when primary calculation fails
   */
  private async calculateFallbackSignal(signalType: string, marketData: Record<string, MarketData[]>): Promise<Signal[]> {
    const today = new Date().toISOString().split('T')[0];
    
    // Simplified signal calculation based on basic market data
    switch (signalType) {
      case 'utilities_spy':
        return this.calculateSimpleUtilitiesSignal(marketData, today);
      case 'lumber_gold':
        return this.calculateSimpleLumberGoldSignal(marketData, today);
      case 'treasury_curve':
        return this.calculateSimpleTreasurySignal(marketData, today);
      case 'sp500_ma':
        return this.calculateSimpleMovingAverageSignal(marketData, today);
      case 'vix_defensive':
        return this.calculateSimpleVixSignal(marketData, today);
      default:
        return [];
    }
  }

  /**
   * Calculate simplified utilities signal
   */
  private calculateSimpleUtilitiesSignal(marketData: Record<string, MarketData[]>, date: string): Signal[] {
    const spyData = marketData['SPY'];
    const xuData = marketData['XLU'];
    
    if (!spyData || !xuData || spyData.length === 0 || xuData.length === 0) {
      return [];
    }

    const spyLatest = spyData[spyData.length - 1];
    const xuLatest = xuData[xuData.length - 1];
    
    // Simple comparison - if utilities outperform, it's risk-off
    const spyChange = spyData.length > 1 ? (spyLatest.close - spyData[spyData.length - 2].close) / spyData[spyData.length - 2].close : 0;
    const xuChange = xuData.length > 1 ? (xuLatest.close - xuData[xuData.length - 2].close) / xuData[xuData.length - 2].close : 0;
    
    const signal: 'Risk-On' | 'Risk-Off' | 'Neutral' = xuChange > spyChange ? 'Risk-Off' : 'Risk-On';
    
    return [{
      date,
      type: 'utilities_spy',
      signal,
      strength: 'Weak',
      confidence: 0.3, // Low confidence for fallback
      rawValue: xuChange - spyChange,
      metadata: { fallback: true, spyChange, xuChange }
    }];
  }

  /**
   * Calculate simplified lumber-gold signal
   */
  private calculateSimpleLumberGoldSignal(marketData: Record<string, MarketData[]>, date: string): Signal[] {
    const lbsData = marketData['LBS'];
    const gldData = marketData['GLD'];
    
    if (!lbsData || !gldData || lbsData.length === 0 || gldData.length === 0) {
      return [];
    }

    const lbsLatest = lbsData[lbsData.length - 1];
    const gldLatest = gldData[gldData.length - 1];
    
    // Simple ratio comparison
    const ratio = lbsLatest.close / gldLatest.close;
    const signal: 'Risk-On' | 'Risk-Off' | 'Neutral' = ratio > 0.15 ? 'Risk-On' : 'Risk-Off';
    
    return [{
      date,
      type: 'lumber_gold',
      signal,
      strength: 'Weak',
      confidence: 0.3,
      rawValue: ratio,
      metadata: { fallback: true, ratio }
    }];
  }

  /**
   * Calculate other simplified signals
   */
  private calculateSimpleTreasurySignal(marketData: Record<string, MarketData[]>, date: string): Signal[] {
    const tltData = marketData['TLT'];
    const iefData = marketData['IEF'];
    
    if (!tltData || !iefData || tltData.length === 0 || iefData.length === 0) {
      return [];
    }

    const tltLatest = tltData[tltData.length - 1];
    const iefLatest = iefData[iefData.length - 1];
    
    const ratio = tltLatest.close / iefLatest.close;
    const signal: 'Risk-On' | 'Risk-Off' | 'Neutral' = ratio > 0.9 ? 'Risk-Off' : 'Risk-On';
    
    return [{
      date,
      type: 'treasury_curve',
      signal,
      strength: 'Weak',
      confidence: 0.3,
      rawValue: ratio,
      metadata: { fallback: true, ratio }
    }];
  }

  private calculateSimpleMovingAverageSignal(marketData: Record<string, MarketData[]>, date: string): Signal[] {
    const spyData = marketData['SPY'];
    
    if (!spyData || spyData.length < 50) {
      return [];
    }

    const latest = spyData[spyData.length - 1];
    const ma50 = spyData.slice(-50).reduce((sum, d) => sum + d.close, 0) / 50;
    
    const signal: 'Risk-On' | 'Risk-Off' | 'Neutral' = latest.close > ma50 ? 'Risk-On' : 'Risk-Off';
    
    return [{
      date,
      type: 'sp500_ma',
      signal,
      strength: 'Weak',
      confidence: 0.3,
      rawValue: (latest.close - ma50) / ma50,
      metadata: { fallback: true, ma50, current: latest.close }
    }];
  }

  private calculateSimpleVixSignal(marketData: Record<string, MarketData[]>, date: string): Signal[] {
    const vixData = marketData['VIX'];
    
    if (!vixData || vixData.length === 0) {
      return [];
    }

    const latest = vixData[vixData.length - 1];
    const signal: 'Risk-On' | 'Risk-Off' | 'Neutral' = latest.close > 25 ? 'Risk-Off' : 'Risk-On';
    
    return [{
      date,
      type: 'vix_defensive',
      signal,
      strength: 'Weak',
      confidence: 0.3,
      rawValue: latest.close,
      metadata: { fallback: true, vix: latest.close }
    }];
  }

  /**
   * Calculate simplified consensus when primary fails
   */
  private calculateSimplifiedConsensus(signals: Signal[]): ConsensusSignal {
    const riskOnCount = signals.filter(s => s.signal === 'Risk-On').length;
    const riskOffCount = signals.filter(s => s.signal === 'Risk-Off').length;
    
    let consensus: 'Risk-On' | 'Risk-Off' | 'Mixed';
    let confidence: number;
    
    if (riskOnCount > riskOffCount) {
      consensus = 'Risk-On';
      confidence = riskOnCount / signals.length;
    } else if (riskOffCount > riskOnCount) {
      consensus = 'Risk-Off';
      confidence = riskOffCount / signals.length;
    } else {
      consensus = 'Mixed';
      confidence = 0.5;
    }

    return {
      date: new Date().toISOString().split('T')[0],
      consensus,
      confidence: Math.max(0.3, confidence), // Minimum confidence for fallback
      riskOnCount,
      riskOffCount,
      signals
    };
  }

  /**
   * Load emergency data (would be loaded from persistent storage in real implementation)
   */
  private loadEmergencyData(): void {
    // In a real implementation, this would load cached data from Redis/database
    // For now, we'll generate minimal synthetic data as needed
    console.log('Emergency data system initialized');
  }

  /**
   * Generate minimal synthetic data for emergency use
   */
  private generateMinimalSyntheticData(symbol: string): MarketData[] {
    const data: MarketData[] = [];
    const basePrice = this.getBasePriceForSymbol(symbol);
    
    // Generate 30 days of data
    for (let i = 30; i >= 0; i--) {
      const date = new Date(Date.now() - (i * 24 * 60 * 60 * 1000));
      data.push({
        date: date.toISOString().split('T')[0],
        symbol,
        close: basePrice * (1 + (Math.random() - 0.5) * 0.02), // ±1% variation
        volume: 1000000
      });
    }
    
    return data;
  }

  private getBasePriceForSymbol(symbol: string): number {
    const basePrices: Record<string, number> = {
      'SPY': 450,
      'XLU': 70,
      'GLD': 180,
      'VIX': 20,
      'TLT': 95,
      'IEF': 105,
      'LBS': 25
    };
    
    return basePrices[symbol] || 100;
  }

  /**
   * Validate data completeness
   */
  private validateDataCompleteness(
    data: Record<string, MarketData[]>, 
    requestedSymbols: string[]
  ): { percentage: number; missingSymbols: string[] } {
    const missingSymbols = requestedSymbols.filter(symbol => {
      const cleanSymbol = symbol.replace('^', '');
      return !data[cleanSymbol] || data[cleanSymbol].length === 0;
    });
    
    const percentage = ((requestedSymbols.length - missingSymbols.length) / requestedSymbols.length) * 100;
    
    return { percentage, missingSymbols };
  }

  /**
   * Calculate data completeness for each symbol
   */
  private calculateDataCompleteness(data: Record<string, MarketData[]>): Record<string, number> {
    const completeness: Record<string, number> = {};
    const expectedDataPoints = 252; // 1 year of trading days
    
    for (const [symbol, marketData] of Object.entries(data)) {
      if (marketData.length === 0) {
        completeness[symbol] = 0;
      } else {
        completeness[symbol] = Math.min(100, (marketData.length / expectedDataPoints) * 100);
      }
    }
    
    return completeness;
  }

  /**
   * Calculate degradation level based on reliability and warnings
   */
  private calculateDegradationLevel(reliability: number, warningCount: number): DegradationLevel {
    if (reliability >= 90 && warningCount === 0) {
      return this.getFullServiceLevel();
    } else if (reliability >= 70 && warningCount <= 2) {
      return this.getPartialServiceLevel();
    } else if (reliability >= 40 && warningCount <= 5) {
      return this.getMinimalServiceLevel();
    } else {
      return this.getEmergencyLevel();
    }
  }

  private getFullServiceLevel(): DegradationLevel {
    return {
      level: 'full',
      description: 'All services operating normally',
      availableFeatures: ['real_time_data', 'all_signals', 'consensus', 'alerts', 'history'],
      disabledFeatures: [],
      dataReliability: 100
    };
  }

  private getPartialServiceLevel(): DegradationLevel {
    return {
      level: 'partial',
      description: 'Some services degraded, core functionality available',
      availableFeatures: ['real_time_data', 'most_signals', 'consensus', 'alerts'],
      disabledFeatures: ['history', 'advanced_analytics'],
      dataReliability: 80
    };
  }

  private getMinimalServiceLevel(): DegradationLevel {
    return {
      level: 'minimal',
      description: 'Limited functionality, basic signals only',
      availableFeatures: ['basic_signals', 'simple_consensus'],
      disabledFeatures: ['real_time_data', 'advanced_signals', 'history', 'alerts'],
      dataReliability: 50
    };
  }

  private getEmergencyLevel(): DegradationLevel {
    return {
      level: 'emergency',
      description: 'Emergency mode - synthetic data only',
      availableFeatures: ['emergency_data', 'status_updates'],
      disabledFeatures: ['real_time_data', 'signals', 'consensus', 'alerts', 'history'],
      dataReliability: 20
    };
  }

  /**
   * Get current degradation status
   */
  getCurrentDegradationLevel(): DegradationLevel {
    return this.currentDegradationLevel;
  }

  /**
   * Update service status
   */
  updateServiceStatus(service: keyof ServiceStatus, status: ServiceStatus[keyof ServiceStatus]): void {
    this.serviceStatus[service] = status;
    
    // Recalculate degradation level based on service status
    const overallHealth = Object.values(this.serviceStatus);
    const healthyServices = overallHealth.filter(s => s === 'healthy').length;
    const reliability = (healthyServices / overallHealth.length) * 100;
    
    this.currentDegradationLevel = this.calculateDegradationLevel(reliability, 0);
  }

  /**
   * Get service status
   */
  getServiceStatus(): ServiceStatus {
    return { ...this.serviceStatus };
  }

  /**
   * Provide simplified signals when signal calculation fails
   */
  private async provideSimplifiedSignals(): Promise<Signal[]> {
    const now = new Date().toISOString();
    return [
      {
        date: now,
        type: 'sp500_ma',
        signal: 'Neutral',
        strength: 'Weak',
        confidence: 0.3,
        rawValue: 0,
        metadata: { fallback: true, source: 'emergency' }
      }
    ];
  }

  /**
   * Provide basic consensus when consensus calculation fails
   */
  private async provideBasicConsensus(): Promise<ConsensusSignal> {
    const now = new Date().toISOString();
    return {
      date: now,
      consensus: 'Mixed',
      confidence: 0.2,
      riskOnCount: 0,
      riskOffCount: 0,
      signals: []
    };
  }
}

// Export singleton instance
export const gracefulDegradationManager = new GracefulDegradationManager();