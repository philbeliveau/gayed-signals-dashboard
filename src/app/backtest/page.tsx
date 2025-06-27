'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, BarChart3, Settings, Play, StopCircle, Loader2, ArrowLeft, Calendar, DollarSign, Zap, Target, Brain, Activity } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';

// Types for the backtesting interface
interface BacktestConfig {
  startDate: string;
  endDate: string;
  initialCapital: number;
  commissionRate: number;
  slippageRate: number;
  maxPositionSize: number;
  maxDrawdown: number;
  riskFreeRate: number;
  engines: string[];
  enableSaflaValidation: boolean;
  maxExecutionTime: number;
}

interface StrategyDefinition {
  name: string;
  description: string;
  signalTypes: string[];
  entryRules: StrategyRule[];
  exitRules: StrategyRule[];
  positionSizing: string;
  rebalanceFrequency: string;
  parameters: Record<string, any>;
}

interface StrategyRule {
  id: string;
  description: string;
  condition: string;
  weight: number;
}

interface BacktestResult {
  id: string;
  timestamp: string;
  overallPerformance: {
    totalReturn: number;
    annualizedReturn: number;
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    totalTrades: number;
  };
  riskAnalysis: {
    var95: number;
    var99: number;
    skewness: number;
    kurtosis: number;
  };
  engineResults: Record<string, any>;
  warnings: Array<{
    severity: string;
    message: string;
  }>;
  executionTime: number;
}

const SIGNAL_TYPES = [
  { id: 'utilities_spy', name: 'Utilities/SPY', description: 'Utilities vs S&P 500 relative performance signal' },
  { id: 'lumber_gold', name: 'Lumber/Gold', description: 'Lumber vs Gold commodity ratio signal' },
  { id: 'treasury_curve', name: 'Treasury Curve', description: 'Yield curve shape and steepness signal' },
  { id: 'sp500_ma', name: 'S&P 500 MA', description: 'S&P 500 moving average trend signal' },
  { id: 'vix_defensive', name: 'VIX Defensive', description: 'VIX-based defensive market signal' }
];

const BACKTEST_ENGINES = [
  { id: 'walk_forward', name: 'Walk-Forward', description: 'Time-series cross-validation with rolling windows' },
  { id: 'monte_carlo', name: 'Monte Carlo', description: 'Statistical simulation with random scenarios' },
  { id: 'cross_validation', name: 'Cross-Validation', description: 'Purged cross-validation to avoid look-ahead bias' },
  { id: 'bootstrap', name: 'Bootstrap', description: 'Bootstrap resampling for robust performance estimation' },
  { id: 'synthetic_data', name: 'Synthetic Data', description: 'AI-generated synthetic market scenarios' }
];

const POSITION_SIZING_METHODS = [
  { id: 'equal_weight', name: 'Equal Weight', description: 'Equal allocation across all positions' },
  { id: 'volatility_adjusted', name: 'Volatility Adjusted', description: 'Size positions based on volatility' },
  { id: 'risk_parity', name: 'Risk Parity', description: 'Equal risk contribution from each position' },
  { id: 'kelly_criterion', name: 'Kelly Criterion', description: 'Optimal position sizing based on edge and odds' }
];

const REBALANCE_FREQUENCIES = [
  { id: 'signal_based', name: 'Signal-Based', description: 'Rebalance when signals change' },
  { id: 'daily', name: 'Daily', description: 'Daily rebalancing' },
  { id: 'weekly', name: 'Weekly', description: 'Weekly rebalancing' },
  { id: 'monthly', name: 'Monthly', description: 'Monthly rebalancing' }
];

