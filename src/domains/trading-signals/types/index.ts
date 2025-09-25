/**
 * Trading Signals Domain - Type Definitions
 */

export type SignalType = 
  | 'utilities_spy' 
  | 'lumber_gold' 
  | 'treasury_curve' 
  | 'vix_defensive' 
  | 'sp500_ma';

export type SignalDirection = 'Risk-On' | 'Risk-Off' | 'Neutral';

export type SignalStrength = 'Strong' | 'Moderate' | 'Weak';

export interface Signal {
  type: SignalType;
  signal: SignalDirection;
  strength: SignalStrength;
  confidence: number; // 0-1
  rawValue: number;
  date: string;
  metadata?: Record<string, any>;
}

export interface ConsensusSignal {
  consensus: 'Risk-On' | 'Risk-Off' | 'Mixed';
  confidence: number;
  riskOnCount: number;
  riskOffCount: number;
  neutralCount: number;
  signals: Signal[];
  timestamp: string;
}

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  timestamp: string;
}

export interface SignalCalculationInput {
  marketData: Record<string, MarketData[]>;
  historicalPeriod?: number;
  lookbackDays?: number;
}

export interface SignalResult {
  signal: Signal;
  calculationDetails: {
    inputs: any;
    intermediateValues: any;
    confidence: number;
  };
}

export interface SignalConfiguration {
  enabled: boolean;
  weight: number;
  parameters: Record<string, any>;
}

export interface SignalOrchestrationConfig {
  signals: Record<SignalType, SignalConfiguration>;
  consensus: {
    method: 'majority' | 'weighted' | 'confidence-based';
    minimumSignals: number;
  };
}

// ETF Recommendation Types
export interface ETF {
  ticker: string;
  name: string;
  expenseRatio: number;
  description: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Very High';
  category: string;
}

export interface ETFRecommendations {
  signalType: SignalType;
  riskOff: ETF[];
  riskOn: ETF[];
  neutral?: ETF[];
}

// Performance Tracking Types
export interface SignalPerformance {
  signalType: SignalType;
  accuracy: number;
  totalSignals: number;
  correctPredictions: number;
  averageHoldingPeriod: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
}