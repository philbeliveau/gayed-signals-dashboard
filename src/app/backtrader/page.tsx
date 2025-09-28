'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  LineChart, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Calendar, 
  Settings, 
  Play, 
  Download, 
  RefreshCw, 
  AlertTriangle, 
  Target, 
  BarChart3, 
  Zap, 
  Eye,
  Info,
  Clock,
  DollarSign,
  Minus,
  CheckCircle,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '../../contexts/ThemeContext';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import ThemeToggle from '../../components/ThemeToggle';
import { ETF_RECOMMENDATIONS, getETFRecommendations, getStrategyConfig } from '../../domains/trading-signals/utils/etf-recommendations';
import dynamic from 'next/dynamic';

// Dynamic import for chart component to avoid SSR issues
const UniversalStrategyChart = dynamic(() => import('../../components/UniversalStrategyChart'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 flex items-center justify-center bg-theme-card-secondary border border-theme-border rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-primary mx-auto mb-4"></div>
        <p className="text-theme-text">Loading Chart Component...</p>
      </div>
    </div>
  )
});

// Types for Backtrader Analysis
interface BacktraderConfig {
  startDate: string;
  endDate: string;
  initialCash: number;
  commission: number;
  symbols: string[];
  allocations: Record<string, number>; // ETF symbol -> allocation percentage
  signals: string[];
  timeframe: string;
  chartStyle: string;
  showVolume: boolean;
  showSignals: boolean;
  showDrawdown: boolean;
}

interface SignalExplanation {
  name: string;
  description: string;
  interpretation: {
    riskOn: string;
    riskOff: string;
    neutral: string;
  };
  calculation: string;
  significance: string;
}

interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  avgWinningTrade: number;
  avgLosingTrade: number;
  largestWin: number;
  largestLoss: number;
}

interface CorrelationData {
  signal: string;
  symbol: string;
  correlation: number;
  pValue: number;
  significance: 'High' | 'Medium' | 'Low' | 'None';
}

interface BacktraderResult {
  chartUrl: string;
  performanceMetrics: PerformanceMetrics;
  correlationMatrix: CorrelationData[];
  signalTimeline: Array<{
    date: string;
    signal: string;
    value: string;
    price: number;
    change: number;
  }>;
  warnings: string[];
  executionTime: number;
}

// Get all available ETFs organized by strategy
const getAllStrategyETFs = () => {
  const strategyETFs: Record<string, Array<{symbol: string, name: string, category: string, type: 'Risk-On' | 'Risk-Off', strategy: string}>> = {};
  
  Object.entries(ETF_RECOMMENDATIONS).forEach(([strategyId, strategyData]) => {
    const strategyName = getStrategyConfig(strategyId)?.strategyName || strategyId;
    
    strategyETFs[strategyName] = [
      ...strategyData.riskOnETFs.map(etf => ({
        symbol: etf.symbol,
        name: etf.name,
        category: etf.category,
        type: 'Risk-On' as const,
        strategy: strategyId
      })),
      ...strategyData.riskOffETFs.map(etf => ({
        symbol: etf.symbol,
        name: etf.name,
        category: etf.category,
        type: 'Risk-Off' as const,
        strategy: strategyId
      }))
    ];
  });
  
  return strategyETFs;
};

// Available Gayed signals
const GAYED_SIGNALS = [
  {
    id: 'utilities_spy',
    name: 'Utilities/SPY Ratio',
    description: 'Measures relative performance of utilities versus broad market',
    category: 'Sector Rotation'
  },
  {
    id: 'lumber_gold',
    name: 'Lumber/Gold Ratio',
    description: 'Commodity ratio indicating economic growth expectations',
    category: 'Commodity Analysis'
  },
  {
    id: 'treasury_curve',
    name: 'Treasury Yield Curve',
    description: 'Yield curve shape and steepness as market regime indicator',
    category: 'Interest Rates'
  },
  {
    id: 'sp500_ma',
    name: 'S&P 500 Moving Average',
    description: 'S&P 500 relative to its moving average for trend analysis',
    category: 'Technical Analysis'
  },
  {
    id: 'vix_defensive',
    name: 'VIX Defensive Signal',
    description: 'VIX-based defensive positioning signal',
    category: 'Volatility Analysis'
  }
];

