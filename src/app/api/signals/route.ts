import { NextRequest, NextResponse } from 'next/server';
import { GayedSignalCalculator } from '../../../../lib/signals/utilities-spy';
import { fetchMarketData } from '../../../../lib/yahoo-finance';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Fetching market data...');
    
    // Fetch latest market data
    const symbols = ['SPY', 'XLU'];
    const marketData = await fetchMarketData(symbols, '2y');

    // Calculate utilities signal
    const utilitiesSignal = GayedSignalCalculator.calculateUtilitiesSignal(
      marketData.XLU?.map(d => d.close) || [],
      marketData.SPY?.map(d => d.close) || []
    );

    if (!utilitiesSignal) {
      return NextResponse.json({ 
        error: 'Unable to calculate utilities signal - insufficient data' 
      }, { status: 500 });
    }

    const signals = [utilitiesSignal];
    
    // Simple consensus (expand this for all 5 signals)
    const consensus = {
      date: new Date().toISOString(),
      consensus: utilitiesSignal.signal === 'Risk-On' ? 'Risk-On' : 'Risk-Off',
      confidence: utilitiesSignal.confidence,
      riskOnCount: utilitiesSignal.signal === 'Risk-On' ? 1 : 0,
      riskOffCount: utilitiesSignal.signal === 'Risk-Off' ? 1 : 0,
      signals
    };

    return NextResponse.json({ signals, consensus });
  } catch (error) {
    console.error('Error calculating signals:', error);
    return NextResponse.json({ 
      error: 'Failed to calculate signals',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
