'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Activity, Shield, AlertCircle } from 'lucide-react';
import InteractiveEconomicChart from '../InteractiveEconomicChart';

interface VixDefensiveData {
  date: string;
  vixLevel: number;
  vixMA: number;
  signal: 'Risk-On' | 'Risk-Off' | 'Neutral';
  strength: 'Strong' | 'Moderate' | 'Weak';
  confidence: number;
}

interface VixDefensiveSignalProps {
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

export default function VixDefensiveSignal({
  height = 400,
  selectedPeriod = '12m',
  onPeriodChange,
  className = ''
}: VixDefensiveSignalProps) {
  const [data, setData] = useState<VixDefensiveData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSignal, setCurrentSignal] = useState<VixDefensiveData | null>(null);

  // Fetch VIX Defensive signal data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/signals?signal=vix_defensive&period=${selectedPeriod}`);
      
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
      console.error('Error fetching VIX Defensive data:', err);
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
  const transformToChartData = (apiData: any[]): VixDefensiveData[] => {
    return apiData.map((item: any) => ({
      date: item.date,
      vixLevel: item.vixLevel || 0,
      vixMA: item.vixMA || item.vixLevel || 0,
      signal: item.signal || 'Neutral',
      strength: item.strength || 'Moderate',
      confidence: item.confidence || 0.5
    }));
  };

  // Generate fallback data for demo purposes
  const generateFallbackData = (): VixDefensiveData[] => {
    const data: VixDefensiveData[] = [];
    const endDate = new Date();
    const startDate = new Date();
    
    // Calculate date range
    const months = selectedPeriod.includes('y') ? 
      parseInt(selectedPeriod) * 12 : 
      parseInt(selectedPeriod) || 12;
    startDate.setMonth(endDate.getMonth() - months);
    
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    let vixMA = 20; // Moving average tracker
    
    for (let i = 0; i < daysDiff; i += 7) { // Weekly data
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      // Generate realistic VIX data with volatility spikes
      const marketStress = Math.random() < 0.05 ? 2 : 1; // 5% chance of stress event
      const vixBase = 15 + Math.sin(i / 100) * 8 + Math.cos(i / 70) * 5;
      const vixLevel = Math.max(10, vixBase * marketStress + (Math.random() - 0.5) * 6);
      
      // Update moving average
      vixMA = vixMA * 0.9 + vixLevel * 0.1;
      
      // Determine signal - Counter-intuitive VIX interpretation (Gayed's approach)
      let signal: 'Risk-On' | 'Risk-Off' | 'Neutral' = 'Neutral';
      let strength: 'Strong' | 'Moderate' | 'Weak' = 'Moderate';
      let confidence = 0.7;
      
      if (vixLevel < 15) {
        signal = 'Risk-Off'; // Low VIX = complacency = potential risk
        strength = vixLevel < 12 ? 'Strong' : 'Moderate';
        confidence = Math.min(0.9, 0.6 + (15 - vixLevel) * 0.1);
      } else if (vixLevel > 30) {
        signal = 'Risk-On'; // High VIX = fear = potential opportunity
        strength = vixLevel > 40 ? 'Strong' : 'Moderate';
        confidence = Math.min(0.9, 0.6 + (vixLevel - 30) * 0.02);
      }
      
      data.push({
        date: date.toISOString().split('T')[0],
        vixLevel: Math.round(vixLevel * 100) / 100,
        vixMA: Math.round(vixMA * 100) / 100,
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

  // Get VIX level interpretation
  const getVixInterpretation = (vixLevel: number) => {
    if (vixLevel < 15) {
      return { level: 'Low', color: 'text-red-600', bg: 'bg-red-50' };
    } else if (vixLevel > 30) {
      return { level: 'High', color: 'text-green-600', bg: 'bg-green-50' };
    } else {
      return { level: 'Normal', color: 'text-gray-600', bg: 'bg-gray-50' };
    }
  };

  // Prepare chart series configuration
  const seriesConfig = [
    {
      id: 'vixLevel',
      name: 'VIX Level',
      dataKey: 'vixLevel',
      color: '#EF4444',
      visible: true,
      focused: false,
      frequency: 'weekly' as const,
      category: 'volatility' as const,
      unit: 'Index',
      yAxisId: 'vix',
      strokeWidth: 2,
      showDots: false
    },
    {
      id: 'vixMA',
      name: 'VIX Moving Average',
      dataKey: 'vixMA',
      color: '#94A3B8',
      visible: true,
      focused: false,
      frequency: 'weekly' as const,
      category: 'volatility' as const,
      unit: 'Index',
      yAxisId: 'vix',
      strokeWidth: 1,
      showDots: false
    }
  ];

  const vixInterpretation = currentSignal ? getVixInterpretation(currentSignal.vixLevel) : null;

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-3 sm:p-6 ${className}`}>
      {/* Header - mobile optimized */}
      <div className="flex flex-col sm:flex-row items-start justify-between mb-4 sm:mb-6 gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="p-1.5 sm:p-2 bg-red-100 text-red-600 rounded-lg flex-shrink-0">
            <Shield className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
              VIX Defensive Signal
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-tight">
              Counter-intuitive VIX interpretation for market timing
            </p>
          </div>
        </div>

        {currentSignal && (
          <div className="text-left sm:text-right flex-shrink-0">
            <div
              className="flex items-center gap-2 text-sm font-medium mb-1"
              style={{ color: SIGNAL_COLORS[currentSignal.signal] }}
            >
              {getSignalIcon(currentSignal.signal)}
              <span className="truncate">{currentSignal.signal}</span>
            </div>
            <div className="text-xs text-gray-500">
              {Math.round(currentSignal.confidence * 100)}% confidence
            </div>
          </div>
        )}
      </div>

      {/* Current Status - mobile optimized */}
      {currentSignal && vixInterpretation && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-sm sm:text-lg font-semibold text-gray-900">
              {currentSignal.vixLevel.toFixed(2)}
            </div>
            <div className="text-xs text-gray-600">Current VIX</div>
          </div>
          <div className="text-center">
            <div className={`text-sm sm:text-lg font-semibold ${vixInterpretation.color}`}>
              {vixInterpretation.level}
            </div>
            <div className="text-xs text-gray-600">VIX Level</div>
          </div>
          <div className="text-center">
            <div className="text-sm sm:text-lg font-semibold text-gray-900">
              {currentSignal.strength}
            </div>
            <div className="text-xs text-gray-600">Signal Strength</div>
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
          title="VIX Volatility Index Over Time"
          showBrush={false}
          allowMultipleYAxes={false}
        />
      </div>

      {/* Interpretation */}
      <div className="mt-4 p-4 bg-red-50 rounded-lg">
        <h4 className="text-sm font-medium text-red-900 mb-2">Signal Interpretation (Counter-Intuitive)</h4>
        <div className="space-y-1 text-xs text-red-800">
          <div>• <strong>Risk-On:</strong> High VIX ({`>`}30) indicates fear/capitulation = potential opportunity</div>
          <div>• <strong>Risk-Off:</strong> Low VIX ({`<`}15) suggests complacency = potential danger ahead</div>
          <div>• <strong>Neutral:</strong> Normal VIX range (15-30) indicates balanced market conditions</div>
        </div>
      </div>
    </div>
  );
}