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
      tiingoApiKey: process.env.TIINGO_API_KEY || '36181da7f5290c0544e9cc0b3b5f19249eb69a61',
      alphaVantageApiKey: process.env.ALPHA_VANTAGE_KEY || 'QM5V895I65W014U0',
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
      console.log('🏠 Calling Python FRED service for housing market data...');
      const fredResponse = await fetch(`${process.env.PYTHON_BACKEND_URL || 'http://localhost:8000'}/api/v1/economic/housing/summary?region=${region}&period=${period}&fast=${fastMode}`, {
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
      
      housingMarketData = await fredResponse.json();
      console.log('✅ Successfully received housing market data from FRED service');
    } catch (fredError) {
      console.warn('⚠️ FRED service unavailable, falling back to mock data:', fredError);
      // Fallback to mock data if FRED service is not available
      housingMarketData = {
        timeSeries: generateMockHousingData(region, period),
        metadata: {
          dataSource: 'mock_fallback',
          reason: fredError instanceof Error ? fredError.message : 'FRED service unavailable'
        }
      };
    }
    
    // Process the data through the housing processor
    // Handle different data structures from FRED service vs mock data
    let timeSeriesData;
    if (housingMarketData.time_series) {
      // Data from FRED service has time_series property
      timeSeriesData = housingMarketData.time_series;
    } else if (housingMarketData.timeSeries) {
      // Fallback for different naming convention
      timeSeriesData = housingMarketData.timeSeries;
    } else if (Array.isArray(housingMarketData)) {
      // Mock data returns array directly
      timeSeriesData = housingMarketData;
    } else {
      // If no time series data found, use empty array
      console.warn('⚠️ No time series data found in housingMarketData:', Object.keys(housingMarketData));
      timeSeriesData = [];
    }
    
    const processedData = await processHousingData(processor, timeSeriesData);
    
    const responseData = {
      region,
      period,
      housingData: processedData.timeSeries,
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

function generateMockHousingData(region: string, period: string) {
  // Mock data generation - in production this would be replaced with real FRED API calls
  const months = period === '3m' ? 3 : period === '6m' ? 6 : period === '12m' ? 12 : 24;
  const data = [];
  
  const baseValues = {
    caseSiller: region === 'national' ? 311.2 : region === 'ca' ? 398.7 : 278.9,
    houst: 1500000,
    supply: 4.2,
    newSales: 650000
  };
  
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  
  for (let i = 0; i < months; i++) {
    const currentDate = new Date(startDate);
    currentDate.setMonth(currentDate.getMonth() + i);
    
    const trend = -0.002 * i; // Gradual decline
    const seasonality = Math.sin((i / 12) * 2 * Math.PI) * 0.02;
    const noise = (Math.random() - 0.5) * 0.01;
    
    data.push({
      date: currentDate.toISOString().split('T')[0],
      caseSillerIndex: Math.round((baseValues.caseSiller * (1 + trend + seasonality + noise)) * 100) / 100,
      housingStarts: Math.round(baseValues.houst * (1 + (Math.random() - 0.5) * 0.05)),
      monthsSupply: Math.round((baseValues.supply + (Math.random() - 0.5) * 0.4) * 10) / 10,
      newHomeSales: Math.round(baseValues.newSales * (1 + (Math.random() - 0.5) * 0.08))
    });
  }
  
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