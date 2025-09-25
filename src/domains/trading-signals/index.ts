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

// Individual signal implementations
export { UtilitiesSpySignal } from './engines/gayed-signals/utilities-spy';
export { LumberGoldSignal } from './engines/gayed-signals/lumber-gold';
export { TreasuryCurveSignal } from './engines/gayed-signals/treasury-curve';
export { VixDefensiveSignal } from './engines/gayed-signals/vix-defensive';
export { SP500MASignal } from './engines/gayed-signals/sp500-ma';

// Services - temporarily disabled due to import issues
// export { signalService } from './services/signalService';

// Types
export type { 
  Signal, 
  ConsensusSignal, 
  MarketData, 
  SignalType, 
  SignalStrength,
  SignalResult 
} from './types';