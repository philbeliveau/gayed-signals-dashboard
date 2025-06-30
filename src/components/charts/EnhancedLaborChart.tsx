'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Users, Calendar, TrendingUp, TrendingDown, AlertTriangle, Briefcase } from 'lucide-react';
import { useChartColors } from '../../utils/chartTheme';
import { formatDate } from '../../utils/dateFormatting';
import ChartWrapper from './ChartWrapper';

// Dynamically import Recharts components to prevent SSR issues
const ComposedChart = dynamic(() => import('recharts').then(mod => mod.ComposedChart), { ssr: false });
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const ReferenceLine = dynamic(() => import('recharts').then(mod => mod.ReferenceLine), { ssr: false });

interface LaborDataPoint {
  date: string;
  initialClaims: number;
  continuedClaims: number;
  claims4Week: number;
  unemploymentRate: number;
  nonfarmPayrolls: number;
  laborParticipation: number;
  jobOpenings: number;
  weeklyChangeInitial: number;
  weeklyChangeContinued: number;
  monthlyChangePayrolls: number;
}

interface EnhancedLaborChartProps {
  data: LaborDataPoint[];
  loading?: boolean;
  error?: string | null;
  height?: number;
  onPeriodChange?: (period: string) => void;
  selectedPeriod?: string;
  alerts?: any[];
}

type ChartType = 'claims' | 'employment' | 'combined';
type PeriodOption = {
  value: string;
  label: string;
  description: string;
  weeks: number;
};

const PERIOD_OPTIONS: PeriodOption[] = [
  { value: '3m', label: '3M', description: '3 Months', weeks: 13 },
  { value: '6m', label: '6M', description: '6 Months', weeks: 26 },
  { value: '12m', label: '1Y', description: '1 Year', weeks: 52 },
  { value: '24m', label: '2Y', description: '2 Years', weeks: 104 },
  { value: '60m', label: '5Y', description: '5 Years', weeks: 260 }
];

/**
 * Enhanced Labor Market Chart Component with Multiple Visualizations
 * 
 * Features:
 * - Initial Claims, Continued Claims, and Unemployment Rate charts
 * - Interactive period selection (3M, 6M, 1Y, 2Y, 5Y)
 * - Multiple chart types (claims focus, employment focus, combined view)
 * - Stress level indicators and reference lines
 * - Real-time alerts integration
 * - Responsive design with theme integration
 */
