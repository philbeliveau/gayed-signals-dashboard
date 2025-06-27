import { NextRequest, NextResponse } from 'next/server';
import { EnhancedMarketClient } from '../../../../lib/data/enhanced-market-client';
import { SignalOrchestrator } from '../../../../lib/signals';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    console.log('🔄 Fetching market data for all Gayed signals...');
    
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
    
    // Get all required symbols for comprehensive signal analysis
    const symbols = SignalOrchestrator.getRequiredSymbols();
    console.log(`📊 Fetching data for symbols: ${symbols.join(', ')}`);
    
    const marketData = await marketClient.fetchMarketData(symbols);
    
    // Validate market data completeness
    const validationResult = SignalOrchestrator.validateMarketData(marketData);
    if (!validationResult.isValid) {
      console.warn('⚠️ Market data validation warnings:', validationResult.warnings);
      // Continue with available data, but log warnings
    }

    // Calculate all 5 Gayed signals
    console.log('🧮 Calculating all Gayed signals...');
    const signals = SignalOrchestrator.calculateAllSignals(marketData);

    if (signals.length === 0) {
      return NextResponse.json({ 
        error: 'Unable to calculate any signals - insufficient market data',
        details: 'Please check market data availability and try again'
      }, { status: 500 });
    }

    // Generate comprehensive consensus from all available signals
    const consensus = SignalOrchestrator.calculateConsensusSignal(signals);
    
    console.log(`✅ Successfully calculated ${signals.length} signals with ${consensus.consensus} consensus (${(consensus.confidence * 100).toFixed(1)}% confidence)`);

    return NextResponse.json({ 
      signals, 
      consensus,
      metadata: {
        timestamp: new Date().toISOString(),
        symbolCount: symbols.length,
        signalCount: signals.length,
        dataValidation: validationResult,
        dataSource: 'real_market_data'
      }
    });
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
 * OPTIONS handler for CORS support
 */
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
