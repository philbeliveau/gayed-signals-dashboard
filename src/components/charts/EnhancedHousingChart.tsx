'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Calendar, TrendingUp, TrendingDown, Home } from 'lucide-react';
import { useChartColors } from '../../utils/chartTheme';
import { formatDate } from '../../utils/dateFormatting';
import ChartWrapper from './ChartWrapper';

// Dynamically import Recharts components to prevent SSR issues
const AreaChart = dynamic(() => import('recharts').then(mod => mod.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then(mod => mod.Area), { ssr: false });
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const ReferenceLine = dynamic(() => import('recharts').then(mod => mod.ReferenceLine), { ssr: false });

interface HousingDataPoint {
  date: string;
  caseSillerIndex: number;
  housingStarts: number;
  monthsSupply: number;
  newHomeSales: number;
  priceChangeMonthly: number;
  priceChangeYearly: number;
  inventoryLevel: number;
  daysOnMarket: number;
}

interface EnhancedHousingChartProps {
  data: HousingDataPoint[];
  loading?: boolean;
  error?: string | null;
  height?: number;
  region?: string;
  onPeriodChange?: (period: string) => void;
  selectedPeriod?: string;
}

type ChartType = 'area' | 'line' | 'supply';
type PeriodOption = {
  value: string;
  label: string;
  description: string;
};

const PERIOD_OPTIONS: PeriodOption[] = [
  { value: '3m', label: '3M', description: '3 Months' },
  { value: '6m', label: '6M', description: '6 Months' },
  { value: '12m', label: '1Y', description: '1 Year' },
  { value: '24m', label: '2Y', description: '2 Years' },
  { value: '60m', label: '5Y', description: '5 Years' }
];

/**
 * Enhanced Housing Chart Component with Area Charts and Period Selection
 * 
 * Features:
 * - Case-Shiller Index area chart visualization
 * - Interactive period selection (3M, 6M, 1Y, 2Y, 5Y)
 * - Multiple chart types (area, line, supply analysis)
 * - Trend indicators and reference lines
 * - Responsive design with theme integration
 */
export default function EnhancedHousingChart({
  data,
  loading = false,
  error = null,
  height = 400,
  region = 'National',
  onPeriodChange,
  selectedPeriod = '12m'
}: EnhancedHousingChartProps) {
  const [chartType, setChartType] = useState<ChartType>('area');
  const [isClient, setIsClient] = useState(false);
  const chartColors = useChartColors();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-theme-card border border-theme-border rounded-lg p-4 shadow-lg">
          <p className="text-theme-text font-medium mb-2">{formatDate(label, 'tooltip')}</p>
          <div className="space-y-1 text-sm">
            {chartType === 'area' && (
              <>
                <p style={{ color: chartColors.primary }}>
                  Case-Shiller Index: {data.caseSillerIndex?.toFixed(1)}
                </p>
                <p className="text-theme-text-secondary">
                  Monthly Change: {data.priceChangeMonthly > 0 ? '+' : ''}{data.priceChangeMonthly?.toFixed(2)}%
                </p>
                <p className="text-theme-text-secondary">
                  Yearly Change: {data.priceChangeYearly > 0 ? '+' : ''}{data.priceChangeYearly?.toFixed(2)}%
                </p>
              </>
            )}
            {chartType === 'supply' && (
              <>
                <p style={{ color: chartColors.info }}>
                  Months Supply: {data.monthsSupply?.toFixed(1)}
                </p>
                <p style={{ color: chartColors.warning }}>
                  New Home Sales: {(data.newHomeSales / 1000)?.toFixed(0)}K
                </p>
                <p className="text-theme-text-secondary">
                  Days on Market: {data.daysOnMarket} days
                </p>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const getChartComponent = () => {
    if (!isClient || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <span className="text-theme-text-muted">No housing data available</span>
        </div>
      );
    }

    switch (chartType) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: chartColors.textMuted }}
                tickFormatter={(value) => formatDate(value, 'chart')}
                stroke={chartColors.textMuted}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: chartColors.textMuted }}
                domain={['dataMin - 10', 'dataMax + 10']}
                stroke={chartColors.textMuted}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="caseSillerIndex" 
                stroke={chartColors.primary}
                strokeWidth={2}
                fill={`${chartColors.primary}20`}
                fillOpacity={0.3}
                dot={false}
                activeDot={{ r: 4, stroke: chartColors.primary, strokeWidth: 2, fill: chartColors.primary }}
              />
              {/* Average reference line */}
              {data.length > 0 && (
                <ReferenceLine 
                  y={data.reduce((sum, d) => sum + d.caseSillerIndex, 0) / data.length} 
                  stroke={chartColors.textLight}
                  strokeDasharray="5 5" 
                  label={{ value: "Average", position: "right", fill: chartColors.textLight }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: chartColors.textMuted }}
                tickFormatter={(value) => formatDate(value, 'chart')}
                stroke={chartColors.textMuted}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: chartColors.textMuted }}
                domain={['dataMin - 10', 'dataMax + 10']}
                stroke={chartColors.textMuted}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="caseSillerIndex" 
                stroke={chartColors.primary}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: chartColors.primary, strokeWidth: 2, fill: chartColors.primary }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'supply':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: chartColors.textMuted }}
                tickFormatter={(value) => formatDate(value, 'chart')}
                stroke={chartColors.textMuted}
              />
              <YAxis 
                yAxisId="supply"
                tick={{ fontSize: 12, fill: chartColors.textMuted }}
                stroke={chartColors.textMuted}
              />
              <YAxis 
                yAxisId="sales"
                orientation="right"
                tick={{ fontSize: 12, fill: chartColors.textMuted }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                stroke={chartColors.textMuted}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                yAxisId="supply"
                type="monotone" 
                dataKey="monthsSupply" 
                stroke={chartColors.info}
                strokeWidth={2}
                dot={false}
                name="Months Supply"
              />
              <Line 
                yAxisId="sales"
                type="monotone" 
                dataKey="newHomeSales" 
                stroke={chartColors.warning}
                strokeWidth={2}
                dot={false}
                name="New Home Sales"
              />
              {/* Healthy supply reference line */}
              <ReferenceLine 
                yAxisId="supply"
                y={6} 
                stroke={chartColors.danger}
                strokeDasharray="3 3" 
                label={{ value: "High Supply", position: "right", fill: chartColors.danger }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  const getCurrentTrend = () => {
    if (data.length < 2) return null;
    const current = data[data.length - 1];
    const previous = data[data.length - 2];
    const change = ((current.caseSillerIndex - previous.caseSillerIndex) / previous.caseSillerIndex) * 100;
    
    return {
      direction: change > 0 ? 'up' : 'down',
      value: Math.abs(change),
      isSignificant: Math.abs(change) > 0.5
    };
  };

  const trend = getCurrentTrend();

  return (
    <ChartWrapper
      height={height}
      loading={loading}
      error={error}
      title={`${region} Housing Market - Case-Shiller Index`}
      description="Interactive housing price trends with multiple visualization options"
    >
      {/* Chart Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        
        {/* Period Selection */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-theme-text-muted" />
          <div className="flex bg-theme-card-secondary border border-theme-border rounded-lg p-1">
            {PERIOD_OPTIONS.map(period => (
              <button
                key={period.value}
                onClick={() => onPeriodChange?.(period.value)}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  selectedPeriod === period.value
                    ? 'bg-theme-primary text-white'
                    : 'text-theme-text-muted hover:text-theme-text'
                }`}
                title={period.description}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Type Selection */}
        <div className="flex items-center gap-2">
          <div className="flex bg-theme-card-secondary border border-theme-border rounded-lg p-1">
            <button
              onClick={() => setChartType('area')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                chartType === 'area'
                  ? 'bg-theme-primary text-white'
                  : 'text-theme-text-muted hover:text-theme-text'
              }`}
              title="Area Chart"
            >
              Area
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                chartType === 'line'
                  ? 'bg-theme-primary text-white'
                  : 'text-theme-text-muted hover:text-theme-text'
              }`}
              title="Line Chart"
            >
              Line
            </button>
            <button
              onClick={() => setChartType('supply')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                chartType === 'supply'
                  ? 'bg-theme-primary text-white'
                  : 'text-theme-text-muted hover:text-theme-text'
              }`}
              title="Supply Analysis"
            >
              Supply
            </button>
          </div>
        </div>
      </div>

      {/* Trend Indicator */}
      {trend && (
        <div className="flex items-center gap-2 mb-4">
          <Home className="w-4 h-4 text-theme-text-muted" />
          <span className="text-sm text-theme-text-muted">Current Trend:</span>
          <div className={`flex items-center gap-1 ${
            trend.direction === 'up' ? 'text-theme-success' : 'text-theme-danger'
          }`}>
            {trend.direction === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="font-medium text-sm">
              {trend.value.toFixed(2)}% {trend.direction === 'up' ? 'increase' : 'decrease'}
            </span>
          </div>
          {trend.isSignificant && (
            <span className="text-xs text-theme-warning bg-theme-warning-bg px-2 py-1 rounded">
              Significant Change
            </span>
          )}
        </div>
      )}

      {/* Chart Legend */}
      <div className="flex items-center gap-4 mb-4">
        {chartType === 'area' && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.primary }}></div>
            <span className="text-sm text-theme-text-muted">Case-Shiller Index</span>
          </div>
        )}
        {chartType === 'supply' && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.info }}></div>
              <span className="text-sm text-theme-text-muted">Months Supply</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.warning }}></div>
              <span className="text-sm text-theme-text-muted">New Home Sales</span>
            </div>
          </>
        )}
      </div>

      {/* Chart Container */}
      <div className="h-full w-full">
        {getChartComponent()}
      </div>

      {/* Chart Footer */}
      <div className="mt-4 text-xs text-theme-text-muted">
        {chartType === 'area' && 'Area chart showing Case-Shiller Home Price Index with trend area. '}
        {chartType === 'line' && 'Line chart showing Case-Shiller Home Price Index trends. '}
        {chartType === 'supply' && 'Supply analysis showing months of inventory and new home sales rates. '}
        Data updates monthly from Federal Reserve Economic Data (FRED).
      </div>
    </ChartWrapper>
  );
}

export type { HousingDataPoint, ChartType, PeriodOption };