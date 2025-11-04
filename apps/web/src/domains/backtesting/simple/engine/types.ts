/**
 * Type definitions for Simple Gayed Backtesting Platform
 * Story 4.0j
 */

export type SignalType =
  | 'utilities-spy'
  | 'lumber-gold'
  | 'treasury-curve'
  | 'sp500-ma'
  | 'vix-defensive';

export type Position = 'RISK_ON' | 'RISK_OFF';

export interface TradeRecord {
  date: string;
  action: 'BUY' | 'SELL';
  symbol: string;
  price: number;
  reason: string;
  signalValue?: number;
}

export interface DailyPortfolioValue {
  date: string;
  value: number;
  position: string;
  signalValue?: number;
}

export interface PerformanceMetrics {
  totalReturn: number; // Percentage
  numberOfTrades: number;
  winRate: number; // Percentage
  maxDrawdown: number; // Percentage
  finalValue: number;
  initialValue: number;
}

export interface BacktestConfig {
  signalType: SignalType;
  startDate: string;
  endDate: string;
  initialCapital: number;
  riskOnSymbol?: string;
  riskOffSymbol?: string;
}

export interface BacktestResult {
  config: BacktestConfig;
  metrics: PerformanceMetrics;
  trades: TradeRecord[];
  equityCurve: DailyPortfolioValue[];
  dataQuality: {
    score: number;
    issues: string[];
  };
}

export interface MarketDataPoint {
  symbol: string;
  date: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

export interface SignalConfig {
  type: SignalType;
  riskOnSymbol: string;
  riskOffSymbol: string;
  requiredSymbols: string[];
  threshold?: number;
}
