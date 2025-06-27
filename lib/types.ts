export interface MarketData {
  date: string;
  symbol: string;
  close: number;
  volume?: number;
}

export interface Signal {
  date: string;
  type: 'utilities_spy' | 'lumber_gold' | 'treasury_duration' | 'sp500_ma' | 'vix';
  signal: 'Risk-On' | 'Risk-Off' | 'Neutral';
  strength: 'Strong' | 'Moderate' | 'Weak';
  confidence: number; // 0-1
  rawValue: number;
  metadata?: Record<string, any>;
}

export interface ConsensusSignal {
  date: string;
  consensus: 'Risk-On' | 'Risk-Off' | 'Mixed';
  confidence: number;
  riskOnCount: number;
  riskOffCount: number;
  signals: Signal[];
}