// Signal explanations
const SIGNAL_EXPLANATIONS: Record<string, SignalExplanation> = {
  utilities_spy: {
    name: 'Utilities/SPY Ratio Signal',
    description: 'This signal compares the performance of utility stocks (XLU) versus the broader S&P 500 (SPY) to identify market regime changes.',
    interpretation: {
      riskOn: 'When SPY outperforms utilities, it suggests investors are comfortable taking risk and moving into growth-oriented sectors.',
      riskOff: 'When utilities outperform SPY, it indicates investors are seeking defensive positions and dividend-yielding assets.',
      neutral: 'When the ratio is stable, it suggests market indecision or transition between risk regimes.'
    },
    calculation: 'Ratio = (XLU Price / SPY Price) compared to historical moving averages and volatility bands.',
    significance: 'Utilities are traditionally defensive assets that outperform during uncertain times, making this ratio a reliable regime indicator.'
  },
  lumber_gold: {
    name: 'Lumber/Gold Ratio Signal',
    description: 'This commodity ratio reflects economic growth expectations by comparing industrial demand (lumber) versus safe-haven demand (gold).',
    interpretation: {
      riskOn: 'Rising lumber/gold ratio suggests strong economic growth expectations and increased construction activity.',
      riskOff: 'Falling lumber/gold ratio indicates economic uncertainty and flight to safe-haven assets like gold.',
      neutral: 'Stable ratio suggests balanced economic outlook with neither strong growth nor recession fears.'
    },
    calculation: 'Ratio = (Lumber Futures Price / Gold Price) analyzed against historical percentiles and trend indicators.',
    significance: 'This ratio captures the fundamental economic drivers of growth (infrastructure demand) versus fear (safe-haven demand).'
  },
  treasury_curve: {
    name: 'Treasury Yield Curve Signal',
    description: 'Analyzes the shape and steepness of the Treasury yield curve to predict economic cycles and market regimes.',
    interpretation: {
      riskOn: 'Steep yield curve (long rates > short rates) suggests economic expansion and growth expectations.',
      riskOff: 'Flat or inverted curve indicates economic slowdown concerns and potential recession risk.',
      neutral: 'Normal curve steepness suggests stable economic conditions without strong directional bias.'
    },
    calculation: 'Spread between 10-year and 2-year Treasury yields, compared to historical distributions and recession indicators.',
    significance: 'Yield curve inversion has historically preceded most U.S. recessions, making it a powerful economic indicator.'
  },
  sp500_ma: {
    name: 'S&P 500 Moving Average Signal',
    description: 'Compares current S&P 500 level to its moving average to identify trend strength and potential reversals.',
    interpretation: {
      riskOn: 'Price above moving average with positive momentum suggests strong uptrend and risk-taking environment.',
      riskOff: 'Price below moving average with negative momentum indicates downtrend and risk-averse conditions.',
      neutral: 'Price near moving average suggests consolidation phase and uncertain market direction.'
    },
    calculation: 'Current S&P 500 price relative to 50-day and 200-day moving averages, with momentum and volatility adjustments.',
    significance: 'Moving averages are widely followed technical indicators that can become self-fulfilling as institutional flows follow these signals.'
  },
  vix_defensive: {
    name: 'VIX Defensive Signal',
    description: 'Uses VIX (volatility index) levels and patterns to identify when defensive positioning is warranted.',
    interpretation: {
      riskOn: 'Low VIX with declining trend suggests complacency and favorable conditions for risk assets.',
      riskOff: 'High VIX or rapidly rising volatility indicates fear and need for defensive positioning.',
      neutral: 'Moderate VIX levels suggest balanced risk environment without extreme fear or complacency.'
    },
    calculation: 'VIX level relative to historical percentiles, combined with VIX term structure and volatility-of-volatility measures.',
    significance: 'VIX reflects market-implied volatility expectations and is often called the "fear gauge" of the market.'
  }
};

