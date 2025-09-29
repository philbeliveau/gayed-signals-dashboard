import { NextRequest, NextResponse } from 'next/server';
import { SignalOrchestrator } from '@/domains/trading-signals/engines/orchestrator';
import { createEnhancedMarketClient } from '@/domains/market-data/services/enhanced-market-client';

/**
 * GET /api/signals/current
 *
 * Returns current Gayed signals with consensus calculation
 * Used by the backend Enhanced Financial Analyst agent
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API: Fetching current Gayed signals for Enhanced Financial Analyst');

    // Get required symbols for all signals
    const requiredSymbols = SignalOrchestrator.getRequiredSymbols();
    console.log(`📊 Fetching market data for ${requiredSymbols.length} symbols`);

    // Create market client and fetch data
    const marketClient = createEnhancedMarketClient();
    const marketData = await marketClient.fetchMarketData(requiredSymbols);

    // Validate data completeness
    const validation = marketClient.constructor.validateGayedSignalsData(marketData);
    if (!validation.isValid) {
      console.warn('⚠️ Market data validation warnings:', validation.warnings);
      return NextResponse.json({
        error: 'Incomplete market data',
        warnings: validation.warnings,
        availableSymbols: Object.keys(marketData).filter(symbol => marketData[symbol].length > 0)
      }, { status: 206 }); // Partial content
    }

    // Calculate all available signals
    const signals = SignalOrchestrator.calculateAllSignals({ marketData });
    console.log(`✅ Calculated ${signals.length} individual signals`);

    // Generate consensus
    const consensus = SignalOrchestrator.calculateConsensusSignal(signals);
    console.log(`🎯 Consensus: ${consensus.consensus} with ${consensus.confidence:.1%} confidence`);

    // Prepare response for Enhanced Financial Analyst
    const response = {
      consensus: {
        status: consensus.consensus,
        confidence: consensus.confidence,
        risk_on_count: consensus.riskOnCount,
        risk_off_count: consensus.riskOffCount,
        neutral_count: consensus.neutralCount,
        timestamp: consensus.timestamp
      },
      signals: signals.map(signal => ({
        type: signal.type,
        signal: signal.signal,
        value: signal.value,
        confidence: signal.confidence,
        timestamp: signal.timestamp,
        lastUpdate: signal.lastUpdate
      })),
      metadata: {
        total_signals: signals.length,
        data_quality: 'real_time',
        market_data_symbols: Object.keys(marketData),
        data_points_per_symbol: Object.fromEntries(
          Object.entries(marketData).map(([symbol, data]) => [symbol, data.length])
        ),
        calculation_timestamp: new Date().toISOString(),
        source: 'SignalOrchestrator'
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error fetching current signals:', error);

    return NextResponse.json({
      error: 'Failed to fetch current signals',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      fallback: true
    }, { status: 500 });
  }
}