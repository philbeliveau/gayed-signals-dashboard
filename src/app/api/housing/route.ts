import { NextRequest, NextResponse } from 'next/server';
import { HousingLaborProcessor, EconomicIndicator, fetchEconomicIndicators } from '../../../../lib/data/housing-labor-processor';
import { EnhancedMarketClient } from '../../../../lib/data/enhanced-market-client';

// Simple in-memory cache for housing data
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

const housingCache = new Map<string, CacheEntry>();
const CACHE_TTL = 1800000; // 30 minutes cache for housing data (updates monthly)
const FAST_CACHE_TTL = 3600000; // 1 hour for fast mode

// Cleanup old cache entries
function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of housingCache.entries()) {
    if (now > entry.timestamp + entry.ttl) {
      housingCache.delete(key);
    }
  }
}

// Get cached data or null if expired
function getCachedData(key: string): any | null {
  const entry = housingCache.get(key);
  if (!entry) return null;
  
  const now = Date.now();
  if (now > entry.timestamp + entry.ttl) {
    housingCache.delete(key);
    return null;
  }
  
  return entry.data;
}

// Set cache data
function setCachedData(key: string, data: any, ttl: number = CACHE_TTL) {
  housingCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

/**
 * GET handler for housing market data
 */
export async function GET(request: NextRequest) {
  try {
    // Clean up expired cache entries
    cleanupCache();
    
    // Parse query parameters
    const url = new URL(request.url);
    const region = url.searchParams.get('region') || 'national';
    const period = url.searchParams.get('period') || '12m';
    const fastMode = url.searchParams.get('fast') === 'true';
    
    const cacheKey = `housing_${region}_${period}_${fastMode ? 'fast' : 'full'}`;
    
    // Check cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log(`🏠 Returning cached housing data for ${region} (${period})`);
      return NextResponse.json({
        ...cachedData,
        cached: true,
        cacheTime: new Date().toISOString()
      });
    }
    
    console.log(`🏠 Fetching housing market data for ${region} (${period})...`);
    
    // Initialize housing/labor processor
    const marketClient = new EnhancedMarketClient({
      tiingoApiKey: process.env.TIINGO_API_KEY,
      alphaVantageApiKey: process.env.ALPHA_VANTAGE_KEY,
      rateLimits: {
        tiingo: 500,
        alphaVantage: 12000,
        yahooFinance: 100
      }
    });
    
    const processor = new HousingLaborProcessor(marketClient);
    
    // Get housing market symbols
    const economicSymbols = processor.getEconomicSymbols();
    const housingSymbols = fastMode 
      ? [economicSymbols.housing.caseShill, economicSymbols.housing.houst] // Fast mode: just essentials
      : Object.values(economicSymbols.housing); // Full mode: all housing indicators
    
    console.log(`📊 Fetching data for housing indicators: ${housingSymbols.join(', ')}`);
    
    // Call the Python backend FRED service for real housing market data
    let housingMarketData;
    try {
      console.log('🏠 Attempting to call Python FRED service for housing market data...');
      
      // Check if FastAPI backend with real FRED data is available first
      const backendUrl = process.env.FASTAPI_BASE_URL || 'http://localhost:8000';
      const fredResponse = await fetch(`${backendUrl}/api/v1/economic/housing-market?region=${region}&period=${period}&fast=${fastMode}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        // Add timeout for the request
        signal: AbortSignal.timeout(10000) // Reduced to 10 second timeout for faster fallback
      });
      
      if (!fredResponse.ok) {
        throw new Error(`FRED service responded with status: ${fredResponse.status} ${fredResponse.statusText}`);
      }
      
      housingMarketData = await fredResponse.json();
      console.log('✅ Successfully received housing market data from FRED service');
    } catch (fredError) {
      console.warn('⚠️ FRED service unavailable, using mock data fallback:', fredError);
      
      // IMPROVED FALLBACK: Always generate mock data when FRED fails
      const mockData = generateMockHousingData(region, period);
      console.log(`📊 Generated ${mockData.length} mock housing data points for reliable chart rendering`);
      
      housingMarketData = {
        timeSeries: mockData,
        time_series: mockData, // Support both naming conventions
        housingData: mockData, // Support backward compatibility
        metadata: {
          dataSource: 'mock_fallback',
          reason: fredError instanceof Error ? fredError.message : 'FRED service unavailable',
          dataPoints: mockData.length
        }
      };
    }
    
    // Process the data through the housing processor
    // Handle different data structures from FastAPI backend vs fallback mock data
    let timeSeriesData;
    if (housingMarketData.housingData && Array.isArray(housingMarketData.housingData)) {
      // FastAPI backend returns housingData array directly
      timeSeriesData = housingMarketData.housingData;
      console.log('✅ Using FastAPI housing data:', timeSeriesData.length, 'data points');
    } else if (housingMarketData.time_series) {
      // Alternative data from FRED service has time_series property
      timeSeriesData = housingMarketData.time_series;
    } else if (housingMarketData.timeSeries && typeof housingMarketData.timeSeries === 'object' && housingMarketData.timeSeries.CSUSHPINSA) {
      // Flask service returns nested structure: timeSeries.INDICATOR.data[]
      console.log('🔄 Transforming Flask service nested data structure...');
      timeSeriesData = transformFlaskDataToTimeSeriesArray(housingMarketData.timeSeries);
      console.log(`✅ Transformed Flask data into ${timeSeriesData.length} time series points`);
    } else if (Array.isArray(housingMarketData.timeSeries)) {
      // Fallback for array format
      timeSeriesData = housingMarketData.timeSeries;
    } else if (Array.isArray(housingMarketData)) {
      // Mock data returns array directly
      timeSeriesData = housingMarketData;
    } else {
      // If no time series data found, use empty array
      console.warn('⚠️ No time series data found in housingMarketData:', Object.keys(housingMarketData));
      timeSeriesData = [];
    }
    
    // IMPROVED Data validation and completeness check
    console.log(`🔍 Validating housing data structure for ${timeSeriesData.length} data points...`);
    
    // Ensure we have an array of data
    if (!Array.isArray(timeSeriesData) || timeSeriesData.length === 0) {
      console.log('⚠️ Invalid or empty time series data, generating mock data');
      timeSeriesData = generateMockHousingData(region, period);
      
      if (housingMarketData && housingMarketData.metadata) {
        housingMarketData.metadata.dataSource = 'mock_fallback_empty';
        housingMarketData.metadata.reason = 'Empty or invalid time series data received';
      }
    } else {
      // Count data points with complete housing metrics
      const completeDataPoints = timeSeriesData.filter((point: any) => {
        // More lenient validation - at least one required field should exist
        const hasBasicData = point && 
          (point.caseSillerIndex !== undefined || 
           point.housingStarts !== undefined || 
           point.monthsSupply !== undefined);
        
        return hasBasicData && point.date;
      }).length;
      
      console.log(`📊 Found ${completeDataPoints} valid data points out of ${timeSeriesData.length} total`);
      
      // Only fallback if we have very few or no valid points
      if (completeDataPoints < 5) {
        console.log(`⚠️ Insufficient valid housing data (${completeDataPoints} < 5), using mock data for chart reliability`);
        timeSeriesData = generateMockHousingData(region, period);
        
        if (housingMarketData && housingMarketData.metadata) {
          housingMarketData.metadata.dataSource = 'mock_fallback_completeness';
          housingMarketData.metadata.reason = `Insufficient valid data points: ${completeDataPoints}/5 required`;
        }
        
        console.log(`✅ Using ${timeSeriesData.length} complete mock housing data points for reliable chart rendering`);
      } else {
        console.log(`✅ Using ${completeDataPoints} valid real housing data points`);
      }
    }
    
    const processedData = await processHousingData(processor, timeSeriesData);
    
    const responseData = {
      region,
      period,
      timeSeries: processedData.timeSeries,
      housingData: processedData.timeSeries, // Keep for backward compatibility
      currentMetrics: processedData.currentMetrics,
      alerts: processedData.alerts,
      trendAnalysis: processedData.trendAnalysis,
      statistics: processedData.statistics,
      metadata: {
        timestamp: new Date().toISOString(),
        dataSource: housingMarketData?.metadata?.dataSource || 'fred_api',
        indicatorCount: housingSymbols.length,
        fastMode,
        region,
        period,
        fallbackReason: housingMarketData?.metadata?.reason
      }
    };
    
    // Cache the result
    const cacheTtl = fastMode ? FAST_CACHE_TTL : CACHE_TTL;
    setCachedData(cacheKey, responseData, cacheTtl);
    
    console.log(`✅ Successfully processed housing data for ${region} with ${processedData.alerts.length} alerts`);
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('❌ Error fetching housing market data:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch housing market data',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * POST handler for historical housing data requests
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { indicator, startDate, endDate, region = 'national' } = body;
    
    if (!indicator || !startDate || !endDate) {
      return NextResponse.json({ 
        error: 'Missing required parameters: indicator, startDate, endDate' 
      }, { status: 400 });
    }
    
    console.log(`🏠 Fetching historical housing data for ${indicator} (${region}) from ${startDate} to ${endDate}`);
    
    // Initialize processor
    const processor = new HousingLaborProcessor();
    const economicSymbols = processor.getEconomicSymbols();
    
    // Validate indicator
    const validIndicators = Object.values(economicSymbols.housing);
    if (!validIndicators.includes(indicator)) {
      return NextResponse.json({ 
        error: `Invalid housing indicator. Valid indicators: ${validIndicators.join(', ')}` 
      }, { status: 400 });
    }
    
    // Call Python backend FRED service for historical housing data
    let historicalData;
    let usedFallback = false;
    try {
      console.log(`🔄 Calling Python FRED service for historical ${indicator} data (${region})...`);
      const fredResponse = await fetch(`${process.env.PYTHON_BACKEND_URL || 'http://localhost:8000'}/api/economic-data/series/${indicator}?start_date=${startDate}&end_date=${endDate}&region=${region}`, {
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
      console.log(`✅ Successfully received ${historicalData.length} historical housing data points from FRED`);
    } catch (fredError) {
      console.warn('⚠️ FRED service unavailable for historical housing data, falling back to mock:', fredError);
      historicalData = generateMockHistoricalData(indicator, startDate, endDate, region);
      usedFallback = true;
    }
    
    if (!historicalData || historicalData.length === 0) {
      return NextResponse.json({ 
        error: `No historical data available for ${indicator}`,
        indicator,
        startDate,
        endDate,
        region
      }, { status: 404 });
    }
    
    // Process through housing processor for trend analysis
    const trendAnalysis = processor.detectHousingTrends(historicalData);
    const statistics = processor.calculateStatistics(historicalData);
    
    console.log(`✅ Retrieved ${historicalData.length} historical data points for ${indicator}`);
    
    return NextResponse.json({
      indicator,
      region,
      startDate,
      endDate,
      historicalData,
      trendAnalysis,
      statistics,
      metadata: {
        timestamp: new Date().toISOString(),
        dataPoints: historicalData.length,
        dataSource: usedFallback ? 'mock_fallback' : 'fred_api'
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching historical housing data:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch historical housing data',
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

/**
 * Transform Flask service nested data structure to flat time series array
 */
function transformFlaskDataToTimeSeriesArray(flaskTimeSeries: any): any[] {
  // Flask returns: { CSUSHPINSA: { data: [...] }, HOUST: { data: [...] } }
  // We need: [{ date, caseSillerIndex, housingStarts, ... }, ...]
  
  const dateMap = new Map<string, any>();
  
  // Process each indicator
  Object.entries(flaskTimeSeries).forEach(([indicator, indicatorData]: [string, any]) => {
    if (indicatorData && indicatorData.data && Array.isArray(indicatorData.data)) {
      indicatorData.data.forEach((dataPoint: any) => {
        const date = dataPoint.date;
        const value = dataPoint.value;
        
        // Initialize date entry if it doesn't exist
        if (!dateMap.has(date)) {
          dateMap.set(date, { date });
        }
        
        // Map Flask indicator names to frontend field names
        const dateEntry = dateMap.get(date);
        switch (indicator) {
          case 'CSUSHPINSA':
            dateEntry.caseSillerIndex = value;
            break;
          case 'HOUST':
            dateEntry.housingStarts = Math.round(value);
            break;
          case 'MSACSR':
            dateEntry.monthsSupply = value;
            break;
          case 'HSN1F':
            dateEntry.newHomeSales = Math.round(value);
            break;
          case 'EXHOSLUSM156S':
            dateEntry.existingHomeSales = Math.round(value);
            break;
          case 'PERMIT':
            dateEntry.buildingPermits = Math.round(value);
            break;
          case 'USSTHPI':
            dateEntry.housePriceIndex = value;
            break;
          default:
            // Handle unknown indicators
            dateEntry[indicator.toLowerCase()] = value;
        }
      });
    }
  });
  
  // Convert map to array and sort by date
  const timeSeriesArray = Array.from(dateMap.values()).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Calculate derived fields
  timeSeriesArray.forEach((dataPoint, index) => {
    // Calculate price changes if Case-Shiller data exists
    if (dataPoint.caseSillerIndex !== undefined) {
      // Monthly change
      if (index > 0 && timeSeriesArray[index - 1].caseSillerIndex !== undefined) {
        const prevValue = timeSeriesArray[index - 1].caseSillerIndex;
        dataPoint.priceChangeMonthly = ((dataPoint.caseSillerIndex / prevValue - 1) * 100);
      } else {
        dataPoint.priceChangeMonthly = 0;
      }
      
      // Yearly change (if we have data from 12 months ago)
      if (index >= 12 && timeSeriesArray[index - 12].caseSillerIndex !== undefined) {
        const yearAgoValue = timeSeriesArray[index - 12].caseSillerIndex;
        dataPoint.priceChangeYearly = ((dataPoint.caseSillerIndex / yearAgoValue - 1) * 100);
      } else {
        dataPoint.priceChangeYearly = 0;
      }
    }
    
    // Set default values for missing fields to ensure chart compatibility
    dataPoint.caseSillerIndex = dataPoint.caseSillerIndex || 0;
    dataPoint.housingStarts = dataPoint.housingStarts || 0;
    dataPoint.monthsSupply = dataPoint.monthsSupply || 0;
    dataPoint.newHomeSales = dataPoint.newHomeSales || 0;
    dataPoint.priceChangeMonthly = Math.round((dataPoint.priceChangeMonthly || 0) * 10) / 10;
    dataPoint.priceChangeYearly = Math.round((dataPoint.priceChangeYearly || 0) * 10) / 10;
  });
  
  return timeSeriesArray;
}

function generateMockHousingData(region: string, period: string) {
  // IMPROVED Mock data generation for reliable chart rendering
  const months = period === '3m' ? 3 : period === '6m' ? 6 : period === '12m' ? 12 : period === '24m' ? 24 : 12;
  const data = [];
  
  const baseValues = {
    caseSiller: region === 'national' ? 311.2 : region === 'ca' ? 398.7 : region === 'ny' ? 289.4 : region === 'fl' ? 356.2 : 278.9,
    houst: 1500000,
    supply: 4.2,
    newSales: 650000
  };
  
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  
  let previousCaseSiller = baseValues.caseSiller;
  
  for (let i = 0; i < months; i++) {
    const currentDate = new Date(startDate);
    currentDate.setMonth(currentDate.getMonth() + i);
    
    const trend = -0.002 * i; // Gradual decline
    const seasonality = Math.sin((i / 12) * 2 * Math.PI) * 0.02;
    const noise = (Math.random() - 0.5) * 0.01;
    
    const currentCaseSiller = Math.round((baseValues.caseSiller * (1 + trend + seasonality + noise)) * 100) / 100;
    const monthlyChange = i > 0 ? ((currentCaseSiller / previousCaseSiller - 1) * 100) : 0;
    const yearlyChange = i >= 12 ? ((currentCaseSiller / data[i-12]?.caseSillerIndex - 1) * 100) : Math.random() * 4 - 1;
    
    data.push({
      date: currentDate.toISOString().split('T')[0],
      caseSillerIndex: currentCaseSiller,
      housingStarts: Math.round(baseValues.houst * (1 + (Math.random() - 0.5) * 0.05)),
      monthsSupply: Math.round((baseValues.supply + (Math.random() - 0.5) * 0.4) * 10) / 10,
      newHomeSales: Math.round(baseValues.newSales * (1 + (Math.random() - 0.5) * 0.08)),
      priceChangeMonthly: Math.round(monthlyChange * 10) / 10,
      priceChangeYearly: Math.round(yearlyChange * 10) / 10,
      inventoryLevel: Math.round((baseValues.supply * 100000) + (Math.random() * 50000)),
      daysOnMarket: Math.round(25 + (Math.random() * 20))
    });
    
    previousCaseSiller = currentCaseSiller;
  }
  
  console.log(`📊 Generated ${data.length} mock housing data points with complete metrics`);
  return data;
}

function generateMockHistoricalData(indicator: string, startDate: string, endDate: string, region: string): EconomicIndicator[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const data: EconomicIndicator[] = [];
  
  const baseValue = getBaseValueForIndicator(indicator, region);
  let currentValue = baseValue;
  
  for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
    const trend = (Math.random() - 0.5) * 0.02;
    currentValue *= (1 + trend);
    
    data.push({
      date: d.toISOString().split('T')[0],
      value: Math.round(currentValue * 100) / 100,
      symbol: indicator,
      source: 'FRED',
      metadata: {
        period: d.toISOString().substring(0, 7), // YYYY-MM
        frequency: 'monthly',
        seasonallyAdjusted: true
      }
    });
  }
  
  return data;
}

function getBaseValueForIndicator(indicator: string, region: string): number {
  const baseValues: Record<string, number> = {
    'CSUSHPINSA': region === 'national' ? 311.2 : region === 'ca' ? 398.7 : 278.9,
    'HOUST': 1500000,
    'MSACSR': 4.2,
    'HSN1F': 650000,
    'EXHOSLUSM156S': 400000,
    'PERMIT': 1400000,
    'USSTHPI': 100.0
  };
  
  return baseValues[indicator] || 100.0;
}

async function processHousingData(processor: HousingLaborProcessor, rawData: any[]) {
  // Convert raw data to EconomicIndicator format
  const economicData: Record<string, EconomicIndicator[]> = {};
  
  // For mock data, create economic indicators from the raw housing data
  rawData.forEach(dataPoint => {
    ['CSUSHPINSA', 'HOUST', 'MSACSR', 'HSN1F'].forEach(symbol => {
      if (!economicData[symbol]) {
        economicData[symbol] = [];
      }
      
      const value = symbol === 'CSUSHPINSA' ? dataPoint.caseSillerIndex :
                   symbol === 'HOUST' ? dataPoint.housingStarts :
                   symbol === 'MSACSR' ? dataPoint.monthsSupply :
                   dataPoint.newHomeSales;
      
      economicData[symbol].push({
        date: dataPoint.date,
        value,
        symbol,
        source: 'FRED',
        metadata: {
          period: dataPoint.date.substring(0, 7),
          frequency: 'monthly',
          seasonallyAdjusted: true
        }
      });
    });
  });
  
  // Process through housing processor
  const alerts = await processor.evaluateAlerts(economicData);
  const trendAnalysis = processor.detectHousingTrends(economicData['CSUSHPINSA'] || []);
  const statistics = economicData['CSUSHPINSA']?.length > 12 
    ? processor.calculateStatistics(economicData['CSUSHPINSA']) 
    : null;
  
  // Calculate current metrics
  const currentData = rawData[rawData.length - 1];
  const currentMetrics = {
    caseSillerIndex: currentData?.caseSillerIndex || 0,
    housingStarts: currentData?.housingStarts || 0,
    monthsSupply: currentData?.monthsSupply || 0,
    newHomeSales: currentData?.newHomeSales || 0,
    priceChangeMonthly: rawData.length >= 2 
      ? ((currentData.caseSillerIndex / rawData[rawData.length - 2].caseSillerIndex - 1) * 100)
      : 0,
    priceChangeYearly: rawData.length >= 12 
      ? ((currentData.caseSillerIndex / rawData[rawData.length - 12].caseSillerIndex - 1) * 100)
      : 0
  };
  
  return {
    timeSeries: rawData,
    currentMetrics,
    alerts,
    trendAnalysis,
    statistics
  };
}