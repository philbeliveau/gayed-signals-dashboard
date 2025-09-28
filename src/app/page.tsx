'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, X, TrendingUp, TrendingDown, AlertTriangle, ExternalLink, Activity, LineChart, Users, Home, Youtube, User, Bell, Settings } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
// import AgentDebateView from '../components/AgentDebateView';

interface Signal {
  type: string;
  signal: 'Risk-On' | 'Risk-Off' | 'Neutral';
  strength: 'Strong' | 'Moderate' | 'Weak';
  confidence: number;
  rawValue: number;
  date: string;
}

interface ConsensusSignal {
  consensus: 'Risk-On' | 'Risk-Off' | 'Mixed';
  confidence: number;
  riskOnCount: number;
  riskOffCount: number;
  signals: Signal[];
}

interface AgentMessage {
  agentName: string;
  agentType: 'SIGNAL_ANALYST' | 'MARKET_CONTEXT' | 'RISK_CHALLENGER';
  role: string;
  message: string;
  timestamp: string;
  confidence?: number;
}

interface ETF {
  ticker: string;
  name: string;
  expenseRatio: number;
  description: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Very High';
  category: string;
}

interface ETFRecommendations {
  signalType: string;
  riskOff: ETF[];
  riskOn: ETF[];
}


const TrendingUpIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const TrendingDownIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
);

const MinusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
  </svg>
);

