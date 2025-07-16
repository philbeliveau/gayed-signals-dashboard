import { NextRequest, NextResponse } from 'next/server';
import { FREDAPIClient, createFREDClient } from '../../../../lib/data/fred-api-client';

// Simple logger for this API
const logger = {
  info: (message: string) => console.log(`ℹ️ Labor API: ${message}`),
  warn: (message: string) => console.warn(`⚠️ Labor API: ${message}`),
  error: (message: string, error?: any) => console.error(`❌ Labor API: ${message}`, error)
};

// Cache for labor data
const laborCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of laborCache.entries()) {
    if (now > entry.timestamp + entry.ttl) {
      laborCache.delete(key);
    }
  }
}

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

function setCachedData(key: string, data: any, ttl: number = CACHE_TTL) {
  laborCache.set(key, {
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
    
    const cacheKey = `labor_${period}_${fast}`;
    
    // Check cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      logger.info(`🚀 Returning cached labor data for period: ${period}`);
      return NextResponse.json({
        ...cachedData,
        cached: true,
        cacheTime: new Date().toISOString()
      });
    }
    
    logger.info(`👥 Fetching labor data for period: ${period}, fast: ${fast}`);
    
    // Initialize FRED client
    const fredClient = createFREDClient();
    
    // Labor series IDs for FRED API
    const laborSeriesIds = [
      'UNRATE',        // Unemployment Rate
      'PAYEMS',        // Nonfarm Payrolls
      'ICSA',          // Initial Claims
      'CCSA',          // Continued Claims
      'IC4WSA',        // 4-Week Claims Average
      'CIVPART',       // Labor Force Participation
      'EMRATIO',       // Employment-Population Ratio
      'UNEMPLOY',      // Unemployed Persons
      'JTSJOL',        // Job Openings
      'JTSQUR'         // Quits Rate
    ];
    
    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();
    
    if (period === 'max' || period === 'all') {
      startDate.setFullYear(1948, 0, 1); // Labor data starts in 1948
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
    const seriesToFetch = fast ? laborSeriesIds.slice(0, 5) : laborSeriesIds;
    const laborData = await fredClient.getBatchSeriesData(seriesToFetch, {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
    
    if (!laborData || Object.keys(laborData).length === 0) {
      logger.warn('No labor data received from FRED');
      return NextResponse.json({ 
        error: 'No labor data available',
        period,
        fast,
        seriesIds: seriesToFetch
      }, { status: 404 });
    }
    
    // Transform data to time series format
    const transformedData = transformLaborData(laborData);
    
    const responseData = {
      timeSeries: transformedData,
      metadata: {
        timestamp: new Date().toISOString(),
        period,
        fast,
        dataPoints: transformedData.length,
        seriesCount: fast ? 5 : 10,
        dataSource: 'FRED',
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        }
      }
    };
    
    // Cache the result
    setCachedData(cacheKey, responseData);
    
    logger.info(`✅ Successfully fetched ${transformedData.length} labor data points`);
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    logger.error('❌ Error fetching labor data:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch labor data',
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
function transformLaborData(fredData: Record<string, any[]>): any[] {
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
        case 'UNRATE':
          entry.unemploymentRate = value;
          break;
        case 'PAYEMS':
          entry.nonfarmPayrolls = value;
          break;
        case 'ICSA':
          entry.initialClaims = value;
          break;
        case 'CCSA':
          entry.continuedClaims = value;
          break;
        case 'IC4WSA':
          entry.claims4Week = value;
          break;
        case 'CIVPART':
          entry.laborParticipation = value;
          break;
        case 'EMRATIO':
          entry.employmentPopulation = value;
          break;
        case 'UNEMPLOY':
          entry.unemployed = value;
          break;
        case 'JTSJOL':
          entry.jobOpenings = value;
          break;
        case 'JTSQUR':
          entry.quitsRate = value;
          break;
      }
    });
  });
  
  // Convert to array and sort by date
  return Array.from(dateMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}