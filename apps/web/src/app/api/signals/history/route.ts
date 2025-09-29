import { NextRequest, NextResponse } from 'next/server';
import { SignalOrchestrator } from '@/domains/trading-signals/engines/orchestrator';
import { createEnhancedMarketClient } from '@/domains/market-data/services/enhanced-market-client';

/**
 * GET /api/signals/history
 *
 * Returns historical Gayed signals for trend analysis
 * Query params:
 *   - days: Number of days of history (default: 30, max: 365)
 *
 * Used by the backend Enhanced Financial Analyst agent for historical context
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = Math.min(parseInt(daysParam || '30'), 365); // Max 1 year

    console.log(`📈 API: Fetching ${days} days of Gayed signal history`);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(`📅 Date range: ${startDateStr} to ${endDateStr}`);

    // Get required symbols
    const requiredSymbols = SignalOrchestrator.getRequiredSymbols();

    // Create market client and fetch historical data
    const marketClient = createEnhancedMarketClient();

    // Fetch historical data for each symbol
    const historicalData: Record<string, any[]> = {};
    const fetchPromises = requiredSymbols.map(async (symbol) => {
      try {
        const data = await marketClient.fetchHistoricalData(symbol, startDateStr, endDateStr);
        historicalData[symbol] = data;
        console.log(`✅ Fetched ${data.length} data points for ${symbol}`);
      } catch (error) {
        console.warn(`⚠️ Failed to fetch data for ${symbol}:`, error);
        historicalData[symbol] = [];
      }
    });

    await Promise.all(fetchPromises);

    // Validate we have sufficient data
    const validSymbols = Object.keys(historicalData).filter(
      symbol => historicalData[symbol].length >= Math.min(days * 0.7, 20) // At least 70% of requested days or 20 points
    );

    if (validSymbols.length < 3) {
      return NextResponse.json({
        error: 'Insufficient historical data',
        message: `Only ${validSymbols.length} symbols have adequate data for ${days} days`,
        available_symbols: validSymbols,
        data_summary: Object.fromEntries(
          Object.entries(historicalData).map(([symbol, data]) => [symbol, data.length])
        )
      }, { status: 206 }); // Partial content
    }

    // Calculate daily signals for the historical period
    console.log(`🔄 Calculating historical signals for ${days} days`);

    // Group data by date
    const dateGroups: Record<string, Record<string, any[]>> = {};

    for (const [symbol, data] of Object.entries(historicalData)) {
      for (const dataPoint of data) {
        const date = dataPoint.date;
        if (!dateGroups[date]) {
          dateGroups[date] = {};
        }
        dateGroups[date][symbol] = [dataPoint]; // Single point for that date
      }
    }

    // Calculate signals for each date where we have sufficient data
    const historicalSignals: any[] = [];
    const sortedDates = Object.keys(dateGroups).sort();

    for (const date of sortedDates) {
      const dayData = dateGroups[date];

      // Only calculate if we have data for most required symbols
      const availableSymbols = Object.keys(dayData);
      if (availableSymbols.length >= Math.min(requiredSymbols.length * 0.7, 3)) {
        try {
          // For historical calculation, we need more data than just single day
          // This is a simplified version - in production, you'd need rolling windows
          const signals = SignalOrchestrator.calculateAllSignals({ marketData: dayData });
          const consensus = SignalOrchestrator.calculateConsensusSignal(signals);

          historicalSignals.push({
            date,
            consensus: {
              status: consensus.consensus,
              confidence: consensus.confidence,
              risk_on_count: consensus.riskOnCount,
              risk_off_count: consensus.riskOffCount,
              neutral_count: consensus.neutralCount
            },
            signals: signals.map(signal => ({
              type: signal.type,
              signal: signal.signal,
              value: signal.value,
              confidence: signal.confidence
            })),
            available_symbols: availableSymbols
          });
        } catch (error) {
          console.warn(`⚠️ Failed to calculate signals for ${date}:`, error);
        }
      }
    }

    console.log(`✅ Calculated signals for ${historicalSignals.length} days`);

    // Analyze trends
    const trendAnalysis = analyzeSignalTrends(historicalSignals);

    const response = {
      period: {
        start_date: startDateStr,
        end_date: endDateStr,
        requested_days: days,
        actual_days: historicalSignals.length
      },
      historical_signals: historicalSignals,
      trend_analysis: trendAnalysis,
      metadata: {
        total_data_points: historicalSignals.length,
        symbols_used: validSymbols,
        data_quality: validSymbols.length >= requiredSymbols.length * 0.8 ? 'good' : 'partial',
        calculation_timestamp: new Date().toISOString(),
        source: 'SignalOrchestrator_Historical'
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error fetching signal history:', error);

    return NextResponse.json({
      error: 'Failed to fetch signal history',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Analyze trends in historical signal data
 */
function analyzeSignalTrends(historicalSignals: any[]): any {
  if (historicalSignals.length === 0) {
    return {
      trend: 'insufficient_data',
      summary: 'No historical data available for trend analysis'
    };
  }

  // Count regime changes
  let regimeChanges = 0;
  let currentRegime = historicalSignals[0]?.consensus?.status;

  for (let i = 1; i < historicalSignals.length; i++) {
    const newRegime = historicalSignals[i]?.consensus?.status;
    if (newRegime !== currentRegime) {
      regimeChanges++;
      currentRegime = newRegime;
    }
  }

  // Calculate average confidence
  const confidences = historicalSignals
    .map(h => h.consensus?.confidence || 0)
    .filter(c => c > 0);

  const avgConfidence = confidences.length > 0
    ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
    : 0;

  // Count regime distribution
  const regimeCounts = historicalSignals.reduce((counts, h) => {
    const regime = h.consensus?.status || 'Unknown';
    counts[regime] = (counts[regime] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  // Determine trend
  const recentSignals = historicalSignals.slice(-7); // Last 7 days
  const recentRegimes = recentSignals.map(h => h.consensus?.status);
  const recentRiskOff = recentRegimes.filter(r => r === 'Risk-Off').length;
  const recentRiskOn = recentRegimes.filter(r => r === 'Risk-On').length;

  let trend = 'neutral';
  if (recentRiskOff > recentRiskOn * 1.5) trend = 'defensive';
  else if (recentRiskOn > recentRiskOff * 1.5) trend = 'aggressive';

  return {
    trend,
    regime_changes: regimeChanges,
    average_confidence: avgConfidence,
    regime_distribution: regimeCounts,
    recent_trend: {
      period: 'last_7_days',
      risk_off_days: recentRiskOff,
      risk_on_days: recentRiskOn,
      mixed_days: recentSignals.length - recentRiskOff - recentRiskOn
    },
    summary: `${regimeChanges} regime changes over ${historicalSignals.length} days with ${(avgConfidence * 100).toFixed(1)}% average confidence`
  };
}