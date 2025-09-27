'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import ChartWrapper from './ChartWrapper';
import { useChartColors } from '../../utils/chartTheme';

// Dynamically import Recharts components with proper typing
// @ts-ignore - Suppress TypeScript errors for dynamic Recharts imports
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false });
// @ts-ignore
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false });
// @ts-ignore
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
// @ts-ignore
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
// @ts-ignore
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
// @ts-ignore
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
// @ts-ignore
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });

interface TestData {
  date: string;
  value1: number;
  value2: number;
}

/**
 * ChartTestDemo - Test component to verify chart fixes
 * 
 * This component tests:
 * - ChartWrapper functionality
 * - ResponsiveContainer configuration
 * - Theme color integration
 * - Dynamic imports
 * - Error and loading states
 */
export default function ChartTestDemo() {
  const [data, setData] = useState<TestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [testMode, setTestMode] = useState<'success' | 'loading' | 'error'>('loading');
  
  const chartColors = useChartColors();

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      if (testMode === 'success') {
        // Generate sample data
        const sampleData: TestData[] = [];
        const startDate = new Date('2024-01-01');
        
        for (let i = 0; i < 30; i++) {
          const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
          sampleData.push({
            date: date.toISOString().split('T')[0],
            value1: 100 + Math.sin(i * 0.2) * 20 + Math.random() * 10,
            value2: 80 + Math.cos(i * 0.15) * 15 + Math.random() * 8
          });
        }
        
        setData(sampleData);
        setLoading(false);
        setError(undefined);
      } else if (testMode === 'error') {
        setLoading(false);
        setError('Test error: Unable to load chart data');
      }
      // If testMode is 'loading', keep loading state
    }, 1000);

    return () => clearTimeout(timer);
  }, [testMode]);

  const handleTestModeChange = (mode: 'success' | 'loading' | 'error') => {
    setTestMode(mode);
    setLoading(true);
    setError(undefined);
    setData([]);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-theme-card border border-theme-border rounded-lg p-3 shadow-lg">
          <p className="text-theme-text font-medium mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            {payload.map((entry: any, index: number) => (
              <p key={index} style={{ color: entry.color }}>
                {entry.dataKey}: {entry.value.toFixed(2)}
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="bg-theme-card border border-theme-border rounded-xl p-6">
        <h2 className="text-xl font-bold text-theme-text mb-4">Chart Rendering Test</h2>
        
        <div className="mb-4">
          <p className="text-theme-text-muted mb-2">Test different chart states:</p>
          <div className="flex gap-2">
            <button
              onClick={() => handleTestModeChange('success')}
              className={`px-3 py-1 rounded text-sm ${
                testMode === 'success' && !loading && !error
                  ? 'bg-theme-success text-white' 
                  : 'bg-theme-card-secondary text-theme-text hover:bg-theme-card-hover'
              }`}
            >
              Success
            </button>
            <button
              onClick={() => handleTestModeChange('loading')}
              className={`px-3 py-1 rounded text-sm ${
                loading
                  ? 'bg-theme-warning text-white' 
                  : 'bg-theme-card-secondary text-theme-text hover:bg-theme-card-hover'
              }`}
            >
              Loading
            </button>
            <button
              onClick={() => handleTestModeChange('error')}
              className={`px-3 py-1 rounded text-sm ${
                error
                  ? 'bg-theme-danger text-white' 
                  : 'bg-theme-card-secondary text-theme-text hover:bg-theme-card-hover'
              }`}
            >
              Error
            </button>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-semibold text-theme-text mb-2">Theme Colors Test:</h3>
          <div className="flex gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: chartColors.primary }}></div>
              <span className="text-theme-text-muted">Primary: {chartColors.primary}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: chartColors.success }}></div>
              <span className="text-theme-text-muted">Success: {chartColors.success}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: chartColors.danger }}></div>
              <span className="text-theme-text-muted">Danger: {chartColors.danger}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Test */}
      <ChartWrapper
        height={350}
        loading={loading}
        error={error}
        title="Chart Rendering Test"
        description="Testing ResponsiveContainer, theme colors, and dynamic imports"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.primary }}></div>
            <span className="text-sm text-theme-text-muted">Value 1</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.secondary }}></div>
            <span className="text-sm text-theme-text-muted">Value 2</span>
          </div>
        </div>

        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-theme-text-muted">No test data available</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="value1" 
                stroke={chartColors.primary}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: chartColors.primary }}
              />
              <Line 
                type="monotone" 
                dataKey="value2" 
                stroke={chartColors.secondary}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: chartColors.secondary }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartWrapper>

      {/* Debug Info */}
      <div className="bg-theme-card-secondary border border-theme-border rounded-lg p-4">
        <h4 className="text-sm font-semibold text-theme-text mb-2">Debug Information:</h4>
        <div className="text-xs text-theme-text-muted space-y-1">
          <p>Test Mode: {testMode}</p>
          <p>Loading: {loading.toString()}</p>
          <p>Error: {error || 'None'}</p>
          <p>Data Points: {data.length}</p>
          <p>Client Mounted: {typeof window !== 'undefined' ? 'true' : 'false'}</p>
        </div>
      </div>
    </div>
  );
}