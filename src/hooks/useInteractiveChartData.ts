'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { SeriesConfig, DataPoint } from '../components/charts/InteractiveEconomicChart';

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
}

interface ChartDataState {
  data: DataPoint[];
  seriesConfig: SeriesConfig[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export function useInteractiveChartData({
  category = 'all',
  defaultVisibleSeries = [],
  autoSelectFrequency = true
}: UseInteractiveChartDataProps = {}) {
  const [state, setState] = useState<ChartDataState>({
    data: [],
    seriesConfig: [],
    loading: false,
    error: null,
    lastUpdated: null
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

  // Mock data generator for development/testing - moved outside to prevent re-creation
  const generateMockData = useCallback((days: number = 365): DataPoint[] => {
    const data: DataPoint[] = [];
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0); // Normalize to prevent time-based re-renders
    const startDate = new Date(baseDate);
    startDate.setDate(startDate.getDate() - days);

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const point: DataPoint = {
        date: date.toISOString().split('T')[0],
      };

      // Generate deterministic mock data to prevent random re-renders
      const seed = i * 12345; // Fixed seed for consistent data
      const random = (Math.sin(seed) + 1) / 2; // Deterministic "random" value

      // Generate mock housing data
      point.caseSillerIndex = 280 + Math.sin(i / 30) * 20 + (random - 0.5) * 10;
      point.housingStarts = 1200 + Math.sin(i / 45) * 200 + (random - 0.5) * 100;
      point.monthsSupply = 4.5 + Math.sin(i / 60) * 1.5 + (random - 0.5) * 0.5;
      point.newHomeSales = 600 + Math.sin(i / 35) * 100 + (random - 0.5) * 50;
      point.existingHomeSales = 5.2 + Math.sin(i / 40) * 0.8 + (random - 0.5) * 0.3;
      point.housingPermits = 1300 + Math.sin(i / 50) * 150 + (random - 0.5) * 75;
      point.mortgageRates = 6.5 + Math.sin(i / 90) * 1.0 + (random - 0.5) * 0.3;
      point.housePriceIndex = 320 + Math.sin(i / 120) * 30 + (random - 0.5) * 15;

      // Generate mock labor data
      point.unemploymentRate = 3.8 + Math.sin(i / 180) * 1.2 + (random - 0.5) * 0.3;
      point.nonfarmPayrolls = 155000 + Math.sin(i / 60) * 5000 + (random - 0.5) * 2000;
      point.initialClaims = 220000 + Math.sin(i / 14) * 50000 + (random - 0.5) * 20000;
      point.continuedClaims = 1700000 + Math.sin(i / 21) * 300000 + (random - 0.5) * 100000;
      point.claims4Week = 225000 + Math.sin(i / 28) * 40000 + (random - 0.5) * 15000;
      point.laborParticipation = 63.2 + Math.sin(i / 365) * 1.0 + (random - 0.5) * 0.2;
      point.employmentPopulation = 60.1 + Math.sin(i / 365) * 1.5 + (random - 0.5) * 0.3;
      point.unemployed = 6200 + Math.sin(i / 180) * 800 + (random - 0.5) * 300;
      point.jobOpenings = 10500 + Math.sin(i / 90) * 1500 + (random - 0.5) * 500;
      point.quitsRate = 2.3 + Math.sin(i / 120) * 0.5 + (random - 0.5) * 0.2;

      data.push(point);
    }

    return data;
  }, []); // Empty dependency array - function is now deterministic

  // Fetch real data from API with stable dependencies
  const fetchData = useCallback(async (startDate?: string, endDate?: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      console.log(`🔄 Fetching REAL data for category: ${category}`);
      
      // Calculate period based on date range or default to 12m
      const period = startDate && endDate 
        ? calculatePeriodFromDates(startDate, endDate)
        : '12m';
      
      // Call REAL API endpoints based on category
      let apiData;
      if (category === 'housing') {
        console.log('🏠 Calling real HOUSING API with FRED data...');
        const housingResponse = await fetch(`/api/housing?period=${period}&fast=false`);
        if (!housingResponse.ok) {
          throw new Error(`Housing API failed: ${housingResponse.status}`);
        }
        apiData = await housingResponse.json();
        console.log('✅ Received real housing data:', apiData.timeSeries?.length, 'points');
      } else if (category === 'labor') {
        console.log('👥 Calling real LABOR API with FRED data...');
        const laborResponse = await fetch(`/api/labor?period=${period}&fast=false`);
        if (!laborResponse.ok) {
          throw new Error(`Labor API failed: ${laborResponse.status}`);
        }
        apiData = await laborResponse.json();
        console.log('✅ Received real labor data:', apiData.timeSeries?.length, 'points');
      } else {
        // Fallback for other categories
        console.log('📊 Using mock data for category:', category);
        const mockData = generateMockData(365);
        apiData = { timeSeries: mockData };
      }
      
      // Extract the time series data
      const realData = apiData.timeSeries || apiData.laborData || apiData.housingData || [];
      
      if (!realData || !Array.isArray(realData) || realData.length === 0) {
        console.warn('⚠️ No real data received, using fallback mock data');
        const mockData = generateMockData(365);
        setState(prev => ({
          ...prev,
          data: mockData,
          loading: false,
          lastUpdated: new Date()
        }));
        return;
      }
      
      console.log(`✅ Successfully loaded ${realData.length} REAL data points for ${category}`);
      
      setState(prev => ({
        ...prev,
        data: realData,
        loading: false,
        lastUpdated: new Date()
      }));
    } catch (error) {
      console.error('❌ Error fetching real data, falling back to mock:', error);
      // Fallback to mock data if API fails
      const mockData = generateMockData(365);
      setState(prev => ({
        ...prev,
        data: mockData,
        loading: false,
        lastUpdated: new Date(),
        error: `API Error: ${error instanceof Error ? error.message : 'Unknown error'} - Using mock data fallback`
      }));
    }
  }, [category, generateMockData]);

  // Helper function to calculate period from date range
  const calculatePeriodFromDates = (startDate: string, endDate: string): string => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMonths = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    if (diffMonths <= 3) return '3m';
    if (diffMonths <= 6) return '6m';
    if (diffMonths <= 12) return '12m';
    if (diffMonths <= 24) return '24m';
    return '60m';
  };

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

    // Computed
    visibleSeries,
    focusedSeries,
    frequencyBreakdown,

    // Actions
    fetchData,
    toggleSeries,
    focusSeries,
    showOnlySeries,
    resetVisibility,
    filterByFrequency,
    filterByCategory,

    // Utils
    generateMockData
  };
}

export type { ChartDataState };
export { HOUSING_SERIES_CONFIG, LABOR_SERIES_CONFIG };