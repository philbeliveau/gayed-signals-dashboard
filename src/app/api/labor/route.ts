import { NextRequest, NextResponse } from 'next/server';
import { HousingLaborProcessor, EconomicIndicator, fetchEconomicIndicators } from '../../../../lib/data/housing-labor-processor';
import { EnhancedMarketClient } from '../../../../lib/data/enhanced-market-client';

// Simple in-memory cache for labor data
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

const laborCache = new Map<string, CacheEntry>();
const CACHE_TTL = 600000; // 10 minutes cache for labor data (updates weekly)
const FAST_CACHE_TTL = 1800000; // 30 minutes for fast mode

// Cleanup old cache entries
function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of laborCache.entries()) {
    if (now > entry.timestamp + entry.ttl) {
      laborCache.delete(key);
    }
  }
}

// Get cached data or null if expired
function getCachedData(key: string): any | null {
  const entry = laborCache.get(key);
  if (!entry) return null;
  
  const now = Date.now();
  if (now > entry.timestamp + entry.ttl) {
    laborCache.delete(key);
    return null;
  }
  
  return entry.data;
}

// Set cache data
function setCachedData(key: string, data: any, ttl: number = CACHE_TTL) {
  laborCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

/**
 * GET handler for labor market data
 */
export async function GET(request: NextRequest) {
  try {
    // Clean up expired cache entries
    cleanupCache();
    
    // Parse query parameters
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || '12m';
    const fastMode = url.searchParams.get('fast') === 'true';
    
    const cacheKey = `labor_${period}_${fastMode ? 'fast' : 'full'}`;
    
    // Check cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log(`👥 Returning cached labor data (${period})`);
      return NextResponse.json({
        ...cachedData,
        cached: true,
        cacheTime: new Date().toISOString()
      });
    }
    
    console.log(`👥 Fetching labor market data (${period})...`);
    
    // Initialize housing/labor processor
    const marketClient = new EnhancedMarketClient({
      tiingoApiKey: process.env.TIINGO_API_KEY || '36181da7f5290c0544e9cc0b3b5f19249eb69a61',
      alphaVantageApiKey: process.env.ALPHA_VANTAGE_KEY || 'QM5V895I65W014U0',
      rateLimits: {
        tiingo: 500,
        alphaVantage: 12000,
        yahooFinance: 100
      }
    });
    
    const processor = new HousingLaborProcessor(marketClient);
    
    // Get labor market symbols
    const economicSymbols = processor.getEconomicSymbols();
    const laborSymbols = fastMode 
      ? [economicSymbols.labor.initialClaims, economicSymbols.labor.continuedClaims] // Fast mode: just essentials
      : Object.values(economicSymbols.labor); // Full mode: all labor indicators
    
    console.log(`📊 Fetching data for labor indicators: ${laborSymbols.join(', ')}`);
    
    // Call the Python backend FRED service for real labor market data
    let laborMarketData;
    try {
      console.log('🔄 Calling FastAPI FRED service for real labor market data...');
      
      // Call the FastAPI backend with real FRED integration
      const backendUrl = process.env.FASTAPI_BASE_URL || 'http://localhost:8000';
      console.log(`🔗 Connecting to FastAPI backend for real FRED data: ${backendUrl}`);
      
      const fredResponse = await fetch(`${backendUrl}/api/v1/economic/labor-market?period=${period}&fast=${fastMode}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        // Add timeout for the request
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      
      if (!fredResponse.ok) {
        throw new Error(`FRED service responded with status: ${fredResponse.status}`);
      }
      
      laborMarketData = await fredResponse.json();
      console.log('✅ Successfully received labor market data from FastAPI backend');
      console.log('🔍 FastAPI Response Keys:', Object.keys(laborMarketData));
      console.log('🔍 FastAPI laborData:', !!laborMarketData.laborData, 'length:', laborMarketData.laborData?.length);
    } catch (fredError) {
      console.warn('⚠️ FastAPI backend unavailable, falling back to mock data:', fredError);
      // IMPROVED FALLBACK: Generate reliable mock data for chart rendering
      const mockData = generateMockLaborData(period);
      console.log(`📊 Generated ${mockData.length} mock labor data points for charts`);
      laborMarketData = {
        timeSeries: mockData,
        time_series: mockData, // Support both naming conventions
        laborData: mockData, // Support backward compatibility
        metadata: {
          dataSource: 'mock_fallback',
          reason: `FRED API service unavailable: ${fredError instanceof Error ? fredError.message : 'FastAPI backend connection failed'}`,
          dataPoints: mockData.length,
          expectedSource: 'fred_api'
        }
      };
    }
    
    // Process the data through the labor processor
    // Handle different data structures from FRED service vs mock data
    let timeSeriesData;
    
    console.log('🔍 DEBUG: laborMarketData structure:', {
      keys: Object.keys(laborMarketData),
      hasTimeSeries: !!laborMarketData.time_series,
      hasTimeSeriesCamel: !!laborMarketData.timeSeries,
      hasLaborData: !!laborMarketData.laborData,
      isArray: Array.isArray(laborMarketData),
      timeSeriesLength: laborMarketData.time_series?.length || 0,
      laborDataLength: laborMarketData.laborData?.length || 0,
      sampleData: laborMarketData.laborData?.[0] || laborMarketData.time_series?.[0] || laborMarketData.timeSeries?.[0] || null
    });
    
    if (laborMarketData.laborData && Array.isArray(laborMarketData.laborData)) {
      // Data from FastAPI backend has laborData property (priority)
      timeSeriesData = laborMarketData.laborData;
      console.log(`✅ Using FastAPI laborData with ${timeSeriesData.length} points`);
    } else if (laborMarketData.time_series && Array.isArray(laborMarketData.time_series)) {
      // Data from FRED service has time_series property
      timeSeriesData = laborMarketData.time_series;
      console.log(`✅ Using FRED time_series data with ${timeSeriesData.length} points`);
    } else if (laborMarketData.timeSeries && Array.isArray(laborMarketData.timeSeries)) {
      // Fallback for different naming convention
      timeSeriesData = laborMarketData.timeSeries;
      console.log(`✅ Using camelCase timeSeries data with ${timeSeriesData.length} points`);
    } else if (Array.isArray(laborMarketData)) {
      // Mock data returns array directly
      timeSeriesData = laborMarketData;
      console.log(`✅ Using direct array data with ${timeSeriesData.length} points`);
    } else if (laborMarketData.timeSeries && typeof laborMarketData.timeSeries === 'object') {
      // Handle Flask service nested timeSeries object format
      console.log('🔄 Converting Flask service timeSeries object to array format...');
      timeSeriesData = transformFlaskTimeSeriesToArray(laborMarketData.timeSeries);
      console.log(`✅ Converted Flask timeSeries to ${timeSeriesData.length} data points`);
    } else {
      // If no time series data found, try to extract from other known properties
      console.warn('⚠️ No time series data found in laborMarketData:', Object.keys(laborMarketData));
      console.warn('⚠️ Full laborMarketData:', JSON.stringify(laborMarketData, null, 2));
      
      // Try to use mock data as fallback
      console.log('🔄 Generating fallback mock data...');
      timeSeriesData = generateMockLaborData(period);
    }
    
    const processedData = await processLaborData(processor, timeSeriesData);
    
    const responseData = {
      period,
      timeSeries: processedData.timeSeries,
      laborData: processedData.timeSeries, // Keep for backward compatibility
      currentMetrics: processedData.currentMetrics,
      alerts: processedData.alerts,
      historicalComparison: processedData.historicalComparison,
      correlationAnalysis: processedData.correlationAnalysis,
      metadata: {
        timestamp: new Date().toISOString(),
        dataSource: laborMarketData?.metadata?.dataSource || 'fred_api',
        indicatorCount: laborSymbols.length,
        fastMode,
        period,
        fallbackReason: laborMarketData?.metadata?.reason,
        isRealData: laborMarketData?.metadata?.dataSource === 'fred_api' || !laborMarketData?.metadata?.dataSource,
        apiEndpoint: `${process.env.FASTAPI_BASE_URL || 'http://localhost:8000'}/api/v1/economic/labor-market`
      }
    };
    
    // Cache the result
    const cacheTtl = fastMode ? FAST_CACHE_TTL : CACHE_TTL;
    setCachedData(cacheKey, responseData, cacheTtl);
    
    console.log(`✅ Successfully processed labor data with ${processedData.alerts.length} alerts`);
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('❌ Error fetching labor market data:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch labor market data',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * POST handler for historical labor data requests
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { indicator, startDate, endDate } = body;
    
    if (!indicator || !startDate || !endDate) {
      return NextResponse.json({ 
        error: 'Missing required parameters: indicator, startDate, endDate' 
      }, { status: 400 });
    }
    
    console.log(`👥 Fetching historical labor data for ${indicator} from ${startDate} to ${endDate}`);
    
    // Initialize processor
    const processor = new HousingLaborProcessor();
    const economicSymbols = processor.getEconomicSymbols();
    
    // Validate indicator
    const validIndicators = Object.values(economicSymbols.labor);
    if (!validIndicators.includes(indicator)) {
      return NextResponse.json({ 
        error: `Invalid labor indicator. Valid indicators: ${validIndicators.join(', ')}` 
      }, { status: 400 });
    }
    
    // Call Python backend FRED service for historical labor data
    let historicalData;
    let usedFallback = false;
    try {
      console.log(`🔄 Calling Python FRED service for historical ${indicator} data...`);
      const fredResponse = await fetch(`${process.env.PYTHON_BACKEND_URL || 'http://localhost:8000'}/api/economic-data/series/${indicator}?start_date=${startDate}&end_date=${endDate}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(30000)
      });
      
      if (!fredResponse.ok) {
        throw new Error(`FRED service responded with status: ${fredResponse.status}`);
      }
      
      const fredData = await fredResponse.json();
      historicalData = fredData.observations || fredData.data || [];
      console.log(`✅ Successfully received ${historicalData.length} historical data points from FRED`);
    } catch (fredError) {
      console.warn('⚠️ FRED service unavailable for historical data, falling back to mock:', fredError);
      historicalData = generateMockHistoricalData(indicator, startDate, endDate);
      usedFallback = true;
    }
    
    if (!historicalData || historicalData.length === 0) {
      return NextResponse.json({ 
        error: `No historical data available for ${indicator}`,
        indicator,
        startDate,
        endDate
      }, { status: 404 });
    }
    
    // Process through labor processor for analysis
    const statistics = processor.calculateStatistics(historicalData);
    const historicalComparison = processor.calculateHistoricalComparison(
      historicalData, 
      getBaseline2021Value(indicator),
      getPostCovidPeakValue(indicator)
    );
    
    console.log(`✅ Retrieved ${historicalData.length} historical data points for ${indicator}`);
    
    return NextResponse.json({
      indicator,
      startDate,
      endDate,
      historicalData,
      statistics,
      historicalComparison,
      metadata: {
        timestamp: new Date().toISOString(),
        dataPoints: historicalData.length,
        dataSource: usedFallback ? 'mock_fallback' : 'fred_api'
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching historical labor data:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch historical labor data',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * OPTIONS handler for CORS support
 */
export async function OPTIONS(_request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// Helper functions

function generateMockLaborData(period: string) {
  // Mock data generation - in production this would be replaced with real DOL/BLS API calls
  const weeks = period === '3m' ? 12 : period === '6m' ? 24 : period === '12m' ? 52 : 104;
  const data: any[] = [];
  
  // Starting realistic values (based on 2023-2024 trends)
  let baseInitialClaims = 220000;
  let baseContinuedClaims = 1750000;
  let baseUnemploymentRate = 3.7;
  let baseNonfarmPayrolls = 200000; // Monthly change
  let baseLaborParticipation = 63.4;
  let baseJobOpenings = 9500000;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (weeks * 7));
  
  for (let i = 0; i < weeks; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + (i * 7));
    
    // Add trends and seasonality
    const weeklyTrend = 0.0002 * i; // Gradual increase in claims
    const seasonality = Math.sin((i / 52) * 2 * Math.PI) * 0.02;
    const noise = (Math.random() - 0.5) * 0.03;
    
    // Apply variations
    baseInitialClaims *= (1 + weeklyTrend + seasonality + noise);
    baseContinuedClaims *= (1 + weeklyTrend * 1.5 + seasonality + noise);
    baseUnemploymentRate *= (1 + weeklyTrend * 0.5 + noise * 0.5);
    baseNonfarmPayrolls *= (1 + (Math.random() - 0.5) * 0.2);
    baseLaborParticipation *= (1 + (Math.random() - 0.5) * 0.001);
    baseJobOpenings *= (1 + (Math.random() - 0.5) * 0.05);
    
    // Calculate changes
    const weeklyChangeInitial = i > 0 ? ((baseInitialClaims / data[i-1]?.initialClaims) - 1) * 100 : 0;
    const weeklyChangeContinued = i > 0 ? ((baseContinuedClaims / data[i-1]?.continuedClaims) - 1) * 100 : 0;
    const monthlyChangePayrolls = i >= 4 ? ((baseNonfarmPayrolls / (data[i-4]?.nonfarmPayrolls || baseNonfarmPayrolls)) - 1) * 100 : 0;
    
    data.push({
      date: currentDate.toISOString().split('T')[0],
      initialClaims: Math.round(baseInitialClaims),
      continuedClaims: Math.round(baseContinuedClaims),
      claims4Week: Math.round((baseInitialClaims + (data[i-1]?.initialClaims || baseInitialClaims) + 
        (data[i-2]?.initialClaims || baseInitialClaims) + (data[i-3]?.initialClaims || baseInitialClaims)) / 4),
      unemploymentRate: Math.round(baseUnemploymentRate * 10) / 10,
      nonfarmPayrolls: Math.round(baseNonfarmPayrolls),
      laborParticipation: Math.round(baseLaborParticipation * 10) / 10,
      jobOpenings: Math.round(baseJobOpenings),
      weeklyChangeInitial: Math.round(weeklyChangeInitial * 10) / 10,
      weeklyChangeContinued: Math.round(weeklyChangeContinued * 10) / 10,
      monthlyChangePayrolls: Math.round(monthlyChangePayrolls * 10) / 10
    });
  }
  
  return data;
}

function generateMockHistoricalData(indicator: string, startDate: string, endDate: string): EconomicIndicator[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const data: EconomicIndicator[] = [];
  
  const baseValue = getBaseValueForIndicator(indicator);
  let currentValue = baseValue;
  
  const isWeekly = ['ICSA', 'CCSA', 'IC4WSA'].includes(indicator);
  const incrementDays = isWeekly ? 7 : 30; // Weekly or monthly data
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + incrementDays)) {
    const trend = (Math.random() - 0.5) * 0.02;
    currentValue *= (1 + trend);
    
    data.push({
      date: d.toISOString().split('T')[0],
      value: Math.round(currentValue),
      symbol: indicator,
      source: indicator.startsWith('IC') || indicator.startsWith('CC') ? 'DOL' : 'BLS',
      metadata: {
        period: isWeekly ? getWeekPeriod(d) : d.toISOString().substring(0, 7), // Week or month
        frequency: isWeekly ? 'weekly' : 'monthly',
        seasonallyAdjusted: true
      }
    });
  }
  
  return data;
}

function getBaseValueForIndicator(indicator: string): number {
  const baseValues: Record<string, number> = {
    'ICSA': 220000,      // Initial Claims
    'CCSA': 1750000,     // Continued Claims
    'IC4WSA': 220000,    // 4-week moving average
    'UNRATE': 3.7,       // Unemployment Rate
    'PAYEMS': 157000000, // Total Nonfarm Payrolls (absolute level)
    'CIVPART': 63.4,     // Labor Force Participation Rate
    'JTSJOL': 9500000,   // Job Openings
    'JTSQUL': 2500000    // Quits Level
  };
  
  return baseValues[indicator] || 100000;
}

function getBaseline2021Value(indicator: string): number {
  const baseline2021Values: Record<string, number> = {
    'ICSA': 350000,      // 2021 average
    'CCSA': 1400000,     // 2021 average
    'IC4WSA': 350000,    // 2021 average
    'UNRATE': 5.4,       // 2021 average
    'PAYEMS': 146000000, // 2021 level
    'CIVPART': 63.2,     // 2021 average
    'JTSJOL': 10000000,  // 2021 average
    'JTSQUL': 3900000    // 2021 average
  };
  
  return baseline2021Values[indicator] || getBaseValueForIndicator(indicator);
}

function getPostCovidPeakValue(indicator: string): number {
  const peakValues: Record<string, number> = {
    'ICSA': 6867000,     // March 2020 peak
    'CCSA': 2300000,     // Peak continued claims
    'IC4WSA': 5500000,   // 4-week average peak
    'UNRATE': 14.8,      // April 2020 peak
    'PAYEMS': 158000000, // Current high
    'CIVPART': 67.3,     // Historical high
    'JTSJOL': 12000000,  // 2021 peak
    'JTSQUL': 4500000    // 2021 peak
  };
  
  return peakValues[indicator] || getBaseValueForIndicator(indicator);
}

function getWeekPeriod(date: Date): string {
  const year = date.getFullYear();
  const start = new Date(year, 0, 1);
  const days = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + start.getDay() + 1) / 7);
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

