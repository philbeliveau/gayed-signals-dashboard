/**
 * Simple Backtest API Route
 * Story: 4.0j - Simple Gayed Signals Backtesting Platform
 *
 * POST /api/backtest-simple
 * Runs simple backtesting using Railway backend data
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { MarketDataFetcher } from '@/domains/backtesting/simple/data/MarketDataFetcher';
import { SimpleBacktestEngine } from '@/domains/backtesting/simple/engine/SimpleBacktestEngine';
import { SignalAdapter } from '@/domains/backtesting/simple/signals/SignalAdapter';
import { formatBacktestResult } from '@/domains/backtesting/simple/results/BacktestResults';
import type { SignalType, BacktestConfig } from '@/domains/backtesting/simple/engine/types';

interface BacktestRequest {
  signalType: SignalType;
  startDate: string;
  endDate: string;
  initialCapital?: number;
  riskOnSymbol?: string;
  riskOffSymbol?: string;
}

export async function POST(request: NextRequest) {
  try {
    // 1. AUTHENTICATE FIRST (Auth-First pattern - coding-standards.md:343-403)
    let userId: string | null = null;
    try {
      const authResult = await auth();
      userId = authResult.userId;
    } catch {
      console.log('⚠️ Clerk auth not available - using development mode');
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // 2. THEN parse request body
    const body = await request.json() as BacktestRequest;
    const { signalType, startDate, endDate, initialCapital = 10000, riskOnSymbol, riskOffSymbol } = body;

    // Validate inputs
    if (!signalType || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields: signalType, startDate, endDate' },
        { status: 400 }
      );
    }

    // Validate signal type
    const validSignalTypes: SignalType[] = [
      'utilities-spy',
      'lumber-gold',
      'treasury-curve',
      'sp500-ma',
      'vix-defensive',
    ];

    if (!validSignalTypes.includes(signalType)) {
      return NextResponse.json(
        { error: `Invalid signal type. Must be one of: ${validSignalTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    if (start >= end) {
      return NextResponse.json(
        { error: 'startDate must be before endDate' },
        { status: 400 }
      );
    }

    // Get required symbols for this signal (including custom symbols if provided)
    const requiredSymbols = SignalAdapter.getAllRequiredSymbols(signalType, riskOnSymbol, riskOffSymbol);

    console.log(`[BacktestAPI] Starting backtest for ${signalType}`);
    console.log(`[BacktestAPI] Date range: ${startDate} to ${endDate}`);
    console.log(`[BacktestAPI] Required symbols:`, requiredSymbols);

    // Fetch market data from Railway backend
    const fetcher = new MarketDataFetcher();
    const marketDataResult = await fetcher.fetchHistoricalData({
      symbols: requiredSymbols,
      startDate,
      endDate,
    });

    console.log(`[BacktestAPI] Fetched market data - Quality: ${marketDataResult.quality.score.toFixed(2)}`);
    console.log(`[BacktestAPI] Data source: ${marketDataResult.source}, Cached: ${marketDataResult.cached}`);

    // Validate data completeness
    const validation = fetcher.validateDataCompleteness(
      marketDataResult.data,
      requiredSymbols,
      30 // Minimum 30 data points
    );

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Insufficient market data',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // Create backtest configuration
    const config: BacktestConfig = {
      signalType,
      startDate,
      endDate,
      initialCapital,
      riskOnSymbol,
      riskOffSymbol,
    };

    // Run backtest
    console.log(`[BacktestAPI] Running backtest engine...`);
    const result = SimpleBacktestEngine.runBacktest(config, marketDataResult.data);

    // Add data quality from fetcher
    result.dataQuality = marketDataResult.quality;

    console.log(`[BacktestAPI] Backtest complete - Total Return: ${result.metrics.totalReturn.toFixed(2)}%`);
    console.log(`[BacktestAPI] Number of trades: ${result.metrics.numberOfTrades}`);

    // Format results
    const formattedResult = formatBacktestResult(result);

    return NextResponse.json({
      success: true,
      result: formattedResult,
    });

  } catch (error) {
    console.error('[BacktestAPI] Error running backtest:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: 'Backtest failed',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/backtest-simple',
    methods: ['POST'],
    requiredFields: ['signalType', 'startDate', 'endDate'],
    optionalFields: ['initialCapital', 'riskOnSymbol', 'riskOffSymbol'],
    signalTypes: [
      'utilities-spy',
      'lumber-gold',
      'treasury-curve',
      'sp500-ma',
      'vix-defensive',
    ],
  });
}
