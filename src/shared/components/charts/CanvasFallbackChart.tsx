'use client';

import { useRef, useEffect } from 'react';
import { useChartColors } from '../../utils/chartTheme';

interface DataPoint {
  date: string;
  value: number;
  label?: string;
}

interface CanvasFallbackChartProps {
  data: DataPoint[];
  height?: number;
  width?: number;
  title?: string;
  yAxisLabel?: string;
  showGrid?: boolean;
  lineColor?: string;
}

/**
 * CanvasFallbackChart - Simple HTML5 Canvas chart as fallback
 * 
 * This provides a basic line chart when Recharts fails to render.
 * Uses Canvas API which has better browser compatibility.
 */
export default function CanvasFallbackChart({
  data,
  height = 300,
  width = 600,
  title,
  yAxisLabel,
  showGrid = true,
  lineColor
}: CanvasFallbackChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colors = useChartColors();

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set up dimensions and margins
    const margin = 60;
    const chartWidth = canvas.width - 2 * margin;
    const chartHeight = canvas.height - 2 * margin;

    // Calculate scales
    const xScale = chartWidth / (data.length - 1);
    const yMin = Math.min(...data.map(d => d.value)) * 0.95;
    const yMax = Math.max(...data.map(d => d.value)) * 1.05;
    const yScale = chartHeight / (yMax - yMin);

    // Set font and colors
    ctx.font = '12px sans-serif';
    ctx.fillStyle = colors.text;
    ctx.strokeStyle = colors.border;

    // Draw background
    ctx.fillStyle = colors.card;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw title
    if (title) {
      ctx.fillStyle = colors.text;
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(title, canvas.width / 2, 25);
    }

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      // Vertical grid lines
      for (let i = 0; i < data.length; i += Math.ceil(data.length / 8)) {
        const x = margin + i * xScale;
        ctx.beginPath();
        ctx.moveTo(x, margin);
        ctx.lineTo(x, margin + chartHeight);
        ctx.stroke();
      }

      // Horizontal grid lines
      const gridLines = 5;
      for (let i = 0; i <= gridLines; i++) {
        const y = margin + (i * chartHeight) / gridLines;
        ctx.beginPath();
        ctx.moveTo(margin, y);
        ctx.lineTo(margin + chartWidth, y);
        ctx.stroke();
      }
      
      ctx.setLineDash([]);
    }

    // Draw axes
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 2;
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin, margin + chartHeight);
    ctx.stroke();

    // X-axis
    ctx.beginPath();
    ctx.moveTo(margin, margin + chartHeight);
    ctx.lineTo(margin + chartWidth, margin + chartHeight);
    ctx.stroke();

    // Draw Y-axis labels
    ctx.fillStyle = colors.textMuted;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    
    const labelCount = 5;
    for (let i = 0; i <= labelCount; i++) {
      const value = yMin + (yMax - yMin) * (1 - i / labelCount);
      const y = margin + (i * chartHeight) / labelCount;
      ctx.fillText(value.toFixed(1), margin - 10, y + 4);
    }

    // Draw X-axis labels (simplified - show first, middle, last)
    ctx.textAlign = 'center';
    const labelIndices = [0, Math.floor(data.length / 2), data.length - 1];
    labelIndices.forEach(i => {
      if (i < data.length) {
        const x = margin + i * xScale;
        const date = new Date(data[i].date);
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        ctx.fillText(label, x, margin + chartHeight + 20);
      }
    });

    // Draw Y-axis label
    if (yAxisLabel) {
      ctx.save();
      ctx.translate(15, margin + chartHeight / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = colors.text;
      ctx.font = '12px sans-serif';
      ctx.fillText(yAxisLabel, 0, 0);
      ctx.restore();
    }

    // Draw the line chart
    ctx.strokeStyle = lineColor || colors.primary;
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.beginPath();

    data.forEach((point, i) => {
      const x = margin + i * xScale;
      const y = margin + chartHeight - (point.value - yMin) * yScale;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw data points
    ctx.fillStyle = lineColor || colors.primary;
    data.forEach((point, i) => {
      const x = margin + i * xScale;
      const y = margin + chartHeight - (point.value - yMin) * yScale;
      
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw border
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

  }, [data, colors, title, yAxisLabel, showGrid, lineColor]);

  if (!data.length) {
    return (
      <div className="flex items-center justify-center bg-theme-card border border-theme-border rounded-lg p-8" style={{ height }}>
        <span className="text-theme-text-muted">No data available for fallback chart</span>
      </div>
    );
  }

  return (
    <div className="bg-theme-card border border-theme-border rounded-lg p-4">
      <canvas 
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-auto max-w-full"
        style={{ display: 'block' }}
      />
      <div className="mt-2 text-xs text-theme-text-muted text-center">
        Canvas Fallback Chart • {data.length} data points
      </div>
    </div>
  );
}