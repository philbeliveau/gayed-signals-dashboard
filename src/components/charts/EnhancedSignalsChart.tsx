'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Eye, 
  EyeOff, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  LineChart,
  Calendar,
  Filter,
  Settings
} from 'lucide-react';
import InteractiveEconomicChart from './InteractiveEconomicChart';
import { formatDate } from '../../utils/dateFormatting';

interface Signal {
  id: string;
  name: string;
  type: string;
  signal: 'Risk-On' | 'Risk-Off' | 'Neutral';
  strength: 'Strong' | 'Moderate' | 'Weak';
  confidence: number;
  value: number;
  description: string;
  timestamp: string;
}

interface ConsensusSignal {
  consensus: 'Risk-On' | 'Risk-Off' | 'Mixed';
  confidence: number;
  riskOnCount: number;
  riskOffCount: number;
  signals: Signal[];
}

interface EnhancedSignalsChartProps {
  height?: number;
  selectedPeriod?: string;
  onPeriodChange?: (period: string) => void;
  showAllSignals?: boolean;
}

const PERIOD_OPTIONS = [
  { value: '1m', label: '1M', description: '1 Month' },
  { value: '3m', label: '3M', description: '3 Months' },
  { value: '6m', label: '6M', description: '6 Months' },
  { value: '12m', label: '1Y', description: '1 Year' },
  { value: '24m', label: '2Y', description: '2 Years' },
  { value: '5y', label: '5Y', description: '5 Years' }
];

const SIGNAL_COLORS = {
  'Risk-On': '#10B981',    // Green
  'Risk-Off': '#EF4444',   // Red
  'Neutral': '#6B7280',    // Gray
  'Mixed': '#F59E0B'       // Amber
} as const;

const SIGNAL_CONFIGS = [
  {
    id: 'utilities_spy',
    name: 'Utilities/SPY',
    description: 'Risk-On/Risk-Off based on utilities relative performance',
    dataKey: 'utilitiesSpyRatio',
    color: '#3B82F6'
  },
  {
    id: 'lumber_gold',
    name: 'Lumber/Gold',
    description: 'Risk-On/Risk-Off based on lumber vs gold performance',
    dataKey: 'lumberGoldRatio',
    color: '#10B981'
  },
  {
    id: 'treasury_curve',
    name: 'Treasury Curve',
    description: 'Risk-On/Risk-Off based on 10Y vs 30Y performance',
    dataKey: 'treasuryCurveRatio',
    color: '#F59E0B'
  },
  {
    id: 'vix_defensive',
    name: 'VIX Defensive',
    description: 'Counter-intuitive: Low VIX = Risk-Off, High VIX = Risk-On',
    dataKey: 'vixLevel',
    color: '#EF4444'
  },
  {
    id: 'sp500_ma',
    name: 'S&P 500 MA',
    description: 'Trend-following based on 50/200 day moving averages',
    dataKey: 'sp500MaRatio',
    color: '#8B5CF6'
  }
];

