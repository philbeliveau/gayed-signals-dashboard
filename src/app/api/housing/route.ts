import { NextRequest, NextResponse } from 'next/server';
import { FREDAPIClient, createFREDClient } from '../../../../lib/data/fred-api-client';

// Simple logger for this API
const logger = {
  info: (message: string) => console.log(`ℹ️ Housing API: ${message}`),
  warn: (message: string) => console.warn(`⚠️ Housing API: ${message}`),
  error: (message: string, error?: any) => console.error(`❌ Housing API: ${message}`, error)
};

// Cache for housing data
const housingCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of housingCache.entries()) {
    if (now > entry.timestamp + entry.ttl) {
      housingCache.delete(key);
    }
  }
}

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

function setCachedData(key: string, data: any, ttl: number = CACHE_TTL) {
  housingCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

export async function GET(request: NextRequest) {
  try {
    cleanupCache();
    
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || '12m';
    const fast = url.searchParams.get('fast') === 'true';
    
    const cacheKey = `housing_${period}_${fast}`;
    
    // Check cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      logger.info(`🚀 Returning cached housing data for period: ${period}`);
      return NextResponse.json({
        ...cachedData,
        cached: true,
        cacheTime: new Date().toISOString()
      });
    }
    
    logger.info(`🏠 Fetching housing data for period: ${period}, fast: ${fast}`);
    
    // Initialize FRED client
    const fredClient = createFREDClient();
    
    // Housing series IDs for FRED API
    const housingSeriesIds = [
      'CSUSHPINSA',    // Case-Shiller Index
      'HOUST',         // Housing Starts
      'MSACSR',        // Months Supply
      'HSN1F',         // New Home Sales
      'EXHOSLUSM495S', // Existing Home Sales
      'PERMIT',        // Building Permits
      'MORTGAGE30US',  // 30-Year Mortgage Rate
      'USSTHPI'        // All-Transactions House Price Index
    ];
    
    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();
    
    if (period === 'max' || period === 'all') {
      startDate.setFullYear(1987, 0, 1); // Case-Shiller starts in 1987
    } else if (period.endsWith('y')) {
      const years = parseInt(period) || 1;
      startDate.setFullYear(endDate.getFullYear() - years);
    } else if (period.endsWith('m')) {
      const months = parseInt(period) || 12;
      startDate.setMonth(endDate.getMonth() - months);
    } else {
      startDate.setMonth(endDate.getMonth() - 12); // Default to 12 months
    }
    
    // Fetch data from FRED
    const seriesToFetch = fast ? housingSeriesIds.slice(0, 4) : housingSeriesIds;
    const housingData = await fredClient.getBatchSeriesData(seriesToFetch, {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
    
    if (!housingData || Object.keys(housingData).length === 0) {
      logger.warn('No housing data received from FRED');
      return NextResponse.json({ 
        error: 'No housing data available',
        period,
        fast,
        seriesIds: seriesToFetch
      }, { status: 404 });
    }
    
    // Transform data to time series format
    const transformedData = transformHousingData(housingData);
    
    const responseData = {
      timeSeries: transformedData,
      metadata: {
        timestamp: new Date().toISOString(),
        period,
        fast,
        dataPoints: transformedData.length,
        seriesCount: fast ? 4 : 8,
        dataSource: 'FRED',
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        }
      }
    };
    
    // Cache the result
    setCachedData(cacheKey, responseData);
    
    logger.info(`✅ Successfully fetched ${transformedData.length} housing data points`);
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    logger.error('❌ Error fetching housing data:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch housing data',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function OPTIONS(_request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// Transform FRED data to time series format
function transformHousingData(fredData: Record<string, any[]>): any[] {
  const dateMap = new Map<string, any>();
  
  // Process each series
  Object.entries(fredData).forEach(([seriesId, dataPoints]) => {
    dataPoints.forEach((point: any) => {
      const date = point.date;
      if (!dateMap.has(date)) {
        dateMap.set(date, { date });
      }
      
      const entry = dateMap.get(date);
      const value = typeof point.value === 'number' ? point.value : parseFloat(point.value);
      
      // Map FRED series IDs to data keys
      switch (seriesId) {
        case 'CSUSHPINSA':
          entry.caseSillerIndex = value;
          break;
        case 'HOUST':
          entry.housingStarts = value;
          break;
        case 'MSACSR':
          entry.monthsSupply = value;
          break;
        case 'HSN1F':
          entry.newHomeSales = value;
          break;
        case 'EXHOSLUSM495S':
          entry.existingHomeSales = value;
          break;
        case 'PERMIT':
          entry.housingPermits = value;
          break;
        case 'MORTGAGE30US':
          entry.mortgageRates = value;
          break;
        case 'USSTHPI':
          entry.housePriceIndex = value;
          break;
      }
    });
  });
  
  // Convert to array and sort by date
  return Array.from(dateMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}