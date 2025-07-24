'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Activity, TreePine, AlertCircle } from 'lucide-react';
import InteractiveEconomicChart from '../InteractiveEconomicChart';

interface LumberGoldData {
  date: string;
  lumberPrice: number;
  goldPrice: number;
  ratio: number;
  signal: 'Risk-On' | 'Risk-Off' | 'Neutral';
  strength: 'Strong' | 'Moderate' | 'Weak';
  confidence: number;
}

interface LumberGoldSignalProps {
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

export default function LumberGoldSignal({
  height = 400,
  selectedPeriod = '12m',
  onPeriodChange,
  className = ''
}: LumberGoldSignalProps) {
  const [data, setData] = useState&lt;LumberGoldData[]&gt;([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState&lt;string | null&gt;(null);
  const [currentSignal, setCurrentSignal] = useState&lt;LumberGoldData | null&gt;(null);

  // Fetch Lumber/Gold signal data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/signals?signal=lumber_gold&period=${selectedPeriod}`);
      
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
      console.error('Error fetching Lumber/Gold data:', err);
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
  const transformToChartData = (apiData: any[]): LumberGoldData[] => {
    return apiData.map((item: any) => ({
      date: item.date,
      lumberPrice: item.lumberPrice || 0,
      goldPrice: item.goldPrice || 0,
      ratio: item.ratio || (item.lumberPrice / item.goldPrice),
      signal: item.signal || 'Neutral',
      strength: item.strength || 'Moderate',
      confidence: item.confidence || 0.5
    }));
  };

  // Generate fallback data for demo purposes
  const generateFallbackData = (): LumberGoldData[] => {
    const data: LumberGoldData[] = [];
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
      
      // Generate realistic commodity data with cycles
      const economicCycle = Math.sin(i / 80) * 0.3 + Math.cos(i / 45) * 0.2;
      const lumberPrice = 350 + economicCycle * 100 + (Math.random() - 0.5) * 50;
      const goldPrice = 1950 + economicCycle * -50 + (Math.random() - 0.5) * 30; // Gold often inverse to growth
      const ratio = lumberPrice / goldPrice;
      
      // Determine signal based on ratio trends
      let signal: 'Risk-On' | 'Risk-Off' | 'Neutral' = 'Neutral';
      let strength: 'Strong' | 'Moderate' | 'Weak' = 'Moderate';
      let confidence = 0.7;
      
      if (ratio > 0.25) {
        signal = 'Risk-On'; // Lumber outperforming gold = growth/inflation expectations
        strength = ratio > 0.30 ? 'Strong' : 'Moderate';
        confidence = Math.min(0.9, 0.6 + (ratio - 0.25) * 2);
      } else if (ratio < 0.18) {
        signal = 'Risk-Off'; // Gold outperforming lumber = defensive/deflationary
        strength = ratio < 0.15 ? 'Strong' : 'Moderate';
        confidence = Math.min(0.9, 0.6 + (0.18 - ratio) * 3);
      }
      
      data.push({
        date: date.toISOString().split('T')[0],
        lumberPrice: Math.round(lumberPrice * 100) / 100,
        goldPrice: Math.round(goldPrice * 100) / 100,
        ratio: Math.round(ratio * 10000) / 10000,
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

  // Prepare chart series configuration
  const seriesConfig = [
    {
      id: 'ratio',
      name: 'Lumber/Gold Ratio',
      dataKey: 'ratio',
      color: '#10B981',
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
    &lt;div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}&gt;
      {/* Header */}
      &lt;div className="flex items-start justify-between mb-6"&gt;
        &lt;div className="flex items-center gap-3"&gt;
          &lt;div className="p-2 bg-green-100 text-green-600 rounded-lg"&gt;
            &lt;TreePine className="w-6 h-6" /&gt;
          &lt;/div&gt;
          &lt;div&gt;
            &lt;h3 className="text-lg font-semibold text-gray-900"&gt;
              Lumber/Gold Signal
            &lt;/h3&gt;
            &lt;p className="text-sm text-gray-600"&gt;
              Lumber vs Gold indicates growth vs defensive sentiment
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
      {currentSignal && (
        &lt;div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg"&gt;
          &lt;div className="text-center"&gt;
            &lt;div className="text-lg font-semibold text-gray-900"&gt;
              {currentSignal.ratio.toFixed(4)}
            &lt;/div&gt;
            &lt;div className="text-xs text-gray-600"&gt;Current Ratio&lt;/div&gt;
          &lt;/div&gt;
          &lt;div className="text-center"&gt;
            &lt;div className="text-lg font-semibold text-gray-900"&gt;
              {currentSignal.strength}
            &lt;/div&gt;
            &lt;div className="text-xs text-gray-600"&gt;Signal Strength&lt;/div&gt;
          &lt;/div&gt;
          &lt;div className="text-center"&gt;
            &lt;div className="text-lg font-semibold text-gray-900"&gt;
              ${currentSignal.lumberPrice}
            &lt;/div&gt;
            &lt;div className="text-xs text-gray-600"&gt;Lumber Price&lt;/div&gt;
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
          title="Lumber/Gold Ratio Over Time"
          showBrush={false}
          allowMultipleYAxes={false}
        /&gt;
      &lt;/div&gt;

      {/* Interpretation */}
      &lt;div className="mt-4 p-4 bg-green-50 rounded-lg"&gt;
        &lt;h4 className="text-sm font-medium text-green-900 mb-2"&gt;Signal Interpretation&lt;/h4&gt;
        &lt;div className="space-y-1 text-xs text-green-800"&gt;
          &lt;div&gt;• &lt;strong&gt;Risk-On:&lt;/strong&gt; Lumber outperforming gold indicates growth/inflation expectations&lt;/div&gt;
          &lt;div&gt;• &lt;strong&gt;Risk-Off:&lt;/strong&gt; Gold outperforming lumber suggests defensive/deflationary sentiment&lt;/div&gt;
          &lt;div&gt;• &lt;strong&gt;Neutral:&lt;/strong&gt; Balanced performance between growth and safe-haven assets&lt;/div&gt;
        &lt;/div&gt;
      &lt;/div&gt;
    &lt;/div&gt;
  );
}