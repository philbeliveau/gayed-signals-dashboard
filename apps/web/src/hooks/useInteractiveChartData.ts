'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// CRITICAL: Use shared components per source tree standards
import type { SeriesConfig, DataPoint } from '../shared/components/charts/InteractiveEconomicChart';

// FRED Series definitions with metadata
const HOUSING_SERIES_CONFIG: Omit<SeriesConfig, 'visible' | 'focused'>[] = [
  {
    id: 'case_shiller',
    name: 'Case-Shiller Index',
    dataKey: 'caseSillerIndex',
    color: '#3B82F6', // Blue
    frequency: 'monthly',
    category: 'housing',
    unit: 'Index',
    description: 'S&P/Case-Shiller U.S. National Home Price Index',
    yAxisId: 'price_index',
    strokeWidth: 2.5,
    showDots: false
  },
  {
    id: 'housing_starts',
    name: 'Housing Starts',
    dataKey: 'housingStarts',
    color: '#10B981', // Green
    frequency: 'monthly',
    category: 'housing',
    unit: 'Thousands',
    description: 'New Privately Owned Housing Units Started',
    yAxisId: 'housing_units',
    strokeWidth: 2,
    showDots: true
  },
  {
    id: 'months_supply',
    name: 'Months Supply',
    dataKey: 'monthsSupply',
    color: '#F59E0B', // Amber
    frequency: 'monthly',
    category: 'housing',
    unit: 'Months',
    description: 'Months Supply of Houses for Sale',
    yAxisId: 'months',
    strokeWidth: 2,
    strokeDashArray: '5 5'
  },
  {
    id: 'new_home_sales',
    name: 'New Home Sales',
    dataKey: 'newHomeSales',
    color: '#EF4444', // Red
    frequency: 'monthly',
    category: 'housing',
    unit: 'Thousands',
    description: 'New One Family Houses Sold',
    yAxisId: 'housing_units',
    strokeWidth: 2,
    showDots: true
  },
  {
    id: 'existing_home_sales',
    name: 'Existing Home Sales',
    dataKey: 'existingHomeSales',
    color: '#8B5CF6', // Purple
    frequency: 'monthly',
    category: 'housing',
    unit: 'Millions',
    description: 'Existing Home Sales Rate',
    yAxisId: 'housing_units',
    strokeWidth: 2
  },
  {
    id: 'housing_permits',
    name: 'Building Permits',
    dataKey: 'housingPermits',
    color: '#06B6D4', // Cyan
    frequency: 'monthly',
    category: 'housing',
    unit: 'Thousands',
    description: 'New Private Housing Units Authorized',
    yAxisId: 'housing_units',
    strokeWidth: 1.5,
    strokeDashArray: '3 3'
  },
  {
    id: 'mortgage_rates',
    name: '30-Year Mortgage Rate',
    dataKey: 'mortgageRates',
    color: '#DC2626', // Dark Red
    frequency: 'weekly',
    category: 'housing',
    unit: '%',
    description: '30-Year Fixed Rate Mortgage Average',
    yAxisId: 'percentage',
    strokeWidth: 2.5
  },
  {
    id: 'house_price_index',
    name: 'House Price Index',
    dataKey: 'housePriceIndex',
    color: '#7C3AED', // Indigo
    frequency: 'quarterly',
    category: 'housing',
    unit: 'Index',
    description: 'All-Transactions House Price Index',
    yAxisId: 'price_index',
    strokeWidth: 2,
    strokeDashArray: '8 4'
  }
];