export default function EnhancedLaborChart({
  data,
  loading = false,
  error = null,
  height = 400,
  onPeriodChange,
  selectedPeriod = '12m',
  alerts = []
}: EnhancedLaborChartProps) {
  const [chartType, setChartType] = useState<ChartType>('claims');
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
            {chartType === 'claims' && (
              <>
                <p style={{ color: chartColors.primary }}>
                  Initial Claims: {data.initialClaims?.toLocaleString()}
                </p>
                <p style={{ color: chartColors.secondary }}>
                  Continued Claims: {(data.continuedClaims / 1000000)?.toFixed(2)}M
                </p>
                <p style={{ color: chartColors.info }}>
                  4-Week Avg: {data.claims4Week?.toLocaleString()}
                </p>
                <p className="text-theme-text-secondary">
                  Weekly Change: {data.weeklyChangeInitial > 0 ? '+' : ''}{data.weeklyChangeInitial?.toFixed(1)}%
                </p>
              </>
            )}
            {chartType === 'employment' && (
              <>
                <p style={{ color: chartColors.warning }}>
                  Unemployment Rate: {data.unemploymentRate?.toFixed(1)}%
                </p>
                <p style={{ color: chartColors.success }}>
                  Labor Participation: {data.laborParticipation?.toFixed(1)}%
                </p>
                <p style={{ color: chartColors.info }}>
                  Job Openings: {(data.jobOpenings / 1000000)?.toFixed(1)}M
                </p>
                <p className="text-theme-text-secondary">
                  Payroll Change: {data.monthlyChangePayrolls > 0 ? '+' : ''}{data.monthlyChangePayrolls?.toFixed(1)}%
                </p>
              </>
            )}
            {chartType === 'combined' && (
              <>
                <p style={{ color: chartColors.primary }}>
                  Initial Claims: {data.initialClaims?.toLocaleString()}
                </p>
                <p style={{ color: chartColors.warning }}>
                  Unemployment: {data.unemploymentRate?.toFixed(1)}%
                </p>
                <p className="text-theme-text-secondary">
                  Claims Change: {data.weeklyChangeInitial > 0 ? '+' : ''}{data.weeklyChangeInitial?.toFixed(1)}%
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
          <span className="text-theme-text-muted">No labor market data available</span>
        </div>
      );
    }

    switch (chartType) {
      case 'claims':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: chartColors.textMuted }}
                tickFormatter={(value) => formatDate(value, 'chart')}
                stroke={chartColors.textMuted}
              />
              <YAxis 
                yAxisId="claims"
                tick={{ fontSize: 12, fill: chartColors.textMuted }}
                tickFormatter={(value) => `${(value / 1000)}K`}
                stroke={chartColors.textMuted}
              />
              <YAxis 
                yAxisId="avg"
                orientation="right"
                tick={{ fontSize: 12, fill: chartColors.textMuted }}
                tickFormatter={(value) => `${(value / 1000)}K`}
                stroke={chartColors.textMuted}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Initial Claims Line */}
              <Line 
                yAxisId="claims"
                type="monotone" 
                dataKey="initialClaims" 
                stroke={chartColors.primary}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: chartColors.primary, strokeWidth: 2, fill: chartColors.primary }}
                name="Initial Claims"
              />
              
              {/* Continued Claims Line */}
              <Line 
                yAxisId="claims"
                type="monotone" 
                dataKey="continuedClaims" 
                stroke={chartColors.secondary}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: chartColors.secondary, strokeWidth: 2, fill: chartColors.secondary }}
                name="Continued Claims"
              />
              
              {/* 4-Week Average */}
              <Line 
                yAxisId="avg"
                type="monotone" 
                dataKey="claims4Week" 
                stroke={chartColors.info}
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                name="4-Week Average"
              />
              
              {/* Reference line for concerning level */}
              <ReferenceLine 
                yAxisId="claims"
                y={1800000} 
                stroke={chartColors.danger}
                strokeDasharray="3 3" 
                label={{ value: "High Risk Level", position: "right", fill: chartColors.danger }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'employment':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: chartColors.textMuted }}
                tickFormatter={(value) => formatDate(value, 'chart')}
                stroke={chartColors.textMuted}
              />
              <YAxis 
                yAxisId="rate"
                tick={{ fontSize: 12, fill: chartColors.textMuted }}
                tickFormatter={(value) => `${value}%`}
                stroke={chartColors.textMuted}
              />
              <YAxis 
                yAxisId="openings"
                orientation="right"
                tick={{ fontSize: 12, fill: chartColors.textMuted }}
                tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                stroke={chartColors.textMuted}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Unemployment Rate */}
              <Line 
                yAxisId="rate"
                type="monotone" 
                dataKey="unemploymentRate" 
                stroke={chartColors.warning}
                strokeWidth={2}
                dot={false}
                name="Unemployment Rate"
              />
              
              {/* Labor Participation */}
              <Line 
                yAxisId="rate"
                type="monotone" 
                dataKey="laborParticipation" 
                stroke={chartColors.success}
                strokeWidth={2}
                dot={false}
                name="Labor Participation"
              />
              
              {/* Job Openings */}
              <Line 
                yAxisId="openings"
                type="monotone" 
                dataKey="jobOpenings" 
                stroke={chartColors.info}
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                name="Job Openings"
              />
              
              {/* Unemployment reference line */}
              <ReferenceLine 
                yAxisId="rate"
                y={4.5} 
                stroke={chartColors.warning}
                strokeDasharray="3 3" 
                label={{ value: "Comfort Zone", position: "right", fill: chartColors.warning }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'combined':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: chartColors.textMuted }}
                tickFormatter={(value) => formatDate(value, 'chart')}
                stroke={chartColors.textMuted}
              />
              <YAxis 
                yAxisId="claims"
                tick={{ fontSize: 12, fill: chartColors.textMuted }}
                tickFormatter={(value) => `${(value / 1000)}K`}
                stroke={chartColors.textMuted}
              />
              <YAxis 
                yAxisId="rate"
                orientation="right"
                tick={{ fontSize: 12, fill: chartColors.textMuted }}
                tickFormatter={(value) => `${value}%`}
                stroke={chartColors.textMuted}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Initial Claims */}
              <Line 
                yAxisId="claims"
                type="monotone" 
                dataKey="initialClaims" 
                stroke={chartColors.primary}
                strokeWidth={2}
                dot={false}
                name="Initial Claims"
              />
              
              {/* Unemployment Rate */}
              <Line 
                yAxisId="rate"
                type="monotone" 
                dataKey="unemploymentRate" 
                stroke={chartColors.warning}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Unemployment Rate"
              />
            </ComposedChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  const getCurrentStress = () => {
    if (data.length === 0) return null;
    const current = data[data.length - 1];
    
    const stressFactors = [
      current.continuedClaims > 1800000,
      current.unemploymentRate > 4.5,
      current.weeklyChangeInitial > 5.0,
      current.laborParticipation < 63.0,
      alerts.some(a => a.severity === 'critical')
    ];

    const stressCount = stressFactors.filter(Boolean).length;
    
    if (stressCount >= 3) return { level: 'high', color: chartColors.danger, label: 'High Stress' };
    if (stressCount >= 1) return { level: 'medium', color: chartColors.warning, label: 'Moderate Stress' };
    return { level: 'low', color: chartColors.success, label: 'Low Stress' };
  };

  const stress = getCurrentStress();

  return (
    <ChartWrapper
      height={height}
      loading={loading}
      error={error}
      title="Labor Market Analysis Dashboard"
      description="Interactive labor market indicators with multiple visualization options"
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
              onClick={() => setChartType('claims')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                chartType === 'claims'
                  ? 'bg-theme-primary text-white'
                  : 'text-theme-text-muted hover:text-theme-text'
              }`}
              title="Claims Analysis"
            >
              Claims
            </button>
            <button
              onClick={() => setChartType('employment')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                chartType === 'employment'
                  ? 'bg-theme-primary text-white'
                  : 'text-theme-text-muted hover:text-theme-text'
              }`}
              title="Employment Metrics"
            >
              Employment
            </button>
            <button
              onClick={() => setChartType('combined')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                chartType === 'combined'
                  ? 'bg-theme-primary text-white'
                  : 'text-theme-text-muted hover:text-theme-text'
              }`}
              title="Combined View"
            >
              Combined
            </button>
          </div>
        </div>
      </div>

      {/* Stress Level Indicator */}
      {stress && (
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-theme-text-muted" />
            <span className="text-sm text-theme-text-muted">Market Stress Level:</span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: stress.color }}
            ></div>
            <span className="font-medium text-sm" style={{ color: stress.color }}>
              {stress.label}
            </span>
          </div>
          {alerts.length > 0 && (
            <div className="flex items-center gap-1 text-theme-warning">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">{alerts.length} Active Alert{alerts.length > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}

      {/* Chart Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        {chartType === 'claims' && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.primary }}></div>
              <span className="text-sm text-theme-text-muted">Initial Claims</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.secondary }}></div>
              <span className="text-sm text-theme-text-muted">Continued Claims</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-1 rounded" style={{ backgroundColor: chartColors.info }}></div>
              <span className="text-sm text-theme-text-muted">4-Week Average</span>
            </div>
          </>
        )}
        {chartType === 'employment' && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.warning }}></div>
              <span className="text-sm text-theme-text-muted">Unemployment Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.success }}></div>
              <span className="text-sm text-theme-text-muted">Labor Participation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-1 rounded" style={{ backgroundColor: chartColors.info }}></div>
              <span className="text-sm text-theme-text-muted">Job Openings</span>
            </div>
          </>
        )}
        {chartType === 'combined' && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.primary }}></div>
              <span className="text-sm text-theme-text-muted">Initial Claims</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-1 rounded" style={{ backgroundColor: chartColors.warning }}></div>
              <span className="text-sm text-theme-text-muted">Unemployment Rate</span>
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
        {chartType === 'claims' && 'Claims analysis showing initial claims, continued claims, and 4-week moving average. '}
        {chartType === 'employment' && 'Employment metrics showing unemployment rate, labor participation, and job openings. '}
        {chartType === 'combined' && 'Combined view of initial claims and unemployment rate correlation. '}
        Data updates weekly from Department of Labor (DOL) and Bureau of Labor Statistics (BLS).
      </div>
    </ChartWrapper>
  );
}

export type { LaborDataPoint, ChartType, PeriodOption };