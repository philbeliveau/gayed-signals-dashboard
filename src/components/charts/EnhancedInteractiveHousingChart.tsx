'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Home, Calendar, TrendingUp, TrendingDown, Filter, Download, Share2 } from 'lucide-react';
import InteractiveEconomicChart from './InteractiveEconomicChart';
import { useInteractiveChartData } from '../../hooks/useInteractiveChartData';
import { formatDate } from '../../utils/dateFormatting';

interface EnhancedInteractiveHousingChartProps {
  data?: any[];
  loading?: boolean;
  error?: string;
  height?: number;
  region?: string;
  onPeriodChange?: (period: string) => void;
  selectedPeriod?: string;
}

type PeriodOption = {
  value: string;
  label: string;
  description: string;
  months: number;
};

const PERIOD_OPTIONS: PeriodOption[] = [
  { value: '3m', label: '3M', description: '3 Months', months: 3 },
  { value: '6m', label: '6M', description: '6 Months', months: 6 },
  { value: '12m', label: '1Y', description: '1 Year', months: 12 },
  { value: '24m', label: '2Y', description: '2 Years', months: 24 },
  { value: '5y', label: '5Y', description: '5 Years', months: 60 },
  { value: '10y', label: '10Y', description: '10 Years', months: 120 },
  { value: '20y', label: '20Y', description: '20 Years', months: 240 },
  { value: 'max', label: 'MAX', description: 'All Available (1987+)', months: 456 }
];

const QUICK_FILTERS = [
  { 
    id: 'prices', 
    name: 'Price Trends', 
    description: 'Focus on price-related indicators',
    series: ['case_shiller', 'house_price_index', 'mortgage_rates']
  },
  { 
    id: 'supply', 
    name: 'Supply & Demand', 
    description: 'Housing supply and sales activity',
    series: ['housing_starts', 'months_supply', 'new_home_sales', 'existing_home_sales']
  },
  { 
    id: 'permits', 
    name: 'Construction Activity', 
    description: 'Building permits and housing starts',
    series: ['housing_permits', 'housing_starts']
  },
  { 
    id: 'all_monthly', 
    name: 'Monthly Data', 
    description: 'All monthly frequency indicators',
    series: [] // Will be set by frequency filter
  }
];

/**
 * Enhanced Interactive Housing Chart Component
 * 
 * Features:
 * - Interactive series selection with click/focus functionality
 * - Automatic granularity adjustment for different data frequencies
 * - Quick filter presets for common analysis scenarios
 * - Modern visual design with smooth animations
 * - Time period selection with data filtering
 * - Export and sharing capabilities
 */
