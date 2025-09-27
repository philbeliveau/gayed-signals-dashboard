'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Activity, BarChart3, AlertCircle } from 'lucide-react';
import InteractiveEconomicChart from '../InteractiveEconomicChart';

interface SP500MAData {
  date: string;
  spyPrice: number;
  ma50: number;
  ma200: number;
  ma50_200_ratio: number;
  signal: 'Risk-On' | 'Risk-Off' | 'Neutral';
  strength: 'Strong' | 'Moderate' | 'Weak';
  confidence: number;
}

interface SP500MASignalProps {
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

export default function SP500MASignal({
  height = 400,
  selectedPeriod = '12m',
  onPeriodChange,
  className = ''
}: SP500MASignalProps) {
  const [data, setData] = useState&lt;SP500MAData[]&gt;([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState&lt;string | null&gt;(null);
  const [currentSignal, setCurrentSignal] = useState&lt;SP500MAData | null&gt;(null);

  // Fetch S&P 500 MA signal data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/signals?signal=sp500_ma&period=${selectedPeriod}`);
      
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
      console.error('Error fetching S&P 500 MA data:', err);
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
  const transformToChartData = (apiData: any[]): SP500MAData[] => {
    return apiData.map((item: any) => ({
      date: item.date,
      spyPrice: item.spyPrice || 0,
      ma50: item.ma50 || 0,
      ma200: item.ma200 || 0,
      ma50_200_ratio: item.ma50_200_ratio || (item.ma50 / item.ma200),
      signal: item.signal || 'Neutral',
      strength: item.strength || 'Moderate',
      confidence: item.confidence || 0.5
    }));
  };

  // Calculate simple moving average
  const calculateMA = (prices: number[], period: number): number[] => {
    const ma: number[] = [];
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        ma.push(0); // Not enough data points
      } else {
        const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        ma.push(sum / period);
      }
    }
    return ma;
  };

  // Generate fallback data for demo purposes
  const generateFallbackData = (): SP500MAData[] => {
    const data: SP500MAData[] = [];
    const endDate = new Date();
    const startDate = new Date();
    
    // Calculate date range
    const months = selectedPeriod.includes('y') ? 
      parseInt(selectedPeriod) * 12 : 
      parseInt(selectedPeriod) || 12;
    startDate.setMonth(endDate.getMonth() - months);
    
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Generate SPY price data with trend
    const spyPrices: number[] = [];
    let basePrice = 400;
    
    for (let i = 0; i < daysDiff; i++) {
      const trend = Math.sin(i / 150) * 30 + Math.cos(i / 90) * 20;
      const dailyChange = (Math.random() - 0.5) * 8;
      basePrice = Math.max(350, basePrice + trend * 0.1 + dailyChange);
      spyPrices.push(basePrice);
    }
    
    // Calculate moving averages
    const ma50Array = calculateMA(spyPrices, 50);
    const ma200Array = calculateMA(spyPrices, 200);
    
    for (let i = 0; i < daysDiff; i += 5) { // Every 5 days for weekly data
      if (i >= 200) { // Only after we have enough data for 200-day MA
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        
        const spyPrice = spyPrices[i];
        const ma50 = ma50Array[i];
        const ma200 = ma200Array[i];
        const ma50_200_ratio = ma50 / ma200;
        
        // Determine signal based on MA crossover and positioning
        let signal: 'Risk-On' | 'Risk-Off' | 'Neutral' = 'Neutral';
        let strength: 'Strong' | 'Moderate' | 'Weak' = 'Moderate';
        let confidence = 0.7;
        
        const priceAbove50 = spyPrice > ma50;
        const priceAbove200 = spyPrice > ma200;
        const ma50Above200 = ma50 > ma200;
        
        if (priceAbove50 && priceAbove200 && ma50Above200) {
          signal = 'Risk-On'; // Golden cross + price above both MAs
          strength = ma50_200_ratio > 1.05 ? 'Strong' : 'Moderate';
          confidence = Math.min(0.9, 0.7 + (ma50_200_ratio - 1) * 2);
        } else if (!priceAbove50 && !priceAbove200 && !ma50Above200) {
          signal = 'Risk-Off'; // Death cross + price below both MAs
          strength = ma50_200_ratio < 0.95 ? 'Strong' : 'Moderate';
          confidence = Math.min(0.9, 0.7 + (1 - ma50_200_ratio) * 2);
        }
        
        data.push({
          date: date.toISOString().split('T')[0],
          spyPrice: Math.round(spyPrice * 100) / 100,
          ma50: Math.round(ma50 * 100) / 100,
          ma200: Math.round(ma200 * 100) / 100,
          ma50_200_ratio: Math.round(ma50_200_ratio * 10000) / 10000,
          signal,
          strength,
          confidence: Math.round(confidence * 100) / 100
        });
      }
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

  // Get MA configuration status
  const getMAStatus = (current: SP500MAData) => {
    const priceAbove50 = current.spyPrice > current.ma50;
    const priceAbove200 = current.spyPrice > current.ma200;
    const ma50Above200 = current.ma50 > current.ma200;
    
    if (priceAbove50 && priceAbove200 && ma50Above200) {
      return { status: 'Golden Cross', color: 'text-green-600' };
    } else if (!priceAbove50 && !priceAbove200 && !ma50Above200) {
      return { status: 'Death Cross', color: 'text-red-600' };
    } else {
      return { status: 'Mixed', color: 'text-yellow-600' };
    }
  };

  // Prepare chart series configuration
  const seriesConfig = [
    {
      id: 'spyPrice',
      name: 'SPY Price',
      dataKey: 'spyPrice',
      color: '#1F2937',
      visible: true,
      focused: false,
      frequency: 'daily' as const,
      category: 'price' as const,
      unit: '$',
      yAxisId: 'price',
      strokeWidth: 2,
      showDots: false
    },
    {
      id: 'ma50',
      name: '50-Day MA',
      dataKey: 'ma50',
      color: '#3B82F6',
      visible: true,
      focused: false,
      frequency: 'daily' as const,
      category: 'price' as const,
      unit: '$',
      yAxisId: 'price',
      strokeWidth: 1.5,
      showDots: false
    },
    {
      id: 'ma200',
      name: '200-Day MA',
      dataKey: 'ma200',
      color: '#DC2626',
      visible: true,
      focused: false,
      frequency: 'daily' as const,
      category: 'price' as const,
      unit: '$',
      yAxisId: 'price',
      strokeWidth: 1.5,
      showDots: false
    }
  ];

  const maStatus = currentSignal ? getMAStatus(currentSignal) : null;

  return (
    &lt;div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}&gt;
      {/* Header */}
      &lt;div className="flex items-start justify-between mb-6"&gt;
        &lt;div className="flex items-center gap-3"&gt;
          &lt;div className="p-2 bg-purple-100 text-purple-600 rounded-lg"&gt;
            &lt;BarChart3 className="w-6 h-6" /&gt;
          &lt;/div&gt;
          &lt;div&gt;
            &lt;h3 className="text-lg font-semibold text-gray-900"&gt;
              S&P 500 MA Signal
            &lt;/h3&gt;
            &lt;p className="text-sm text-gray-600"&gt;
              50/200-day moving average crossover system
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
      {currentSignal && maStatus && (
        &lt;div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg"&gt;
          &lt;div className="text-center"&gt;
            &lt;div className="text-lg font-semibold text-gray-900"&gt;
              ${currentSignal.spyPrice}
            &lt;/div&gt;
            &lt;div className="text-xs text-gray-600"&gt;SPY Price&lt;/div&gt;
          &lt;/div&gt;
          &lt;div className="text-center"&gt;
            &lt;div className={`text-lg font-semibold ${maStatus.color}`}&gt;
              {maStatus.status}
            &lt;/div&gt;
            &lt;div className="text-xs text-gray-600"&gt;MA Configuration&lt;/div&gt;
          &lt;/div&gt;
          &lt;div className="text-center"&gt;
            &lt;div className="text-lg font-semibold text-gray-900"&gt;
              {currentSignal.ma50_200_ratio.toFixed(4)}
            &lt;/div&gt;
            &lt;div className="text-xs text-gray-600"&gt;50/200 Ratio&lt;/div&gt;
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
          title="S&P 500 with Moving Averages"
          showBrush={false}
          allowMultipleYAxes={false}
        /&gt;
      &lt;/div&gt;

      {/* Interpretation */}
      &lt;div className="mt-4 p-4 bg-purple-50 rounded-lg"&gt;
        &lt;h4 className="text-sm font-medium text-purple-900 mb-2"&gt;Signal Interpretation&lt;/h4&gt;
        &lt;div className="space-y-1 text-xs text-purple-800"&gt;
          &lt;div&gt;• &lt;strong&gt;Risk-On:&lt;/strong&gt; Golden Cross (50 MA &gt; 200 MA) with price above both averages&lt;/div&gt;
          &lt;div&gt;• &lt;strong&gt;Risk-Off:&lt;/strong&gt; Death Cross (50 MA &lt; 200 MA) with price below both averages&lt;/div&gt;
          &lt;div&gt;• &lt;strong&gt;Neutral:&lt;/strong&gt; Mixed configuration or transitional phase between signals&lt;/div&gt;
        &lt;/div&gt;
      &lt;/div&gt;
    &lt;/div&gt;
  );
}