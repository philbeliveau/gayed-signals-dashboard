import { NextRequest, NextResponse } from 'next/server';
import { SignalOrchestrator } from '@/domains/trading-signals/engines/orchestrator';
import { createEnhancedMarketClient } from '@/domains/market-data/services/enhanced-market-client';

/**
 * GET /api/signals/fast
 *
 * Returns fast Gayed signals for real-time analysis
 * Includes Utilities/SPY and S&P 500 MA (most important signals)
 * Used by the backend Enhanced Financial Analyst agent for quick regime assessment
 */
export async function GET(request: NextRequest) {
  try {
    console.log('⚡ API: Fetching fast Gayed signals for real-time analysis');

    // Get market data for essential symbols only (faster execution)
    const essentialSymbols = ['SPY', 'XLU']; // Core symbols for fast signals
    console.log(`📊 Fetching fast market data for ${essentialSymbols.length} symbols`);

    // Create market client and fetch data
    const marketClient = createEnhancedMarketClient();
    const marketData = await marketClient.fetchMarketData(essentialSymbols);

    // Check if we have the minimum required data
    const missingSymbols = essentialSymbols.filter(symbol =>
      !marketData[symbol] || marketData[symbol].length < 100
    );

    if (missingSymbols.length > 0) {
      console.warn(`⚠️ Missing data for essential symbols: ${missingSymbols.join(', ')}`);
      return NextResponse.json({
        error: 'Insufficient data for fast signals',
        missing_symbols: missingSymbols,
        available_data: Object.fromEntries(
          Object.entries(marketData).map(([symbol, data]) => [symbol, data.length])
        )
      }, { status: 206 }); // Partial content
    }

    // Calculate fast signals (most important for market regime)
    const fastSignals = SignalOrchestrator.calculateFastSignals(marketData);
    console.log(`⚡ Calculated ${fastSignals.length} fast signals`);

    // Generate consensus from available fast signals
    const consensus = SignalOrchestrator.calculateConsensusSignal(fastSignals);
    console.log(`🎯 Fast consensus: ${consensus.consensus} with ${Math.round(consensus.confidence * 100)}% confidence`);

    // Prepare fast response
    const response = {
      consensus: {
        status: consensus.consensus,
        confidence: consensus.confidence,
        risk_on_count: consensus.riskOnCount,
        risk_off_count: consensus.riskOffCount,
        neutral_count: consensus.neutralCount,
        timestamp: consensus.timestamp
      },
      fast_signals: fastSignals.map(signal => ({
        type: signal.type,
        signal: signal.signal,
        value: signal.value,
        confidence: signal.confidence,
        timestamp: signal.timestamp,
        lastUpdate: signal.lastUpdate
      })),
      metadata: {
        signal_type: 'fast_signals',
        total_signals: fastSignals.length,
        symbols_used: essentialSymbols,
        data_quality: 'real_time_fast',
        execution_time: 'optimized_for_speed',
        calculation_timestamp: new Date().toISOString(),
        source: 'SignalOrchestrator.calculateFastSignals'
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error fetching fast signals:', error);

    return NextResponse.json({
      error: 'Failed to fetch fast signals',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      fallback: true
    }, { status: 500 });
  }
}