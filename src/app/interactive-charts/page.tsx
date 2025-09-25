'use client';

import { useState } from 'react';
import { Users, Home, TrendingUp, Info, Sparkles, BarChart3 } from 'lucide-react';
import EnhancedInteractiveHousingChart from '../../components/charts/EnhancedInteractiveHousingChart';
import EnhancedInteractiveLaborChart from '../../components/charts/EnhancedInteractiveLaborChart';

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

  const chartTypes = [
    {
      id: 'housing' as ChartType,
      name: 'Housing Market',
      description: 'Interactive housing market indicators with price trends, supply metrics, and mortgage rates',
      icon: Home,
      color: 'green'
    },
    {
      id: 'labor' as ChartType,
      name: 'Labor Market',
      description: 'Employment data with unemployment rates, job claims, and participation metrics',
      icon: Users,
      color: 'orange'
    }
  ];

  const features = [
    {
      icon: TrendingUp,
      title: 'Dynamic Series Selection',
      description: 'Click on any data series to show/hide. Double-click to focus and isolate specific indicators.'
    },
    {
      icon: Sparkles,
      title: 'Automatic Granularity',
      description: 'Charts automatically adjust for different data frequencies (daily, weekly, monthly, quarterly).'
    },
    {
      icon: BarChart3,
      title: 'Multi-Axis Support',
      description: 'Different data scales are handled with separate Y-axes for optimal visualization.'
    },
    {
      icon: Info,
      title: 'Interactive Tooltips',
      description: 'Rich contextual information with series metadata and trend indicators.'
    }
  ];

  const getColorClasses = (color: string, isActive: boolean) => {
    const colorMap = {
      blue: isActive 
        ? 'bg-blue-50 border-blue-200 text-blue-700' 
        : 'bg-white border-gray-200 text-gray-700 hover:border-blue-200 hover:text-blue-600',
      green: isActive 
        ? 'bg-green-50 border-green-200 text-green-700' 
        : 'bg-white border-gray-200 text-gray-700 hover:border-green-200 hover:text-green-600',
      orange: isActive 
        ? 'bg-orange-50 border-orange-200 text-orange-700' 
        : 'bg-white border-gray-200 text-gray-700 hover:border-orange-200 hover:text-orange-600',
      purple: isActive 
        ? 'bg-purple-50 border-purple-200 text-purple-700' 
        : 'bg-white border-gray-200 text-gray-700 hover:border-purple-200 hover:text-purple-600'
    };
    return colorMap[color as keyof typeof colorMap];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              {/* <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl">
                <BarChart3 className="w-8 h-8" />
              </div> */}
              {/* <h1 className="text-4xl font-bold text-gray-900">
                Interactive Economic Charts
              </h1> */}
            </div>
            {/* <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experience the next generation of economic data visualization with clickable series selection, 
              automatic granularity adjustment, and modern interactive design.
            </p> */}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Chart Type Selection */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Select Chart Type</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {chartTypes.map((chart) => {
              const Icon = chart.icon;
              const isActive = activeChart === chart.id;
              
              return (
                <button
                  key={chart.id}
                  onClick={() => setActiveChart(chart.id)}
                  className={`p-6 border rounded-xl transition-all text-left ${getColorClasses(chart.color, isActive)}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${
                      isActive 
                        ? `bg-${chart.color}-100 text-${chart.color}-600` 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">
                        {chart.name}
                      </h3>
                      <p className="text-sm opacity-75">
                        {chart.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>


        {/* Chart Display */}
        <div className="space-y-8">
          {activeChart === 'housing' && (
            <EnhancedInteractiveHousingChart
              height={700}
              selectedPeriod={selectedPeriod}
              onPeriodChange={setSelectedPeriod}
              region="United States"
            />
          )}

          {activeChart === 'labor' && (
            <EnhancedInteractiveLaborChart
              height={700}
              selectedPeriod={selectedPeriod}
              onPeriodChange={setSelectedPeriod}
              alerts={[
                { id: 1, severity: 'medium', message: 'Initial claims trending upward' },
                { id: 2, severity: 'low', message: 'Labor participation stable' }
              ]}
            />
          )}
        </div>

        {/* Technical Notes */}
        <div className="mt-12 bg-gray-100 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Technical Implementation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Data Sources</h4>
              <ul className="space-y-1">
                <li>• Federal Reserve Economic Data (FRED)</li>
                <li>• Bureau of Labor Statistics (BLS)</li>
                <li>• Department of Labor (DOL)</li>
                <li>• Automatic frequency detection</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Chart Features</h4>
              <ul className="space-y-1">
                <li>• Dynamic Y-axis scaling</li>
                <li>• Responsive design with touch support</li>
                <li>• Real-time data updates</li>
                <li>• Export capabilities (CSV, JSON, PNG)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}