export default function BacktraderPage() {
  const { theme } = useTheme();
  const { preferences, getSelectedETFs } = useUserPreferences();
  
  // Get all user's selected ETFs across all strategies
  const getAllUserSelectedETFs = () => {
    const allSelectedETFs: Array<{symbol: string, allocation: number, strategy: string}> = [];
    
    Object.keys(preferences.strategies).forEach(strategyType => {
      const selectedETFs = getSelectedETFs(strategyType);
      selectedETFs.forEach(etf => {
        allSelectedETFs.push({
          symbol: etf.symbol,
          allocation: etf.allocation,
          strategy: strategyType
        });
      });
    });
    
    return allSelectedETFs;
  };

  const userSelectedETFs = getAllUserSelectedETFs();
  const userSymbols = userSelectedETFs.map(etf => etf.symbol);
  const userAllocations = userSelectedETFs.reduce((acc, etf) => {
    acc[etf.symbol] = etf.allocation;
    return acc;
  }, {} as Record<string, number>);
  
  // State management
  const [config, setConfig] = useState<BacktraderConfig>({
    startDate: '2020-01-01',
    endDate: '2023-12-31',
    initialCash: 100000,
    commission: 0.001,
    symbols: userSymbols.length > 0 ? userSymbols : ['SPY', 'XLU'],
    allocations: userAllocations,
    signals: ['utilities_spy'],
    timeframe: '1D',
    chartStyle: 'candlestick',
    showVolume: true,
    showSignals: true,
    showDrawdown: false
  });

  // Update config when user preferences change
  useEffect(() => {
    const currentUserETFs = getAllUserSelectedETFs();
    const currentSymbols = currentUserETFs.map(etf => etf.symbol);
    const currentAllocations = currentUserETFs.reduce((acc, etf) => {
      acc[etf.symbol] = etf.allocation;
      return acc;
    }, {} as Record<string, number>);

    if (currentSymbols.length > 0) {
      setConfig(prev => ({
        ...prev,
        symbols: currentSymbols,
        allocations: currentAllocations
      }));
    }
  }, [preferences]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BacktraderResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'charts' | 'performance' | 'correlations' | 'signals'>('charts');
  const [selectedSignal, setSelectedSignal] = useState<string | null>(null);

  // Handlers
  const handleSymbolToggle = (symbol: string) => {
    setConfig(prev => ({
      ...prev,
      symbols: prev.symbols.includes(symbol)
        ? prev.symbols.filter(s => s !== symbol)
        : [...prev.symbols, symbol]
    }));
  };

  const handleSignalToggle = (signal: string) => {
    setConfig(prev => ({
      ...prev,
      signals: prev.signals.includes(signal)
        ? prev.signals.filter(s => s !== signal)
        : [...prev.signals, signal]
    }));
  };

  const runAnalysis = async () => {
    if (config.symbols.length === 0) {
      setError('Please select at least one symbol to analyze');
      return;
    }

    if (config.signals.length === 0) {
      setError('Please select at least one signal to analyze');
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);
    setError(null);

    try {
      // Optimized progress updates for faster analysis
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 25, 90));
      }, 200); // Faster updates since analysis is now optimized

      const response = await fetch('/api/backtrader', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const result = await response.json();
      console.log('Backtrader analysis result:', result);
      console.log('Chart URL received:', result.chartUrl);
      setResults(result);
      setActiveTab('charts');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during analysis');
    } finally {
      setIsAnalyzing(false);
      setProgress(0);
    }
  };

  const exportResults = () => {
    if (!results) return;
    
    const exportData = {
      config,
      results,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backtrader-analysis-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  const getCorrelationColor = (correlation: number) => {
    const abs = Math.abs(correlation);
    if (abs > 0.7) return 'text-theme-danger';
    if (abs > 0.4) return 'text-theme-warning';
    if (abs > 0.2) return 'text-theme-info';
    return 'text-theme-text-muted';
  };

  const getCorrelationBg = (correlation: number) => {
    const abs = Math.abs(correlation);
    if (abs > 0.7) return 'bg-theme-danger-bg border-theme-danger-border';
    if (abs > 0.4) return 'bg-theme-warning-bg border-theme-warning-border';
    if (abs > 0.2) return 'bg-theme-info-bg border-theme-info-border';
    return 'bg-theme-card-secondary border-theme-border';
  };

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text trading-background-subtle">
      {/* Header */}
      <header className="border-b border-theme-border bg-theme-card/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <Link href="/" className="p-2 hover:bg-theme-card-hover rounded-lg transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center">
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </Link>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-theme-primary to-theme-primary-hover rounded-lg flex items-center justify-center">
                <LineChart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-theme-text truncate">Backtrader Analysis</h1>
                <p className="text-theme-text-muted text-xs sm:text-sm truncate">Visualize Gayed Signals with Professional Charts</p>
              </div>
            </div>

            <div className="flex items-center justify-between space-x-2 sm:space-x-4">
              <div className="bg-theme-info-bg border border-theme-info-border rounded-lg px-3 py-2 sm:px-4 flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <Info className="w-3 h-3 sm:w-4 sm:h-4 text-theme-info" />
                  <span className="text-theme-info text-xs sm:text-sm font-medium">Educational Tool</span>
                </div>
              </div>
              <div className="sm:block">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Navigation Tabs */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-wrap gap-1 bg-theme-card p-1 rounded-xl border border-theme-border overflow-x-auto">
            <button
              onClick={() => setActiveTab('config')}
              className={`flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors whitespace-nowrap touch-manipulation min-h-[44px] ${
                activeTab === 'config'
                  ? 'bg-theme-primary text-white'
                  : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-card-hover'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm sm:text-base">Config</span>
            </button>
            <button
              onClick={() => setActiveTab('charts')}
              className={`flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors whitespace-nowrap touch-manipulation min-h-[44px] ${
                activeTab === 'charts'
                  ? 'bg-theme-primary text-white'
                  : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-card-hover'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm sm:text-base">Charts</span>
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors whitespace-nowrap touch-manipulation min-h-[44px] ${
                activeTab === 'performance'
                  ? 'bg-theme-primary text-white'
                  : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-card-hover'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm sm:text-base">Performance</span>
            </button>
            <button
              onClick={() => setActiveTab('correlations')}
              className={`flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors whitespace-nowrap touch-manipulation min-h-[44px] ${
                activeTab === 'correlations'
                  ? 'bg-theme-primary text-white'
                  : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-card-hover'
              }`}
            >
              <Target className="w-4 h-4" />
              <span className="text-sm sm:text-base">Correlations</span>
            </button>
            <button
              onClick={() => setActiveTab('signals')}
              className={`flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors whitespace-nowrap touch-manipulation min-h-[44px] ${
                activeTab === 'signals'
                  ? 'bg-theme-primary text-white'
                  : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-card-hover'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span className="text-sm sm:text-base">Signals</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'config' && (
          <div className="space-y-8">
            {/* Analysis Configuration */}
            <div className="bg-theme-card border border-theme-border rounded-xl p-6">
              <h2 className="text-xl font-bold text-theme-text mb-6">Analysis Parameters</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-theme-text-secondary mb-2">Start Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
                    <input
                      type="date"
                      value={config.startDate}
                      onChange={(e) => setConfig(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 bg-theme-card-secondary border border-theme-border rounded-lg text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-theme-text-secondary mb-2">End Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
                    <input
                      type="date"
                      value={config.endDate}
                      onChange={(e) => setConfig(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 bg-theme-card-secondary border border-theme-border rounded-lg text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-theme-text-secondary mb-2">Initial Cash</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
                    <input
                      type="number"
                      value={config.initialCash}
                      onChange={(e) => setConfig(prev => ({ ...prev, initialCash: Number(e.target.value) }))}
                      className="w-full pl-10 pr-4 py-3 bg-theme-card-secondary border border-theme-border rounded-lg text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-theme-text-secondary mb-2">Timeframe</label>
                  <select
                    value={config.timeframe}
                    onChange={(e) => setConfig(prev => ({ ...prev, timeframe: e.target.value }))}
                    className="w-full px-4 py-3 bg-theme-card-secondary border border-theme-border rounded-lg text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-primary"
                  >
                    <option value="1D">Daily</option>
                    <option value="1W">Weekly</option>
                    <option value="1M">Monthly</option>
                  </select>
                </div>
              </div>
            </div>

            {/* All Available ETFs by Strategy */}
            <div className="bg-theme-card border border-theme-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-theme-text">ETF & Index Selection</h2>
                <div className="flex items-center space-x-3">
                  {userSelectedETFs.length > 0 && (
                    <Link 
                      href="/strategies"
                      className="px-3 py-1 text-sm bg-theme-success hover:bg-theme-success-hover text-white rounded-lg transition-colors"
                    >
                      View Portfolio ({userSelectedETFs.length})
                    </Link>
                  )}
                  <span className="text-sm text-theme-text-muted">
                    {config.symbols.length} selected
                  </span>
                </div>
              </div>
              
              <p className="text-theme-text-muted mb-6">
                Choose any combination of ETFs and indices for backtesting. ETFs are organized by their associated Gayed signals:
              </p>
              
              {Object.entries(getAllStrategyETFs()).map(([strategyName, etfs]) => (
                <div key={strategyName} className="mb-8 last:mb-0">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-3 h-3 bg-theme-primary rounded-full"></div>
                    <h3 className="text-lg font-semibold text-theme-text">{strategyName}</h3>
                    <span className="text-sm text-theme-text-muted">({etfs.length} ETFs)</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    {etfs.map((etf) => {
                      const isSelected = config.symbols.includes(etf.symbol);
                      const userAllocation = config.allocations[etf.symbol] || 0;
                      
                      return (
                        <div
                          key={etf.symbol}
                          onClick={() => handleSymbolToggle(etf.symbol)}
                          className={`p-4 border rounded-xl cursor-pointer transition-all hover:shadow-md ${
                            isSelected
                              ? 'border-theme-primary bg-theme-primary-bg'
                              : 'border-theme-border hover:border-theme-border-hover'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className={`w-4 h-4 rounded-full border-2 ${
                                isSelected
                                  ? 'bg-theme-primary border-theme-primary'
                                  : 'border-theme-text-muted'
                              }`} />
                              <div>
                                <h4 className="font-semibold text-theme-text">{etf.symbol}</h4>
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    etf.type === 'Risk-On' 
                                      ? 'bg-theme-success-bg text-theme-success' 
                                      : 'bg-theme-danger-bg text-theme-danger'
                                  }`}>
                                    {etf.type}
                                  </span>
                                  <span className="text-xs text-theme-info">{etf.category}</span>
                                </div>
                              </div>
                            </div>
                            {userAllocation > 0 && (
                              <div className="text-right">
                                <div className="text-sm font-bold text-theme-primary">{userAllocation}%</div>
                                <div className="text-xs text-theme-text-muted">Portfolio</div>
                              </div>
                            )}
                          </div>
                          
                          <p className="text-sm text-theme-text-muted">{etf.name}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              <div className="mt-6 p-4 bg-theme-info-bg border border-theme-info-border rounded-lg">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-theme-info flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-theme-text-secondary">
                    <p className="font-medium text-theme-info mb-1">Selection Guide</p>
                    <div className="space-y-1">
                      <p>• <strong>Risk-On ETFs:</strong> Perform well when the signal indicates growth/risk appetite</p>
                      <p>• <strong>Risk-Off ETFs:</strong> Perform well when the signal indicates caution/defensive positioning</p>
                      <p>• <strong>Portfolio %:</strong> Shows your allocation from Strategy Dashboard (if any)</p>
                      <p>• Select any combination across strategies for comprehensive backtesting</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Signal Selection */}
            <div className="bg-theme-card border border-theme-border rounded-xl p-6">
              <h2 className="text-xl font-bold text-theme-text mb-6">Gayed Signal Selection</h2>
              <p className="text-theme-text-muted mb-6">Select which Gayed research signals to overlay on your charts:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {GAYED_SIGNALS.map((signal) => (
                  <div
                    key={signal.id}
                    onClick={() => handleSignalToggle(signal.id)}
                    className={`p-4 border rounded-xl cursor-pointer transition-all hover:shadow-md ${
                      config.signals.includes(signal.id)
                        ? 'border-theme-success bg-theme-success-bg'
                        : 'border-theme-border hover:border-theme-border-hover'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        config.signals.includes(signal.id)
                          ? 'bg-theme-success border-theme-success'
                          : 'border-theme-text-muted'
                      }`} />
                      <div>
                        <h3 className="font-semibold text-theme-text">{signal.name}</h3>
                        <p className="text-xs text-theme-success">{signal.category}</p>
                      </div>
                    </div>
                    <p className="text-sm text-theme-text-muted">{signal.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart Options */}
            <div className="bg-theme-card border border-theme-border rounded-xl p-6">
              <h2 className="text-xl font-bold text-theme-text mb-6">Chart Configuration</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-theme-text-secondary mb-2">Chart Style</label>
                  <select
                    value={config.chartStyle}
                    onChange={(e) => setConfig(prev => ({ ...prev, chartStyle: e.target.value }))}
                    className="w-full px-4 py-3 bg-theme-card-secondary border border-theme-border rounded-lg text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-primary"
                  >
                    <option value="candlestick">Candlestick</option>
                    <option value="ohlc">OHLC Bars</option>
                    <option value="line">Line Chart</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-theme-text-secondary mb-2">Commission Rate</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={config.commission}
                    onChange={(e) => setConfig(prev => ({ ...prev, commission: Number(e.target.value) }))}
                    className="w-full px-4 py-3 bg-theme-card-secondary border border-theme-border rounded-lg text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-primary"
                  />
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="showVolume"
                    checked={config.showVolume}
                    onChange={(e) => setConfig(prev => ({ ...prev, showVolume: e.target.checked }))}
                    className="w-4 h-4 text-theme-primary bg-theme-card-secondary border-theme-border rounded focus:ring-theme-primary"
                  />
                  <label htmlFor="showVolume" className="text-theme-text">Show Volume</label>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="showSignals"
                    checked={config.showSignals}
                    onChange={(e) => setConfig(prev => ({ ...prev, showSignals: e.target.checked }))}
                    className="w-4 h-4 text-theme-primary bg-theme-card-secondary border-theme-border rounded focus:ring-theme-primary"
                  />
                  <label htmlFor="showSignals" className="text-theme-text">Show Signal Markers</label>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="showDrawdown"
                    checked={config.showDrawdown}
                    onChange={(e) => setConfig(prev => ({ ...prev, showDrawdown: e.target.checked }))}
                    className="w-4 h-4 text-theme-primary bg-theme-card-secondary border-theme-border rounded focus:ring-theme-primary"
                  />
                  <label htmlFor="showDrawdown" className="text-theme-text">Show Drawdown Chart</label>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'charts' && (
          <div className="space-y-8">
            {/* Universal Multi-Strategy Backtesting Chart */}
            {config.symbols.length > 0 && config.signals.length > 0 ? (
              <UniversalStrategyChart config={config} />
            ) : (
              <div className="bg-theme-card border border-theme-border rounded-xl p-8 text-center">
                <div className="text-theme-text-muted mb-4">
                  <div className="text-4xl mb-4">📊</div>
                  <h3 className="text-lg font-semibold text-theme-text mb-2">Ready for Analysis</h3>
                  <p className="text-theme-text-muted">
                    Select ETFs and signals above to generate comprehensive backtesting charts with real market data.
                  </p>
                  <p className="text-sm text-theme-text-light mt-2">
                    Choose any combination of ETFs across all 5 Gayed strategies for multi-strategy analysis.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-8">
            {!results ? (
              <div className="text-center py-16">
                <TrendingUp className="w-16 h-16 text-theme-text-muted mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-theme-text-secondary mb-2">No Performance Data</h3>
                <p className="text-theme-text-muted">Run an analysis to see detailed performance metrics and statistics</p>
              </div>
            ) : (
              <>
                {/* Performance Metrics */}
                <div className="bg-theme-card border border-theme-border rounded-xl p-6">
                  <h2 className="text-xl font-bold text-theme-text mb-6">Performance Metrics</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-theme-success mb-1">
                        {formatPercentage(results.performanceMetrics.totalReturn)}
                      </div>
                      <div className="text-xs text-theme-text-muted">Total Return</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-theme-info mb-1">
                        {formatPercentage(results.performanceMetrics.annualizedReturn)}
                      </div>
                      <div className="text-xs text-theme-text-muted">Annual Return</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-theme-primary mb-1">
                        {results.performanceMetrics.sharpeRatio.toFixed(2)}
                      </div>
                      <div className="text-xs text-theme-text-muted">Sharpe Ratio</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-theme-danger mb-1">
                        {formatPercentage(results.performanceMetrics.maxDrawdown)}
                      </div>
                      <div className="text-xs text-theme-text-muted">Max Drawdown</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-theme-warning mb-1">
                        {formatPercentage(results.performanceMetrics.winRate)}
                      </div>
                      <div className="text-xs text-theme-text-muted">Win Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-theme-text mb-1">
                        {results.performanceMetrics.totalTrades}
                      </div>
                      <div className="text-xs text-theme-text-muted">Total Trades</div>
                    </div>
                  </div>
                </div>

                {/* Trade Analysis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-theme-card border border-theme-border rounded-xl p-6">
                    <h3 className="text-lg font-bold text-theme-text mb-4">Trade Statistics</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-theme-text-muted">Average Winning Trade</span>
                        <span className="text-theme-success font-medium">
                          {formatCurrency(results.performanceMetrics.avgWinningTrade)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-theme-text-muted">Average Losing Trade</span>
                        <span className="text-theme-danger font-medium">
                          {formatCurrency(results.performanceMetrics.avgLosingTrade)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-theme-text-muted">Largest Win</span>
                        <span className="text-theme-success font-medium">
                          {formatCurrency(results.performanceMetrics.largestWin)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-theme-text-muted">Largest Loss</span>
                        <span className="text-theme-danger font-medium">
                          {formatCurrency(results.performanceMetrics.largestLoss)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-theme-text-muted">Profit Factor</span>
                        <span className="text-theme-text font-medium">
                          {results.performanceMetrics.profitFactor.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-theme-card border border-theme-border rounded-xl p-6">
                    <h3 className="text-lg font-bold text-theme-text mb-4">Risk Metrics</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-theme-text-muted">Analysis Period</span>
                        <span className="text-theme-text font-medium">
                          {Math.ceil((new Date(config.endDate).getTime() - new Date(config.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-theme-text-muted">Execution Time</span>
                        <span className="text-theme-text font-medium">
                          {results.executionTime.toFixed(2)}s
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-theme-text-muted">Initial Capital</span>
                        <span className="text-theme-text font-medium">
                          {formatCurrency(config.initialCash)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-theme-text-muted">Commission Rate</span>
                        <span className="text-theme-text font-medium">
                          {formatPercentage(config.commission)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'correlations' && (
          <div className="space-y-8">
            {!results ? (
              <div className="text-center py-16">
                <Target className="w-16 h-16 text-theme-text-muted mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-theme-text-secondary mb-2">No Correlation Data</h3>
                <p className="text-theme-text-muted">Run an analysis to see how signals correlate with price movements</p>
              </div>
            ) : (
              <>
                {/* Correlation Matrix */}
                <div className="bg-theme-card border border-theme-border rounded-xl p-6">
                  <h2 className="text-xl font-bold text-theme-text mb-6">Signal-Price Correlations</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {results.correlationMatrix.map((corr, index) => (
                      <div
                        key={index}
                        className={`p-4 border rounded-xl ${getCorrelationBg(corr.correlation)}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-theme-text">{corr.signal}</h3>
                            <p className="text-sm text-theme-text-muted">{corr.symbol}</p>
                          </div>
                          <div className={`text-lg font-bold ${getCorrelationColor(corr.correlation)}`}>
                            {corr.correlation > 0 ? '+' : ''}{corr.correlation.toFixed(3)}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-theme-text-light">P-Value: {corr.pValue.toFixed(4)}</span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            corr.significance === 'High' ? 'bg-theme-success-bg text-theme-success' :
                            corr.significance === 'Medium' ? 'bg-theme-warning-bg text-theme-warning' :
                            corr.significance === 'Low' ? 'bg-theme-info-bg text-theme-info' :
                            'bg-theme-card-secondary text-theme-text-muted'
                          }`}>
                            {corr.significance}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Correlation Explanation */}
                <div className="bg-theme-info-bg border border-theme-info-border rounded-xl p-6">
                  <div className="flex items-start space-x-3">
                    <Info className="w-6 h-6 text-theme-info flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-lg font-bold text-theme-info mb-3">Understanding Correlations</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-theme-text-secondary">
                        <div>
                          <p className="mb-2"><strong>Strong Positive (+0.7 to +1.0):</strong> Signal and price move together strongly</p>
                          <p className="mb-2"><strong>Moderate Positive (+0.4 to +0.7):</strong> Signal and price tend to move together</p>
                          <p><strong>Weak Positive (+0.2 to +0.4):</strong> Signal and price sometimes move together</p>
                        </div>
                        <div>
                          <p className="mb-2"><strong>Strong Negative (-0.7 to -1.0):</strong> Signal and price move in opposite directions</p>
                          <p className="mb-2"><strong>Moderate Negative (-0.4 to -0.7):</strong> Signal and price tend to move opposite</p>
                          <p><strong>No Correlation (-0.2 to +0.2):</strong> No meaningful relationship</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'signals' && (
          <div className="space-y-8">
            {/* Signal Guide */}
            <div className="bg-theme-card border border-theme-border rounded-xl p-6">
              <h2 className="text-xl font-bold text-theme-text mb-6">Gayed Signal Guide</h2>
              <p className="text-theme-text-muted mb-6">
                Understanding Michael Gayed&apos;s market regime signals and their interpretations:
              </p>
              
              <div className="grid grid-cols-1 gap-6">
                {config.signals.map((signalId) => {
                  const explanation = SIGNAL_EXPLANATIONS[signalId];
                  if (!explanation) return null;
                  
                  return (
                    <div key={signalId} className="border border-theme-border rounded-xl p-6">
                      <div className="flex items-start space-x-4 mb-4">
                        <div className="w-12 h-12 bg-theme-primary-bg rounded-lg flex items-center justify-center">
                          <Activity className="w-6 h-6 text-theme-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-theme-text mb-2">{explanation.name}</h3>
                          <p className="text-theme-text-muted">{explanation.description}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-theme-success-bg border border-theme-success-border rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-theme-success" />
                            <span className="font-semibold text-theme-success">Risk-On Signal</span>
                          </div>
                          <p className="text-sm text-theme-text-secondary">{explanation.interpretation.riskOn}</p>
                        </div>
                        
                        <div className="bg-theme-danger-bg border border-theme-danger-border rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <TrendingDown className="w-4 h-4 text-theme-danger" />
                            <span className="font-semibold text-theme-danger">Risk-Off Signal</span>
                          </div>
                          <p className="text-sm text-theme-text-secondary">{explanation.interpretation.riskOff}</p>
                        </div>
                        
                        <div className="bg-theme-warning-bg border border-theme-warning-border rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <Minus className="w-4 h-4 text-theme-warning" />
                            <span className="font-semibold text-theme-warning">Neutral Signal</span>
                          </div>
                          <p className="text-sm text-theme-text-secondary">{explanation.interpretation.neutral}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-theme-text mb-2">How It&apos;s Calculated</h4>
                          <p className="text-sm text-theme-text-muted">{explanation.calculation}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-theme-text mb-2">Why It Matters</h4>
                          <p className="text-sm text-theme-text-muted">{explanation.significance}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Educational Notice */}
            <div className="bg-theme-warning-bg border border-theme-warning-border rounded-xl p-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-6 h-6 text-theme-warning flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-bold text-theme-warning mb-3">Important Disclaimers</h3>
                  <div className="space-y-2 text-sm text-theme-text-secondary">
                    <p>• <strong>Educational Purpose:</strong> This analysis tool is for educational and research purposes only.</p>
                    <p>• <strong>No Investment Advice:</strong> Signal interpretations do not constitute investment recommendations.</p>
                    <p>• <strong>Past Performance:</strong> Historical signal accuracy does not guarantee future performance.</p>
                    <p>• <strong>Risk Warning:</strong> All investments carry risk of loss. Consult qualified professionals before investing.</p>
                    <p>• <strong>Market Complexity:</strong> Market regimes are influenced by many factors beyond these signals.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Bar */}
        <div className="sticky bottom-4 sm:bottom-6 bg-theme-card border border-theme-border rounded-xl p-4 sm:p-6 shadow-lg mx-4 sm:mx-0">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
              {error && (
                <div className="flex items-center space-x-2 text-theme-danger">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm">{error}</span>
                </div>
              )}
              {isAnalyzing && (
                <div className="flex items-center space-x-3">
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-theme-primary" />
                  <span className="text-xs sm:text-sm text-theme-text-secondary">Running analysis...</span>
                  <div className="w-24 sm:w-32 bg-theme-bg-secondary rounded-full h-2">
                    <div
                      className="bg-theme-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs sm:text-sm text-theme-text-muted">{progress}%</span>
                </div>
              )}
            </div>

            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
              <div className="text-xs sm:text-sm text-theme-text-muted text-center sm:text-left">
                {config.symbols.length} symbol{config.symbols.length !== 1 ? 's' : ''} • {config.signals.length} signal{config.signals.length !== 1 ? 's' : ''}
                {Object.keys(config.allocations).length > 0 && (
                  <span className="block sm:inline sm:ml-2 mt-1 sm:mt-0 px-2 py-1 bg-theme-primary-bg text-theme-primary rounded text-xs">
                    Portfolio Allocations
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4">
                {results && (
                  <button
                    onClick={exportResults}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-theme-card-secondary hover:bg-theme-card-hover text-theme-text border border-theme-border rounded-lg transition-colors flex items-center justify-center space-x-2 touch-manipulation min-h-[44px]"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-sm">Export</span>
                  </button>
                )}
                <button
                  onClick={runAnalysis}
                  disabled={isAnalyzing || config.symbols.length === 0 || config.signals.length === 0}
                  className="flex-1 sm:flex-none px-4 sm:px-6 py-3 bg-theme-primary hover:bg-theme-primary-hover disabled:bg-theme-text-muted disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center space-x-2 touch-manipulation min-h-[44px]"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      <span className="text-sm sm:text-base">Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-sm sm:text-base">Run Analysis</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}