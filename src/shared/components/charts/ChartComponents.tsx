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
      <div className="bg-theme-card border border-theme-border rounded-lg p-3 shadow-lg">
        <p className="text-theme-text font-medium mb-2">{label}</p>
        <div className="space-y-1 text-sm">
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      </div>
    );
  }
  return null;
});

const LineChartComponent = memo<ChartComponentsProps>(({ data, config, onDataPointClick }) => (
  <ResponsiveContainer width="100%" height={config.height || 400}>
    <LineChart 
      data={data} 
      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
      onClick={onDataPointClick}
    >
      {config.showGrid !== false && (
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
      )}
      
      <XAxis 
        dataKey={config.xAxisKey}
        tick={{ fontSize: 12, fill: '#9CA3AF' }}
        stroke="#6B7280"
        tickFormatter={config.formatters?.xAxis}
      />
      
      <YAxis 
        tick={{ fontSize: 12, fill: '#9CA3AF' }}
        stroke="#6B7280"
        tickFormatter={config.formatters?.yAxis}
      />
      
      {config.showTooltip !== false && (
        <Tooltip content={<DefaultTooltip />} />
      )}
      
      {config.showLegend !== false && <Legend />}
      
      {config.dataKeys.map((key, index) => (
        <Line 
          key={key}
          type="monotone" 
          dataKey={key} 
          stroke={config.colors?.[key] || `hsl(${index * 60}, 70%, 50%)`}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2 }}
        />
      ))}
    </LineChart>
  </ResponsiveContainer>
));

const ComposedChartComponent = memo<ChartComponentsProps>(({ data, config, onDataPointClick }) => (
  <ResponsiveContainer width="100%" height={config.height || 400}>
    <ComposedChart 
      data={data} 
      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
      onClick={onDataPointClick}
    >
      {config.showGrid !== false && (
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
      )}
      
      <XAxis 
        dataKey={config.xAxisKey}
        tick={{ fontSize: 12, fill: '#9CA3AF' }}
        stroke="#6B7280"
        tickFormatter={config.formatters?.xAxis}
      />
      
      <YAxis 
        tick={{ fontSize: 12, fill: '#9CA3AF' }}
        stroke="#6B7280"
        tickFormatter={config.formatters?.yAxis}
      />
      
      {config.showTooltip !== false && (
        <Tooltip content={<DefaultTooltip />} />
      )}
      
      {config.showLegend !== false && <Legend />}
      
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
              strokeWidth={2}
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
));

const AreaChartComponent = memo<ChartComponentsProps>(({ data, config, onDataPointClick }) => (
  <ResponsiveContainer width="100%" height={config.height || 400}>
    <AreaChart 
      data={data} 
      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
      onClick={onDataPointClick}
    >
      {config.showGrid !== false && (
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
      )}
      
      <XAxis 
        dataKey={config.xAxisKey}
        tick={{ fontSize: 12, fill: '#9CA3AF' }}
        stroke="#6B7280"
        tickFormatter={config.formatters?.xAxis}
      />
      
      <YAxis 
        tick={{ fontSize: 12, fill: '#9CA3AF' }}
        stroke="#6B7280"
        tickFormatter={config.formatters?.yAxis}
      />
      
      {config.showTooltip !== false && (
        <Tooltip content={<DefaultTooltip />} />
      )}
      
      {config.showLegend !== false && <Legend />}
      
      {config.dataKeys.map((key, index) => (
        <Area 
          key={key}
          type="monotone" 
          dataKey={key} 
          stackId="1"
          stroke={config.colors?.[key] || `hsl(${index * 60}, 70%, 50%)`}
          fill={config.colors?.[key] || `hsl(${index * 60}, 70%, 50%)`}
          fillOpacity={0.6}
        />
      ))}
    </AreaChart>
  </ResponsiveContainer>
));

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