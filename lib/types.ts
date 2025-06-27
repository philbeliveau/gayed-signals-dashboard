export interface MarketData {
  date: string;
  symbol: string;
  close: number;
  volume?: number;
}

export interface Signal {
  date: string;
  type: 'utilities_spy' | 'lumber_gold' | 'treasury_curve' | 'sp500_ma' | 'vix_defensive';
  signal: 'Risk-On' | 'Risk-Off' | 'Neutral';
  strength: 'Strong' | 'Moderate' | 'Weak';
  confidence: number; // 0-1
  rawValue: number;
  metadata?: Record<string, unknown>;
}

export interface ConsensusSignal {
  date: string;
  consensus: 'Risk-On' | 'Risk-Off' | 'Mixed';
  confidence: number;
  riskOnCount: number;
  riskOffCount: number;
  signals: Signal[];
}

// ========================================
// BACKTESTING FRAMEWORK TYPES
// ========================================

/**
 * Core Backtesting Types
 */
export interface BacktestConfig {
  // General Settings
  startDate: string;
  endDate: string;
  initialCapital: number;
  commissionRate: number; // As decimal (e.g., 0.001 for 0.1%)
  slippageRate: number; // As decimal
  
  // Risk Management
  maxPositionSize: number; // As decimal (e.g., 0.25 for 25%)
  maxDrawdown: number; // As decimal (e.g., 0.2 for 20%)
  riskFreeRate: number; // Annual risk-free rate
  
  // Engine Selection
  engines: BacktestEngineType[];
  
  // Engine-specific configs
  walkForward?: WalkForwardConfig;
  monteCarlo?: MonteCarloConfig;
  crossValidation?: CrossValidationConfig;
  bootstrap?: BootstrapConfig;
  syntheticData?: SyntheticDataConfig;
  
  // Safety and validation
  enableSaflaValidation: boolean;
  maxExecutionTime: number; // seconds
  warningThresholds: WarningThresholds;
}

export type BacktestEngineType = 
  | 'walk_forward' 
  | 'monte_carlo' 
  | 'cross_validation' 
  | 'bootstrap' 
  | 'synthetic_data';

export interface WalkForwardConfig {
  optimizationWindow: number; // Trading days
  validationWindow: number; // Trading days
  stepSize: number; // Trading days
  reoptimizeFrequency: number; // How often to reoptimize parameters
}

export interface MonteCarloConfig {
  simulations: number;
  confidenceLevels: number[]; // e.g., [0.05, 0.95] for 90% confidence interval
  scenarioTypes: MonteCarloScenarioType[];
  randomSeed?: number;
}

export type MonteCarloScenarioType = 
  | 'normal_returns' 
  | 'fat_tail_returns' 
  | 'regime_switching' 
  | 'volatility_clustering'
  | 'market_crash'
  | 'bull_market'
  | 'bear_market';

export interface CrossValidationConfig {
  folds: number;
  purgeGap: number; // Days to purge to avoid lookahead bias
  embargoGap: number; // Days to embargo to avoid leakage
  combinatorial: boolean; // Use combinatorial purged cross-validation
}

export interface BootstrapConfig {
  samples: number;
  blockSize: number; // For block bootstrap
  bootstrapType: BootstrapType;
  confidenceLevels: number[];
}

export type BootstrapType = 'block' | 'stationary' | 'circular';

export interface SyntheticDataConfig {
  scenarios: number;
  generationMethod: SyntheticDataMethod;
  marketRegimes: MarketRegime[];
  stressTests: StressTestScenario[];
}

export type SyntheticDataMethod = 'gan' | 'regime_switching' | 'monte_carlo' | 'historical_bootstrap';

export interface MarketRegime {
  name: string;
  duration: number; // Days
  characteristics: {
    volatility: number;
    trend: number; // -1 to 1 (bearish to bullish)
    correlation: number; // Inter-asset correlation
  };
}

export interface StressTestScenario {
  name: string;
  description: string;
  marketShock: {
    magnitude: number; // Percentage drop
    duration: number; // Days
    recoveryTime: number; // Days
  };
}

export interface WarningThresholds {
  maxDrawdown: number;
  minSharpeRatio: number;
  maxVaR: number; // 95% VaR threshold
  minWinRate: number;
}

/**
 * Backtest Results and Performance Types
 */
export interface BacktestResult {
  id: string;
  timestamp: string;
  config: BacktestConfig;
  strategy: StrategyDefinition;
  
  // Results by engine
  engineResults: Record<BacktestEngineType, EngineResult>;
  
  // Aggregated metrics
  overallPerformance: PerformanceMetrics;
  riskAnalysis: RiskMetrics;
  statisticalTests: StatisticalTestResults;
  
  // Safety and validation
  saflaReport?: SafetyReport;
  warnings: BacktestWarning[];
  executionTime: number; // seconds
  
