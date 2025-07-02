'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Calendar, TrendingUp, TrendingDown, Filter, AlertTriangle, Activity, Download, Share2 } from 'lucide-react';
import InteractiveEconomicChart from './InteractiveEconomicChart';
import { useInteractiveChartData } from '../../hooks/useInteractiveChartData';
import { formatDate } from '../../utils/dateFormatting';

interface EnhancedInteractiveLaborChartProps {
  data?: any[];
  loading?: boolean;
  error?: string;
  height?: number;
  onPeriodChange?: (period: string) => void;
  selectedPeriod?: string;
  alerts?: any[];
}

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

const QUICK_FILTERS = [
  { 
    id: 'unemployment', 
    name: 'Unemployment Focus', 
    description: 'Key unemployment indicators',
    series: ['unemployment_rate', 'unemployed', 'initial_claims', 'continued_claims']
  },
  { 
    id: 'employment', 
    name: 'Employment Health', 
    description: 'Employment levels and participation',
    series: ['nonfarm_payrolls', 'labor_participation', 'employment_population', 'job_openings']
  },
  { 
    id: 'claims', 
    name: 'Claims Analysis', 
    description: 'Weekly unemployment claims data',
    series: ['initial_claims', 'continued_claims', 'claims_4wk_avg']
  },
  { 
    id: 'weekly', 
    name: 'Weekly Data', 
    description: 'High-frequency weekly indicators',
    series: [] // Will be set by frequency filter
  },
  { 
    id: 'stress', 
    name: 'Stress Indicators', 
    description: 'Market stress and volatility signals',
    series: ['initial_claims', 'unemployment_rate', 'quits_rate']
  }
];

const STRESS_THRESHOLDS = {
  initial_claims: 400000,    // Claims above 400K indicate stress
  unemployment_rate: 4.5,    // Unemployment above 4.5% is concerning
  continued_claims: 1800000, // Continued claims above 1.8M
  labor_participation: 63.0  // Participation below 63% is low
};

/**
 * Enhanced Interactive Labor Chart Component
 * 
 * Features:
 * - Interactive series selection with click/focus functionality
 * - Automatic granularity adjustment for weekly vs monthly data
 * - Labor market stress level calculations
 * - Quick filter presets for different analysis scenarios
 * - Real-time alerts integration
 * - Modern visual design with smooth animations
 */