const LABOR_SERIES_CONFIG: Omit<SeriesConfig, 'visible' | 'focused'>[] = [
  {
    id: 'unemployment_rate',
    name: 'Unemployment Rate',
    dataKey: 'unemploymentRate',
    color: '#EF4444', // Red
    frequency: 'monthly',
    category: 'labor',
    unit: '%',
    description: 'Unemployment Rate - Seasonally Adjusted',
    yAxisId: 'percentage',
    strokeWidth: 3,
    showDots: true
  },
  {
    id: 'nonfarm_payrolls',
    name: 'Nonfarm Payrolls',
    dataKey: 'nonfarmPayrolls',
    color: '#10B981', // Green
    frequency: 'monthly',
    category: 'labor',
    unit: 'Thousands',
    description: 'All Employees: Total Nonfarm Payrolls',
    yAxisId: 'employment',
    strokeWidth: 2.5,
    showDots: true
  },
  {
    id: 'initial_claims',
    name: 'Initial Claims',
    dataKey: 'initialClaims',
    color: '#F59E0B', // Amber
    frequency: 'weekly',
    category: 'labor',
    unit: 'Claims',
    description: 'Initial Claims for Unemployment Insurance',
    yAxisId: 'claims',
    strokeWidth: 2,
    showDots: false
  },
  {
    id: 'continued_claims',
    name: 'Continued Claims',
    dataKey: 'continuedClaims',
    color: '#F97316', // Orange
    frequency: 'weekly',
    category: 'labor',
    unit: 'Claims',
    description: 'Continued Claims for Unemployment Insurance',
    yAxisId: 'claims',
    strokeWidth: 2,
    strokeDashArray: '4 4'
  },
  {
    id: 'claims_4wk_avg',
    name: '4-Week Claims Average',
    dataKey: 'claims4Week',
    color: '#DC2626', // Dark Red
    frequency: 'weekly',
    category: 'labor',
    unit: 'Claims',
    description: '4-Week Moving Average of Initial Claims',
    yAxisId: 'claims',
    strokeWidth: 1.5,
    strokeDashArray: '6 2'
  },
  {
    id: 'labor_participation',
    name: 'Labor Participation',
    dataKey: 'laborParticipation',
    color: '#3B82F6', // Blue
    frequency: 'monthly',
    category: 'labor',
    unit: '%',
    description: 'Labor Force Participation Rate',
    yAxisId: 'percentage',
    strokeWidth: 2,
    showDots: true
  },
  {
    id: 'employment_population',
    name: 'Employment-Population Ratio',
    dataKey: 'employmentPopulation',
    color: '#06B6D4', // Cyan
    frequency: 'monthly',
    category: 'labor',
    unit: '%',
    description: 'Employment-Population Ratio',
    yAxisId: 'percentage',
    strokeWidth: 2
  },
  {
    id: 'unemployed',
    name: 'Unemployed Persons',
    dataKey: 'unemployed',
    color: '#8B5CF6', // Purple
    frequency: 'monthly',
    category: 'labor',
    unit: 'Thousands',
    description: 'Number of Unemployed Persons',
    yAxisId: 'employment',
    strokeWidth: 1.5,
    strokeDashArray: '5 3'
  },
  {
    id: 'job_openings',
    name: 'Job Openings',
    dataKey: 'jobOpenings',
    color: '#059669', // Emerald
    frequency: 'monthly',
    category: 'labor',
    unit: 'Thousands',
    description: 'Job Openings: Total Nonfarm',
    yAxisId: 'employment',
    strokeWidth: 2,
    showDots: true
  },
  {
    id: 'quits_rate',
    name: 'Quits Rate',
    dataKey: 'quitsRate',
    color: '#7C3AED', // Indigo
    frequency: 'monthly',
    category: 'labor',
    unit: '%',
    description: 'Quits: Total Nonfarm Rate',
    yAxisId: 'percentage',
    strokeWidth: 1.5,
    strokeDashArray: '7 3'
  }
];

interface UseInteractiveChartDataProps {
  category?: 'housing' | 'labor' | 'all';
  defaultVisibleSeries?: string[];
  autoSelectFrequency?: boolean;
  initialPeriod?: string;
}

