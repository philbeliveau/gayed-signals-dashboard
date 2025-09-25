/**
 * Trading Signals Domain - Public API
 * 
 * This domain handles Michael Gayed's 5 market regime signals:
 * - Utilities/SPY Signal
 * - Lumber/Gold Signal  
 * - Treasury Curve Signal
 * - VIX Defensive Signal
 * - S&P 500 MA Signal
 */

// Core signal engines
export { SignalOrchestrator } from './engines/orchestrator';
export { ConsensusCalculator } from './engines/consensus';

// Individual signal implementations
export { UtilitiesSpySignal } from './engines/gayed-signals/utilities-spy';
export { LumberGoldSignal } from './engines/gayed-signals/lumber-gold';
export { TreasuryCurveSignal } from './engines/gayed-signals/treasury-curve';
export { VixDefensiveSignal } from './engines/gayed-signals/vix-defensive';
export { SP500MASignal } from './engines/gayed-signals/sp500-ma';

// React hooks for components
export { useSignals } from './hooks/useSignals';
export { useMarketData } from './hooks/useMarketData';
export { useConsensus } from './hooks/useConsensus';

// UI Components
export { SignalDashboard } from './components/dashboards/SignalDashboard';
export { SignalChart } from './components/charts/SignalChart';
export { SignalCard } from './components/indicators/SignalCard';

// Services
export { signalService } from './services/signalService';
export { marketDataService } from './services/marketDataService';

// Types
export type { 
  Signal, 
  ConsensusSignal, 
  MarketData, 
  SignalType, 
  SignalStrength,
  SignalResult 
} from './types';

// Re-export commonly used utilities
export { formatSignal, validateSignalData } from './utils';