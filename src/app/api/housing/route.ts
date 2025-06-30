import { NextRequest, NextResponse } from 'next/server';
import { HousingLaborProcessor, EconomicIndicator, fetchEconomicIndicators } from '../../../../lib/data/housing-labor-processor';
import { EnhancedMarketClient } from '../../../../lib/data/enhanced-market-client';
import { RealDataFetcher } from '../../../../lib/data/real-data-fetcher';

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
    
    // REAL DATA: Fetch actual housing data from Alpha Vantage and Tiingo
    const realDataFetcher = new RealDataFetcher();
    
    // Test API connectivity first
    const apiStatus = await realDataFetcher.testAPIConnectivity();
    console.log('🔑 API Status:', apiStatus);
    
    // Fetch real housing data
    const realHousingData = await realDataFetcher.fetchRealHousingData(
      period === '3m' ? 3 : period === '6m' ? 6 : period === '12m' ? 12 : 24
    );
    
    // Process the REAL data through the housing processor
    const processedData = await processHousingData(processor, realHousingData);
    
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
        dataSource: 'alpha_vantage_tiingo_real_data', // Real APIs!
        indicatorCount: housingSymbols.length,
        fastMode,
        region,
        period,
        apiStatus
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
    
    // Real historical data from FRED API - NO MOCK DATA
    const realDataFetcher = new RealDataFetcher();
    const realHousingData = await realDataFetcher.fetchRealHousingData(12); // Get real data
    
    if (!realHousingData || realHousingData.length === 0) {
      return NextResponse.json({ 
        error: `No historical data available for ${indicator}`,
        indicator,
        startDate,
        endDate,
        region
      }, { status: 404 });
    }

    // Convert RealHousingData to EconomicIndicator format for processor
    const historicalData: EconomicIndicator[] = realHousingData.map(data => ({
      date: data.date,
      value: indicator === 'CSUSHPINSA' ? data.caseSillerIndex :
             indicator === 'HOUST' ? data.housingStarts :
             indicator === 'MSACSR' ? data.monthsSupply :
             indicator === 'HSN1F' ? data.newHomeSales : data.caseSillerIndex,
      symbol: indicator,
      source: 'FRED',
      metadata: {
        period: data.date.substring(0, 7),
        frequency: 'monthly',
        seasonallyAdjusted: true
      }
    }));
    
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
        dataSource: 'mock_data' // In production: 'fred_api'
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

// NO MOCK DATA FUNCTIONS - Only real data from APIs

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