export default function EnhancedInteractiveHousingChart({
  data: externalData,
  loading: externalLoading = false,
  error: externalError,
  height = 600,
  region = 'National',
  onPeriodChange,
  selectedPeriod = '12m'
}: EnhancedInteractiveHousingChartProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>('all_monthly');
  const [timeRange, setTimeRange] = useState<[string, string] | undefined>();
  const [showExportModal, setShowExportModal] = useState(false);

  // Use the interactive chart data hook
  const {
    data: chartData,
    seriesConfig,
    loading: dataLoading,
    error: dataError,
    lastUpdated,
    currentPeriod,
    visibleSeries,
    focusedSeries,
    toggleSeries,
    focusSeries,
    showOnlySeries,
    resetVisibility,
    filterByFrequency,
    fetchData,
    changePeriod
  } = useInteractiveChartData({
    category: 'housing',
    defaultVisibleSeries: ['case_shiller', 'housing_starts', 'months_supply', 'mortgage_rates'],
    autoSelectFrequency: true,
    initialPeriod: selectedPeriod
  });

  // Use external data if provided, otherwise use hook data
  const finalData = externalData || chartData;
  const finalLoading = externalLoading || dataLoading;
  const finalError = externalError || dataError;

  // Handle period changes
  const handlePeriodChange = useCallback((period: string) => {
    console.log('🏠 Housing period changed to:', period);
    changePeriod(period);
    onPeriodChange?.(period);
  }, [changePeriod, onPeriodChange]);

  // Initialize time range based on selected period
  useEffect(() => {
    const option = PERIOD_OPTIONS.find(p => p.value === selectedPeriod);
    if (option) {
      const endDate = new Date();
      const startDate = new Date();
      
      // Handle different period types (same logic as handlePeriodChange)
      if (selectedPeriod === 'max' || selectedPeriod === 'all') {
        // For max period, go back to 1987 (start of Case-Shiller data)
        startDate.setFullYear(1987, 0, 1);
      } else if (selectedPeriod.endsWith('y')) {
        // Year-based periods (5y, 10y, 20y)
        const years = parseInt(selectedPeriod) || 1;
        startDate.setFullYear(endDate.getFullYear() - years);
      } else if (selectedPeriod.endsWith('m')) {
        // Month-based periods (3m, 6m, 12m, 24m)
        const months = parseInt(selectedPeriod) || 12;
        startDate.setMonth(endDate.getMonth() - months);
      } else {
        // Legacy month-based calculation for backwards compatibility
        startDate.setMonth(endDate.getMonth() - option.months);
      }
      
      setTimeRange([
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      ]);
    }
  }, [selectedPeriod]);

  // Handle quick filters
  const handleQuickFilter = useCallback((filterId: string) => {
    setSelectedFilter(filterId);
    
    const filter = QUICK_FILTERS.find(f => f.id === filterId);
    if (filter) {
      if (filterId === 'all_monthly') {
        filterByFrequency('monthly');
      } else {
        showOnlySeries(filter.series);
      }
    }
  }, [showOnlySeries, filterByFrequency]);

  // Handle data refresh
  const handleRefresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Export functionality
  const handleExport = useCallback((format: 'csv' | 'json' | 'png') => {
    // Implementation for data export
    console.log(`Exporting data as ${format}`);
    setShowExportModal(false);
  }, []);

  // Calculate summary statistics
  const summary = useMemo(() => {
    if (!finalData.length) return null;
    
    const latest = finalData[finalData.length - 1];
    const previous = finalData[finalData.length - 2];
    
    if (!latest || !previous) return null;
    
    const priceChange = latest.caseSillerIndex && previous.caseSillerIndex
      ? ((latest.caseSillerIndex - previous.caseSillerIndex) / previous.caseSillerIndex) * 100
      : 0;
    
    const startsChange = latest.housingStarts && previous.housingStarts
      ? ((latest.housingStarts - previous.housingStarts) / previous.housingStarts) * 100
      : 0;
    
    return {
      currentPrice: latest.caseSillerIndex,
      priceChange,
      currentStarts: latest.housingStarts,
      startsChange,
      currentSupply: latest.monthsSupply,
      currentRate: latest.mortgageRates
    };
  }, [finalData]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {region} Housing Market Analysis
              </h2>
              <p className="text-gray-600">
                Interactive visualization of housing market indicators
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh Data"
          >
            <TrendingUp className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            title="Export Data"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => {/* Share functionality */}}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            title="Share Chart"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Case-Shiller Index</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summary.currentPrice?.toFixed(1)}
                </p>
              </div>
              <div className={`flex items-center gap-1 ${
                summary.priceChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {summary.priceChange >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {Math.abs(summary.priceChange).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Housing Starts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summary.currentStarts?.toFixed(0)}K
                </p>
              </div>
              <div className={`flex items-center gap-1 ${
                summary.startsChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {summary.startsChange >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {Math.abs(summary.startsChange).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div>
              <p className="text-sm text-gray-600">Months Supply</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.currentSupply?.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {summary.currentSupply && summary.currentSupply > 6 ? 'High' : 
                 summary.currentSupply && summary.currentSupply < 4 ? 'Low' : 'Balanced'}
              </p>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div>
              <p className="text-sm text-gray-600">30-Year Mortgage</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.currentRate?.toFixed(2)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Current average rate
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Controls Section */}
      <div className="flex flex-col xl:flex-row gap-4">
        
        {/* Period Selection */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Time Period:</span>
          <div className="flex bg-gray-50 border border-gray-200 rounded-lg p-1">
            {PERIOD_OPTIONS.map(period => (
              <button
                key={period.value}
                onClick={() => handlePeriodChange(period.value)}
                className={`px-3 py-1.5 text-sm rounded transition-all ${
                  currentPeriod === period.value
                    ? 'bg-white text-blue-600 shadow-sm font-medium'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title={period.description}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Quick Filters:</span>
          <div className="flex flex-wrap gap-2">
            {QUICK_FILTERS.map(filter => (
              <button
                key={filter.id}
                onClick={() => handleQuickFilter(filter.id)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                  selectedFilter === filter.id
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
                title={filter.description}
              >
                {filter.name}
              </button>
            ))}
          </div>
        </div>

        {/* Reset Button */}
        <button
          onClick={resetVisibility}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors ml-auto"
        >
          Reset View
        </button>
      </div>

      {/* Status Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 px-4 py-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>
            <strong>{visibleSeries.length}</strong> of <strong>{seriesConfig.length}</strong> series visible
          </span>
          {focusedSeries.length > 0 && (
            <span className="text-blue-600 font-medium">
              {focusedSeries.length} series focused
            </span>
          )}
        </div>
        
        {lastUpdated && (
          <div className="text-sm text-gray-500">
            Last updated: {formatDate(lastUpdated.toISOString(), 'short')}
          </div>
        )}
      </div>

      {/* Interactive Chart */}
      <div 
        className="bg-white border border-gray-200 rounded-xl" 
        style={{ 
          minHeight: '800px', 
          height: 'auto',
          overflow: 'visible'
        }}
      >
        <InteractiveEconomicChart
          data={finalData}
          seriesConfig={seriesConfig}
          loading={finalLoading}
          error={finalError || undefined}
          height={height}
          title={`${region} Housing Market Data`}
          onTimeRangeChange={setTimeRange}
          selectedTimeRange={timeRange}
          showBrush={true}
          allowMultipleYAxes={true}
        />
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Export Data</h3>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">CSV Format</div>
                  <div className="text-sm text-gray-600">Download as spreadsheet</div>
                </button>
                
                <button
                  onClick={() => handleExport('json')}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">JSON Format</div>
                  <div className="text-sm text-gray-600">Raw data structure</div>
                </button>
                
                <button
                  onClick={() => handleExport('png')}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">PNG Image</div>
                  <div className="text-sm text-gray-600">Chart screenshot</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export type { PeriodOption };