export default function EnhancedInteractiveLaborChart({
  data: externalData,
  loading: externalLoading = false,
  error: externalError,
  height = 600,
  onPeriodChange,
  selectedPeriod = '12m',
  alerts = []
}: EnhancedInteractiveLaborChartProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>('employment');
  const [timeRange, setTimeRange] = useState<[string, string] | undefined>();
  const [showExportModal, setShowExportModal] = useState(false);
  const [stressLevel, setStressLevel] = useState<'low' | 'medium' | 'high'>('low');

  // Use the interactive chart data hook
  const {
    data: chartData,
    seriesConfig,
    loading: dataLoading,
    error: dataError,
    lastUpdated,
    visibleSeries,
    focusedSeries,
    toggleSeries,
    focusSeries,
    showOnlySeries,
    resetVisibility,
    filterByFrequency,
    fetchData
  } = useInteractiveChartData({
    category: 'labor',
    defaultVisibleSeries: ['unemployment_rate', 'nonfarm_payrolls', 'initial_claims', 'labor_participation'],
    autoSelectFrequency: true
  });

  // Use external data if provided, otherwise use hook data
  const finalData = externalData || chartData;
  const finalLoading = externalLoading || dataLoading;
  const finalError = externalError || dataError;

  // Handle period changes
  const handlePeriodChange = useCallback((period: string) => {
    const option = PERIOD_OPTIONS.find(p => p.value === period);
    if (option) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - (option.weeks * 7));
      
      setTimeRange([
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      ]);
      
      onPeriodChange?.(period);
    }
  }, [onPeriodChange]);

  // Initialize time range based on selected period
  useEffect(() => {
    handlePeriodChange(selectedPeriod);
  }, [selectedPeriod, handlePeriodChange]);

  // Handle quick filters
  const handleQuickFilter = useCallback((filterId: string) => {
    setSelectedFilter(filterId);
    
    const filter = QUICK_FILTERS.find(f => f.id === filterId);
    if (filter) {
      if (filterId === 'weekly') {
        filterByFrequency('weekly');
      } else {
        showOnlySeries(filter.series);
      }
    }
  }, [showOnlySeries, filterByFrequency]);

  // Calculate labor market stress level
  const calculateStressLevel = useCallback(() => {
    if (!finalData.length) return 'low';
    
    const latest = finalData[finalData.length - 1];
    let stressFactors = 0;
    
    if (latest.initialClaims > STRESS_THRESHOLDS.initial_claims) stressFactors++;
    if (latest.unemploymentRate > STRESS_THRESHOLDS.unemployment_rate) stressFactors++;
    if (latest.continuedClaims > STRESS_THRESHOLDS.continued_claims) stressFactors++;
    if (latest.laborParticipation < STRESS_THRESHOLDS.labor_participation) stressFactors++;
    if (alerts.some(a => a.severity === 'critical')) stressFactors++;
    
    if (stressFactors >= 3) return 'high';
    if (stressFactors >= 1) return 'medium';
    return 'low';
  }, [finalData, alerts]);

  // Update stress level when data changes
  useEffect(() => {
    setStressLevel(calculateStressLevel());
  }, [calculateStressLevel]);

  // Handle data refresh
  const handleRefresh = useCallback(() => {
    fetchData(timeRange?.[0], timeRange?.[1]);
  }, [fetchData, timeRange]);

  // Export functionality
  const handleExport = useCallback((format: 'csv' | 'json' | 'png') => {
    console.log(`Exporting labor data as ${format}`);
    setShowExportModal(false);
  }, []);

  // Calculate labor market summary
  const getLaborSummary = useCallback(() => {
    if (!finalData.length) return null;
    
    const latest = finalData[finalData.length - 1];
    const previous = finalData[finalData.length - 2];
    
    if (!latest || !previous) return null;
    
    const unemploymentChange = latest.unemploymentRate && previous.unemploymentRate
      ? latest.unemploymentRate - previous.unemploymentRate
      : 0;
    
    const claimsChange = latest.initialClaims && previous.initialClaims
      ? ((latest.initialClaims - previous.initialClaims) / previous.initialClaims) * 100
      : 0;
    
    return {
      currentUnemployment: latest.unemploymentRate,
      unemploymentChange,
      currentClaims: latest.initialClaims,
      claimsChange,
      currentParticipation: latest.laborParticipation,
      currentPayrolls: latest.nonfarmPayrolls
    };
  }, [finalData]);

  const summary = getLaborSummary();

  const getStressColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Labor Market Analysis
              </h2>
              <p className="text-gray-600">
                Interactive visualization of employment and unemployment indicators
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
            <Activity className="w-4 h-4" />
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

      {/* Stress Level Indicator */}
      <div className={`flex items-center justify-between p-4 border rounded-xl ${getStressColor(stressLevel)}`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            <span className="font-semibold">Labor Market Stress Level:</span>
          </div>
          <span className="font-bold text-lg capitalize">{stressLevel}</span>
        </div>
        
        {alerts.length > 0 && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">
              {alerts.length} Active Alert{alerts.length > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unemployment Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summary.currentUnemployment?.toFixed(1)}%
                </p>
              </div>
              <div className={`flex items-center gap-1 ${
                summary.unemploymentChange <= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {summary.unemploymentChange <= 0 ? (
                  <TrendingDown className="w-4 h-4" />
                ) : (
                  <TrendingUp className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {Math.abs(summary.unemploymentChange).toFixed(1)}pp
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Initial Claims</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(summary.currentClaims / 1000)?.toFixed(0)}K
                </p>
              </div>
              <div className={`flex items-center gap-1 ${
                summary.claimsChange <= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {summary.claimsChange <= 0 ? (
                  <TrendingDown className="w-4 h-4" />
                ) : (
                  <TrendingUp className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {Math.abs(summary.claimsChange).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div>
              <p className="text-sm text-gray-600">Labor Participation</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.currentParticipation?.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {summary.currentParticipation && summary.currentParticipation < 63 ? 'Below Normal' : 'Healthy'}
              </p>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div>
              <p className="text-sm text-gray-600">Nonfarm Payrolls</p>
              <p className="text-2xl font-bold text-gray-900">
                {(summary.currentPayrolls / 1000)?.toFixed(0)}K
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Total employment
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
                  selectedPeriod === period.value
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
          <span className="text-xs text-gray-500">
            • Weekly data updates on Thursdays • Monthly data on first Friday
          </span>
        </div>
        
        {lastUpdated && (
          <div className="text-sm text-gray-500">
            Last updated: {formatDate(lastUpdated.toISOString(), 'short')}
          </div>
        )}
      </div>

      {/* Interactive Chart */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <InteractiveEconomicChart
          data={finalData}
          seriesConfig={seriesConfig}
          loading={finalLoading}
          error={finalError}
          height={height}
          title="Labor Market Indicators"
          onSeriesToggle={toggleSeries}
          onSeriesFocus={focusSeries}
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
                <h3 className="text-lg font-semibold text-gray-900">Export Labor Data</h3>
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