interface ChartDataState {
  data: DataPoint[];
  seriesConfig: SeriesConfig[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  currentPeriod: string;
}

export function useInteractiveChartData({
  category = 'all',
  defaultVisibleSeries = [],
  autoSelectFrequency = true,
  initialPeriod = '12m'
}: UseInteractiveChartDataProps = {}) {
  const [state, setState] = useState<ChartDataState>({
    data: [],
    seriesConfig: [],
    loading: false,
    error: null,
    lastUpdated: null,
    currentPeriod: initialPeriod
  });

  // Create combined series configuration with stable dependencies
  const defaultVisibleSeriesString = useMemo(() => 
    defaultVisibleSeries.sort().join(','), 
    [defaultVisibleSeries]
  );

  const allSeriesConfig = useMemo(() => {
    let baseConfig: Omit<SeriesConfig, 'visible' | 'focused'>[] = [];
    
    switch (category) {
      case 'housing':
        baseConfig = HOUSING_SERIES_CONFIG;
        break;
      case 'labor':
        baseConfig = LABOR_SERIES_CONFIG;
        break;
      default:
        baseConfig = [...HOUSING_SERIES_CONFIG, ...LABOR_SERIES_CONFIG];
    }

    return baseConfig.map(config => ({
      ...config,
      visible: defaultVisibleSeries.length > 0 
        ? defaultVisibleSeries.includes(config.id)
        : autoSelectFrequency 
          ? config.frequency === 'monthly' || config.frequency === 'weekly' // Default to more frequent data
          : true,
      focused: false
    }));
  }, [category, defaultVisibleSeriesString, autoSelectFrequency]);

  // Initialize series configuration
  useEffect(() => {
    setState(prev => ({
      ...prev,
      seriesConfig: allSeriesConfig
    }));
  }, [allSeriesConfig]);

  // REMOVED: Mock data generator - real data only per coding standards
  // All data must come from Railway backend or local API (which proxies to Railway)

  // Data downsampling function to handle large datasets for chart performance
  const downsampleData = useCallback((data: DataPoint[], maxPoints: number = 500): DataPoint[] => {
    if (!data || data.length <= maxPoints) {
      return data;
    }
    
    console.log(`📉 Downsampling ${data.length} data points to ${maxPoints} for chart performance`);
    
    // Sort data by date to ensure proper sampling
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Calculate sampling interval
    const step = Math.floor(sortedData.length / maxPoints);
    const sampledData: DataPoint[] = [];
    
    // Always include the first data point
    sampledData.push(sortedData[0]);
    
    // Sample data points at regular intervals
    for (let i = step; i < sortedData.length - step; i += step) {
      sampledData.push(sortedData[i]);
    }
    
    // Always include the last data point
    if (sortedData.length > 1) {
      sampledData.push(sortedData[sortedData.length - 1]);
    }
    
    console.log(`✅ Downsampled to ${sampledData.length} data points for optimal chart rendering`);
    return sampledData;
  }, []);

  // Fetch real data from Railway backend with fallback (NO MOCK DATA)
  const fetchData = useCallback(async (periodOverride?: string) => {
    const period = periodOverride || initialPeriod;
    console.log(`🔄 Fetching REAL data for category: ${category}, period: ${period}`);
    
    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null,
      currentPeriod: period
    }));

