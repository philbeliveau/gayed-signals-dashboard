'use client';

import { useState, useEffect } from 'react';
import { Signal, ConsensusSignal } from '../../lib/types';
import { ETF_RECOMMENDATIONS, getETFRecommendations, getStrategyConfig, ETFRecommendation } from '../../lib/etf-recommendations';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import ETFChart from './ETFChart';

interface StrategyDashboardProps {
  signals: (Signal | null)[];
  consensus: ConsensusSignal;
  isRealData?: boolean;
}

export default function StrategyDashboard({ signals, consensus, isRealData = true }: StrategyDashboardProps) {
  const [activeTab, setActiveTab] = useState('utilities_spy');
  const [etfPrices, setETFPrices] = useState<Record<string, number>>({});
  const { 
    updateETFSelection, 
    updateETFAllocation, 
    getSelectedETFs, 
    getTotalAllocation,
    resetStrategy,
    preferences 
  } = useUserPreferences();

  const strategyTabs = [
    { id: 'utilities_spy', name: 'Utilities/SPY', icon: '⚡' },
    { id: 'lumber_gold', name: 'Lumber/Gold', icon: '🏗️' },
    { id: 'treasury_curve', name: 'Treasury Curve', icon: '📈' },
    { id: 'vix_defensive', name: 'VIX Defensive', icon: '🛡️' },
    { id: 'sp500_ma', name: 'S&P 500 MA', icon: '📊' }
  ];


  useEffect(() => {
    // Fetch current ETF prices for display
    const fetchETFPrices = async () => {
      // This would normally fetch real-time prices
      // For now, using mock data
      setETFPrices({
        'SPY': 614.91,
        'QQQ': 567.83,
        'IWM': 231.45,
        'SPXL': 145.67,
        'XLU': 78.92,
        'SPLV': 67.34,
        'USMV': 89.12,
        'WOOD': 81.30,
        'GLD': 191.17,
        'CUT': 45.23,
        'XLI': 134.56,
        'IAU': 47.89,
        'PDBC': 18.45,
        'XLF': 47.23,
        'TLT': 89.34,
        'IEF': 98.76,
        'VGIT': 58.91,
        'VTI': 298.45,
        'MTUM': 234.67,
        'QUAL': 156.78,
        'SHY': 82.34
      });
    };

    fetchETFPrices();
  }, []);

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Very Low': return 'text-green-600 bg-green-50';
      case 'Low': return 'text-green-500 bg-green-50';
      case 'Medium': return 'text-yellow-600 bg-yellow-50';
      case 'High': return 'text-orange-600 bg-orange-50';
      case 'Very High': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'Risk-On': return 'text-green-600 bg-green-50';
      case 'Risk-Off': return 'text-red-600 bg-red-50';
      case 'Neutral': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Find the signal for the active tab early to avoid conditional hooks
  const activeSignal = signals.find(signal => signal?.type === activeTab);
  const strategyConfig = getStrategyConfig(activeTab);
  
  // Initialize variables that depend on activeSignal being available
  const currentSignal = activeSignal?.signal || 'Neutral';
  const confidence = activeSignal ? Math.round(activeSignal.confidence * 100) : 0;
  const recommendedETFs = activeSignal ? getETFRecommendations(activeTab, currentSignal) : [];
  const alternativeETFs = activeSignal ? getETFRecommendations(
    activeTab, 
    currentSignal === 'Risk-On' ? 'Risk-Off' : 'Risk-On'
  ) : [];

  // Initialize strategy preferences if they don't exist (must be before any early returns)
  useEffect(() => {
    if (!activeSignal || !strategyConfig) return;
    
    const allETFs = [...recommendedETFs, ...alternativeETFs];
    const etfSymbols = allETFs.map(etf => etf.symbol);
    
    if (!preferences.strategies[activeTab] && etfSymbols.length > 0) {
      // Initialize with first 2 ETFs selected with equal allocation
      etfSymbols.slice(0, 2).forEach((symbol, index) => {
        updateETFSelection(activeTab, symbol, true);
        updateETFAllocation(activeTab, symbol, 50); // 50% each for first 2
      });
    }
  }, [activeTab, recommendedETFs, alternativeETFs, preferences.strategies, updateETFSelection, updateETFAllocation, activeSignal, strategyConfig]);

  const renderETFCard = (etf: ETFRecommendation, isActive: boolean) => {
    const price = etfPrices[etf.symbol] || 0;
    
    return (
      <div
        key={etf.symbol}
        className={`p-4 rounded-lg border-2 transition-all ${
          isActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">{etf.symbol}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(etf.riskLevel)}`}>
                {etf.riskLevel} Risk
              </span>
              {etf.priority === 'PRIMARY' && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-600">
                  PRIMARY
                </span>
              )}
            </div>
            <h4 className="font-semibold text-gray-900 mt-1">{etf.name}</h4>
            <p className="text-sm text-gray-600 mb-2">{etf.category}</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900">${price.toFixed(2)}</div>
            <div className="text-sm text-gray-500">{etf.expenseRatio}</div>
            <div className="text-xs text-gray-400">Expense Ratio</div>
          </div>
        </div>
        
        <p className="text-sm text-gray-700 mb-2">{etf.description}</p>
        
        <div className="text-xs text-gray-500">
          <strong>Tracks:</strong> {etf.trackingInfo}
        </div>
      </div>
    );
  };

  if (!activeSignal || !strategyConfig) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg">
        <p className="text-gray-600">Loading strategy data...</p>
      </div>
    );
  }

  const selectedETFs = getSelectedETFs(activeTab);
  const totalAllocation = getTotalAllocation(activeTab);
  const allETFs = [...recommendedETFs, ...alternativeETFs];

  const handleETFToggle = (etfSymbol: string, selected: boolean) => {
    updateETFSelection(activeTab, etfSymbol, selected);
    if (!selected) {
      updateETFAllocation(activeTab, etfSymbol, 0);
    }
  };

  const handleAllocationChange = (etfSymbol: string, allocation: number) => {
    updateETFAllocation(activeTab, etfSymbol, allocation);
  };

  const handleEqualizeAllocations = () => {
    const selected = selectedETFs;
    if (selected.length === 0) return;
    
    const equalAllocation = Math.floor(100 / selected.length);
    selected.forEach(etf => {
      updateETFAllocation(activeTab, etf.symbol, equalAllocation);
    });
  };

  const getETFSelection = (etfSymbol: string) => {
    return preferences.strategies[activeTab]?.selectedETFs[etfSymbol] || {
      symbol: etfSymbol,
      selected: false,
      allocation: 0
    };
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      {/* Real Data Indicator */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Strategy Dashboard</h1>
        {isRealData && (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Real Market Data
          </div>
        )}
      </div>

      {/* Strategy Tabs */}
      <div className="flex overflow-x-auto border-b border-gray-200 mb-6">
        {strategyTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            {tab.name}
          </button>
        ))}
      </div>

      {/* Strategy Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              ETF Recommendations: {strategyConfig.strategyName}
            </h2>
            <p className="text-gray-600 mb-4">{strategyConfig.description}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 mb-1">Current Signal</div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getSignalColor(currentSignal)}`}>
              {currentSignal}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Confidence: {confidence}%
            </div>
          </div>
        </div>
      </div>

      {/* ETF Selection & Portfolio Allocation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            🎯 Customize Your ETF Portfolio
          </h3>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              Total Allocation: <span className={`font-bold ${totalAllocation === 100 ? 'text-green-600' : totalAllocation > 100 ? 'text-red-600' : 'text-orange-600'}`}>
                {totalAllocation}%
              </span>
            </div>
            <button
              onClick={handleEqualizeAllocations}
              disabled={selectedETFs.length === 0}
              className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Equalize
            </button>
            <button
              onClick={() => resetStrategy(activeTab)}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ETF Selection */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Select ETFs to Trade</h4>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {allETFs.map((etf) => {
                const selection = getETFSelection(etf.symbol);
                const isRecommended = recommendedETFs.some(r => r.symbol === etf.symbol);
                
                return (
                  <div
                    key={etf.symbol}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selection.selected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selection.selected}
                        onChange={(e) => handleETFToggle(etf.symbol, e.target.checked)}
                        className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900">{etf.symbol}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(etf.riskLevel)}`}>
                            {etf.riskLevel} Risk
                          </span>
                          {isRecommended && (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-600">
                              RECOMMENDED
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-700 font-medium">{etf.name}</div>
                        <div className="text-xs text-gray-500">{etf.category} • {etf.expenseRatio} expense ratio</div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-medium text-gray-900">${etfPrices[etf.symbol]?.toFixed(2) || '---'}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Portfolio Allocation */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Portfolio Allocation</h4>
            {selectedETFs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-lg mb-2">📊</div>
                <div>Select ETFs to set allocations</div>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedETFs.map((etf) => (
                  <div key={etf.symbol} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-gray-900">{etf.symbol}</div>
                      <div className="text-sm text-gray-600">{etf.allocation}%</div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={etf.allocation}
                      onChange={(e) => handleAllocationChange(etf.symbol, parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>
                ))}
                
                {/* Allocation Summary */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-800">
                    <strong>Portfolio Summary:</strong>
                  </div>
                  <div className="text-sm text-blue-700 mt-1">
                    {selectedETFs.length} ETFs selected • {totalAllocation}% allocated
                  </div>
                  {totalAllocation !== 100 && (
                    <div className="text-xs text-blue-600 mt-1">
                      {totalAllocation > 100 
                        ? '⚠️ Over-allocated! Reduce allocations.' 
                        : `💡 ${100 - totalAllocation}% remaining to allocate.`
                      }
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recommended ETFs */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recommended for {currentSignal} Signal
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {recommendedETFs.map((etf) => renderETFCard(etf, true))}
        </div>
      </div>

      {/* Alternative ETFs */}
      {alternativeETFs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Alternative: {currentSignal === 'Risk-On' ? 'Risk-Off' : 'Risk-On'} Options
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {alternativeETFs.map((etf) => renderETFCard(etf, false))}
          </div>
        </div>
      )}

      {/* ETF Performance Charts */}
      <div className="mt-8 space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          📈 Your Selected ETF Performance Charts
        </h3>
        
        {selectedETFs.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="text-gray-500 text-lg mb-2">📊</div>
            <div className="text-gray-600 mb-2">No ETFs selected for charting</div>
            <div className="text-sm text-gray-500">Select ETFs above to see their performance charts with signals</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {selectedETFs.map((etfSelection) => {
              // Find the full ETF data to get the current signal context
              const etfData = allETFs.find(etf => etf.symbol === etfSelection.symbol);
              const isRecommended = recommendedETFs.some(etf => etf.symbol === etfSelection.symbol);
              const chartSignal = isRecommended ? currentSignal : (currentSignal === 'Risk-On' ? 'Risk-Off' : 'Risk-On');
              
              return (
                <div key={etfSelection.symbol} className="relative">
                  <ETFChart
                    symbol={etfSelection.symbol}
                    strategyType={activeTab}
                    currentSignal={chartSignal}
                    height={350}
                  />
                  {/* Allocation badge overlay */}
                  <div className="absolute top-4 right-4 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                    {etfSelection.allocation}% allocated
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {selectedETFs.length > 0 && (
          <div className="text-center text-sm text-gray-500 mt-4">
            Showing charts for {selectedETFs.length} selected ETF{selectedETFs.length !== 1 ? 's' : ''} with your portfolio allocations
          </div>
        )}
      </div>
    </div>
  );
}