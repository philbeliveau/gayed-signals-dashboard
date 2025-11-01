'use client';

/**
 * QualityTrendsChart Component
 * Story 4.0f: Monitoring & Observability - Task 1.3
 *
 * Time-series visualization for data quality metrics
 */

import React, { useState, useEffect, useRef } from 'react';
import type { TimeSeriesData, TimeRange } from '@/domains/data-pipeline/types/monitoring';

export interface QualityTrendsChartProps {
  timeRange: TimeRange;
  metrics: string[]; // e.g., ['overall', 'freshness', 'completeness']
  refreshInterval?: number;
  height?: number;
}

export const QualityTrendsChart: React.FC<QualityTrendsChartProps> = ({
  timeRange,
  metrics,
  refreshInterval = 30000,
  height = 300,
}) => {
  const [seriesData, setSeriesData] = useState<Record<string, TimeSeriesData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(metrics);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const fetchTrendsData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/monitoring/quality-trends?timeRange=${timeRange}&metrics=${selectedMetrics.join(',')}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch trends: ${response.status}`);
        }

        const data = await response.json();
        setSeriesData(data.series);
      } catch (err) {
        console.error('Error fetching trends data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchTrendsData();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchTrendsData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [timeRange, selectedMetrics, refreshInterval]);

  // Simple canvas-based chart rendering
  useEffect(() => {
    if (!canvasRef.current || Object.keys(seriesData).length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const padding = 40;
    const chartWidth = canvas.width - 2 * padding;
    const chartHeight = canvas.height - 2 * padding;

    // Draw axes
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();

    // Draw grid lines
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 10; i++) {
      const y = padding + (chartHeight / 10) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.stroke();
    }

    // Y-axis labels (0-100)
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 10; i++) {
      const value = 100 - i * 10;
      const y = padding + (chartHeight / 10) * i;
      ctx.fillText(value.toString(), padding - 10, y + 4);
    }

    // Plot each metric series
    const colors: Record<string, string> = {
      overall: '#3b82f6',
      freshness: '#10b981',
      completeness: '#f59e0b',
      consistency: '#8b5cf6',
      accuracy: '#ef4444',
    };

    Object.entries(seriesData).forEach(([metric, data]) => {
      if (!data.dataPoints || data.dataPoints.length === 0) return;

      const color = colors[metric] || '#6b7280';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      data.dataPoints.forEach((point, index) => {
        const x = padding + (chartWidth / (data.dataPoints.length - 1)) * index;
        const y = canvas.height - padding - (point.value / 100) * chartHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Draw data points
      ctx.fillStyle = color;
      data.dataPoints.forEach((point, index) => {
        const x = padding + (chartWidth / (data.dataPoints.length - 1)) * index;
        const y = canvas.height - padding - (point.value / 100) * chartHeight;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
    });

    // X-axis labels (time)
    if (Object.keys(seriesData).length > 0) {
      const firstSeries = Object.values(seriesData)[0];
      if (firstSeries.dataPoints.length > 0) {
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';

        const step = Math.ceil(firstSeries.dataPoints.length / 6);
        firstSeries.dataPoints.forEach((point, index) => {
          if (index % step === 0) {
            const x = padding + (chartWidth / (firstSeries.dataPoints.length - 1)) * index;
            const time = new Date(point.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            ctx.fillText(time, x, canvas.height - padding + 20);
          }
        });
      }
    }
  }, [seriesData]);

  const toggleMetric = (metric: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric]
    );
  };

  const exportChart = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `quality-trends-${Date.now()}.png`;
    link.href = url;
    link.click();
  };

  const exportCSV = () => {
    if (Object.keys(seriesData).length === 0) return;

    let csv = 'Timestamp,' + Object.keys(seriesData).join(',') + '\n';

    const firstSeries = Object.values(seriesData)[0];
    firstSeries.dataPoints.forEach((_, index) => {
      const timestamp = new Date(firstSeries.dataPoints[index].timestamp).toISOString();
      const values = Object.values(seriesData).map(
        (series) => series.dataPoints[index]?.value || ''
      );
      csv += `${timestamp},${values.join(',')}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `quality-trends-${Date.now()}.csv`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading && Object.keys(seriesData).length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-white rounded-lg shadow p-6"
        style={{ height }}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading trends...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4" style={{ height }}>
        <div className="flex items-center">
          <svg
            className="w-5 h-5 text-red-600 mr-2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span className="text-red-800 font-medium">Error loading trends</span>
        </div>
        <p className="text-red-700 text-sm mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Quality Trends</h3>
        <div className="flex gap-2">
          <button
            onClick={exportChart}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            title="Export as PNG"
          >
            📊 PNG
          </button>
          <button
            onClick={exportCSV}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            title="Export as CSV"
          >
            📄 CSV
          </button>
        </div>
      </div>

      {/* Metric toggles */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {metrics.map((metric) => (
          <button
            key={metric}
            onClick={() => toggleMetric(metric)}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              selectedMetrics.includes(metric)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {metric.charAt(0).toUpperCase() + metric.slice(1)}
          </button>
        ))}
      </div>

      {/* Chart canvas */}
      <canvas ref={canvasRef} width={800} height={height} className="w-full" />

      {/* Legend */}
      <div className="flex gap-4 mt-4 justify-center">
        {Object.entries(seriesData).map(([metric, data]) => {
          const colors: Record<string, string> = {
            overall: '#3b82f6',
            freshness: '#10b981',
            completeness: '#f59e0b',
            consistency: '#8b5cf6',
            accuracy: '#ef4444',
          };
          const color = colors[metric] || '#6b7280';

          return (
            <div key={metric} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
              <span className="text-sm text-gray-700 capitalize">{metric}</span>
              {data.dataPoints.length > 0 && (
                <span className="text-xs text-gray-500">
                  ({Math.round(data.dataPoints[data.dataPoints.length - 1].value)})
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QualityTrendsChart;
