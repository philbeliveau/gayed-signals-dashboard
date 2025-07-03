'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  EyeOff, 
  Focus, 
  BarChart3,
  LineChart as LineChartIcon,
  AreaChart as AreaChartIcon,
  Settings,
  Info,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
import { useChartColors } from '../../utils/chartTheme';
import { formatDate } from '../../utils/dateFormatting';
import ChartWrapper from './ChartWrapper';

// Import Recharts components
import {
  LineChart,
  AreaChart,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Brush
} from 'recharts';

// Data types and interfaces
interface DataPoint {
  date: string;
  [key: string]: number | string;
}

interface SeriesConfig {
  id: string;
  name: string;
  dataKey: string;
  color: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  category: 'housing' | 'labor' | 'economic';
  unit: string;
  description: string;
  visible: boolean;
  focused: boolean;
  yAxisId?: string;
  strokeWidth?: number;
  strokeDashArray?: string;
  showDots?: boolean;
  fillOpacity?: number;
}

interface InteractiveEconomicChartProps {
  data: DataPoint[];
  seriesConfig: SeriesConfig[];
  loading?: boolean;
  error?: string;
  height?: number;
  title?: string;
  onSeriesToggle?: (seriesId: string) => void;
  onSeriesFocus?: (seriesId: string) => void;
  onTimeRangeChange?: (range: [string, string]) => void;
  selectedTimeRange?: [string, string];
  showBrush?: boolean;
  allowMultipleYAxes?: boolean;
}

type ChartType = 'line' | 'area' | 'composed';
type ViewMode = 'overview' | 'focused' | 'comparison';

const CHART_ANIMATIONS = {
  duration: 300,
  easing: 'ease-in-out'
};

const FREQUENCY_COLORS = {
  daily: '#10B981',    // Green
  weekly: '#3B82F6',   // Blue  
  monthly: '#F59E0B',  // Amber
  quarterly: '#EF4444', // Red
  annual: '#8B5CF6'    // Purple
};

const FREQUENCY_LABELS = {
  daily: 'Daily',
  weekly: 'Weekly', 
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual'
};

/**
 * Interactive Economic Chart Component
 * 
 * Features:
 * - Click on series to show/hide individual data sources
 * - Focus mode to isolate specific series
 * - Automatic granularity adjustment for different frequencies
 * - Multi-axis support for different data scales
 * - Time range selection with brush
 * - Responsive design with animations
 * - Advanced tooltip with contextual information
 */
