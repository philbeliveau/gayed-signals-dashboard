'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';

interface CorrelationData {
  x: string;
  y: string;
  value: number;
  significance: 'high' | 'medium' | 'low';
  period: string;
}

interface CorrelationHeatmapProps {
  data: CorrelationData[];
  title?: string;
  subtitle?: string;
  xLabels: string[];
  yLabels: string[];
  colorScheme?: 'diverging' | 'sequential';
  loading?: boolean;
  height?: number;
  showValues?: boolean;
  onCellClick?: (data: CorrelationData) => void;
}

export default function CorrelationHeatmap({
  data,
  title = 'Correlation Analysis',
  subtitle,
  xLabels,
  yLabels,
  colorScheme = 'diverging',
  loading = false,
  height = 300,
  showValues = true,
  onCellClick
}: CorrelationHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<CorrelationData | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false
  });

  const getCellColor = (value: number): string => {
    if (colorScheme === 'diverging') {
      // Diverging color scheme: negative = red, positive = green, neutral = gray
      const intensity = Math.abs(value);
      const alpha = Math.min(intensity, 1);
      
      if (value > 0.1) {
        return `rgba(var(--theme-success-rgb, 16, 185, 129), ${alpha})`;
      } else if (value < -0.1) {
        return `rgba(var(--theme-danger-rgb, 248, 113, 113), ${alpha})`;
      } else {
        return `rgba(var(--theme-text-muted-rgb, 148, 163, 184), ${alpha * 0.3})`;
      }
    } else {
      // Sequential color scheme: all positive, varying intensity
      const intensity = Math.min(Math.abs(value), 1);
      return `rgba(var(--theme-primary-rgb, 139, 92, 246), ${intensity})`;
    }
  };

  const getTextColor = (value: number): string => {
    const intensity = Math.abs(value);
    return intensity > 0.5 ? 'text-white' : 'text-theme-text';
  };

  const formatValue = (value: number): string => {
    return value.toFixed(2);
  };

  const getSignificanceIcon = (significance: string) => {
    switch (significance) {
      case 'high':
        return <TrendingUp className="w-3 h-3" />;
      case 'medium':
        return <Info className="w-3 h-3" />;
      case 'low':
        return <TrendingDown className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const handleMouseEnter = (cellData: CorrelationData, event: React.MouseEvent) => {
    setHoveredCell(cellData);
    setTooltip({
      x: event.clientX,
      y: event.clientY,
      visible: true
    });
  };

  const handleMouseLeave = () => {
    setHoveredCell(null);
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (hoveredCell) {
      setTooltip(prev => ({
        ...prev,
        x: event.clientX,
        y: event.clientY
      }));
    }
  };

  if (loading) {
    return (
      <div className="bg-theme-card border border-theme-border rounded-xl p-6">
        <div className="h-4 bg-theme-bg-secondary rounded mb-4 w-48 animate-pulse"></div>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${xLabels.length + 1}, 1fr)` }}>
          {Array.from({ length: (xLabels.length + 1) * (yLabels.length + 1) }).map((_, i) => (
            <div key={i} className="h-12 bg-theme-bg-secondary rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const cellSize = Math.min(60, Math.max(40, (height - 100) / Math.max(xLabels.length, yLabels.length)));

  return (
    <div className="bg-theme-card border border-theme-border rounded-xl p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-theme-text">{title}</h3>
        {subtitle && (
          <p className="text-sm text-theme-text-muted mt-1">{subtitle}</p>
        )}
      </div>

      {/* Heatmap Grid */}
      <div className="relative">
        <div 
          className="grid gap-1"
          style={{ 
            gridTemplateColumns: `auto repeat(${xLabels.length}, ${cellSize}px)`,
            gridTemplateRows: `auto repeat(${yLabels.length}, ${cellSize}px)`
          }}
          onMouseMove={handleMouseMove}
        >
          {/* Empty top-left corner */}
          <div></div>
          
          {/* X-axis labels */}
          {xLabels.map((label, i) => (
            <div 
              key={`x-${i}`}
              className="flex items-center justify-center text-xs font-medium text-theme-text-muted p-2 text-center"
              style={{ height: cellSize }}
            >
              <span className="transform -rotate-45 origin-center whitespace-nowrap">
                {label}
              </span>
            </div>
          ))}

          {/* Y-axis labels and data cells */}
          {yLabels.map((yLabel, yIndex) => (
            <React.Fragment key={`row-${yIndex}`}>
              {/* Y-axis label */}
              <div 
                className="flex items-center justify-end text-xs font-medium text-theme-text-muted pr-2"
                style={{ height: cellSize }}
              >
                {yLabel}
              </div>
              
              {/* Data cells for this row */}
              {xLabels.map((xLabel, xIndex) => {
                const cellData = data.find(d => d.x === xLabel && d.y === yLabel);
                const value = cellData?.value || 0;
                const significance = cellData?.significance || 'low';
                
                return (
                  <div
                    key={`cell-${xIndex}-${yIndex}`}
                    className={`relative border border-theme-border/30 rounded cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg ${getTextColor(value)}`}
                    style={{ 
                      backgroundColor: getCellColor(value),
                      height: cellSize,
                      width: cellSize
                    }}
                    onMouseEnter={(e) => cellData && handleMouseEnter(cellData, e)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => cellData && onCellClick?.(cellData)}
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      {showValues && (
                        <span className="text-xs font-bold">
                          {formatValue(value)}
                        </span>
                      )}
                      {cellData && (
                        <div className="text-xs opacity-70">
                          {getSignificanceIcon(significance)}
                        </div>
                      )}
                    </div>
                    
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-200 rounded"></div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        {/* Tooltip */}
        {tooltip.visible && hoveredCell && (
          <div
            className="fixed bg-theme-card border border-theme-border rounded-lg p-3 shadow-xl z-50 pointer-events-none"
            style={{
              left: tooltip.x + 10,
              top: tooltip.y - 80,
              transform: tooltip.x > window.innerWidth - 200 ? 'translateX(-100%)' : undefined
            }}
          >
            <div className="font-medium text-theme-text mb-1">
              {hoveredCell.x} × {hoveredCell.y}
            </div>
            <div className="text-sm text-theme-text-secondary mb-1">
              Correlation: <span className="font-bold">{formatValue(hoveredCell.value)}</span>
            </div>
            <div className="text-xs text-theme-text-muted flex items-center gap-1">
              {getSignificanceIcon(hoveredCell.significance)}
              <span className="capitalize">{hoveredCell.significance} significance</span>
            </div>
            {hoveredCell.period && (
              <div className="text-xs text-theme-text-light mt-1">
                Period: {hoveredCell.period}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-theme-text-muted">Correlation:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: getCellColor(-1) }}></div>
            <span className="text-xs text-theme-text-muted">-1.0</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: getCellColor(0) }}></div>
            <span className="text-xs text-theme-text-muted">0.0</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: getCellColor(1) }}></div>
            <span className="text-xs text-theme-text-muted">+1.0</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-xs text-theme-text-muted">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>High</span>
          </div>
          <div className="flex items-center gap-1">
            <Info className="w-3 h-3" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingDown className="w-3 h-3" />
            <span>Low</span>
          </div>
        </div>
      </div>
    </div>
  );
}