export default function EnhancedSignalsChart({
  height = 600,
  selectedPeriod = '12m',
  onPeriodChange,
  showAllSignals = true
}: EnhancedSignalsChartProps) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [consensus, setConsensus] = useState<ConsensusSignal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [visibleSignals, setVisibleSignals] = useState<string[]>(
    showAllSignals ? SIGNAL_CONFIGS.map(s => s.id) : ['utilities_spy']
  );
  const [chartData, setChartData] = useState<any[]>([]);

  // Fetch signals data
  const fetchSignals = useCallback(async (fast = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/signals?fast=${fast}`);
      
      if (!response.ok) {
        throw new Error(`Signals API failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setSignals(data.signals || []);
      setConsensus(data.consensus || null);
      setLastUpdated(new Date());
      
      // Transform signals data for chart display
      const transformedData = transformSignalsToChartData(data.signals || []);
      setChartData(transformedData);
      
    } catch (err) {
      console.error('Error fetching signals:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch signals');
    } finally {
      setLoading(false);
    }
  }, []);

  // Transform signals data to chart format
  const transformSignalsToChartData = (signalsData: Signal[]): any[] => {
    // Create mock time series data for visualization
    const data: any[] = [];
    const endDate = new Date();
    const startDate = new Date();
    
    // Calculate date range based on period
    if (selectedPeriod.endsWith('y')) {
      const years = parseInt(selectedPeriod) || 1;
      startDate.setFullYear(endDate.getFullYear() - years);
    } else if (selectedPeriod.endsWith('m')) {
      const months = parseInt(selectedPeriod) || 12;
      startDate.setMonth(endDate.getMonth() - months);
    }
    
    // Generate daily data points
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i < daysDiff; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const point: any = {
        date: date.toISOString().split('T')[0]
      };
      
      // Add signal data with some variation
      signalsData.forEach(signal => {
        const baseValue = signal.value;
        const variation = (Math.sin(i / 10) + Math.cos(i / 7)) * 0.1;
        
        switch (signal.type) {
          case 'utilities_spy':
            point.utilitiesSpyRatio = baseValue + variation;
            break;
          case 'lumber_gold':
            point.lumberGoldRatio = baseValue + variation;
            break;
          case 'treasury_curve':
            point.treasuryCurveRatio = baseValue + variation;
            break;
          case 'vix_defensive':
            point.vixLevel = Math.max(10, baseValue + variation * 5);
            break;
          case 'sp500_ma':
            point.sp500MaRatio = baseValue + variation;
            break;
        }
      });
      
      data.push(point);
    }
    
    return data;
  };

  // Initial load
  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  // Handle period change
  const handlePeriodChange = useCallback((period: string) => {
    onPeriodChange?.(period);
    fetchSignals();
  }, [onPeriodChange, fetchSignals]);

  // Toggle signal visibility
  const toggleSignalVisibility = useCallback((signalId: string) => {
    setVisibleSignals(prev => 
      prev.includes(signalId) 
        ? prev.filter(id => id !== signalId)
        : [...prev, signalId]
    );
  }, []);

  // Show all signals
  const showAllSignalsHandler = useCallback(() => {
    setVisibleSignals(SIGNAL_CONFIGS.map(s => s.id));
  }, []);

  // Hide all signals
  const hideAllSignalsHandler = useCallback(() => {
    setVisibleSignals([]);
  }, []);

  // Series configuration for chart
  const seriesConfig = useMemo(() => {
    return SIGNAL_CONFIGS.map(config => ({
      ...config,
      visible: visibleSignals.includes(config.id),
      focused: false,
      frequency: 'daily' as const,
      category: 'economic' as const,
      unit: config.id === 'vix_defensive' ? 'Index' : 'Ratio',
      yAxisId: config.id === 'vix_defensive' ? 'vix' : 'ratio',
      strokeWidth: 2,
      showDots: false
    }));
  }, [visibleSignals]);

  // Get signal icon
  const getSignalIcon = (signal: 'Risk-On' | 'Risk-Off' | 'Neutral') => {
    switch (signal) {
      case 'Risk-On':
        return <TrendingUp className="w-4 h-4" />;
      case 'Risk-Off':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  // Get signal color
  const getSignalColor = (signal: 'Risk-On' | 'Risk-Off' | 'Neutral' | 'Mixed') => {
    return SIGNAL_COLORS[signal] || SIGNAL_COLORS['Neutral'];
  };

  // Get strength badge
  const getStrengthBadge = (strength: 'Strong' | 'Moderate' | 'Weak') => {
    const colors = {
      Strong: 'bg-green-100 text-green-800',
      Moderate: 'bg-yellow-100 text-yellow-800',
      Weak: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[strength]}`}>
        {strength}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Gayed Market Signals
              </h2>
              <p className="text-gray-600">
                Real-time analysis of all 5 market regime indicators
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchSignals()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button
            onClick={showAllSignalsHandler}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Eye className="w-4 h-4" />
            Show All 5
          </button>
        </div>
      </div>

      {/* Consensus Signal */}
      {consensus && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Market Consensus</h3>
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getSignalColor(consensus.consensus) }}
              />
              <span className="font-medium" style={{ color: getSignalColor(consensus.consensus) }}>
                {consensus.consensus}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(consensus.confidence * 100)}%
              </div>
              <div className="text-sm text-gray-600">Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {consensus.riskOnCount}
              </div>
              <div className="text-sm text-gray-600">Risk-On</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {consensus.riskOffCount}
              </div>
              <div className="text-sm text-gray-600">Risk-Off</div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Signals */}
      {signals.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Individual Signals</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {signals.map((signal) => (
              <div key={signal.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleSignalVisibility(signal.type)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      {visibleSignals.includes(signal.type) ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>
                    <span className="font-medium text-gray-900">{signal.name}</span>
                  </div>
                  <div className="flex items-center gap-1" style={{ color: getSignalColor(signal.signal) }}>
                    {getSignalIcon(signal.signal)}
                    <span className="text-sm font-medium">{signal.signal}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {Math.round(signal.confidence * 100)}% confident
                  </div>
                  {getStrengthBadge(signal.strength)}
                </div>
                
                <div className="mt-2 text-xs text-gray-500">
                  {signal.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Period:</span>
          <div className="flex bg-gray-50 border border-gray-200 rounded-lg p-1">
            {PERIOD_OPTIONS.map(period => (
              <button
                key={period.value}
                onClick={() => handlePeriodChange(period.value)}
                className={`px-3 py-1.5 text-sm rounded transition-all ${
                  selectedPeriod === period.value
                    ? 'bg-white text-blue-600 shadow-sm font-medium'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title={period.description}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={hideAllSignalsHandler}
            className="px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Hide All
          </button>
          <span className="text-sm text-gray-500">
            {visibleSignals.length} of {SIGNAL_CONFIGS.length} visible
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <InteractiveEconomicChart
          data={chartData}
          seriesConfig={seriesConfig}
          loading={loading}
          error={error || undefined}
          height={height}
          title="Market Regime Signals"
          allowMultipleYAxes={true}
          showBrush={true}
        />
      </div>

      {/* Status */}
      {lastUpdated && (
        <div className="text-sm text-gray-500 text-center">
          Last updated: {formatDate(lastUpdated.toISOString(), 'short')}
        </div>
      )}
    </div>
  );
}