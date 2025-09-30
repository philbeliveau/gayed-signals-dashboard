import { NextRequest, NextResponse } from 'next/server';
import { createEnhancedMarketClient } from '@/domains/market-data/services/enhanced-market-client';

/**
 * GET /api/market-data/current
 *
 * Returns current market data for key symbols used in signal context
 * Used by the backend SignalContextService for real market data
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API: Fetching current market data for signal context');

    // Key symbols for signal context
    const contextSymbols = ['SPY', 'XLU', 'VIX', 'GLD', 'TLT'];

    // Create market client and fetch data
    const marketClient = createEnhancedMarketClient();
    const marketData = await marketClient.fetchMarketData(contextSymbols);

    // Get latest price data for each symbol
    const currentData = [];
    for (const [symbol, data] of Object.entries(marketData)) {
      if (data && data.length > 0) {
        const latest = data[data.length - 1]; // Most recent data point
        const previous = data.length > 1 ? data[data.length - 2] : latest;

        const change = latest.close - previous.close;
        const changePercent = ((change / previous.close) * 100);

        currentData.push({
          symbol,
          price: latest.close,
          change: change,
          change_percent: changePercent,
          volume: latest.volume,
          date: latest.date,
          timestamp: new Date(latest.date + 'T16:00:00Z').toISOString() // Market close time
        });
      }
    }

    console.log(`✅ Retrieved current data for ${currentData.length} symbols`);

    const response = {
      market_data: currentData,
      metadata: {
        total_symbols: currentData.length,
        data_quality: 'real_time',
        symbols_requested: contextSymbols,
        symbols_retrieved: currentData.map(d => d.symbol),
        timestamp: new Date().toISOString(),
        source: 'enhanced_market_client'
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error fetching current market data:', error);

    return NextResponse.json({
      error: 'Failed to fetch current market data',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      market_data: [], // Empty array, no fallback data
      real_data_only: true
    }, { status: 500 });
  }
}