/**
 * Transform Flask service timeSeries object format to array format
 * Flask returns: {ICSA: {data: [...]}, CCSA: {data: [...]}}
 * Frontend expects: [{date, initialClaims, continuedClaims, ...}, ...]
 */
function transformFlaskTimeSeriesToArray(timeSeries: any): any[] {
  try {
    // Extract all dates from all series to build complete timeline
    const allDates = new Set<string>();
    
    // Collect all dates from all indicators
    Object.values(timeSeries).forEach((indicator: any) => {
      if (indicator.data && Array.isArray(indicator.data)) {
        indicator.data.forEach((item: any) => {
          if (item.date) {
            allDates.add(item.date);
          }
        });
      }
    });
    
    // Convert to sorted array
    const sortedDates = Array.from(allDates).sort();
    
    // Build flat array with combined data for each date
    const result: any[] = [];
    
    for (const date of sortedDates) {
      const dataPoint: any = { date };
      
      // Map Flask indicator data to expected field names
      if (timeSeries.ICSA?.data) {
        const icsa = timeSeries.ICSA.data.find((item: any) => item.date === date);
        if (icsa) {
          dataPoint.initialClaims = Math.round(icsa.value);
        }
      }
      
      if (timeSeries.CCSA?.data) {
        const ccsa = timeSeries.CCSA.data.find((item: any) => item.date === date);
        if (ccsa) {
          dataPoint.continuedClaims = Math.round(ccsa.value);
        }
      }
      
      if (timeSeries.UNRATE?.data) {
        const unrate = timeSeries.UNRATE.data.find((item: any) => item.date === date);
        if (unrate) {
          dataPoint.unemploymentRate = Math.round(unrate.value * 10) / 10;
        }
      }
      
      if (timeSeries.PAYEMS?.data) {
        const payems = timeSeries.PAYEMS.data.find((item: any) => item.date === date);
        if (payems) {
          dataPoint.nonfarmPayrolls = Math.round(payems.value);
        }
      }
      
      if (timeSeries.CIVPART?.data) {
        const civpart = timeSeries.CIVPART.data.find((item: any) => item.date === date);
        if (civpart) {
          dataPoint.laborParticipation = Math.round(civpart.value * 10) / 10;
        }
      }
      
      if (timeSeries.JTSJOL?.data) {
        const jtsjol = timeSeries.JTSJOL.data.find((item: any) => item.date === date);
        if (jtsjol) {
          dataPoint.jobOpenings = Math.round(jtsjol.value);
        }
      }
      
      // Calculate derived fields
      const prevIndex = result.length - 1;
      if (prevIndex >= 0 && result[prevIndex]) {
        const prevData = result[prevIndex];
        
        // Weekly changes
        if (dataPoint.initialClaims && prevData.initialClaims) {
          dataPoint.weeklyChangeInitial = Math.round(((dataPoint.initialClaims / prevData.initialClaims) - 1) * 1000) / 10;
        }
        if (dataPoint.continuedClaims && prevData.continuedClaims) {
          dataPoint.weeklyChangeContinued = Math.round(((dataPoint.continuedClaims / prevData.continuedClaims) - 1) * 1000) / 10;
        }
      }
      
      // Calculate 4-week average for initial claims
      if (result.length >= 3 && dataPoint.initialClaims) {
        const recentClaims = [dataPoint.initialClaims];
        for (let i = Math.max(0, result.length - 3); i < result.length; i++) {
          if (result[i] && result[i].initialClaims) {
            recentClaims.push(result[i].initialClaims);
          }
        }
        dataPoint.claims4Week = Math.round(recentClaims.reduce((a, b) => a + b, 0) / recentClaims.length);
      }
      
      // Set defaults for missing fields
      dataPoint.initialClaims = dataPoint.initialClaims || 0;
      dataPoint.continuedClaims = dataPoint.continuedClaims || 0;
      dataPoint.unemploymentRate = dataPoint.unemploymentRate || 0;
      dataPoint.nonfarmPayrolls = dataPoint.nonfarmPayrolls || 0;
      dataPoint.laborParticipation = dataPoint.laborParticipation || 0;
      dataPoint.jobOpenings = dataPoint.jobOpenings || 0;
      dataPoint.claims4Week = dataPoint.claims4Week || dataPoint.initialClaims || 0;
      dataPoint.weeklyChangeInitial = dataPoint.weeklyChangeInitial || 0;
      dataPoint.weeklyChangeContinued = dataPoint.weeklyChangeContinued || 0;
      dataPoint.monthlyChangePayrolls = 0; // Not available in Flask service
      
      result.push(dataPoint);
    }
    
    console.log(`🔄 Transformed ${Object.keys(timeSeries).length} Flask indicators into ${result.length} time series points`);
    return result;
    
  } catch (error) {
    console.error('❌ Error transforming Flask timeSeries data:', error);
    return [];
  }
}

