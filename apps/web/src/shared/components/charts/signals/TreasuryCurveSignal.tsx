'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Activity, Landmark, AlertCircle } from 'lucide-react';
import InteractiveEconomicChart from '../InteractiveEconomicChart';

interface TreasuryCurveData {
  date: string;
  ty10Price: number;
  ty30Price: number;
  ratio: number;
  spread: number;
  signal: 'Risk-On' | 'Risk-Off' | 'Neutral';
  strength: 'Strong' | 'Moderate' | 'Weak';
  confidence: number;
}

interface TreasuryCurveSignalProps {
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

export default function TreasuryCurveSignal({
  height = 400,
  selectedPeriod = '12m',
  onPeriodChange,
  className = ''
}: TreasuryCurveSignalProps) {
  const [data, setData] = useState<TreasuryCurveData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSignal, setCurrentSignal] = useState<TreasuryCurveData | null>(null);

  // Fetch Treasury Curve signal data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/signals?signal=treasury_curve&period=${selectedPeriod}`);
      
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
      console.error('Error fetching Treasury Curve data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      
      // Generate fallback data for demo
      const fallbackData = generateFallbackData();
      setData(fallbackData);
      if (fallbackData.length > 0) {
        setCurrentSignal(fallbackData[fallbackData.length - 1]);
      }
      
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  // Transform API data to chart format
  const transformToChartData = (apiData: any[]): TreasuryCurveData[] => {
    return apiData.map((item: any) => ({
      date: item.date,
      ty10Price: item.ty10Price || 0,
      ty30Price: item.ty30Price || 0,
      ratio: item.ratio || (item.ty10Price / item.ty30Price),
      spread: item.spread || (item.ty30Price - item.ty10Price),
      signal: item.signal || 'Neutral',
      strength: item.strength || 'Moderate',
      confidence: item.confidence || 0.5
    }));
  };

  // Generate fallback data for demo purposes
  const generateFallbackData = (): TreasuryCurveData[] => {
    const data: TreasuryCurveData[] = [];
    const endDate = new Date();
    const startDate = new Date();
    
    // Calculate date range
    const months = selectedPeriod.includes('y') ? 
      parseInt(selectedPeriod) * 12 : 
      parseInt(selectedPeriod) || 12;
    startDate.setMonth(endDate.getMonth() - months);
    
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i < daysDiff; i += 7) { // Weekly data
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      // Generate realistic bond ETF data with yield curve dynamics
      const ratesCycle = Math.sin(i / 90) * 0.3 + Math.cos(i / 60) * 0.2;
      const ty10Price = 105 + ratesCycle * -8 + (Math.random() - 0.5) * 3; // Inverse to rates
      const ty30Price = 125 + ratesCycle * -12 + (Math.random() - 0.5) * 4; // More sensitive to rates
      const ratio = ty10Price / ty30Price;
      const spread = ty30Price - ty10Price;
      
      // Determine signal based on curve steepness/inversion
      let signal: 'Risk-On' | 'Risk-Off' | 'Neutral' = 'Neutral';
      let strength: 'Strong' | 'Moderate' | 'Weak' = 'Moderate';
      let confidence = 0.7;
      
      if (ratio > 0.86) {
        signal = 'Risk-Off'; // Flattening/inverting curve = recession fears
        strength = ratio > 0.88 ? 'Strong' : 'Moderate';
        confidence = Math.min(0.9, 0.6 + (ratio - 0.86) * 5);
      } else if (ratio < 0.82) {
        signal = 'Risk-On'; // Steepening curve = growth expectations
        strength = ratio < 0.80 ? 'Strong' : 'Moderate';
        confidence = Math.min(0.9, 0.6 + (0.82 - ratio) * 5);
      }
      
      data.push({
        date: date.toISOString().split('T')[0],
        ty10Price: Math.round(ty10Price * 100) / 100,
        ty30Price: Math.round(ty30Price * 100) / 100,
        ratio: Math.round(ratio * 10000) / 10000,
        spread: Math.round(spread * 100) / 100,
        signal,
        strength,
        confidence: Math.round(confidence * 100) / 100
      });
    }
    
    return data;
  };

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
      name: '10Y/30Y Treasury Ratio',
      dataKey: 'ratio',
      color: '#F59E0B',
      visible: true,
      focused: false,
      frequency: 'weekly' as const,
      category: 'ratio' as const,
      unit: 'Ratio',
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
          <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Treasury Curve Signal
            </h3>
            <p className="text-sm text-gray-600">
              10Y vs 30Y Treasury performance indicates yield curve shape
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
            <div className="text-xs text-gray-600">10Y/30Y Ratio</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {currentSignal.strength}
            </div>
            <div className="text-xs text-gray-600">Signal Strength</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {currentSignal.spread.toFixed(2)}
            </div>
            <div className="text-xs text-gray-600">Price Spread</div>
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
          title="10Y/30Y Treasury Ratio Over Time"
          showBrush={false}
          allowMultipleYAxes={false}
        />
      </div>

      {/* Interpretation */}
      <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
        <h4 className="text-sm font-medium text-yellow-900 mb-2">Signal Interpretation</h4>
        <div className="space-y-1 text-xs text-yellow-800">
          <div>• <strong>Risk-On:</strong> Steepening curve (lower ratio) indicates growth expectations</div>
          <div>• <strong>Risk-Off:</strong> Flattening/inverting curve (higher ratio) suggests recession fears</div>
          <div>• <strong>Neutral:</strong> Normal curve shape with balanced economic outlook</div>
        </div>
      </div>
    </div>
  );
}