// ETF Recommendations Data
const ETF_RECOMMENDATIONS: Record<string, ETFRecommendations> = {
  'UTILITIES_SPY': {
    signalType: 'Utilities/SPY',
    riskOff: [
      {
        ticker: 'XLU',
        name: 'Utilities Select Sector SPDR Fund',
        expenseRatio: 0.12,
        description: 'Tracks utilities companies that provide electricity, gas, and water services',
        riskLevel: 'Low',
        category: 'Utilities'
      },
      {
        ticker: 'SPLV',
        name: 'Invesco S&P 500 Low Volatility ETF',
        expenseRatio: 0.25,
        description: 'Invests in the 100 least volatile stocks from the S&P 500',
        riskLevel: 'Low',
        category: 'Low Volatility'
      },
      {
        ticker: 'USMV',
        name: 'iShares MSCI USA Min Vol Factor ETF',
        expenseRatio: 0.15,
        description: 'Targets the lowest volatility stocks in the US market',
        riskLevel: 'Low',
        category: 'Min Volatility'
      }
    ],
    riskOn: [
      {
        ticker: 'SPY',
        name: 'SPDR S&P 500 ETF Trust',
        expenseRatio: 0.09,
        description: 'Tracks the S&P 500 index of large-cap US stocks',
        riskLevel: 'Medium',
        category: 'Large Cap'
      },
      {
        ticker: 'QQQ',
        name: 'Invesco QQQ Trust',
        expenseRatio: 0.20,
        description: 'Tracks the Nasdaq-100 index of technology and growth stocks',
        riskLevel: 'Medium',
        category: 'Technology'
      },
      {
        ticker: 'IWM',
        name: 'iShares Russell 2000 ETF',
        expenseRatio: 0.19,
        description: 'Tracks small-cap US stocks via the Russell 2000 index',
        riskLevel: 'High',
        category: 'Small Cap'
      },
      {
        ticker: 'SPXL',
        name: 'Direxion Daily S&P 500 Bull 3X Shares',
        expenseRatio: 0.95,
        description: '3x leveraged exposure to the S&P 500 index',
        riskLevel: 'Very High',
        category: 'Leveraged'
      }
    ]
  },
  'LUMBER_GOLD': {
    signalType: 'Lumber/Gold',
    riskOff: [
      {
        ticker: 'GLD',
        name: 'SPDR Gold Shares',
        expenseRatio: 0.40,
        description: 'Tracks the price of gold bullion',
        riskLevel: 'Medium',
        category: 'Precious Metals'
      },
      {
        ticker: 'IAU',
        name: 'iShares Gold Trust',
        expenseRatio: 0.25,
        description: 'Lower-cost alternative for gold exposure',
        riskLevel: 'Medium',
        category: 'Precious Metals'
      },
      {
        ticker: 'TLT',
        name: 'iShares 20+ Year Treasury Bond ETF',
        expenseRatio: 0.15,
        description: 'Invests in long-term US Treasury bonds',
        riskLevel: 'Medium',
        category: 'Treasury Bonds'
      },
      {
        ticker: 'PDBC',
        name: 'Invesco Optimum Yield Diversified Commodity Strategy No K-1 ETF',
        expenseRatio: 0.59,
        description: 'Broad commodities exposure through futures contracts',
        riskLevel: 'High',
        category: 'Commodities'
      }
    ],
    riskOn: [
      {
        ticker: 'WOOD',
        name: 'iShares Global Timber & Forestry ETF',
        expenseRatio: 0.46,
        description: 'Invests in companies involved in timber and forestry',
        riskLevel: 'High',
        category: 'Commodities'
      },
      {
        ticker: 'XLI',
        name: 'Industrial Select Sector SPDR Fund',
        expenseRatio: 0.12,
        description: 'Tracks industrial companies including construction and machinery',
        riskLevel: 'Medium',
        category: 'Industrials'
      },
      {
        ticker: 'XLB',
        name: 'Materials Select Sector SPDR Fund',
        expenseRatio: 0.12,
        description: 'Invests in materials and chemical companies',
        riskLevel: 'High',
        category: 'Materials'
      },
      {
        ticker: 'IYM',
        name: 'iShares US Basic Materials ETF',
        expenseRatio: 0.40,
        description: 'Focused exposure to US basic materials companies',
        riskLevel: 'High',
        category: 'Basic Materials'
      }
    ]
  },
  'TREASURY_CURVE': {
    signalType: 'Treasury Curve',
    riskOff: [
      {
        ticker: 'TLT',
        name: 'iShares 20+ Year Treasury Bond ETF',
        expenseRatio: 0.15,
        description: 'Long-duration Treasury bonds for defensive positioning',
        riskLevel: 'Medium',
        category: 'Long Treasury'
      },
      {
        ticker: 'EDV',
        name: 'Vanguard Extended Duration Treasury ETF',
        expenseRatio: 0.06,
        description: 'Ultra-long duration Treasury exposure',
        riskLevel: 'High',
        category: 'Extended Duration'
      },
      {
        ticker: 'VGLT',
        name: 'Vanguard Long-Term Treasury ETF',
        expenseRatio: 0.04,
        description: 'Low-cost long-term Treasury bond exposure',
        riskLevel: 'Medium',
        category: 'Long Treasury'
      }
    ],
    riskOn: [
      {
        ticker: 'IEF',
        name: 'iShares 7-10 Year Treasury Bond ETF',
        expenseRatio: 0.15,
        description: 'Intermediate-term Treasury bond exposure',
        riskLevel: 'Low',
        category: 'Intermediate Treasury'
      },
      {
        ticker: 'SHY',
        name: 'iShares 1-3 Year Treasury Bond ETF',
        expenseRatio: 0.15,
        description: 'Short-term Treasury bonds with low duration risk',
        riskLevel: 'Low',
        category: 'Short Treasury'
      },
      {
        ticker: 'VTEB',
        name: 'Vanguard Tax-Exempt Bond ETF',
        expenseRatio: 0.05,
        description: 'Tax-exempt municipal bond exposure',
        riskLevel: 'Low',
        category: 'Municipal Bonds'
      }
    ]
  },
  'VIX_DEFENSIVE': {
    signalType: 'VIX Defensive',
    riskOff: [
      {
        ticker: 'SPLV',
        name: 'Invesco S&P 500 Low Volatility ETF',
        expenseRatio: 0.25,
        description: 'Low volatility equity exposure during defensive periods',
        riskLevel: 'Low',
        category: 'Low Volatility'
      },
      {
        ticker: 'USMV',
        name: 'iShares MSCI USA Min Vol Factor ETF',
        expenseRatio: 0.15,
        description: 'Minimum volatility US equity exposure',
        riskLevel: 'Low',
        category: 'Min Volatility'
      },
      {
        ticker: 'VXX',
        name: 'iPath Series B S&P 500 VIX Short-Term Futures ETN',
        expenseRatio: 0.89,
        description: 'Direct volatility exposure through VIX futures',
        riskLevel: 'Very High',
        category: 'Volatility'
      },
      {
        ticker: 'VIXY',
        name: 'ProShares VIX Short-Term Futures ETF',
        expenseRatio: 0.85,
        description: 'Short-term VIX futures exposure',
        riskLevel: 'Very High',
        category: 'Volatility'
      }
    ],
    riskOn: [
      {
        ticker: 'SPHB',
        name: 'Invesco S&P 500 High Beta ETF',
        expenseRatio: 0.25,
        description: 'High beta stocks for maximum market exposure',
        riskLevel: 'High',
        category: 'High Beta'
      },
      {
        ticker: 'SPXL',
        name: 'Direxion Daily S&P 500 Bull 3X Shares',
        expenseRatio: 0.95,
        description: '3x leveraged S&P 500 exposure',
        riskLevel: 'Very High',
        category: 'Leveraged'
      },
      {
        ticker: 'TQQQ',
        name: 'ProShares UltraPro QQQ',
        expenseRatio: 0.95,
        description: '3x leveraged Nasdaq-100 exposure',
        riskLevel: 'Very High',
        category: 'Leveraged Tech'
      },
      {
        ticker: 'UPRO',
        name: 'ProShares UltraPro S&P500',
        expenseRatio: 0.95,
        description: '3x leveraged S&P 500 exposure',
        riskLevel: 'Very High',
        category: 'Leveraged'
      }
    ]
  },
  'SPY_MA': {
    signalType: 'S&P 500 MA',
    riskOff: [
      {
        ticker: 'SHY',
        name: 'iShares 1-3 Year Treasury Bond ETF',
        expenseRatio: 0.15,
        description: 'Safe short-term Treasury exposure',
        riskLevel: 'Low',
        category: 'Short Treasury'
      },
      {
        ticker: 'TLT',
        name: 'iShares 20+ Year Treasury Bond ETF',
        expenseRatio: 0.15,
        description: 'Long-term Treasury bonds for defensive allocation',
        riskLevel: 'Medium',
        category: 'Long Treasury'
      },
      {
        ticker: 'SPLV',
        name: 'Invesco S&P 500 Low Volatility ETF',
        expenseRatio: 0.25,
        description: 'Low volatility equity exposure',
        riskLevel: 'Low',
        category: 'Low Volatility'
      },
      {
        ticker: 'VMOT',
        name: 'Vanguard Russell 1000 Value ETF',
        expenseRatio: 0.10,
        description: 'Multi-asset allocation for balanced exposure',
        riskLevel: 'Medium',
        category: 'Multi-Asset'
      }
    ],
    riskOn: [
      {
        ticker: 'SPY',
        name: 'SPDR S&P 500 ETF Trust',
        expenseRatio: 0.09,
        description: 'Core S&P 500 exposure for risk-on periods',
        riskLevel: 'Medium',
        category: 'Large Cap'
      },
      {
        ticker: 'SPXL',
        name: 'Direxion Daily S&P 500 Bull 3X Shares',
        expenseRatio: 0.95,
        description: '3x leveraged S&P 500 for aggressive exposure',
        riskLevel: 'Very High',
        category: 'Leveraged'
      },
      {
        ticker: 'QQQ',
        name: 'Invesco QQQ Trust',
        expenseRatio: 0.20,
        description: 'Technology-heavy Nasdaq-100 exposure',
        riskLevel: 'Medium',
        category: 'Technology'
      },
      {
        ticker: 'VTI',
        name: 'Vanguard Total Stock Market ETF',
        expenseRatio: 0.03,
        description: 'Broad US total market exposure',
        riskLevel: 'Medium',
        category: 'Total Market'
      }
    ]
  }
};

