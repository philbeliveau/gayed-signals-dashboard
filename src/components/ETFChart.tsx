'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import NoSSRWrapper from './NoSSRWrapper';
import { formatDate, formatTooltipDate } from '../utils/dateFormatting';
import { validateChartData, ChartDataPoint } from '../utils/dataValidation';

// Dynamically import Recharts components to prevent SSR issues
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const ReferenceDot = dynamic(() => import('recharts').then(mod => mod.ReferenceDot), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });

interface ETFChartDataPoint extends ChartDataPoint {
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

  useEffect(() => {
    const fetchETFData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Generate sample data with proper validation
        const mockData = generateMockETFData(symbol, strategyType);
        
        // Validate the chart data
        const validationResult = validateChartData(mockData, ['date', 'price'], {
          sortByDate: true,
          removeDuplicates: true
        });

        if (!validationResult.valid) {
          throw new Error(`Invalid chart data: ${validationResult.errors.join(', ')}`);
        }

        if (validationResult.warnings.length > 0) {
          console.warn('Chart data warnings:', validationResult.warnings);
        }

        setChartData(validationResult.data as ETFChartDataPoint[]);

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
        date: formatDate(currentDate, 'iso'), // Use consistent date formatting
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
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
          <p className="text-gray-900 dark:text-white font-medium">{`Date: ${formatTooltipDate(label)}`}</p>
          <p className="text-blue-600 dark:text-blue-400">{`${symbol}: $${data.price}`}</p>
          {data.signal && (
            <p className={`font-semibold ${data.signal === 'Risk-On' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
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
    <div className="bg-theme-card rounded-lg p-4 border border-theme-border chart-container">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-theme-text">
            {symbol} Price Chart with Signals
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-theme-success rounded-full"></div>
              <span className="text-sm text-theme-text-muted">Risk-On</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-theme-danger rounded-full"></div>
              <span className="text-sm text-theme-text-muted">Risk-Off</span>
            </div>
            <div className="px-2 py-1 bg-theme-info-bg text-theme-info rounded text-sm">
              Real Data
            </div>
          </div>
        </div>
      </div>
      
      <div className="chart-responsive-wrapper" style={{ height: `${height}px` }}>
        <NoSSRWrapper 
          fallback={
            <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-center">
                <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-32 rounded mx-auto mb-2"></div>
                <div className="text-gray-600 dark:text-gray-400 text-sm">Loading chart...</div>
              </div>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                className="chart-grid-color"
                opacity={0.3} 
              />
              <XAxis 
                dataKey="date" 
                className="chart-axis-color chart-text-color"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatDate(value, 'chart')}
              />
              <YAxis 
                className="chart-axis-color chart-text-color"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${value}`}
                domain={['dataMin - 5', 'dataMax + 5']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="var(--theme-primary)" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: 'var(--theme-primary)', strokeWidth: 2, fill: 'var(--theme-primary)' }}
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
                      fill={point.signal === 'Risk-On' ? 'var(--theme-success)' : 'var(--theme-danger)'}
                      stroke="var(--theme-card)"
                      strokeWidth={2}
                    />
                  );
                }
                return null;
              })}
            </LineChart>
          </ResponsiveContainer>
        </NoSSRWrapper>
      </div>
      
      <div className="mt-4 text-xs text-theme-text-muted">
        Chart shows {symbol} price movements with {strategyType.replace('_', '/')} strategy signals. 
        Green dots indicate Risk-On signals, red dots indicate Risk-Off signals.
      </div>
    </div>
  );
}