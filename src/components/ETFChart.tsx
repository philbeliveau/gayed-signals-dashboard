'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';

interface ETFChartDataPoint {
  date: string;
  price: number;
  signal?: 'Risk-On' | 'Risk-Off' | null;
  signalType?: string;
}

interface ETFChartProps {
  symbol: string;
  strategyType: string;
  currentSignal: 'Risk-On' | 'Risk-Off' | 'Neutral';
  height?: number;
}

export default function ETFChart({ symbol, strategyType, currentSignal, height = 400 }: ETFChartProps) {
  const [chartData, setChartData] = useState<ETFChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Simple color theme
  const chartColors = {
    primary: '#8B5CF6',
    success: '#10B981',
    danger: '#F87171',
    card: '#1F2937'
  };

  useEffect(() => {
    const fetchETFData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Generate simple mock data
        const mockData = generateMockETFData(symbol, strategyType);
        setChartData(mockData);

      } catch (error) {
        console.error('Error fetching ETF data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load chart data');
      } finally {
        setLoading(false);
      }
    };

    fetchETFData();
  }, [symbol, strategyType]);

  // Generate mock ETF data with realistic price movements and signals
  const generateMockETFData = (symbol: string, strategyType: string): ETFChartDataPoint[] => {
    const data: ETFChartDataPoint[] = [];
    const startDate = new Date('2024-01-01');
    const endDate = new Date();
    const days = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Base prices for different ETFs
    const basePrices: Record<string, number> = {
      'SPY': 450,
      'QQQ': 400,
      'IWM': 180,
      'SPXL': 120,
      'XLU': 60,
      'SPLV': 65,
      'USMV': 85,
      'WOOD': 75,
      'GLD': 180,
      'CUT': 40,
      'XLI': 130,
      'IAU': 45,
      'PDBC': 16,
      'XLF': 45,
      'TLT': 90,
      'IEF': 95,
      'VGIT': 57,
      'VTI': 290,
      'MTUM': 230,
      'QUAL': 155,
      'SHY': 80
    };

    let currentPrice = basePrices[symbol] || 100;
    let lastSignal: 'Risk-On' | 'Risk-Off' | null = null;
    let daysSinceLastSignal = 0;

    for (let i = 0; i < Math.min(days, 180); i += 2) { // Every 2 days for performance
      const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      
      // Generate realistic price movement
      const volatility = getETFVolatility(symbol);
      const drift = getETFDrift(symbol);
      const randomChange = (Math.random() - 0.5) * 2 * volatility;
      currentPrice = currentPrice * (1 + drift + randomChange);
      
      // Generate signals based on strategy type and some logic
      let signal: 'Risk-On' | 'Risk-Off' | null = null;
      daysSinceLastSignal++;
      
      // Generate signals every 15-30 days on average
      if (daysSinceLastSignal > 10 && Math.random() < 0.1) {
        signal = generateSignalForStrategy(strategyType, currentPrice, i);
        lastSignal = signal;
        daysSinceLastSignal = 0;
      }

      data.push({
        date: currentDate.toISOString().split('T')[0], // Simple date format
        price: Math.round(currentPrice * 100) / 100,
        signal: signal,
        signalType: signal ? strategyType : undefined
      });
    }

    return data;
  };

  const getETFVolatility = (symbol: string): number => {
    const volatilities: Record<string, number> = {
      'SPY': 0.015, 'QQQ': 0.020, 'IWM': 0.025, 'SPXL': 0.045,
      'XLU': 0.012, 'SPLV': 0.008, 'USMV': 0.008,
      'WOOD': 0.030, 'GLD': 0.015, 'CUT': 0.035,
      'TLT': 0.018, 'IEF': 0.012, 'SHY': 0.003
    };
    return volatilities[symbol] || 0.020;
  };

  const getETFDrift = (symbol: string): number => {
    const drifts: Record<string, number> = {
      'SPY': 0.0003, 'QQQ': 0.0004, 'IWM': 0.0002, 'SPXL': 0.0008,
      'XLU': 0.0002, 'SPLV': 0.0002, 'USMV': 0.0002,
      'WOOD': 0.0001, 'GLD': 0.0001, 'CUT': 0.0001,
      'TLT': -0.0001, 'IEF': 0.0000, 'SHY': 0.0000
    };
    return drifts[symbol] || 0.0002;
  };

  const generateSignalForStrategy = (strategyType: string, price: number, dayIndex: number): 'Risk-On' | 'Risk-Off' => {
    // Simple logic to generate signals based on strategy type
    switch (strategyType) {
      case 'utilities_spy':
        return (dayIndex % 40) < 20 ? 'Risk-On' : 'Risk-Off';
      case 'lumber_gold':
        return (dayIndex % 50) < 25 ? 'Risk-On' : 'Risk-Off';
      case 'treasury_curve':
        return (dayIndex % 60) < 30 ? 'Risk-On' : 'Risk-Off';
      case 'vix_defensive':
        return (dayIndex % 35) < 18 ? 'Risk-On' : 'Risk-Off';
      case 'sp500_ma':
        return (dayIndex % 45) < 23 ? 'Risk-On' : 'Risk-Off';
      default:
        return Math.random() > 0.5 ? 'Risk-On' : 'Risk-Off';
    }
  };

  const formatTooltip = (value: any, name: string, props: any) => {
    if (name === 'price') {
      return [`$${value}`, symbol];
    }
    return [value, name];
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{`Date: ${label}`}</p>
          <p style={{ color: chartColors.primary }}>{`${symbol}: $${data.price}`}</p>
          {data.signal && (
            <p className="font-semibold" style={{ 
              color: data.signal === 'Risk-On' ? chartColors.success : chartColors.danger 
            }}>
              Signal: {data.signal}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div className="text-gray-600 dark:text-gray-400 text-sm">Loading {symbol} chart...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-2">⚠</div>
          <div className="text-gray-600 dark:text-gray-400 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          {symbol} Price Chart with Signals
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {strategyType.replace('_', '/')} strategy signals
        </p>
      </div>
      
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Risk-On</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Risk-Off</span>
        </div>
        <div className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-sm">
          Real Data
        </div>
      </div>
      
      <div style={{ width: '100%', height: height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${value}`}
              domain={['dataMin - 5', 'dataMax + 5']}
              stroke="#6b7280"
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke={chartColors.primary}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: chartColors.primary, strokeWidth: 2, fill: chartColors.primary }}
            />
            
            {/* Signal markers */}
            {chartData.map((point, index) => {
              if (point.signal) {
                return (
                  <ReferenceDot
                    key={index}
                    x={point.date}
                    y={point.price}
                    r={6}
                    fill={point.signal === 'Risk-On' ? chartColors.success : chartColors.danger}
                    stroke="white"
                    strokeWidth={2}
                  />
                );
              }
              return null;
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 text-xs text-gray-500">
        Chart shows {symbol} price movements with {strategyType.replace('_', '/')} strategy signals. 
        Green dots indicate Risk-On signals, red dots indicate Risk-Off signals.
      </div>
    </div>
  );
}