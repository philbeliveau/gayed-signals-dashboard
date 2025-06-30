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
      tiingo: {
        apiKey: process.env.TIINGO_API_KEY || '36181da7f5290c0544e9cc0b3b5f19249eb69a61',
        rateLimit: 500
      },
      alphaVantage: {
        apiKey: process.env.ALPHA_VANTAGE_KEY || 'QM5V895I65W014U0',
        rateLimit: 12000
      },
      yahoo: {
        rateLimit: 100
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
      console.log('🔄 Calling Python FRED service for labor market data...');
      const fredResponse = await fetch(`${process.env.PYTHON_BACKEND_URL || 'http://localhost:8000'}/api/economic-data/labor-market?period=${period}&fast=${fastMode}`, {
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
      console.log('✅ Successfully received labor market data from FRED service');
    } catch (fredError) {
      console.warn('⚠️ FRED service unavailable, falling back to mock data:', fredError);
      // Fallback to mock data if FRED service is not available
      laborMarketData = {
        timeSeries: generateMockLaborData(period),
        metadata: {
          dataSource: 'mock_fallback',
          reason: fredError instanceof Error ? fredError.message : 'FRED service unavailable'
        }
      };
    }
    
    // Process the data through the labor processor
    const processedData = await processLaborData(processor, laborMarketData.timeSeries || laborMarketData);
    
    const responseData = {
      period,
      laborData: processedData.timeSeries,
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
        fallbackReason: laborMarketData?.metadata?.reason
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
        dataSource: historicalData === generateMockHistoricalData(indicator, startDate, endDate) ? 'mock_fallback' : 'fred_api'
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
  const data = [];
  
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