import { NextRequest, NextResponse } from 'next/server';

// Types matching the frontend interfaces
interface BacktraderConfig {
  startDate: string;
  endDate: string;
  initialCash: number;
  commission: number;
  symbols: string[];
  signals: string[];
  timeframe: string;
  chartStyle: string;
  showVolume: boolean;
  showSignals: boolean;
  showDrawdown: boolean;
}

interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  avgWinningTrade: number;
  avgLosingTrade: number;
  largestWin: number;
  largestLoss: number;
}

interface CorrelationData {
  signal: string;
  symbol: string;
  correlation: number;
  pValue: number;
  significance: 'High' | 'Medium' | 'Low' | 'None';
}

interface BacktraderResult {
  chartUrl: string;
  performanceMetrics: PerformanceMetrics;
  correlationMatrix: CorrelationData[];
  signalTimeline: Array<{
    date: string;
    signal: string;
    value: string;
    price: number;
    change: number;
  }>;
  warnings: string[];
  executionTime: number;
}

// REMOVED: All mock data generation functions
// This system now requires real market data only

/**
 * Call Python Backtrader service - NO FAKE DATA FALLBACK
 */
async function callBacktraderService(config: BacktraderConfig): Promise<BacktraderResult> {
  try {
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';
    const response = await fetch(`${pythonServiceUrl}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
      signal: AbortSignal.timeout(15000) // 15 second timeout
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        chartUrl: data.chart_url,
        performanceMetrics: data.performance,
        correlationMatrix: data.correlations,
        signalTimeline: data.timeline,
        warnings: data.warnings || [],
        executionTime: data.executionTime || 0
      };
    } else {
      throw new Error(`Python service responded with status ${response.status}`);
    }
  } catch (error) {
    console.error('Python Backtrader service error:', error);
    throw new Error(
      'REAL DATA SERVICE REQUIRED: Python Backtrader service is not available. ' +
      'This system requires real market data analysis. Please start the Python service: ' +
      'cd python-services/backtrader-analysis && python start_service.py'
    );
  }
}

/**
 * Validate the configuration
 */
function validateConfig(config: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!config.startDate) {
    errors.push('Start date is required');
  }
  
  if (!config.endDate) {
    errors.push('End date is required');
  }
  
  if (config.startDate && config.endDate && new Date(config.startDate) >= new Date(config.endDate)) {
    errors.push('End date must be after start date');
  }
  
  if (!config.symbols || !Array.isArray(config.symbols) || config.symbols.length === 0) {
    errors.push('At least one symbol must be selected');
  }
  
  if (!config.signals || !Array.isArray(config.signals) || config.signals.length === 0) {
    errors.push('At least one signal must be selected');
  }
  
  if (typeof config.initialCash !== 'number' || config.initialCash <= 0) {
    errors.push('Initial cash must be a positive number');
  }
  
  if (typeof config.commission !== 'number' || config.commission < 0) {
    errors.push('Commission must be a non-negative number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * POST handler for Backtrader analysis requests
 */
export async function POST(request: NextRequest) {
  try {
    const config: BacktraderConfig = await request.json();
    
    // Validate the configuration
    const validation = validateConfig(config);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: `Configuration validation failed: ${validation.errors.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Log the analysis request (in production, use proper logging)
    console.log('[BACKTRADER API] Analysis request received:', {
      symbols: config.symbols,
      signals: config.signals,
      dateRange: `${config.startDate} to ${config.endDate}`,
      initialCash: config.initialCash
    });
    
    // Call the Backtrader service
    const result = await callBacktraderService(config);
    
    // Log the successful response
    console.log('[BACKTRADER API] Analysis completed successfully:', {
      executionTime: result.executionTime,
      totalReturn: result.performanceMetrics.totalReturn,
      correlations: result.correlationMatrix.length,
      warnings: result.warnings.length
    });
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('[BACKTRADER API] Error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: 'Failed to process Backtrader analysis request'
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler for API status and capabilities
 */
export async function GET() {
  return NextResponse.json({
    status: 'active',
    service: 'Backtrader Analysis API',
    version: '1.0.0',
    capabilities: {
      supportedSymbols: ['SPY', 'XLU', 'WOOD', 'GLD', 'TLT', 'QQQ', 'IWM', 'VXX', 'DBA', 'USO'],
      supportedSignals: ['utilities_spy', 'lumber_gold', 'treasury_curve', 'sp500_ma', 'vix_defensive'],
      supportedTimeframes: ['1D', '1W', '1M'],
      supportedChartStyles: ['candlestick', 'ohlc', 'line'],
      maxAnalysisPeriod: '10 years',
      maxSymbols: 10,
      maxSignals: 5
    },
    endpoints: {
      analyze: 'POST /api/backtrader',
      status: 'GET /api/backtrader'
    },
    documentation: '/docs/backtrader-api',
    lastUpdated: new Date().toISOString()
  });
}