  // Meta information
  dataQuality: DataQualityReport;
  marketConditions: MarketConditionsAnalysis;
}

export interface EngineResult {
  engineType: BacktestEngineType;
  successful: boolean;
  error?: string;
  
  // Performance results
  returns: TimeSeries<number>;
  trades: Trade[];
  positions: Position[];
  
  // Engine-specific metrics
  performance: PerformanceMetrics;
  risk: RiskMetrics;
  
  // Engine-specific data
  engineSpecificData?: Record<string, unknown>;
  
  executionTime: number; // seconds
}

export interface StrategyDefinition {
  name: string;
  description: string;
  signalTypes: Signal['type'][];
  
  // Strategy logic parameters
  entryRules: StrategyRule[];
  exitRules: StrategyRule[];
  positionSizing: PositionSizingMethod;
  
  // Risk management
  stopLoss?: number; // As decimal
  takeProfit?: number; // As decimal
  maxHoldingPeriod?: number; // Days
  
  // Rebalancing
  rebalanceFrequency: RebalanceFrequency;
  
  // Custom parameters for optimization
  parameters: Record<string, ParameterDefinition>;
}

export interface StrategyRule {
  id: string;
  description: string;
  condition: string; // JavaScript expression or reference to function
  weight: number; // For combining multiple rules
}

export type PositionSizingMethod = 
  | 'equal_weight' 
  | 'volatility_adjusted' 
  | 'risk_parity' 
  | 'kelly_criterion'
  | 'fixed_fractional';

export type RebalanceFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'signal_based';

export interface ParameterDefinition {
  name: string;
  type: 'number' | 'boolean' | 'string' | 'array';
  defaultValue: unknown;
  bounds?: {
    min?: number;
    max?: number;
    step?: number;
  };
  description: string;
}

/**
 * Trading and Position Types
 */
export interface Trade {
  id: string;
  entryDate: string;
  exitDate?: string;
  symbol: string;
  side: 'long' | 'short';
  
  // Entry details
  entryPrice: number;
  entryQuantity: number;
  entrySignal: Signal;
  
  // Exit details (if closed)
  exitPrice?: number;
  exitQuantity?: number;
  exitSignal?: Signal | 'stop_loss' | 'take_profit' | 'time_exit';
  
  // Performance
  pnl?: number; // Profit/Loss in currency
  pnlPercent?: number; // P&L as percentage of position
  commissions: number;
  slippage: number;
  
  // Risk metrics
  maxDrawdownDuringTrade?: number;
  timeInTrade?: number; // Days
  
  // Meta information
  metadata?: Record<string, unknown>;
}

export interface Position {
  date: string;
  symbol: string;
  quantity: number;
  price: number;
  value: number;
  weight: number; // Percentage of portfolio
  
  // Risk metrics
  dailyReturn?: number;
  cumulativeReturn?: number;
  volatility?: number;
  
  // Attribution
  signalSource: Signal['type'];
  confidenceAtEntry: number;
}

/**
 * Performance and Risk Metrics
 */
export interface PerformanceMetrics {
  // Basic returns
  totalReturn: number;
  annualizedReturn: number;
  volatility: number; // Annualized
  
  // Risk-adjusted returns
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  informationRatio?: number;
  
  // Drawdown metrics
  maxDrawdown: number;
  maxDrawdownDuration: number; // Days
  averageDrawdown: number;
  recoveryTime: number; // Average time to recover from drawdowns
  
  // Trading metrics
  totalTrades: number;
  winRate: number; // Percentage of winning trades
  averageWin: number;
  averageLoss: number;
  profitFactor: number; // Gross profit / Gross loss
  
  // Consistency metrics
  bestMonth: number;
  worstMonth: number;
  positiveMonths: number; // Percentage
  consecutiveWins: number;
  consecutiveLosses: number;
  
  // Benchmark comparison (if available)
  alpha?: number;
  beta?: number;
  trackingError?: number;
  
  // Time-based analysis
  monthlyReturns: TimeSeries<number>;
  yearlyReturns: TimeSeries<number>;
  rollingMetrics: RollingMetrics;
}

export interface RiskMetrics {
  // Value at Risk
  var95: number; // 95% VaR (1 day)
  var99: number; // 99% VaR (1 day)
  expectedShortfall95: number; // Conditional VaR
  expectedShortfall99: number;
  
  // Volatility measures
  historicalVolatility: number;
  realizedVolatility: number;
  volatilitySkew: number;
  volatilityKurtosis: number;
  
  // Tail risk
  skewness: number;
  kurtosis: number;
  tailRatio: number; // Average of worst 5% returns / Average of best 5% returns
  
  // Correlation and diversification
  correlationToMarket?: number;
  averageCorrelation?: number; // If multi-asset strategy
  diversificationRatio?: number;
  
  // Regime analysis
  bearMarketReturn?: number;
  bullMarketReturn?: number;
  volatilityRegimes: VolatilityRegime[];
  
