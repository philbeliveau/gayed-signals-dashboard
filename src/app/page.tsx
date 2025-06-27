'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, X, TrendingUp, TrendingDown, AlertTriangle, ExternalLink, BarChart3, Activity } from 'lucide-react';
import Link from 'next/link';

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
  const [signals, setSignals] = useState<Signal[]>([]);
  const [consensus, setConsensus] = useState<ConsensusSignal | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [showETFModal, setShowETFModal] = useState(false);

  const fetchSignals = useCallback(async () => {
    try {
      if (!loading) setRefreshing(true);
      setError(null);
      const response = await fetch('/api/signals');
      
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
    } catch (error) {
      console.error('Failed to fetch signals:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loading]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'Risk-On': return 'text-emerald-400';
      case 'Risk-Off': return 'text-red-400';
      case 'Neutral': return 'text-amber-400';
      default: return 'text-gray-400';
    }
  };

  const getSignalBgColor = (signal: string) => {
    switch (signal) {
      case 'Risk-On': return 'bg-emerald-500/10 border-emerald-500/20';
      case 'Risk-Off': return 'bg-red-500/10 border-red-500/20';
      case 'Neutral': return 'bg-amber-500/10 border-amber-500/20';
      default: return 'bg-gray-500/10 border-gray-500/20';
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
      case 'Strong': return 'bg-emerald-500';
      case 'Moderate': return 'bg-amber-500';
      case 'Weak': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Low': return 'text-emerald-400 bg-emerald-500/10';
      case 'Medium': return 'text-amber-400 bg-amber-500/10';
      case 'High': return 'text-red-400 bg-red-500/10';
      case 'Very High': return 'text-purple-400 bg-purple-500/10';
      default: return 'text-gray-400 bg-gray-500/10';
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
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="sticky top-0 bg-[#1A1A1A] border-b border-gray-800 p-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                ETF Recommendations: {recommendations.signalType}
              </h2>
              <div className="flex items-center space-x-4">
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${getSignalBgColor(selectedSignal.signal)}`}>
                  {getSignalIcon(selectedSignal.signal)}
                  <span className={`font-semibold ${getSignalColor(selectedSignal.signal)}`}>
                    Current Signal: {selectedSignal.signal}
                  </span>
                </div>
                <div className="text-sm text-gray-400">
                  Confidence: {Math.round(selectedSignal.confidence * 100)}%
                </div>
              </div>
            </div>
            <button
              onClick={closeETFModal}
              className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 space-y-8">
            {/* Current Signal Recommendations */}
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className={`p-2 rounded-lg ${getSignalBgColor(selectedSignal.signal)}`}>
                  {selectedSignal.signal === 'Risk-On' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                </div>
                <h3 className="text-xl font-bold text-white">
                  Recommended for {selectedSignal.signal} Signal
                </h3>
                <div className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full">
                  PRIMARY
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentSignalETFs.map((etf, index) => (
                  <div key={index} className="bg-[#2A2A2A] border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-lg font-bold text-white">{etf.ticker}</span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskLevelColor(etf.riskLevel)}`}>
                            {etf.riskLevel} Risk
                          </span>
                        </div>
                        <div className="text-sm text-gray-300 font-medium mb-1">{etf.name}</div>
                        <div className="text-xs text-gray-500">{etf.category}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-white">{etf.expenseRatio}%</div>
                        <div className="text-xs text-gray-500">Expense Ratio</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">{etf.description}</p>
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
                    <div key={index} className="bg-[#2A2A2A] border border-gray-700/50 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-lg font-bold text-gray-300">{etf.ticker}</span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskLevelColor(etf.riskLevel)}`}>
                              {etf.riskLevel} Risk
                            </span>
                          </div>
                          <div className="text-sm text-gray-400 font-medium mb-1">{etf.name}</div>
                          <div className="text-xs text-gray-600">{etf.category}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-300">{etf.expenseRatio}%</div>
                          <div className="text-xs text-gray-600">Expense Ratio</div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 leading-relaxed">{etf.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risk Disclaimer */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-lg font-semibold text-amber-400 mb-3">Important Risk Disclaimer</h4>
                  <div className="space-y-2 text-sm text-gray-300">
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

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-800">
              <div className="text-sm text-gray-500">
                Signal updated: {new Date(selectedSignal.date).toLocaleString()}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={closeETFModal}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => window.open('https://finance.yahoo.com', '_blank')}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center space-x-2"
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
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <div className="text-xl font-medium text-gray-300">Loading market signals...</div>
          <div className="text-sm text-gray-500 mt-2">Analyzing market regime data</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8 bg-[#1A1A1A] border border-red-500/20 rounded-xl">
          <div className="text-red-400 text-5xl mb-4">⚠</div>
          <div className="text-xl font-semibold text-red-400 mb-4">Error Loading Signals</div>
          <div className="text-gray-400 mb-6">{error}</div>
          <button 
            onClick={() => {
              setLoading(true);
              setError(null);
              fetchSignals();
            }}
            className="px-6 py-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const totalSignals = signals.length;
  const riskOnSignals = signals.filter(s => s.signal === 'Risk-On').length;
  const riskOffSignals = signals.filter(s => s.signal === 'Risk-Off').length;
  const neutralSignals = signals.filter(s => s.signal === 'Neutral').length;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Enhanced Header */}
      <header className="border-b border-gray-800/50 bg-[#1A1A1A]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-lg">G</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Gayed Signal Dashboard</h1>
                <p className="text-gray-400 text-sm">Professional Market Regime Analysis</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              {lastUpdated && (
                <div className="text-right">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Last Updated</div>
                  <div className="text-sm text-gray-300 font-medium">
                    {lastUpdated.toLocaleTimeString()}
                  </div>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-emerald-400 font-medium">Live</span>
              </div>
              
              <button
                onClick={fetchSignals}
                disabled={refreshing}
                className="p-3 bg-[#2A2A2A] border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:bg-[#3A3A3A] hover:border-gray-600 transition-all duration-200 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-6 pb-4">
          <div className="flex space-x-1 bg-[#0A0A0A] p-1 rounded-xl border border-gray-800/50">
            <div className="flex items-center space-x-2 px-4 py-3 rounded-lg bg-emerald-600 text-white">
              <Activity className="w-4 h-4" />
              <span>Live Signals</span>
            </div>
            <Link 
              href="/backtest" 
              className="flex items-center space-x-2 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Backtesting Lab</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Market Overview Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-[#1A1A1A] border border-gray-800/50 rounded-xl p-6 hover:border-gray-700/50 transition-colors duration-200">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Total Signals</div>
            <div className="text-2xl font-bold text-white">{totalSignals}</div>
          </div>
          
          <div className="bg-[#1A1A1A] border border-emerald-500/20 rounded-xl p-6 hover:border-emerald-500/30 transition-colors duration-200">
            <div className="text-xs text-emerald-400 uppercase tracking-wide mb-2">Risk-On</div>
            <div className="text-2xl font-bold text-emerald-400">{riskOnSignals}</div>
            <div className="text-xs text-gray-400 mt-1">{totalSignals > 0 ? Math.round((riskOnSignals / totalSignals) * 100) : 0}%</div>
          </div>
          
          <div className="bg-[#1A1A1A] border border-red-500/20 rounded-xl p-6 hover:border-red-500/30 transition-colors duration-200">
            <div className="text-xs text-red-400 uppercase tracking-wide mb-2">Risk-Off</div>
            <div className="text-2xl font-bold text-red-400">{riskOffSignals}</div>
            <div className="text-xs text-gray-400 mt-1">{totalSignals > 0 ? Math.round((riskOffSignals / totalSignals) * 100) : 0}%</div>
          </div>
          
          <div className="bg-[#1A1A1A] border border-amber-500/20 rounded-xl p-6 hover:border-amber-500/30 transition-colors duration-200">
            <div className="text-xs text-amber-400 uppercase tracking-wide mb-2">Neutral</div>
            <div className="text-2xl font-bold text-amber-400">{neutralSignals}</div>
            <div className="text-xs text-gray-400 mt-1">{totalSignals > 0 ? Math.round((neutralSignals / totalSignals) * 100) : 0}%</div>
          </div>
        </div>

        {/* Enhanced Consensus Panel */}
        {consensus && (
          <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] border border-gray-800/50 rounded-2xl p-12 shadow-2xl">
            <div className="text-center mb-8">
              <div className="text-sm text-gray-400 uppercase tracking-wide mb-4">Market Consensus</div>
              <div className={`text-7xl font-bold mb-6 ${getSignalColor(consensus.consensus)} flex items-center justify-center space-x-4`}>
                <span className="p-4 rounded-full bg-current/10">
                  {getSignalIcon(consensus.consensus)}
                </span>
                <span>{consensus.consensus}</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-2">
                    {Math.round(consensus.confidence * 100)}%
                  </div>
                  <div className="text-gray-400">Confidence Level</div>
                  <div className="w-full bg-gray-800 rounded-full h-2 mt-3">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${consensus.confidence * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-400 mb-2">
                    {consensus.riskOnCount}
                  </div>
                  <div className="text-gray-400">Risk-On Signals</div>
                  <div className="w-full bg-gray-800 rounded-full h-2 mt-3">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${totalSignals > 0 ? (consensus.riskOnCount / totalSignals) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-400 mb-2">
                    {consensus.riskOffCount}
                  </div>
                  <div className="text-gray-400">Risk-Off Signals</div>
                  <div className="w-full bg-gray-800 rounded-full h-2 mt-3">
                    <div 
                      className="bg-red-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${totalSignals > 0 ? (consensus.riskOffCount / totalSignals) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Individual Signal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {signals.map((signal, index) => (
            <div 
              key={index} 
              onClick={() => handleSignalClick(signal)}
              className={`bg-[#1A1A1A] border rounded-xl p-6 hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer ${getSignalBgColor(signal.signal)}`}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${getSignalBgColor(signal.signal)}`}>
                    {getSignalIcon(signal.signal)}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm uppercase tracking-wide">
                      {signal.type.replace('_', ' / ')}
                    </h3>
                    <div className="text-xs text-gray-500 mt-1">
                      Updated {new Date(signal.date).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={`text-3xl font-bold mb-4 ${getSignalColor(signal.signal)}`}>
                {signal.signal}
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-sm">Signal Strength</span>
                    <span className="text-white font-medium text-sm">{signal.strength}</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${getStrengthColor(signal.strength)}`}
                      style={{ width: `${getStrengthValue(signal.strength)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-sm">Confidence</span>
                    <span className="text-white font-medium text-sm">{Math.round(signal.confidence * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${signal.confidence * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-800">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-500 text-xs">Raw Value</span>
                  <span className="text-gray-300 text-sm font-mono">
                    {signal.rawValue.toFixed(4)}
                  </span>
                </div>
                <div className="flex items-center justify-center space-x-2 text-emerald-400 text-sm">
                  <ExternalLink className="w-4 h-4" />
                  <span>Click to View ETF Recommendations</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ETF Modal */}
      <ETFModal />
    </div>
  );
}
