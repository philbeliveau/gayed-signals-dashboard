// Re-export types from the shared types
export type { Signal, ConsensusSignal, MarketData } from '../shared/types/common';

// Export domain-specific types
export type { 
  SignalType, 
  SignalDirection, 
  SignalStrength,
  SignalResult,
  SignalConfiguration,
  SignalOrchestrationConfig,
  ETF,
  ETFRecommendations,
  SignalPerformance 
} from '../domains/trading-signals/types';