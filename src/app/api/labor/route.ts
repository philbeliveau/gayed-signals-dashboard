import { NextRequest, NextResponse } from 'next/server';
import { HousingLaborProcessor, EconomicIndicator, fetchEconomicIndicators } from '../../../../lib/data/housing-labor-processor';
import { EnhancedMarketClient } from '../../../../lib/data/enhanced-market-client';
import { RealDataFetcher } from '../../../../lib/data/real-data-fetcher';

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
    
    // REAL DATA: Fetch actual labor data from Alpha Vantage and Tiingo
    const realDataFetcher = new RealDataFetcher();
    
    // Test API connectivity first
    const apiStatus = await realDataFetcher.testAPIConnectivity();
    console.log('🔑 API Status:', apiStatus);
    
    // Fetch real labor data
    const realLaborData = await realDataFetcher.fetchRealLaborData(
      period === '3m' ? 12 : period === '6m' ? 24 : period === '12m' ? 52 : 104
    );
    
    // Process the REAL data through the labor processor
    const processedData = await processLaborData(processor, realLaborData);
    
    const responseData = {
      period,
      laborData: processedData.timeSeries,
      currentMetrics: processedData.currentMetrics,
      alerts: processedData.alerts,
      historicalComparison: processedData.historicalComparison,
      correlationAnalysis: processedData.correlationAnalysis,
      metadata: {
        timestamp: new Date().toISOString(),
        dataSource: 'alpha_vantage_tiingo_real_data', // Real APIs!
        indicatorCount: laborSymbols.length,
        fastMode,
        period,
        apiStatus
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
    
    // Real historical data from BLS/DOL API - NO MOCK DATA
    const realDataFetcher = new RealDataFetcher();
    const realLaborData = await realDataFetcher.fetchRealLaborData(52); // Get real data
    
    if (!realLaborData || realLaborData.length === 0) {
      return NextResponse.json({ 
        error: `No historical data available for ${indicator}`,
        indicator,
        startDate,
        endDate
      }, { status: 404 });
    }

    // Convert RealLaborData to EconomicIndicator format for processor
    const historicalData: EconomicIndicator[] = realLaborData.map(data => ({
      date: data.date,
      value: indicator === 'ICSA' ? data.initialClaims :
             indicator === 'CCSA' ? data.continuedClaims :
             indicator === 'UNRATE' ? data.unemploymentRate :
             indicator === 'PAYEMS' ? data.nonfarmPayrolls :
             indicator === 'CIVPART' ? data.laborParticipation :
             indicator === 'JTSJOL' ? data.jobOpenings : data.initialClaims,
      symbol: indicator,
      source: indicator.startsWith('IC') || indicator.startsWith('CC') ? 'DOL' : 'BLS',
      metadata: {
        period: indicator.startsWith('IC') || indicator.startsWith('CC') 
          ? data.date.replace(/-/g, '').substring(0, 6) + 'W' + data.date.substring(8, 10)
          : data.date.substring(0, 7),
        frequency: indicator.startsWith('IC') || indicator.startsWith('CC') ? 'weekly' : 'monthly',
        seasonallyAdjusted: true
      }
    }));
    
    // Process through labor processor for analysis
    const statistics = processor.calculateStatistics(historicalData);
    const baseline = 350000; // Default baseline for 2021
    const peak = 6867000; // Default peak for post-COVID
    const historicalComparison = processor.calculateHistoricalComparison(
      historicalData, 
      baseline,
      peak
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
        dataSource: 'mock_data' // In production: 'dol_bls_api'
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

// NO MOCK DATA - All data must be real from APIs

// NO MOCK DATA FUNCTIONS - Only real data from APIs

async function processLaborData(processor: HousingLaborProcessor, rawData: any[]) {
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
            ? dataPoint.date.replace(/-/g, '').substring(0, 8) // YYYYMMDD format for weekly
            : dataPoint.date.substring(0, 7), // YYYY-MM format for monthly
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