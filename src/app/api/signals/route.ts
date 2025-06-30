import { NextRequest, NextResponse } from 'next/server';
import { EnhancedMarketClient } from '../../../../lib/data/enhanced-market-client';
import { SignalOrchestrator } from '../../../../lib/signals';

// Simple in-memory cache for faster signal responses
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

const signalCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60000; // 1 minute cache for live signals
const FAST_CACHE_TTL = 300000; // 5 minutes for less frequent updates

// Cleanup old cache entries
function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of signalCache.entries()) {
    if (now > entry.timestamp + entry.ttl) {
      signalCache.delete(key);
    }
  }
}

// Get cached data or null if expired
function getCachedData(key: string): any | null {
  const entry = signalCache.get(key);
  if (!entry) return null;
  
  const now = Date.now();
  if (now > entry.timestamp + entry.ttl) {
    signalCache.delete(key);
    return null;
  }
  
  return entry.data;
}

// Set cache data
function setCachedData(key: string, data: any, ttl: number = CACHE_TTL) {
  signalCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

 
export async function GET(request: NextRequest) {
  try {
    // Clean up expired cache entries
    cleanupCache();
    
    // Check for fast mode parameter
    const url = new URL(request.url);
    const fastMode = url.searchParams.get('fast') === 'true';
    
    const cacheKey = fastMode ? 'fast_signals' : 'live_signals';
    
    // Check cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log(`🚀 Returning cached signals (${fastMode ? 'fast' : 'full'} mode)`);
      return NextResponse.json({
        ...cachedData,
        cached: true,
        cacheTime: new Date().toISOString()
      });
    }
    
    console.log(`🔄 Fetching ${fastMode ? 'fast' : 'live'} market data for Gayed signals...`);
    
    // Initialize enhanced market client with your API keys
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
    
    // Get symbols - fewer for fast mode
    const allSymbols = SignalOrchestrator.getRequiredSymbols();
    const symbols = fastMode ? ['SPY', 'XLU'] : allSymbols; // Fast mode: only essentials
    
    console.log(`📊 Fetching data for symbols: ${symbols.join(', ')}`);
    
    const marketData = await marketClient.fetchMarketData(symbols);
    
    // Quick validation for fast mode
    if (fastMode) {
      // Simple check - just ensure we have SPY data
      if (!marketData['SPY'] || marketData['SPY'].length === 0) {
        throw new Error('Missing essential SPY data');
      }
    } else {
      // Full validation for normal mode
      const validationResult = SignalOrchestrator.validateMarketData(marketData);
      if (!validationResult.isValid) {
        console.warn('⚠️ Market data validation warnings:', validationResult.warnings);
      }
    }

    // Calculate signals - fewer for fast mode
    console.log('🧮 Calculating Gayed signals...');
    let signals;
    
    if (fastMode) {
      // Fast mode: Calculate only essential signals
      signals = SignalOrchestrator.calculateFastSignals(marketData);
    } else {
      // Full mode: Calculate all signals
      signals = SignalOrchestrator.calculateAllSignals(marketData);
    }

    if (signals.length === 0) {
      return NextResponse.json({ 
        error: 'Unable to calculate any signals - insufficient market data',
        details: 'Please check market data availability and try again',
        fastMode
      }, { status: 500 });
    }

    // Generate consensus from available signals
    const consensus = SignalOrchestrator.calculateConsensusSignal(signals);
    
    console.log(`✅ Successfully calculated ${signals.length} signals with ${consensus.consensus} consensus (${(consensus.confidence * 100).toFixed(1)}% confidence)`);

    const responseData = { 
      signals, 
      consensus,
      metadata: {
        timestamp: new Date().toISOString(),
        symbolCount: symbols.length,
        signalCount: signals.length,
        dataSource: 'real_market_data',
        fastMode,
        processingTimeMs: Date.now()
      }
    };
    
    // Cache the result
    const cacheTtl = fastMode ? FAST_CACHE_TTL : CACHE_TTL;
    setCachedData(cacheKey, responseData, cacheTtl);
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('❌ Error calculating Gayed signals:', error);
    return NextResponse.json({ 
      error: 'Failed to calculate Gayed signals',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * POST handler for historical data requests
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, startDate, endDate, requestHistorical } = body;
    
    if (!requestHistorical) {
      return NextResponse.json({ 
        error: 'This endpoint requires requestHistorical=true' 
      }, { status: 400 });
    }
    
    if (!symbol || !startDate || !endDate) {
      return NextResponse.json({ 
        error: 'Missing required parameters: symbol, startDate, endDate' 
      }, { status: 400 });
    }
    
    console.log(`📈 Fetching historical data for ${symbol} from ${startDate} to ${endDate}`);
    
    // Initialize enhanced market client
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
    
    // Fetch historical data for the specific symbol
    const historicalData = await marketClient.fetchHistoricalData(symbol, startDate, endDate);
    
    if (!historicalData || historicalData.length === 0) {
      return NextResponse.json({ 
        error: `No historical data available for ${symbol}`,
        symbol,
        startDate,
        endDate
      }, { status: 404 });
    }
    
    console.log(`✅ Retrieved ${historicalData.length} historical data points for ${symbol}`);
    
    return NextResponse.json({
      symbol,
      startDate,
      endDate,
      historicalData,
      metadata: {
        timestamp: new Date().toISOString(),
        dataPoints: historicalData.length,
        dataSource: 'real_market_data'
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching historical data:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch historical data',
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
