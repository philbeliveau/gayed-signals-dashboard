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
  const [data, setData] = useState&lt;VixDefensiveData[]&gt;([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState&lt;string | null&gt;(null);
  const [currentSignal, setCurrentSignal] = useState&lt;VixDefensiveData | null&gt;(null);

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
        return &lt;TrendingUp className="w-5 h-5" /&gt;;
      case 'Risk-Off':
        return &lt;TrendingDown className="w-5 h-5" /&gt;;
      default:
        return &lt;Activity className="w-5 h-5" /&gt;;
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
    &lt;div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}&gt;
      {/* Header */}
      &lt;div className="flex items-start justify-between mb-6"&gt;
        &lt;div className="flex items-center gap-3"&gt;
          &lt;div className="p-2 bg-red-100 text-red-600 rounded-lg"&gt;
            &lt;Shield className="w-6 h-6" /&gt;
          &lt;/div&gt;
          &lt;div&gt;
            &lt;h3 className="text-lg font-semibold text-gray-900"&gt;
              VIX Defensive Signal
            &lt;/h3&gt;
            &lt;p className="text-sm text-gray-600"&gt;
              Counter-intuitive VIX interpretation for market timing
            &lt;/p&gt;
          &lt;/div&gt;
        &lt;/div&gt;
        
        {currentSignal && (
          &lt;div className="text-right"&gt;
            &lt;div 
              className="flex items-center gap-2 text-sm font-medium mb-1"
              style={{ color: SIGNAL_COLORS[currentSignal.signal] }}
            &gt;
              {getSignalIcon(currentSignal.signal)}
              {currentSignal.signal}
            &lt;/div&gt;
            &lt;div className="text-xs text-gray-500"&gt;
              {Math.round(currentSignal.confidence * 100)}% confidence
            &lt;/div&gt;
          &lt;/div&gt;
        )}
      &lt;/div&gt;

      {/* Current Status */}
      {currentSignal && vixInterpretation && (
        &lt;div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg"&gt;
          &lt;div className="text-center"&gt;
            &lt;div className="text-lg font-semibold text-gray-900"&gt;
              {currentSignal.vixLevel.toFixed(2)}
            &lt;/div&gt;
            &lt;div className="text-xs text-gray-600"&gt;Current VIX&lt;/div&gt;
          &lt;/div&gt;
          &lt;div className="text-center"&gt;
            &lt;div className={`text-lg font-semibold ${vixInterpretation.color}`}&gt;
              {vixInterpretation.level}
            &lt;/div&gt;
            &lt;div className="text-xs text-gray-600"&gt;VIX Level&lt;/div&gt;
          &lt;/div&gt;
          &lt;div className="text-center"&gt;
            &lt;div className="text-lg font-semibold text-gray-900"&gt;
              {currentSignal.strength}
            &lt;/div&gt;
            &lt;div className="text-xs text-gray-600"&gt;Signal Strength&lt;/div&gt;
          &lt;/div&gt;
        &lt;/div&gt;
      )}

      {/* Error Display */}
      {error && (
        &lt;div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4"&gt;
          &lt;AlertCircle className="w-4 h-4 text-red-600" /&gt;
          &lt;span className="text-sm text-red-700"&gt;{error}&lt;/span&gt;
        &lt;/div&gt;
      )}

      {/* Chart */}
      &lt;div className="border border-gray-200 rounded-lg"&gt;
        &lt;InteractiveEconomicChart
          data={data}
          seriesConfig={seriesConfig}
          loading={loading}
          error={error || undefined}
          height={height}
          title="VIX Volatility Index Over Time"
          showBrush={false}
          allowMultipleYAxes={false}
        /&gt;
      &lt;/div&gt;

      {/* Interpretation */}
      &lt;div className="mt-4 p-4 bg-red-50 rounded-lg"&gt;
        &lt;h4 className="text-sm font-medium text-red-900 mb-2"&gt;Signal Interpretation (Counter-Intuitive)&lt;/h4&gt;
        &lt;div className="space-y-1 text-xs text-red-800"&gt;
          &lt;div&gt;• &lt;strong&gt;Risk-On:&lt;/strong&gt; High VIX (&gt;30) indicates fear/capitulation = potential opportunity&lt;/div&gt;
          &lt;div&gt;• &lt;strong&gt;Risk-Off:&lt;/strong&gt; Low VIX (&lt;15) suggests complacency = potential danger ahead&lt;/div&gt;
          &lt;div&gt;• &lt;strong&gt;Neutral:&lt;/strong&gt; Normal VIX range (15-30) indicates balanced market conditions&lt;/div&gt;
        &lt;/div&gt;
      &lt;/div&gt;
    &lt;/div&gt;
  );
}