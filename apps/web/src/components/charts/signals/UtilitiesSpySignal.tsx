'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Activity, Zap, AlertCircle } from 'lucide-react';
import InteractiveEconomicChart from '../InteractiveEconomicChart';

interface UtilitiesSpyData {
  date: string;
  xluPrice: number;
  spyPrice: number;
  ratio: number;
  signal: 'Risk-On' | 'Risk-Off' | 'Neutral';
  strength: 'Strong' | 'Moderate' | 'Weak';
  confidence: number;
  [key: string]: number | string;
}

interface UtilitiesSpySignalProps {
  height?: number;
  selectedPeriod?: string;
  onPeriodChange?: (period: string) => void;
  className?: string;
}

const SIGNAL_COLORS = {
  'Risk-On': '#10B981',
  'Risk-Off': '#EF4444', 
  'Neutral': '#6B7280'
} as const;

export default function UtilitiesSpySignal({
  height = 400,
  selectedPeriod = '12m',
  onPeriodChange,
  className = ''
}: UtilitiesSpySignalProps) {
  const [data, setData] = useState<UtilitiesSpyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSignal, setCurrentSignal] = useState<UtilitiesSpyData | null>(null);

  // Fetch Utilities/SPY signal data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/signals?signal=utilities_spy&period=${selectedPeriod}`);
      
      if (!response.ok) {
        throw new Error(`API failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Transform API response to chart data
      const transformedData = transformToChartData(result.data || []);
      setData(transformedData);
      
      // Set current signal (latest data point)
      if (transformedData.length > 0) {
        setCurrentSignal(transformedData[transformedData.length - 1]);
      }
      
    } catch (err) {
      console.error('❌ Error fetching Utilities/SPY data:', err);
      console.log('⚠️ Real data unavailable - NO SYNTHETIC FALLBACK');
      setError(err instanceof Error ? err.message : 'Failed to fetch data');

      // ✅ POLICY COMPLIANT: No fallback data - return empty
      setData([]);
      setCurrentSignal(null);

    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  // Transform API data to chart format
  const transformToChartData = (apiData: any[]): UtilitiesSpyData[] => {
    return apiData.map((item: any) => ({
      date: item.date,
      xluPrice: item.xluPrice || 0,
      spyPrice: item.spyPrice || 0,
      ratio: item.ratio || (item.xluPrice / item.spyPrice),
      signal: item.signal || 'Neutral',
      strength: item.strength || 'Moderate',
      confidence: item.confidence || 0.5
    }));
  };

  // ❌ REMOVED: generateFallbackData() violated REAL DATA ONLY policy
  // Per data-integrity-policy.md: NO SYNTHETIC FALLBACKS ALLOWED
  // When API fails, component displays error state instead

  // Load data on mount and period change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get signal icon
  const getSignalIcon = (signal: 'Risk-On' | 'Risk-Off' | 'Neutral') => {
    switch (signal) {
      case 'Risk-On':
        return <TrendingUp className="w-5 h-5" />;
      case 'Risk-Off':
        return <TrendingDown className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  // Prepare chart series configuration
  const seriesConfig = [
    {
      id: 'ratio',
      name: 'XLU/SPY Ratio',
      dataKey: 'ratio',
      color: '#3B82F6',
      visible: true,
      focused: false,
      frequency: 'weekly' as const,
      category: 'economic' as const,
      unit: 'Ratio',
      description: 'Utilities ETF to S&P 500 ETF ratio',
      yAxisId: 'ratio',
      strokeWidth: 2,
      showDots: false
    }
  ];

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Utilities/SPY Signal
            </h3>
            <p className="text-sm text-gray-600">
              XLU vs SPY performance indicates risk appetite
            </p>
          </div>
        </div>
        
        {currentSignal && (
          <div className="text-right">
            <div 
              className="flex items-center gap-2 text-sm font-medium mb-1"
              style={{ color: SIGNAL_COLORS[currentSignal.signal] }}
            >
              {getSignalIcon(currentSignal.signal)}
              {currentSignal.signal}
            </div>
            <div className="text-xs text-gray-500">
              {Math.round(currentSignal.confidence * 100)}% confidence
            </div>
          </div>
        )}
      </div>

      {/* Current Status */}
      {currentSignal && (
        <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {currentSignal.ratio.toFixed(4)}
            </div>
            <div className="text-xs text-gray-600">Current Ratio</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {currentSignal.strength}
            </div>
            <div className="text-xs text-gray-600">Signal Strength</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              ${currentSignal.xluPrice}
            </div>
            <div className="text-xs text-gray-600">XLU Price</div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Chart */}
      <div className="border border-gray-200 rounded-lg">
        <InteractiveEconomicChart
          data={data}
          seriesConfig={seriesConfig}
          loading={loading}
          error={error || undefined}
          height={height}
          title="XLU/SPY Ratio Over Time"
          showBrush={false}
          allowMultipleYAxes={false}
        />
      </div>

      {/* Interpretation */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Signal Interpretation</h4>
        <div className="space-y-1 text-xs text-blue-800">
          <div>• <strong>Risk-Off:</strong> Utilities outperforming SPY (higher ratio) indicates defensive behavior</div>
          <div>• <strong>Risk-On:</strong> SPY outperforming utilities (lower ratio) indicates risk appetite</div>
          <div>• <strong>Neutral:</strong> Ratio in equilibrium range, mixed market sentiment</div>
        </div>
      </div>
    </div>
  );
}