async function processLaborData(processor: HousingLaborProcessor, rawData: any[]) {
  // Handle empty or undefined data
  if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
    console.warn('⚠️ processLaborData received empty or invalid data, using defaults');
    return {
      timeSeries: [],
      currentMetrics: {
        initialClaims: 0,
        continuedClaims: 0,
        unemploymentRate: 0,
        nonfarmPayrolls: 0,
        laborParticipation: 0,
        jobOpenings: 0,
        claims4Week: 0,
        weeklyChangeInitial: 0,
        weeklyChangeContinued: 0,
        monthlyChangePayrolls: 0
      },
      alerts: [],
      historicalComparison: {
        continuedClaims: null,
        unemploymentRate: null
      },
      correlationAnalysis: {}
    };
  }
  
  // Convert raw data to EconomicIndicator format
  const economicData: Record<string, EconomicIndicator[]> = {};
  
  // For mock data, create economic indicators from the raw labor data
  rawData.forEach(dataPoint => {
    ['ICSA', 'CCSA', 'UNRATE', 'PAYEMS'].forEach(symbol => {
      if (!economicData[symbol]) {
        economicData[symbol] = [];
      }
      
      const value = symbol === 'ICSA' ? dataPoint.initialClaims :
                   symbol === 'CCSA' ? dataPoint.continuedClaims :
                   symbol === 'UNRATE' ? dataPoint.unemploymentRate :
                   dataPoint.nonfarmPayrolls;
      
      economicData[symbol].push({
        date: dataPoint.date,
        value,
        symbol,
        source: symbol === 'ICSA' || symbol === 'CCSA' ? 'DOL' : 'BLS',
        metadata: {
          period: symbol === 'ICSA' || symbol === 'CCSA' 
            ? getWeekPeriod(new Date(dataPoint.date))
            : dataPoint.date.substring(0, 7),
          frequency: symbol === 'ICSA' || symbol === 'CCSA' ? 'weekly' : 'monthly',
          seasonallyAdjusted: true
        }
      });
    });
  });
  
  // Process through labor processor
  const alerts = await processor.evaluateAlerts(economicData);
  
  // Calculate historical comparisons
  const currentData = rawData[rawData.length - 1];
  const continuedClaimsComparison = processor.calculateHistoricalComparison(
    economicData['CCSA'] || [],
    1400000, // 2021 baseline
    2300000  // Post-COVID peak
  );
  
  const unemploymentComparison = processor.calculateHistoricalComparison(
    economicData['UNRATE'] || [],
    5.4,  // 2021 baseline
    14.8  // Post-COVID peak
  );
  
  // Calculate correlation matrix
  const correlationMatrix = processor.calculateCorrelationMatrix(economicData);
  
  // Calculate current metrics
  const currentMetrics = {
    initialClaims: currentData?.initialClaims || 0,
    continuedClaims: currentData?.continuedClaims || 0,
    unemploymentRate: currentData?.unemploymentRate || 0,
    nonfarmPayrolls: currentData?.nonfarmPayrolls || 0,
    laborParticipation: currentData?.laborParticipation || 0,
    jobOpenings: currentData?.jobOpenings || 0,
    claims4Week: currentData?.claims4Week || 0,
    weeklyChangeInitial: currentData?.weeklyChangeInitial || 0,
    weeklyChangeContinued: currentData?.weeklyChangeContinued || 0,
    monthlyChangePayrolls: currentData?.monthlyChangePayrolls || 0
  };
  
  return {
    timeSeries: rawData,
    currentMetrics,
    alerts,
    historicalComparison: {
      continuedClaims: continuedClaimsComparison,
      unemploymentRate: unemploymentComparison
    },
    correlationAnalysis: correlationMatrix
  };
}