export default function InteractiveEconomicChart({
  data,
  seriesConfig,
  loading = false,
  error,
  height = 500,
  title = "Economic Data Analysis",
  onSeriesToggle,
  onSeriesFocus,
  onTimeRangeChange,
  selectedTimeRange,
  showBrush = true,
  allowMultipleYAxes = true
}: InteractiveEconomicChartProps) {
  const [chartType, setChartType] = useState<ChartType>('line');
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [isClient, setIsClient] = useState(false);
  const [localSeriesConfig, setLocalSeriesConfig] = useState<SeriesConfig[]>(seriesConfig);
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  
  const chartColors = useChartColors();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    setLocalSeriesConfig(seriesConfig);
  }, [seriesConfig]);

  // Memoized calculations for performance
  const visibleSeries = useMemo(() => 
    localSeriesConfig.filter(series => series.visible),
    [localSeriesConfig]
  );

  const focusedSeries = useMemo(() => 
    localSeriesConfig.filter(series => series.focused),
    [localSeriesConfig]
  );

  const frequencyGroups = useMemo(() => {
    const groups: { [key: string]: SeriesConfig[] } = {};
    localSeriesConfig.forEach(series => {
      if (!groups[series.frequency]) {
        groups[series.frequency] = [];
      }
      groups[series.frequency].push(series);
    });
    return groups;
  }, [localSeriesConfig]);

  const displayedSeries = useMemo(() => {
    switch (viewMode) {
      case 'focused':
        return focusedSeries.length > 0 ? focusedSeries : visibleSeries;
      case 'comparison':
        return visibleSeries.filter(series => 
          series.category === focusedSeries[0]?.category || focusedSeries.length === 0
        );
      default:
        return visibleSeries;
    }
  }, [viewMode, visibleSeries, focusedSeries]);

  // Filter data based on time range
  const filteredData = useMemo(() => {
    if (!selectedTimeRange) return data;
    
    return data.filter(point => {
      const date = new Date(point.date);
      const start = new Date(selectedTimeRange[0]);
      const end = new Date(selectedTimeRange[1]);
      return date >= start && date <= end;
    });
  }, [data, selectedTimeRange]);

  // Handlers
  const handleSeriesToggle = useCallback((seriesId: string) => {
    setLocalSeriesConfig(prev => prev.map(series => 
      series.id === seriesId 
        ? { ...series, visible: !series.visible }
        : series
    ));
  }, []);

  const handleSeriesFocus = useCallback((seriesId: string) => {
    setLocalSeriesConfig(prev => prev.map(series => ({
      ...series,
      focused: series.id === seriesId ? !series.focused : false
    })));
  }, []);

  const handleResetView = useCallback(() => {
    setLocalSeriesConfig(prev => prev.map(series => ({
      ...series,
      visible: true,
      focused: false
    })));
    setViewMode('overview');
    setZoomLevel(1);
  }, []);

  // Custom tooltip component
  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    const date = new Date(label);
    const relevantData = payload.filter((item: any) => 
      displayedSeries.some(series => series.dataKey === item.dataKey)
    );

    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl p-4 shadow-xl max-w-sm">
        <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <p className="font-semibold text-gray-900">
            {formatDate(label, 'long')}
          </p>
        </div>
        
        <div className="space-y-2">
          {relevantData.map((item: any, index: number) => {
            const series = localSeriesConfig.find(s => s.dataKey === item.dataKey);
            if (!series) return null;
            
            return (
              <div key={index} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {series.name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900">
                    {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">
                    {series.unit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        
        {relevantData.length > 1 && (
          <div className="mt-3 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Info className="w-3 h-3" />
              <span>Click series to focus • Double-click to isolate</span>
            </div>
          </div>
        )}
      </div>
    );
  }, [displayedSeries, localSeriesConfig, formatDate]);

  // Chart component renderer
  const getChartComponent = useCallback(() => {
    if (!isClient || filteredData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center space-y-3" style={{ height: '600px', minHeight: '600px' }}>
          <BarChart3 className="w-12 h-12 text-gray-300" />
          <span className="text-gray-500 font-medium">No data available</span>
          <span className="text-sm text-gray-400">Try adjusting your time range or series selection</span>
        </div>
      );
    }

    const ChartComponent = chartType === 'area' ? AreaChart : 
                          chartType === 'composed' ? ComposedChart : LineChart;

    return (
      <ResponsiveContainer width="100%" height={600} minHeight={600}>
        <ChartComponent 
          data={filteredData} 
          margin={{ top: 20, right: 30, left: 20, bottom: showBrush ? 60 : 20 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={chartColors.grid} 
            opacity={0.3}
          />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 11, fill: chartColors.textMuted }}
            tickFormatter={(value) => formatDate(value, 'chart')}
            stroke={chartColors.textMuted}
            strokeWidth={0.5}
          />
          
          {/* Dynamic Y-Axes based on data scales */}
          {allowMultipleYAxes ? (
            displayedSeries.map((series, index) => (
              <YAxis 
                key={`yaxis-${series.id}`}
                yAxisId={series.yAxisId || series.id}
                orientation={index % 2 === 0 ? 'left' : 'right'}
                tick={{ fontSize: 10, fill: series.color }}
                stroke={series.color}
                strokeWidth={0.5}
                domain={['dataMin - 5%', 'dataMax + 5%']}
                hide={displayedSeries.length > 4} // Hide axes if too many series
              />
            ))
          ) : (
            <YAxis 
              tick={{ fontSize: 11, fill: chartColors.textMuted }}
              stroke={chartColors.textMuted}
              strokeWidth={0.5}
              domain={['dataMin - 5%', 'dataMax + 5%']}
            />
          )}
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Render series based on chart type */}
          {displayedSeries.map((series) => {
            const isHovered = hoveredSeries === series.id;
            const isFocused = series.focused;
            const baseOpacity = viewMode === 'focused' && !isFocused ? 0.2 : 1;
            
            if (chartType === 'area') {
              return (
                <Area
                  key={series.id}
                  yAxisId={allowMultipleYAxes ? (series.yAxisId || series.id) : undefined}
                  type="monotone"
                  dataKey={series.dataKey}
                  stroke={series.color}
                  strokeWidth={isFocused ? 3 : isHovered ? 2.5 : (series.strokeWidth || 2)}
                  strokeDasharray={series.strokeDashArray}
                  fill={`${series.color}30`}
                  fillOpacity={(series.fillOpacity || 0.3) * baseOpacity}
                  dot={series.showDots ? { r: 2, fill: series.color } : false}
                  activeDot={{ 
                    r: isFocused ? 6 : 4, 
                    stroke: series.color,
                    strokeWidth: 2,
                    fill: 'white'
                  }}
                  strokeOpacity={baseOpacity}
                />
              );
            } else {
              return (
                <Line
                  key={series.id}
                  yAxisId={allowMultipleYAxes ? (series.yAxisId || series.id) : undefined}
                  type="monotone"
                  dataKey={series.dataKey}
                  stroke={series.color}
                  strokeWidth={isFocused ? 3 : isHovered ? 2.5 : (series.strokeWidth || 2)}
                  strokeDasharray={series.strokeDashArray}
                  fill="none"
                  dot={series.showDots ? { r: 2, fill: series.color } : false}
                  activeDot={{ 
                    r: isFocused ? 6 : 4, 
                    stroke: series.color, 
                    strokeWidth: 2, 
                    fill: 'white',
                    filter: isFocused ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none'
                  }}
                  opacity={baseOpacity}
                  onMouseEnter={() => setHoveredSeries(series.id)}
                  onMouseLeave={() => setHoveredSeries(null)}
                  onClick={() => handleSeriesFocus(series.id)}
                  style={{ 
                    cursor: 'pointer',
                    transition: `all ${CHART_ANIMATIONS.duration}ms ${CHART_ANIMATIONS.easing}`
                  }}
                />
              );
            }
          })}
          
          {/* Time range brush */}
          {showBrush && (
            <Brush 
              dataKey="date" 
              height={30}
              stroke={chartColors.primary}
              fill={`${chartColors.primary}10`}
              tickFormatter={(value) => formatDate(value, 'short')}
              onChange={(range) => {
                if (range?.startIndex !== undefined && range?.endIndex !== undefined) {
                  const startDate = filteredData[range.startIndex]?.date;
                  const endDate = filteredData[range.endIndex]?.date;
                  if (startDate && endDate) {
                    onTimeRangeChange?.([startDate, endDate]);
                  }
                }
              }}
            />
          )}
        </ChartComponent>
      </ResponsiveContainer>
    );
  }, [
    isClient,
    filteredData,
    chartType,
    showBrush,
    chartColors,
    allowMultipleYAxes,
    displayedSeries,
    hoveredSeries,
    viewMode,
    onTimeRangeChange,
    formatDate
  ]);

  return (
    <ChartWrapper
      height={height}
      loading={loading}
      error={error}
      title={title}
      description="Interactive economic data visualization with dynamic series selection"
    >
      {/* Chart Controls */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        
        {/* Chart Type Selection */}
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-50 border border-gray-200 rounded-lg p-1">
            <button
              onClick={() => setChartType('line')}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded transition-all ${
                chartType === 'line'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Line Chart"
            >
              <LineChartIcon className="w-4 h-4" />
              Line
            </button>
            <button
              onClick={() => setChartType('area')}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded transition-all ${
                chartType === 'area'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Area Chart"
            >
              <AreaChartIcon className="w-4 h-4" />
              Area
            </button>
            <button
              onClick={() => setChartType('composed')}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded transition-all ${
                chartType === 'composed'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Composed Chart"
            >
              <BarChart3 className="w-4 h-4" />
              Mixed
            </button>
          </div>
        </div>

        {/* View Mode Selection */}
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-50 border border-gray-200 rounded-lg p-1">
            <button
              onClick={() => setViewMode('overview')}
              className={`px-3 py-1.5 text-sm rounded transition-all ${
                viewMode === 'overview'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setViewMode('focused')}
              className={`px-3 py-1.5 text-sm rounded transition-all ${
                viewMode === 'focused'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Focused
            </button>
            <button
              onClick={() => setViewMode('comparison')}
              className={`px-3 py-1.5 text-sm rounded transition-all ${
                viewMode === 'comparison'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Compare
            </button>
          </div>
        </div>

        {/* Control Actions */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleResetView}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-all"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg transition-all ${
              showSettings
                ? 'bg-blue-50 text-blue-600 border-blue-200'
                : 'text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100'
            }`}
            title="Chart Settings"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Series Legend with Interactive Controls */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Focus className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Data Series</span>
          <span className="text-xs text-gray-500">
            ({displayedSeries.length} of {localSeriesConfig.length} visible)
          </span>
        </div>
        
        {/* Group by frequency */}
        <div className="space-y-3">
          {Object.entries(frequencyGroups).map(([frequency, seriesList]) => (
            <div key={frequency} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: FREQUENCY_COLORS[frequency as keyof typeof FREQUENCY_COLORS] }}
                />
                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  {FREQUENCY_LABELS[frequency as keyof typeof FREQUENCY_LABELS]} Data
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {seriesList.map((series) => (
                  <div
                    key={series.id}
                    className={`flex items-center gap-2 p-2 rounded-md border transition-all cursor-pointer ${
                      series.visible
                        ? series.focused
                          ? 'bg-blue-50 border-blue-200 shadow-sm'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                        : 'bg-gray-100 border-gray-200 opacity-60'
                    }`}
                    onClick={() => handleSeriesToggle(series.id)}
                    onDoubleClick={() => handleSeriesFocus(series.id)}
                    title={`${series.description} • Click to toggle • Double-click to focus`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSeriesToggle(series.id);
                        }}
                        className="shrink-0"
                      >
                        {series.visible ? (
                          <Eye className="w-4 h-4 text-gray-600" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      
                      <div 
                        className="w-3 h-3 rounded-full border border-white shadow-sm shrink-0"
                        style={{ backgroundColor: series.color }}
                      />
                      
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium text-gray-900 truncate block">
                          {series.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {series.unit}
                        </span>
                      </div>
                    </div>
                    
                    {series.focused && (
                      <Focus className="w-3 h-3 text-blue-600 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative">
        <div 
          className="h-full w-full" 
          style={{ 
            height: '600px', 
            minHeight: '600px',
            maxHeight: 'none'
          }}
        >
          {getChartComponent()}
        </div>
        
        {/* Zoom Controls Overlay */}
        {zoomLevel !== 1 && (
          <div className="absolute top-4 right-4 flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg p-2">
            <button
              onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
              className="p-1 hover:bg-gray-100 rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-xs text-gray-600 px-2">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
              className="p-1 hover:bg-gray-100 rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        )}
      </div>

      {/* Chart Footer */}
      <div className="mt-4 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
        <div className="flex flex-col sm:flex-row justify-between gap-2">
          <div>
            Interactive economic data from Federal Reserve Economic Data (FRED) • 
            {displayedSeries.length > 0 && (
              <span className="ml-1">
                Showing {displayedSeries.length} series spanning {displayedSeries.map(s => s.frequency).join(', ')} frequencies
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span>Last updated: {formatDate(new Date().toISOString(), 'short')}</span>
            {focusedSeries.length > 0 && (
              <span className="text-blue-600 font-medium">
                {focusedSeries.length} series focused
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Chart Settings</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Multiple Y-Axes
                  </label>
                  <button
                    onClick={() => {/* Toggle multiple Y-axes */}}
                    className={`w-full text-left p-3 rounded-lg border ${
                      allowMultipleYAxes
                        ? 'bg-blue-50 border-blue-200 text-blue-900'
                        : 'bg-gray-50 border-gray-200 text-gray-700'
                    }`}
                  >
                    {allowMultipleYAxes ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Range Brush
                  </label>
                  <button
                    onClick={() => {/* Toggle brush */}}
                    className={`w-full text-left p-3 rounded-lg border ${
                      showBrush
                        ? 'bg-blue-50 border-blue-200 text-blue-900'
                        : 'bg-gray-50 border-gray-200 text-gray-700'
                    }`}
                  >
                    {showBrush ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </ChartWrapper>
  );
}

export type { DataPoint, SeriesConfig, ChartType, ViewMode };