  // Stress test results
  stressTestResults: StressTestResult[];
}

export interface RollingMetrics {
  window: number; // Days
  returns: TimeSeries<number>;
  volatility: TimeSeries<number>;
  sharpeRatio: TimeSeries<number>;
  maxDrawdown: TimeSeries<number>;
}

export interface VolatilityRegime {
  regime: 'low' | 'medium' | 'high';
  threshold: number;
  periods: Array<{
    start: string;
    end: string;
    return: number;
    volatility: number;
  }>;
}

export interface StressTestResult {
  scenario: string;
  return: number;
  maxDrawdown: number;
  recoveryTime: number; // Days, -1 if didn't recover
  worstDay: number;
}

/**
 * Statistical Testing
 */
export interface StatisticalTestResults {
  // Strategy significance
  tStatistic: number;
  pValue: number;
  confidenceInterval: [number, number];
  
  // Normality tests
  jarqueBeraTest: StatisticalTest;
  shapiroWilkTest: StatisticalTest;
  
  // Serial correlation
  ljungBoxTest: StatisticalTest;
  autocorrelationTest: AutocorrelationResult;
  
  // Regime detection
  regimeChangeTest?: RegimeChangeResult;
  
  // Out-of-sample validation
  outOfSampleResults?: OutOfSampleResult;
}

export interface StatisticalTest {
  testName: string;
  statistic: number;
  pValue: number;
  criticalValue: number;
  significant: boolean;
  interpretation: string;
}

export interface AutocorrelationResult {
  lags: number[];
  correlations: number[];
  significantLags: number[];
  interpretation: string;
}

export interface RegimeChangeResult {
  regimes: Array<{
    start: string;
    end: string;
    characteristics: {
      meanReturn: number;
      volatility: number;
      trend: number;
    };
  }>;
  changePoints: string[];
  confidence: number;
}

export interface OutOfSampleResult {
  inSamplePeriod: { start: string; end: string };
  outOfSamplePeriod: { start: string; end: string };
  
  inSampleMetrics: PerformanceMetrics;
  outOfSampleMetrics: PerformanceMetrics;
  
  degradation: {
    returnDegradation: number;
    sharpeDegradation: number;
    drawdownIncrease: number;
  };
  
  significance: StatisticalTest;
}

/**
 * Data Quality and Market Conditions
 */
export interface DataQualityReport {
  totalDataPoints: number;
  missingDataPoints: number;
  dataCompleteness: number; // Percentage
  
  outliers: Array<{
    date: string;
    symbol: string;
    value: number;
    zScore: number;
  }>;
  
  dataFreshness: {
    latestDate: string;
    ageInHours: number;
    acceptable: boolean;
  };
  
  consistencyChecks: Array<{
    check: string;
    passed: boolean;
    details?: string;
  }>;
}

export interface MarketConditionsAnalysis {
  period: { start: string; end: string };
  
  marketRegimes: Array<{
    regime: 'bull' | 'bear' | 'sideways';
    start: string;
    end: string;
    return: number;
    volatility: number;
  }>;
  
  volatilityEnvironment: 'low' | 'normal' | 'high' | 'extreme';
  interestRateEnvironment: 'rising' | 'falling' | 'stable';
  marketStressEvents: Array<{
    date: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
  }>;
  
  correlationEnvironment: {
    averageCorrelation: number;
    correlationTrend: 'increasing' | 'decreasing' | 'stable';
  };
}

/**
 * Safety and Warning Types
 */
export interface BacktestWarning {
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'data' | 'performance' | 'risk' | 'statistical' | 'system';
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  suggestion?: string;
}

// Reuse SafetyReport from SAFLA validator
export interface SafetyReport {
  overallStatus: 'safe' | 'warning' | 'unsafe';
  validationResults: ValidationResult[];
  circuitBreakerStatus: 'active' | 'inactive' | 'cooling_down';
  riskScore: number;
  recommendations: string[];
  auditTrail: AuditEntry[];
}

export interface ValidationResult {
  isValid: boolean;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'data_integrity' | 'calculation' | 'market_data' | 'signal_logic' | 'risk_boundary';
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  correctionSuggestion?: string;
}

export interface AuditEntry {
  timestamp: string;
  operation: string;
  result: 'success' | 'failure' | 'warning';
  details: Record<string, unknown>;
  userId?: string;
}

/**
 * Utility Types
 */
export interface TimeSeries<T> {
  dates: string[];
  values: T[];
  frequency: 'daily' | 'weekly' | 'monthly' | 'intraday';
}

export interface DateRange {
  start: string;
  end: string;
}

export interface OptimizationResult {
  parameters: Record<string, unknown>;
  fitness: number;
  metrics: PerformanceMetrics;
  validationPeriod?: DateRange;
  robust: boolean; // Whether the result is statistically robust
}
