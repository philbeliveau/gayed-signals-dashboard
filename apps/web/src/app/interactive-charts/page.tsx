'use client';

import { useState, useEffect } from 'react';
import { Users, Home } from 'lucide-react';
// CRITICAL: Use shared components following source tree standards
import EnhancedInteractiveHousingChart from '../../shared/components/charts/EnhancedInteractiveHousingChart';
import EnhancedInteractiveLaborChart from '../../shared/components/charts/EnhancedInteractiveLaborChart';

type ChartType = 'housing' | 'labor';

/**
 * Interactive Charts Demo Page
 * 
 * This page demonstrates the new interactive economic charts with:
 * - Click-to-focus series selection
 * - Automatic granularity adjustment
 * - Modern visual design
 * - Real-time data integration
 */
export default function InteractiveChartsPage() {
  const [activeChart, setActiveChart] = useState<ChartType>('housing');
  const [selectedPeriod, setSelectedPeriod] = useState('12m');
  const [chartHeight, setChartHeight] = useState(700);

  useEffect(() => {
    const updateChartHeight = () => {
      if (typeof window !== 'undefined') {
        const width = window.innerWidth;
        if (width < 640) {
          setChartHeight(400);
        } else if (width < 1024) {
          setChartHeight(500);
        } else {
          setChartHeight(700);
        }
      }
    };

    updateChartHeight();
    window.addEventListener('resize', updateChartHeight);
    return () => window.removeEventListener('resize', updateChartHeight);
  }, []);

  const chartTypes = [
    {
      id: 'housing' as ChartType,
      name: 'Housing',
      icon: Home,
    },
    {
      id: 'labor' as ChartType,
      name: 'Labor',
      icon: Users,
    }
  ];


  return (
    <div className="min-h-screen bg-theme-bg text-theme-text">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-theme-text">Economic Data Analysis</h1>
          <p className="text-theme-text-muted mt-2">Housing and Labor Market Indicators</p>
        </div>
        {/* Chart Type Selection */}
        <div className="mb-6">
          <div className="flex gap-3">
            {chartTypes.map((chart) => {
              const Icon = chart.icon;
              const isActive = activeChart === chart.id;

              return (
                <button
                  key={chart.id}
                  onClick={() => setActiveChart(chart.id)}
                  className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                    isActive ? 'bg-theme-primary text-white' : 'bg-theme-card text-theme-text hover:bg-theme-card-hover'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{chart.name}</span>
                </button>
              );
            })}
          </div>
        </div>


        {/* Chart Display */}
        <div className="space-y-6 sm:space-y-8">
          {activeChart === 'housing' && (
            <div className="w-full overflow-hidden">
              <EnhancedInteractiveHousingChart
                height={chartHeight}
                selectedPeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
                region="United States"
              />
            </div>
          )}

          {activeChart === 'labor' && (
            <div className="w-full overflow-hidden">
              <EnhancedInteractiveLaborChart
                height={chartHeight}
                selectedPeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
                // Alerts are fetched from API - no hardcoded alerts per coding standards
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}