export default function BacktestPage() {
  const { theme } = useTheme();
  // State management
  const [activeTab, setActiveTab] = useState<'builder' | 'config' | 'results'>('builder');
  const [strategy, setStrategy] = useState<StrategyDefinition>({
    name: 'Gayed Multi-Signal Strategy',
    description: 'Multi-signal strategy based on Gayed research indicators',
    signalTypes: ['utilities_spy', 'lumber_gold'],
    entryRules: [
      {
        id: 'risk_on_entry',
        description: 'Enter on Risk-On consensus with high confidence',
        condition: 'consensus === "Risk-On" && confidence > 0.6',
        weight: 1.0
      }
    ],
    exitRules: [
      {
        id: 'risk_off_exit',
        description: 'Exit on Risk-Off signal',
        condition: 'signal === "Risk-Off"',
        weight: 1.0
      }
    ],
    positionSizing: 'equal_weight',
    rebalanceFrequency: 'signal_based',
    parameters: {}
  });

  const [config, setConfig] = useState<BacktestConfig>({
    startDate: '2020-01-01',
    endDate: '2023-12-31',
    initialCapital: 100000,
    commissionRate: 0.001,
    slippageRate: 0.0005,
    maxPositionSize: 0.25,
    maxDrawdown: 0.20,
    riskFreeRate: 0.02,
    engines: ['walk_forward', 'monte_carlo', 'cross_validation'],
    enableSaflaValidation: true,
    maxExecutionTime: 300
  });

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handlers
  const handleSignalTypeToggle = (signalType: string) => {
    setStrategy(prev => ({
      ...prev,
      signalTypes: prev.signalTypes.includes(signalType)
        ? prev.signalTypes.filter(t => t !== signalType)
        : [...prev.signalTypes, signalType]
    }));
  };

  const handleEngineToggle = (engine: string) => {
    setConfig(prev => ({
      ...prev,
      engines: prev.engines.includes(engine)
        ? prev.engines.filter(e => e !== engine)
        : [...prev.engines, engine]
    }));
  };

  const runBacktest = async () => {
    if (strategy.signalTypes.length === 0) {
      setError('Please select at least one signal type');
      return;
    }

    if (config.engines.length === 0) {
      setError('Please select at least one backtesting engine');
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setError(null);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          strategy,
          marketData: {}, // This would be populated with actual market data
          config
        })
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Backtest failed');
      }

      const result = await response.json();
      setResults(result);
      setActiveTab('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsRunning(false);
      setProgress(0);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text trading-background-subtle">
      {/* Header */}
      <header className="border-b border-theme-border bg-theme-card/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="p-2 hover:bg-theme-card-hover rounded-lg transition-colors">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div className="w-10 h-10 bg-gradient-to-br from-theme-primary to-theme-primary-hover rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-theme-text">Backtesting Laboratory</h1>
                <p className="text-theme-text-muted text-sm">Advanced Strategy Testing & Analysis</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="bg-theme-warning-bg border border-theme-warning-border rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-theme-warning" />
                  <span className="text-theme-warning text-sm font-medium">Educational Use Only</span>
                </div>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-theme-card p-1 rounded-xl border border-theme-border">
            <button
              onClick={() => setActiveTab('builder')}
              className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'builder'
                  ? 'bg-theme-primary text-white'
                  : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-card-hover'
              }`}
            >
              <Brain className="w-4 h-4" />
              <span>Strategy Builder</span>
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'config'
                  ? 'bg-theme-primary text-white'
                  : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-card-hover'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Configuration</span>
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'results'
                  ? 'bg-theme-primary text-white'
                  : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-card-hover'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Results</span>
            </button>
          </div>
        </div>

        {/* Educational Warning Banner */}
        <div className="mb-8 bg-gradient-to-r from-theme-warning-bg to-theme-danger-bg border border-theme-warning-border rounded-xl p-6">
          <div className="flex items-start space-x-4">
            <AlertTriangle className="w-8 h-8 text-theme-warning flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold text-theme-warning mb-3">Important Educational Notice</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-theme-text-secondary">
                <div>
                  <p className="mb-2">• <strong>Educational purposes only:</strong> This backtesting system is designed for learning and research.</p>
                  <p className="mb-2">• <strong>Past performance warning:</strong> Historical results do not guarantee future performance.</p>
                  <p>• <strong>Risk disclaimer:</strong> All trading involves substantial risk of loss.</p>
                </div>
                <div>
                  <p className="mb-2">• <strong>Backtesting limitations:</strong> Results may not reflect real trading conditions.</p>
                  <p className="mb-2">• <strong>Professional advice:</strong> Consult qualified financial advisors before investing.</p>
                  <p>• <strong>No investment advice:</strong> This tool does not provide investment recommendations.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'builder' && (
          <div className="space-y-8">
            {/* Strategy Overview */}
            <div className="bg-theme-card border border-theme-border rounded-xl p-6">
              <h2 className="text-xl font-bold text-theme-text mb-6">Strategy Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-theme-text-secondary mb-2">Strategy Name</label>
                  <input
                    type="text"
                    value={strategy.name}
                    onChange={(e) => setStrategy(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-theme-card-secondary border border-theme-border rounded-lg text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-theme-text-secondary mb-2">Description</label>
                  <input
                    type="text"
                    value={strategy.description}
                    onChange={(e) => setStrategy(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 bg-theme-card-secondary border border-theme-border rounded-lg text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-primary"
                  />
                </div>
              </div>
            </div>

            {/* Signal Selection */}
            <div className="bg-theme-card border border-theme-border rounded-xl p-6">
              <h2 className="text-xl font-bold text-theme-text mb-6">Signal Selection</h2>
              <p className="text-theme-text-muted mb-6">Choose which Gayed signals to include in your strategy:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {SIGNAL_TYPES.map((signal) => (
                  <div
                    key={signal.id}
                    onClick={() => handleSignalTypeToggle(signal.id)}
                    className={`p-4 border rounded-xl cursor-pointer transition-all hover:shadow-md ${
                      strategy.signalTypes.includes(signal.id)
                        ? 'border-theme-primary bg-theme-primary-bg'
                        : 'border-theme-border hover:border-theme-border-hover'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        strategy.signalTypes.includes(signal.id)
                          ? 'bg-theme-primary border-theme-primary'
                          : 'border-theme-text-muted'
                      }`} />
                      <h3 className="font-semibold text-theme-text">{signal.name}</h3>
                    </div>
                    <p className="text-sm text-theme-text-muted">{signal.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Position Sizing & Rebalancing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-theme-card border border-theme-border rounded-xl p-6">
                <h2 className="text-xl font-bold text-theme-text mb-6">Position Sizing</h2>
                <div className="space-y-4">
                  {POSITION_SIZING_METHODS.map((method) => (
                    <div
                      key={method.id}
                      onClick={() => setStrategy(prev => ({ ...prev, positionSizing: method.id }))}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        strategy.positionSizing === method.id
                          ? 'border-theme-primary bg-theme-primary-bg'
                          : 'border-theme-border hover:border-theme-border-hover'
                      }`}
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          strategy.positionSizing === method.id
                            ? 'bg-theme-primary border-theme-primary'
                            : 'border-theme-text-muted'
                        }`} />
                        <h3 className="font-semibold text-theme-text">{method.name}</h3>
                      </div>
                      <p className="text-sm text-theme-text-muted">{method.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-theme-card border border-theme-border rounded-xl p-6">
                <h2 className="text-xl font-bold text-theme-text mb-6">Rebalancing Frequency</h2>
                <div className="space-y-4">
                  {REBALANCE_FREQUENCIES.map((freq) => (
                    <div
                      key={freq.id}
                      onClick={() => setStrategy(prev => ({ ...prev, rebalanceFrequency: freq.id }))}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        strategy.rebalanceFrequency === freq.id
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          strategy.rebalanceFrequency === freq.id
                            ? 'bg-purple-500 border-purple-500'
                            : 'border-gray-600'
                        }`} />
                        <h3 className="font-semibold text-white">{freq.name}</h3>
                      </div>
                      <p className="text-sm text-gray-400">{freq.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="space-y-8">
            {/* Date Range & Capital */}
            <div className="bg-theme-card border border-theme-border rounded-xl p-6">
              <h2 className="text-xl font-bold text-theme-text mb-6">Backtest Parameters</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-theme-text-secondary mb-2">Start Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={config.startDate}
                      onChange={(e) => setConfig(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 bg-theme-card-secondary border border-theme-border rounded-lg text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={config.endDate}
                      onChange={(e) => setConfig(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 bg-theme-card-secondary border border-theme-border rounded-lg text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Initial Capital</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={config.initialCapital}
                      onChange={(e) => setConfig(prev => ({ ...prev, initialCapital: Number(e.target.value) }))}
                      className="w-full pl-10 pr-4 py-3 bg-theme-card-secondary border border-theme-border rounded-lg text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Max Position Size</label>
                  <div className="relative">
                    <Target className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={config.maxPositionSize}
                      onChange={(e) => setConfig(prev => ({ ...prev, maxPositionSize: Number(e.target.value) }))}
                      className="w-full pl-10 pr-4 py-3 bg-theme-card-secondary border border-theme-border rounded-lg text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-primary"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Decimal (0.25 = 25%)</p>
                </div>
              </div>
            </div>

            {/* Trading Costs */}
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Trading Costs & Risk Management</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Commission Rate</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={config.commissionRate}
                    onChange={(e) => setConfig(prev => ({ ...prev, commissionRate: Number(e.target.value) }))}
                    className="w-full px-4 py-3 bg-[#2A2A2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Decimal (0.001 = 0.1%)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Slippage Rate</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={config.slippageRate}
                    onChange={(e) => setConfig(prev => ({ ...prev, slippageRate: Number(e.target.value) }))}
                    className="w-full px-4 py-3 bg-[#2A2A2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Decimal (0.0005 = 0.05%)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Max Drawdown</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={config.maxDrawdown}
                    onChange={(e) => setConfig(prev => ({ ...prev, maxDrawdown: Number(e.target.value) }))}
                    className="w-full px-4 py-3 bg-[#2A2A2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Decimal (0.20 = 20%)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Risk-Free Rate</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={config.riskFreeRate}
                    onChange={(e) => setConfig(prev => ({ ...prev, riskFreeRate: Number(e.target.value) }))}
                    className="w-full px-4 py-3 bg-[#2A2A2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Annual rate (0.02 = 2%)</p>
                </div>
              </div>
            </div>

            {/* Engine Selection */}
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Backtesting Engines</h2>
              <p className="text-gray-400 mb-6">Select which backtesting methodologies to run:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {BACKTEST_ENGINES.map((engine) => (
                  <div
                    key={engine.id}
                    onClick={() => handleEngineToggle(engine.id)}
                    className={`p-4 border rounded-xl cursor-pointer transition-all ${
                      config.engines.includes(engine.id)
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        config.engines.includes(engine.id)
                          ? 'bg-purple-500 border-purple-500'
                          : 'border-gray-600'
                      }`} />
                      <h3 className="font-semibold text-white">{engine.name}</h3>
                    </div>
                    <p className="text-sm text-gray-400">{engine.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="space-y-8">
            {!results ? (
              <div className="text-center py-16">
                <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No Results Yet</h3>
                <p className="text-gray-500">Run a backtest to see detailed performance analysis</p>
              </div>
            ) : (
              <>
                {/* Performance Overview */}
                <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-6">
                  <h2 className="text-xl font-bold text-white mb-6">Performance Overview</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-emerald-400 mb-1">
                        {formatPercentage(results.overallPerformance.totalReturn)}
                      </div>
                      <div className="text-xs text-gray-400">Total Return</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400 mb-1">
                        {formatPercentage(results.overallPerformance.annualizedReturn)}
                      </div>
                      <div className="text-xs text-gray-400">Annual Return</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400 mb-1">
                        {results.overallPerformance.sharpeRatio.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-400">Sharpe Ratio</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-400 mb-1">
                        {formatPercentage(results.overallPerformance.maxDrawdown)}
                      </div>
                      <div className="text-xs text-gray-400">Max Drawdown</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-400 mb-1">
                        {formatPercentage(results.overallPerformance.volatility)}
                      </div>
                      <div className="text-xs text-gray-400">Volatility</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400 mb-1">
                        {formatPercentage(results.overallPerformance.winRate)}
                      </div>
                      <div className="text-xs text-gray-400">Win Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white mb-1">
                        {results.overallPerformance.totalTrades}
                      </div>
                      <div className="text-xs text-gray-400">Total Trades</div>
                    </div>
                  </div>
                </div>

                {/* Risk Analysis */}
                <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-6">
                  <h2 className="text-xl font-bold text-white mb-6">Risk Analysis</h2>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-400 mb-1">
                        {formatPercentage(results.riskAnalysis.var95)}
                      </div>
                      <div className="text-xs text-gray-400">95% VaR</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-500 mb-1">
                        {formatPercentage(results.riskAnalysis.var99)}
                      </div>
                      <div className="text-xs text-gray-400">99% VaR</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-400 mb-1">
                        {results.riskAnalysis.skewness.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-400">Skewness</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-400 mb-1">
                        {results.riskAnalysis.kurtosis.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-400">Kurtosis</div>
                    </div>
                  </div>
                </div>

                {/* Warnings */}
                {results.warnings && results.warnings.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-amber-400 mb-4">Warnings & Recommendations</h3>
                    <div className="space-y-3">
                      {results.warnings.map((warning, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="text-sm font-medium text-amber-400 capitalize">{warning.severity}</div>
                            <div className="text-sm text-gray-300">{warning.message}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Run Backtest Button */}
        <div className="sticky bottom-6 bg-theme-card border border-theme-border rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {error && (
                <div className="flex items-center space-x-2 text-theme-danger">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
              {isRunning && (
                <div className="flex items-center space-x-3">
                  <Loader2 className="w-5 h-5 animate-spin text-theme-primary" />
                  <span className="text-sm text-theme-text-secondary">Running backtest...</span>
                  <div className="w-32 bg-theme-bg-secondary rounded-full h-2">
                    <div 
                      className="bg-theme-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-sm text-theme-text-muted">{progress}%</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-theme-text-muted">
                {strategy.signalTypes.length} signal{strategy.signalTypes.length !== 1 ? 's' : ''} • {config.engines.length} engine{config.engines.length !== 1 ? 's' : ''}
              </div>
              <button
                onClick={runBacktest}
                disabled={isRunning || strategy.signalTypes.length === 0 || config.engines.length === 0}
                className="px-6 py-3 bg-theme-primary hover:bg-theme-primary-hover disabled:bg-theme-text-muted disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                {isRunning ? (
                  <>
                    <StopCircle className="w-5 h-5" />
                    <span>Running...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    <span>Run Backtest</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}