export default function Dashboard() {
  const { theme } = useTheme();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [consensus, setConsensus] = useState<ConsensusSignal | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [showETFModal, setShowETFModal] = useState(false);
  const [loadingMode, setLoadingMode] = useState<'fast' | 'full' | null>(null);
  const [isFullMode, setIsFullMode] = useState(true);
  // NEW: Agent debate state
  const [agentConversation, setAgentConversation] = useState<AgentMessage[]>([]);
  const [reasoning, setReasoning] = useState<string[]>([]);
  const [transparentDecision, setTransparentDecision] = useState(false);

  const fetchSignals = useCallback(async (fast = false) => {
    try {
      if (!loading) setRefreshing(true);
      setError(null);
      setLoadingMode(fast ? 'fast' : 'full');
      
      // Use full mode by default for home page to show all 5 signals
      const apiUrl = fast ? '/api/signals?fast=true' : '/api/signals';
      const startTime = Date.now();
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setSignals(data.signals || []);
      setConsensus(data.consensus);
      setLastUpdated(new Date());
      // NEW: Set agent debate data
      setAgentConversation(data.agentConversation || []);
      setReasoning(data.reasoning || []);
      setTransparentDecision(data.transparentDecision || false);
      
      const loadTime = Date.now() - startTime;
      
      // Show performance info
      if (data.cached) {
        console.log(`📦 Using cached signal data (${loadTime}ms)`);
      } else {
        console.log(`⚡ ${fast ? 'Fast' : 'Full'} signals loaded in ${loadTime}ms`);
      }
      
    } catch (error) {
      console.error('Failed to fetch signals:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMode(null);
    }
  }, [loading]);

  useEffect(() => {
    fetchSignals(!isFullMode);
  }, [fetchSignals, isFullMode]);

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'Risk-On': return 'text-theme-risk-on';
      case 'Risk-Off': return 'text-theme-risk-off';
      case 'Neutral': return 'text-theme-neutral';
      default: return 'text-theme-text-muted';
    }
  };

  const getSignalBgColor = (signal: string) => {
    switch (signal) {
      case 'Risk-On': return 'bg-theme-risk-on-bg border-theme-success-border';
      case 'Risk-Off': return 'bg-theme-risk-off-bg border-theme-danger-border';
      case 'Neutral': return 'bg-theme-neutral-bg border-theme-warning-border';
      default: return 'bg-theme-card border-theme-border';
    }
  };

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'Risk-On': return <TrendingUpIcon />;
      case 'Risk-Off': return <TrendingDownIcon />;
      case 'Neutral': return <MinusIcon />;
      default: return <MinusIcon />;
    }
  };

  const getStrengthValue = (strength: string) => {
    switch (strength) {
      case 'Strong': return 100;
      case 'Moderate': return 66;
      case 'Weak': return 33;
      default: return 0;
    }
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'Strong': return 'bg-theme-success';
      case 'Moderate': return 'bg-theme-warning';
      case 'Weak': return 'bg-theme-danger';
      default: return 'bg-theme-text-muted';
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Low': return 'text-theme-success bg-theme-success-bg';
      case 'Medium': return 'text-theme-warning bg-theme-warning-bg';
      case 'High': return 'text-theme-danger bg-theme-danger-bg';
      case 'Very High': return 'text-theme-primary bg-theme-primary-bg';
      default: return 'text-theme-text-muted bg-theme-card-secondary';
    }
  };

  const getETFRecommendations = (signalType: string): ETFRecommendations | null => {
    const key = signalType.toUpperCase().replace(/\s+/g, '_').replace('/', '_');
    return ETF_RECOMMENDATIONS[key] || null;
  };

  const handleSignalClick = (signal: Signal) => {
    setSelectedSignal(signal);
    setShowETFModal(true);
  };

  const closeETFModal = () => {
    setShowETFModal(false);
    setSelectedSignal(null);
  };

  // ETF Modal Component
  const ETFModal = () => {
    if (!showETFModal || !selectedSignal) return null;

    const recommendations = getETFRecommendations(selectedSignal.type);
    if (!recommendations) return null;

    const currentSignalETFs = selectedSignal.signal === 'Risk-On' 
      ? recommendations.riskOn 
      : selectedSignal.signal === 'Risk-Off' 
        ? recommendations.riskOff 
        : [];

    const alternativeETFs = selectedSignal.signal === 'Risk-On' 
      ? recommendations.riskOff 
      : selectedSignal.signal === 'Risk-Off' 
        ? recommendations.riskOn 
        : [];

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="bg-theme-card border border-theme-border rounded-t-2xl sm:rounded-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl mobile-modal">
          {/* Modal Header - mobile optimized */}
          <div className="sticky top-0 bg-theme-card border-b border-theme-border p-3 sm:p-4 lg:p-6 flex items-start justify-between mobile-modal-header">
            <div className="flex-1 min-w-0 pr-2 sm:pr-3">
              <h2 className="text-base sm:text-lg lg:text-2xl font-bold text-theme-text mb-1 sm:mb-2">
                ETF Recommendations
              </h2>
              <p className="text-xs sm:text-sm text-theme-text-muted mb-2 sm:mb-3 sm:hidden">{recommendations.signalType}</p>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div className={`flex items-center space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg ${getSignalBgColor(selectedSignal.signal)}`}>
                  {getSignalIcon(selectedSignal.signal)}
                  <span className={`font-semibold text-xs sm:text-sm ${getSignalColor(selectedSignal.signal)}`}>
                    {selectedSignal.signal}
                  </span>
                </div>
                <div className="text-xs sm:text-sm text-theme-text-muted">
                  Confidence: {Math.round(selectedSignal.confidence * 100)}%
                </div>
              </div>
            </div>
            <button
              onClick={closeETFModal}
              className="p-2 sm:p-3 hover:bg-theme-card-hover rounded-lg text-theme-text-muted hover:text-theme-text transition-colors touch-manipulation flex-shrink-0 min-h-[44px] min-w-[44px]"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
            </button>
          </div>

          {/* Modal Content - mobile optimized */}
          <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 lg:space-y-8 mobile-modal-content">
            {/* Current Signal Recommendations - mobile optimized */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-3 sm:mb-4 lg:mb-6">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className={`p-1.5 sm:p-2 rounded-lg ${getSignalBgColor(selectedSignal.signal)}`}>
                    {selectedSignal.signal === 'Risk-On' ? <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" /> : <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />}
                  </div>
                  <h3 className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold text-theme-text">
                    Recommended for {selectedSignal.signal}
                  </h3>
                </div>
                <div className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full self-start sm:self-auto">
                  PRIMARY
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {currentSignalETFs.map((etf, index) => (
                  <div key={index} className="bg-theme-card-secondary border border-theme-border rounded-lg sm:rounded-xl p-3 sm:p-4 hover:border-theme-border-hover hover:shadow-md transition-all touch-manipulation">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1 sm:mb-2">
                          <span className="text-base sm:text-lg font-bold text-theme-text">{etf.ticker}</span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskLevelColor(etf.riskLevel)} self-start`}>
                            {etf.riskLevel} Risk
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm text-theme-text-secondary font-medium mb-1 leading-tight">{etf.name}</div>
                        <div className="text-xs text-theme-text-light mb-2 sm:mb-3">{etf.category}</div>
                        <p className="text-xs sm:text-sm text-theme-text-muted leading-relaxed">{etf.description}</p>
                      </div>
                      <div className="text-left sm:text-right flex-shrink-0">
                        <div className="text-sm font-medium text-theme-text">{etf.expenseRatio}%</div>
                        <div className="text-xs text-theme-text-light">Expense Ratio</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Alternative Signal Recommendations */}
            {alternativeETFs.length > 0 && (
              <div>
                <div className="flex items-center space-x-3 mb-6">
                  <div className={`p-2 rounded-lg ${selectedSignal.signal === 'Risk-On' ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                    {selectedSignal.signal === 'Risk-On' ? <TrendingDown className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    Alternative: {selectedSignal.signal === 'Risk-On' ? 'Risk-Off' : 'Risk-On'} Options
                  </h3>
                  <div className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs font-medium rounded-full">
                    ALTERNATIVE
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-75">
                  {alternativeETFs.map((etf, index) => (
                    <div key={index} className="bg-theme-card-secondary border border-theme-border/50 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-lg font-bold text-theme-text-secondary">{etf.ticker}</span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskLevelColor(etf.riskLevel)}`}>
                              {etf.riskLevel} Risk
                            </span>
                          </div>
                          <div className="text-sm text-theme-text-muted font-medium mb-1">{etf.name}</div>
                          <div className="text-xs text-theme-text-light">{etf.category}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-theme-text-secondary">{etf.expenseRatio}%</div>
                          <div className="text-xs text-theme-text-light">Expense Ratio</div>
                        </div>
                      </div>
                      <p className="text-sm text-theme-text-light leading-relaxed">{etf.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risk Disclaimer */}
            <div className="bg-theme-warning-bg border border-theme-warning-border rounded-xl p-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-6 h-6 text-theme-warning flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-lg font-semibold text-theme-warning mb-3">Important Risk Disclaimer</h4>
                  <div className="space-y-2 text-sm text-theme-text-secondary">
                    <p>• ETF investments carry market risk and may lose value. Past performance does not guarantee future results.</p>
                    <p>• Leveraged ETFs (3x) are extremely volatile and suitable only for sophisticated investors with high risk tolerance.</p>
                    <p>• VIX-related products experience rapid decay and are not suitable for long-term holding.</p>
                    <p>• This information is for educational purposes only and does not constitute investment advice.</p>
                    <p>• Always consult with a qualified financial advisor before making investment decisions.</p>
                    <p>• Consider your investment objectives, risk tolerance, and time horizon before investing.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons - mobile optimized */}
            <div className="border-t border-theme-border pt-3 sm:pt-4 space-y-3 sm:space-y-0">
              <div className="text-xs sm:text-sm text-theme-text-light text-center sm:text-left">
                Signal updated: {new Date(selectedSignal.date).toLocaleString()}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                  onClick={closeETFModal}
                  className="w-full sm:w-auto px-4 sm:px-6 py-3 sm:py-2 bg-theme-card-secondary hover:bg-theme-card-hover text-theme-text border border-theme-border rounded-lg transition-colors touch-manipulation min-h-[48px] text-sm sm:text-base"
                >
                  Close
                </button>
                <button
                  onClick={() => window.open('https://finance.yahoo.com', '_blank')}
                  className="w-full sm:w-auto px-4 sm:px-6 py-3 sm:py-2 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-lg transition-colors flex items-center justify-center space-x-2 touch-manipulation min-h-[48px] text-sm sm:text-base"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Research ETFs</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-bg text-theme-text flex items-center justify-center">
        <div className="text-center bg-theme-card border border-theme-border rounded-2xl p-12 shadow-xl max-w-md mx-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-theme-border border-t-theme-primary mx-auto mb-6"></div>
          <div className="text-xl font-bold text-theme-text mb-2">Loading market signals...</div>
          <div className="text-theme-text-muted">Analyzing market regime data</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-theme-bg text-theme-text flex items-center justify-center">
        <div className="text-center max-w-md mx-4 p-8 bg-theme-card border border-theme-border rounded-2xl shadow-xl">
          <div className="text-theme-danger text-6xl mb-6">⚠</div>
          <div className="text-2xl font-bold text-theme-danger mb-4">Error Loading Signals</div>
          <div className="text-theme-text-muted mb-8 leading-relaxed">{error}</div>
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => {
                setLoading(true);
                setError(null);
                fetchSignals(!isFullMode);
              }}
              className="px-6 py-3 bg-theme-primary text-white rounded-xl hover:bg-theme-primary-hover transition-all duration-200 font-medium shadow-md"
            >
              Try Again
            </button>
            <button 
              onClick={() => {
                setLoading(true);
                setError(null);
                setIsFullMode(false);
                fetchSignals(true);
              }}
              className="px-6 py-3 bg-theme-card border border-theme-border rounded-xl text-theme-text hover:bg-theme-card-hover transition-all duration-200 font-medium"
            >
              Try Fast Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalSignals = signals.length;
  const riskOnSignals = signals.filter(s => s.signal === 'Risk-On').length;
  const riskOffSignals = signals.filter(s => s.signal === 'Risk-Off').length;
  const neutralSignals = signals.filter(s => s.signal === 'Neutral').length;

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 lg:pt-12 pb-8 sm:pb-12 space-y-6 sm:space-y-8 lg:space-y-12">
        {/* Header with Profile - mobile optimized */}
        <div className="flex flex-col space-y-4 sm:space-y-6 lg:flex-row lg:justify-between lg:items-center lg:space-y-0 lg:gap-6">
          {/* Left: Main Title */}
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-theme-text mb-1 sm:mb-2">Market Signals Dashboard</h1>
            <p className="text-theme-text-muted text-sm sm:text-base lg:text-lg">Real-time analysis of Gayed market regime indicators</p>
          </div>

          {/* Right: Profile Section - mobile responsive */}
          <div className="flex items-center gap-3 sm:gap-4 bg-theme-card border border-theme-border rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg w-full sm:w-auto">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 sm:flex-none">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-theme-primary to-theme-primary-hover rounded-full flex items-center justify-center shadow-md">
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1 sm:flex-none">
                <div className="text-xs sm:text-sm text-theme-text-muted">Hello 👋</div>
                <div className="font-bold text-theme-text text-sm sm:text-base truncate">Market Analyst</div>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 sm:ml-4 sm:border-l sm:border-theme-border sm:pl-4">
              <button className="p-2 hover:bg-theme-card-hover rounded-lg transition-colors touch-manipulation">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-theme-text-muted" />
              </button>
              <button className="p-2 hover:bg-theme-card-hover rounded-lg transition-colors touch-manipulation">
                <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-theme-text-muted" />
              </button>
            </div>
          </div>
        </div>

        {/* Controls Section - mobile optimized */}
        <div className="flex flex-col space-y-3 sm:space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0">
          <div></div>

          <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center gap-0 sm:gap-3">
            {/* Mode Toggle - mobile optimized */}
            <div className="flex items-center gap-1 bg-theme-card border border-theme-border rounded-xl p-1.5 sm:p-2 w-full sm:w-auto shadow-sm">
              <button
                onClick={() => setIsFullMode(true)}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium rounded-lg transition-all touch-manipulation ${
                  isFullMode
                    ? 'bg-theme-primary text-white shadow-md'
                    : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-card-hover'
                }`}
              >
                All 5 Signals
              </button>
              <button
                onClick={() => setIsFullMode(false)}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium rounded-lg transition-all touch-manipulation ${
                  !isFullMode
                    ? 'bg-theme-primary text-white shadow-md'
                    : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-card-hover'
                }`}
              >
                Fast Mode
              </button>
            </div>

            {/* Enhanced Controls - mobile responsive */}
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              {/* Refresh Button */}
              <button
                onClick={() => fetchSignals(!isFullMode)}
                disabled={refreshing}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-theme-card border border-theme-border rounded-xl sm:rounded-2xl hover:border-theme-border-hover hover:bg-theme-card-hover transition-all disabled:opacity-50 touch-manipulation shadow-lg font-semibold min-h-[48px]"
              >
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-theme-text/10 rounded-lg flex items-center justify-center">
                  <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 text-theme-text ${refreshing ? 'animate-spin' : ''}`} />
                </div>
                <span className="text-xs sm:text-sm lg:text-base">Refresh</span>
              </button>

              {/* Charts Button */}
              <Link
                href="/interactive-charts"
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-theme-primary text-white rounded-xl sm:rounded-2xl hover:bg-theme-primary-hover transition-all touch-manipulation shadow-lg font-semibold min-h-[48px]"
              >
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-white/20 rounded-lg flex items-center justify-center">
                  <LineChart className="w-3 h-3 sm:w-4 sm:h-4" />
                </div>
                <span className="text-xs sm:text-sm lg:text-base">Charts</span>
              </Link>

              {/* Menu Button - mobile optimized */}
              <button className="w-12 h-12 bg-theme-text rounded-xl flex items-center justify-center shadow-lg hover:bg-theme-text/90 transition-colors touch-manipulation">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Status Bar - clean design */}
        <div className="flex flex-col gap-4 sm:gap-3 sm:flex-row sm:justify-between sm:items-center px-6 py-4 bg-theme-card border border-theme-border rounded-2xl shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm font-medium text-theme-text-muted">
            <span className="text-center sm:text-left">
              Mode: <strong className="text-theme-text">{isFullMode ? 'Full Analysis' : 'Fast Mode'}</strong>
            </span>
            <span className="text-center sm:text-left">
              Signals: <strong className="text-theme-text">{signals.length}</strong>
            </span>
            {loadingMode && (
              <span className="text-theme-primary text-center sm:text-left font-semibold">
                {loadingMode === 'fast' ? 'Fast loading...' : 'Full analysis...'}
              </span>
            )}
          </div>
          
          {lastUpdated && (
            <div className="text-sm text-theme-text-muted text-center sm:text-right font-medium">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Portfolio Summary - mobile optimized */}
        <div className="bg-theme-card border border-theme-border rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl">
          <div className="flex flex-col space-y-4 sm:space-y-6 lg:flex-row lg:items-center lg:justify-between lg:space-y-0 lg:gap-6">
            {/* Left: Portfolio Balance */}
            <div className="flex-1">
              <div className="text-xs sm:text-sm text-theme-text-muted uppercase tracking-wide font-semibold mb-1 sm:mb-2">TOTAL BALANCE</div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <div className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-theme-text">
                  $180,512.85
                </div>
                <span className="text-xs sm:text-sm font-medium text-theme-success bg-theme-success-bg px-2 sm:px-3 py-1 rounded-full self-start sm:self-auto">
                  +2.45%
                </span>
              </div>
              <div className="text-theme-text-muted text-sm sm:text-base">≈ 1.06 ETH</div>
            </div>

            {/* Right: Quick Actions - mobile responsive */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto lg:w-auto">
              <button className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 p-3 sm:p-2 bg-theme-card-hover hover:bg-theme-border rounded-xl transition-colors touch-manipulation min-h-[48px]">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-theme-text rounded-full flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <span className="text-sm font-medium text-theme-text flex-1 sm:flex-none text-center sm:text-left">Withdraw</span>
              </button>
              <button className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 p-3 sm:p-2 bg-theme-card-hover hover:bg-theme-border rounded-xl transition-colors touch-manipulation min-h-[48px]">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-theme-text rounded-full flex items-center justify-center">
                  <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <span className="text-sm font-medium text-theme-text flex-1 sm:flex-none text-center sm:text-left">Send</span>
              </button>
              <button className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 p-3 sm:p-2 bg-theme-primary hover:bg-theme-primary-hover rounded-xl transition-colors touch-manipulation min-h-[48px]">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <span className="text-sm font-medium text-white flex-1 sm:flex-none text-center sm:text-left">Invest</span>
              </button>
            </div>
          </div>
        </div>

        {/* Market Overview Section - mobile optimized */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 xl:gap-8">
          <div className="bg-theme-card border border-theme-border rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg hover:shadow-xl transition-all duration-300 touch-manipulation">
            <div className="text-xs text-theme-text-muted uppercase tracking-wider font-semibold mb-2 sm:mb-3">Total Signals</div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-theme-text">{totalSignals}</div>
          </div>

          <div className="bg-theme-card border border-theme-border rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg hover:shadow-xl transition-all duration-300 touch-manipulation">
            <div className="text-xs text-theme-success uppercase tracking-wider font-semibold mb-2 sm:mb-3">Risk-On</div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-theme-success">{riskOnSignals}</div>
            <div className="text-xs sm:text-sm text-theme-text-muted mt-1 sm:mt-2 font-medium">{totalSignals > 0 ? Math.round((riskOnSignals / totalSignals) * 100) : 0}%</div>
          </div>

          <div className="bg-theme-card border border-theme-border rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg hover:shadow-xl transition-all duration-300 touch-manipulation">
            <div className="text-xs text-theme-danger uppercase tracking-wider font-semibold mb-2 sm:mb-3">Risk-Off</div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-theme-danger">{riskOffSignals}</div>
            <div className="text-xs sm:text-sm text-theme-text-muted mt-1 sm:mt-2 font-medium">{totalSignals > 0 ? Math.round((riskOffSignals / totalSignals) * 100) : 0}%</div>
          </div>

          <div className="bg-theme-card border border-theme-border rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg hover:shadow-xl transition-all duration-300 touch-manipulation">
            <div className="text-xs text-theme-warning uppercase tracking-wider font-semibold mb-2 sm:mb-3">Neutral</div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-theme-warning">{neutralSignals}</div>
            <div className="text-xs sm:text-sm text-theme-text-muted mt-1 sm:mt-2 font-medium">{totalSignals > 0 ? Math.round((neutralSignals / totalSignals) * 100) : 0}%</div>
          </div>
        </div>

        {/* Enhanced Consensus Panel - mobile optimized */}
        {consensus && (
          <div className="bg-gradient-to-br from-theme-card to-theme-card-secondary border border-theme-border rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 xl:p-20 shadow-2xl">
            <div className="text-center mb-8 sm:mb-12">
              {/* Header - mobile responsive */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-6 sm:mb-8">
                <div className="text-xs sm:text-sm text-theme-text-muted uppercase tracking-wider font-bold">Market Consensus</div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-theme-success rounded-full animate-pulse"></div>
                  <span className="text-xs text-theme-success font-semibold">LIVE</span>
                </div>
              </div>

              {/* Main Consensus Display - mobile optimized */}
              <div className="mb-8 sm:mb-12">
                <div className={`text-5xl sm:text-6xl lg:text-7xl xl:text-8xl 2xl:text-9xl font-black mb-4 sm:mb-6 ${getSignalColor(consensus.consensus)} flex flex-col items-center justify-center space-y-4 sm:space-y-6`}>
                  <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 xl:w-32 xl:h-32 rounded-2xl sm:rounded-3xl bg-current/10 flex items-center justify-center shadow-xl">
                    <div className="scale-125 sm:scale-150 lg:scale-200">
                      {getSignalIcon(consensus.consensus)}
                    </div>
                  </div>
                  <span className="text-center tracking-tight px-4">{consensus.consensus}</span>
                </div>
                <div className="text-base sm:text-lg lg:text-xl text-theme-text-muted font-medium px-4">
                  Market is showing <strong className="text-theme-text">{consensus.consensus.toLowerCase()}</strong> signals with{' '}
                  <strong className="text-theme-text">{Math.round(consensus.confidence * 100)}%</strong> confidence
                </div>
              </div>

              {/* Enhanced Metrics Grid - mobile responsive */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 xl:gap-12 max-w-6xl mx-auto">
                <div className="bg-theme-card border border-theme-border rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-all duration-300 touch-manipulation">
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-theme-text mb-3 sm:mb-4">
                    {Math.round(consensus.confidence * 100)}%
                  </div>
                  <div className="text-theme-text-muted font-semibold text-base sm:text-lg mb-3 sm:mb-4">Confidence Level</div>
                  <div className="w-full bg-theme-border rounded-full h-3 sm:h-4">
                    <div
                      className="bg-theme-primary h-3 sm:h-4 rounded-full transition-all duration-1000"
                      style={{ width: `${consensus.confidence * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-theme-card border border-theme-border rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-all duration-300 touch-manipulation">
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-theme-success mb-3 sm:mb-4">
                    {consensus.riskOnCount}
                  </div>
                  <div className="text-theme-text-muted font-semibold text-base sm:text-lg mb-3 sm:mb-4">Risk-On Signals</div>
                  <div className="w-full bg-theme-border rounded-full h-3 sm:h-4">
                    <div
                      className="bg-theme-success h-3 sm:h-4 rounded-full transition-all duration-1000"
                      style={{ width: `${totalSignals > 0 ? (consensus.riskOnCount / totalSignals) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-theme-card border border-theme-border rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-all duration-300 touch-manipulation">
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-theme-danger mb-3 sm:mb-4">
                    {consensus.riskOffCount}
                  </div>
                  <div className="text-theme-text-muted font-semibold text-base sm:text-lg mb-3 sm:mb-4">Risk-Off Signals</div>
                  <div className="w-full bg-theme-border rounded-full h-3 sm:h-4">
                    <div
                      className="bg-theme-danger h-3 sm:h-4 rounded-full transition-all duration-1000"
                      style={{ width: `${totalSignals > 0 ? (consensus.riskOffCount / totalSignals) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Individual Signal Cards - mobile optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {signals.map((signal, index) => (
            <div
              key={index}
              onClick={() => handleSignalClick(signal)}
              className="bg-theme-card border border-theme-border rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer touch-manipulation active:scale-95"
            >
              {/* Header with mobile-optimized layout */}
              <div className="flex items-start justify-between mb-6 sm:mb-8">
                <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl sm:rounded-2xl ${getSignalBgColor(signal.signal)} flex items-center justify-center shadow-md`}>
                    <div className="scale-100 sm:scale-110 lg:scale-125">
                      {getSignalIcon(signal.signal)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-theme-text font-bold text-sm sm:text-base lg:text-lg uppercase tracking-wide mb-1 truncate">
                      {signal.type.replace('_', ' / ')}
                    </h3>
                    <div className="text-theme-text-muted font-medium text-xs sm:text-sm">
                      {signal.strength} Signal
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-theme-text">
                    {Math.round(signal.confidence * 100)}%
                  </div>
                  <div className="text-xs text-theme-text-muted uppercase tracking-wide">
                    Confidence
                  </div>
                </div>
              </div>

              {/* Main signal display - mobile responsive */}
              <div className="text-center mb-6 sm:mb-8">
                <div className={`text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3 ${getSignalColor(signal.signal)}`}>
                  {signal.signal}
                </div>
                <div className="text-theme-text-muted text-xs sm:text-sm">
                  Updated {new Date(signal.date).toLocaleTimeString()}
                </div>
              </div>

              {/* Compact metrics display - mobile optimized */}
              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                <div className="flex items-center justify-between p-3 sm:p-4 bg-theme-card-secondary rounded-lg sm:rounded-xl">
                  <div>
                    <div className="text-theme-text-muted text-xs sm:text-sm font-medium">Signal Strength</div>
                    <div className="text-theme-text text-sm sm:text-base lg:text-lg font-bold">{signal.strength}</div>
                  </div>
                  <div className="w-16 sm:w-20 bg-theme-border rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-700 ${getStrengthColor(signal.strength)}`}
                      style={{ width: `${getStrengthValue(signal.strength)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 sm:p-4 bg-theme-card-secondary rounded-lg sm:rounded-xl">
                  <div className="flex-1 min-w-0 mr-2">
                    <div className="text-theme-text-muted text-xs sm:text-sm font-medium">Raw Value</div>
                    <div className="text-theme-text text-sm sm:text-base lg:text-lg font-mono font-bold truncate">
                      {signal.rawValue.toFixed(4)}
                    </div>
                  </div>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-theme-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                </div>
              </div>

              {/* Action button - mobile optimized */}
              <button className="w-full bg-theme-text text-white py-3 sm:py-4 rounded-lg sm:rounded-xl font-semibold hover:bg-theme-text/90 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base touch-manipulation min-h-[48px]">
                <span className="truncate">View ETF Recommendations</span>
                <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              </button>
            </div>
          ))}
        </div>
        
        {/* AI Agent Debate View - Coming Soon */}
        {transparentDecision && (
          <div className="bg-theme-card border border-theme-border rounded-2xl p-6 shadow-lg mt-8">
            <h3 className="text-lg font-semibold text-theme-text mb-4">🤖 AI Agent Analysis</h3>
            <p className="text-theme-text-muted">Multi-agent decision system coming soon...</p>
          </div>
        )}
      </div>

      {/* ETF Modal */}
      <ETFModal />
    </div>
  );
}