    try {
      // CRITICAL: Use Railway backend wrapper following coding standards
      const { fetchEconomicDataWithFallback } = await import('../lib/api/fetch-economic-data');
      
      const response = await fetchEconomicDataWithFallback({
        category: category as 'labor' | 'housing',
        period,
        fast: false,
        region: category === 'housing' ? 'national' : undefined,
      });
      
      // Extract the time series data
      const realData = response.data.timeSeries || 
                      response.data.laborData || 
                      response.data.housingData || [];
      
      if (!realData || !Array.isArray(realData) || realData.length === 0) {
        throw new Error(`No data received from ${response.data.metadata.dataSource}`);
      }
      
      console.log(`✅ Successfully loaded ${realData.length} REAL data points for ${category} from ${response.data.metadata.dataSource}`);
      
      // Apply downsampling for large datasets to improve chart performance
      const processedData = downsampleData(realData);
      
      setState(prev => ({
        ...prev,
        data: processedData,
        loading: false,
        lastUpdated: new Date()
      }));
    } catch (error) {
      console.error('❌ Error fetching real data:', error);
      // CRITICAL: NO MOCK DATA FALLBACK - show error to user
      setState(prev => ({
        ...prev,
        data: [],
        loading: false,
        lastUpdated: new Date(),
        error: `Failed to fetch ${category} data: ${error instanceof Error ? error.message : 'Unknown error'}. Real data only - please check your connection and try again.`
      }));
    }
  }, [category, initialPeriod, downsampleData]);

  // Helper function to calculate period from date range - now supports extended periods
  const calculatePeriodFromDates = (startDate: string, endDate: string): string => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMonths = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const diffYears = Math.ceil(diffMonths / 12);
    
    if (diffMonths <= 3) return '3m';
    if (diffMonths <= 6) return '6m';
    if (diffMonths <= 12) return '12m';
    if (diffMonths <= 24) return '24m';
    if (diffYears <= 5) return '5y';
    if (diffYears <= 10) return '10y';
    if (diffYears <= 20) return '20y';
    if (diffYears <= 50) return '50y';
    return 'max';
  };

  // Add function to change period directly
  const changePeriod = useCallback((newPeriod: string) => {
    console.log(`🔄 Changing period to: ${newPeriod}`);
    fetchData(newPeriod);
  }, [fetchData]);

  // Load initial data only once to prevent infinite re-renders
  const initialLoadRef = useRef(false);
  
  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      fetchData();
    }
  }, []); // Empty dependency array - only run once on mount

  // Series management functions
  const toggleSeries = useCallback((seriesId: string) => {
    setState(prev => ({
      ...prev,
      seriesConfig: prev.seriesConfig.map(series =>
        series.id === seriesId
          ? { ...series, visible: !series.visible }
          : series
      )
    }));
  }, []);

  const focusSeries = useCallback((seriesId: string) => {
    setState(prev => ({
      ...prev,
      seriesConfig: prev.seriesConfig.map(series => ({
        ...series,
        focused: series.id === seriesId ? !series.focused : false
      }))
    }));
  }, []);

  const showOnlySeries = useCallback((seriesIds: string[]) => {
    setState(prev => ({
      ...prev,
      seriesConfig: prev.seriesConfig.map(series => ({
        ...series,
        visible: seriesIds.includes(series.id),
        focused: false
      }))
    }));
  }, []);

  const resetVisibility = useCallback(() => {
    setState(prev => ({
      ...prev,
      seriesConfig: prev.seriesConfig.map(series => ({
        ...series,
        visible: autoSelectFrequency 
          ? series.frequency === 'monthly' || series.frequency === 'weekly'
          : true,
        focused: false
      }))
    }));
  }, [autoSelectFrequency]);

  const filterByFrequency = useCallback((frequency: string) => {
    setState(prev => ({
      ...prev,
      seriesConfig: prev.seriesConfig.map(series => ({
        ...series,
        visible: series.frequency === frequency,
        focused: false
      }))
    }));
  }, []);

  const filterByCategory = useCallback((category: string) => {
    setState(prev => ({
      ...prev,
      seriesConfig: prev.seriesConfig.map(series => ({
        ...series,
        visible: series.category === category,
        focused: false
      }))
    }));
  }, []);

  // Computed values
  const visibleSeries = useMemo(() => 
    state.seriesConfig.filter(s => s.visible),
    [state.seriesConfig]
  );

  const focusedSeries = useMemo(() => 
    state.seriesConfig.filter(s => s.focused),
    [state.seriesConfig]
  );

  const frequencyBreakdown = useMemo(() => {
    const breakdown: { [key: string]: number } = {};
    state.seriesConfig.forEach(series => {
      breakdown[series.frequency] = (breakdown[series.frequency] || 0) + 1;
    });
    return breakdown;
  }, [state.seriesConfig]);

  return {
    // Data
    data: state.data,
    seriesConfig: state.seriesConfig,
    loading: state.loading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    currentPeriod: state.currentPeriod,

    // Computed
    visibleSeries,
    focusedSeries,
    frequencyBreakdown,

    // Actions
    fetchData,
    changePeriod,
    toggleSeries,
    focusSeries,
    showOnlySeries,
    resetVisibility,
    filterByFrequency,
    filterByCategory,

    // Utils removed - no mock data generation
  };
}

export type { ChartDataState };
export { HOUSING_SERIES_CONFIG, LABOR_SERIES_CONFIG };