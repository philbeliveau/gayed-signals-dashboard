'use client';

import React, { memo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Bar,
  Area,
  AreaChart
} from 'recharts';
import type { ChartConfig } from './OptimizedChart';

interface ChartComponentsProps {
  data: any[];
  config: ChartConfig;
  onDataPointClick?: (data: any) => void;
}

const DefaultTooltip = memo(({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-theme-card border border-theme-border rounded-lg p-2 sm:p-3 shadow-lg max-w-xs">
        <p className="text-theme-text font-medium mb-1 sm:mb-2 text-xs sm:text-sm truncate">{label}</p>
        <div className="space-y-0.5 sm:space-y-1 text-xs sm:text-sm">
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="truncate">
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
            </p>
          ))}
        </div>
      </div>
    );
  }
  return null;
});

const LineChartComponent = memo<ChartComponentsProps>(({ data, config, onDataPointClick }) => {
  // Mobile-responsive chart configuration
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const chartHeight = isMobile ? Math.max(250, config.height || 300) : config.height || 400;
  const margins = isMobile
    ? { top: 10, right: 10, left: 10, bottom: 30 }
    : { top: 20, right: 30, left: 20, bottom: 60 };
  const tickFontSize = isMobile ? 10 : 12;
  const strokeWidth = isMobile ? 1.5 : 2;
  const activeDotRadius = isMobile ? 3 : 4;

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <LineChart
        data={data}
        margin={margins}
        onClick={onDataPointClick}
      >
        {config.showGrid !== false && (
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
        )}

        <XAxis
          dataKey={config.xAxisKey}
          tick={{ fontSize: tickFontSize, fill: '#9CA3AF' }}
          stroke="#6B7280"
          tickFormatter={config.formatters?.xAxis}
          interval={isMobile ? 'preserveStartEnd' : undefined}
          minTickGap={isMobile ? 10 : 5}
        />

        <YAxis
          tick={{ fontSize: tickFontSize, fill: '#9CA3AF' }}
          stroke="#6B7280"
          tickFormatter={config.formatters?.yAxis}
          width={isMobile ? 40 : 60}
        />

        {config.showTooltip !== false && (
          <Tooltip
            content={<DefaultTooltip />}
            position={isMobile ? { x: 10, y: 10 } : undefined}
          />
        )}

        {config.showLegend !== false && !isMobile && <Legend />}

        {config.dataKeys.map((key, index) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={config.colors?.[key] || `hsl(${index * 60}, 70%, 50%)`}
            strokeWidth={strokeWidth}
            dot={false}
            activeDot={{ r: activeDotRadius, strokeWidth: strokeWidth }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
});

const ComposedChartComponent = memo<ChartComponentsProps>(({ data, config, onDataPointClick }) => {
  // Mobile-responsive chart configuration
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const chartHeight = isMobile ? Math.max(250, config.height || 300) : config.height || 400;
  const margins = isMobile
    ? { top: 10, right: 10, left: 10, bottom: 30 }
    : { top: 20, right: 30, left: 20, bottom: 60 };
  const tickFontSize = isMobile ? 10 : 12;
  const strokeWidth = isMobile ? 1.5 : 2;

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <ComposedChart
        data={data}
        margin={margins}
        onClick={onDataPointClick}
      >
        {config.showGrid !== false && (
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
        )}

        <XAxis
          dataKey={config.xAxisKey}
          tick={{ fontSize: tickFontSize, fill: '#9CA3AF' }}
          stroke="#6B7280"
          tickFormatter={config.formatters?.xAxis}
          interval={isMobile ? 'preserveStartEnd' : undefined}
          minTickGap={isMobile ? 10 : 5}
        />

        <YAxis
          tick={{ fontSize: tickFontSize, fill: '#9CA3AF' }}
          stroke="#6B7280"
          tickFormatter={config.formatters?.yAxis}
          width={isMobile ? 40 : 60}
        />

        {config.showTooltip !== false && (
          <Tooltip
            content={<DefaultTooltip />}
            position={isMobile ? { x: 10, y: 10 } : undefined}
          />
        )}

        {config.showLegend !== false && !isMobile && <Legend />}

        {config.dataKeys.map((key, index) => {
          const color = config.colors?.[key] || `hsl(${index * 60}, 70%, 50%)`;

          // Alternate between lines and bars for visual variety
          if (index % 2 === 0) {
            return (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={color}
                strokeWidth={strokeWidth}
                dot={false}
              />
            );
          } else {
            return (
              <Bar
                key={key}
                dataKey={key}
                fill={color}
                opacity={0.7}
              />
            );
          }
        })}
      </ComposedChart>
    </ResponsiveContainer>
  );
});

const AreaChartComponent = memo<ChartComponentsProps>(({ data, config, onDataPointClick }) => {
  // Mobile-responsive chart configuration
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const chartHeight = isMobile ? Math.max(250, config.height || 300) : config.height || 400;
  const margins = isMobile
    ? { top: 10, right: 10, left: 10, bottom: 30 }
    : { top: 20, right: 30, left: 20, bottom: 60 };
  const tickFontSize = isMobile ? 10 : 12;
  const strokeWidth = isMobile ? 1.5 : 2;

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <AreaChart
        data={data}
        margin={margins}
        onClick={onDataPointClick}
      >
        {config.showGrid !== false && (
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
        )}

        <XAxis
          dataKey={config.xAxisKey}
          tick={{ fontSize: tickFontSize, fill: '#9CA3AF' }}
          stroke="#6B7280"
          tickFormatter={config.formatters?.xAxis}
          interval={isMobile ? 'preserveStartEnd' : undefined}
          minTickGap={isMobile ? 10 : 5}
        />

        <YAxis
          tick={{ fontSize: tickFontSize, fill: '#9CA3AF' }}
          stroke="#6B7280"
          tickFormatter={config.formatters?.yAxis}
          width={isMobile ? 40 : 60}
        />

        {config.showTooltip !== false && (
          <Tooltip
            content={<DefaultTooltip />}
            position={isMobile ? { x: 10, y: 10 } : undefined}
          />
        )}

        {config.showLegend !== false && !isMobile && <Legend />}

        {config.dataKeys.map((key, index) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stackId="1"
            stroke={config.colors?.[key] || `hsl(${index * 60}, 70%, 50%)`}
            fill={config.colors?.[key] || `hsl(${index * 60}, 70%, 50%)`}
            fillOpacity={0.6}
            strokeWidth={strokeWidth}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
});

/**
 * Main chart components dispatcher
 * Renders the appropriate chart type based on config
 */
const ChartComponents: React.FC<ChartComponentsProps> = memo(({ data, config, onDataPointClick }) => {
  switch (config.type) {
    case 'line':
      return <LineChartComponent data={data} config={config} onDataPointClick={onDataPointClick} />;
    case 'composed':
      return <ComposedChartComponent data={data} config={config} onDataPointClick={onDataPointClick} />;
    case 'area':
      return <AreaChartComponent data={data} config={config} onDataPointClick={onDataPointClick} />;
    default:
      return <LineChartComponent data={data} config={config} onDataPointClick={onDataPointClick} />;
  }
});

ChartComponents.displayName = 'ChartComponents';

export default ChartComponents;