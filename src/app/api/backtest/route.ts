import { NextRequest, NextResponse } from 'next/server';
import { BacktestOrchestrator } from '../../../../lib/backtesting/orchestrator';
import { 
  BacktestConfig, 
  StrategyDefinition,
  MarketData,
  BacktestEngineType 
} from '../../../../lib/types';

/**
 * Backtesting API Endpoint
 * 
 * Provides RESTful access to the comprehensive backtesting system.
 * 
 * IMPORTANT EDUCATIONAL NOTICE:
 * This backtesting system is designed for educational and research purposes only.
 * Past performance does not guarantee future results. Use at your own risk.
 */

/**
 * POST /api/backtest
 * 
 * Run a comprehensive backtest with multiple methodologies
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const { strategy, marketData, config } = body;
    
    if (!strategy || !marketData || !config) {
      return NextResponse.json(
        { 
          error: 'Missing required fields: strategy, marketData, and config are required',
          requiredFields: ['strategy', 'marketData', 'config']
        },
        { status: 400 }
      );
    }

    // Validate strategy definition
    const validatedStrategy = validateStrategyDefinition(strategy);
    if (!validatedStrategy.valid) {
      return NextResponse.json(
        { 
          error: 'Invalid strategy definition',
          details: validatedStrategy.errors
        },
        { status: 400 }
      );
    }

    // Validate and set default config
    const backtestConfig = validateAndSetDefaults(config);
    
    // Add educational warnings to response headers
    const educationalWarnings = [
      'This backtesting system is for educational purposes only',
      'Past performance does not guarantee future results',
      'Backtesting has inherent limitations and biases',
      'Real trading involves additional risks not captured in backtests'
    ];

    // Initialize the backtesting orchestrator
    const orchestrator = new BacktestOrchestrator();
    
    // Run the comprehensive backtest
    console.log('🚀 Starting comprehensive backtest via API...');
    const result = await orchestrator.runComprehensiveBacktest(
      strategy as StrategyDefinition,
      marketData as Record<string, MarketData[]>,
      backtestConfig
    );

    // Add educational warnings to the result
    const responseData = {
      ...result,
      educationalWarnings,
      disclaimer: {
        notice: 'EDUCATIONAL USE ONLY',
        warnings: educationalWarnings,
        riskNotice: 'Trading involves substantial risk of loss. This analysis is not investment advice.',
        timestamp: new Date().toISOString()
      }
    };

    console.log('✅ Backtest completed successfully via API');
    
    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        'X-Educational-Warning': 'This backtesting system is for educational purposes only',
        'X-Risk-Notice': 'Past performance does not guarantee future results',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error('❌ Backtesting API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: 'Backtesting failed',
        message: errorMessage,
        timestamp: new Date().toISOString(),
        educationalNotice: 'This is an educational backtesting system. Results should not be used for actual trading decisions.'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/backtest
 * 
 * Get information about the backtesting system
 */
export async function GET() {
  const systemInfo = {
    name: 'Gayed Signals Backtesting System',
    version: '1.0.0',
    description: 'Comprehensive backtesting framework for educational and research purposes',
    
    engines: [
      'walk_forward',
      'monte_carlo', 
      'cross_validation',
      'bootstrap',
      'synthetic_data'
    ],
    
    features: [
      'Multiple backtesting methodologies',
      'SAFLA safety validation',
      'Comprehensive risk analysis',
      'Statistical significance testing',
      'Performance attribution',
      'Educational warnings and disclaimers'
    ],
    
    usage: {
      endpoint: '/api/backtest',
      method: 'POST',
      requiredFields: [
        'strategy (StrategyDefinition)',
        'marketData (Record<string, MarketData[]>)',
        'config (BacktestConfig)'
      ]
    },
    
    disclaimer: {
      purpose: 'EDUCATIONAL AND RESEARCH ONLY',
      warnings: [
        'Past performance does not guarantee future results',
        'Backtesting has inherent limitations and biases',
        'Results should not be used for actual trading decisions',
        'Consult with financial professionals before making investment decisions'
      ]
    },
    
    supportedSignalTypes: [
      'utilities_spy',
      'lumber_gold', 
      'treasury_curve',
      'sp500_ma',
      'vix_defensive'
    ],
    
    riskNotice: 'Trading and investing involve substantial risk of loss. This system is designed for educational analysis only.',
    
    timestamp: new Date().toISOString()
  };

  return NextResponse.json(systemInfo, {
    headers: {
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'X-Educational-System': 'true'
    }
  });
}

/**
 * Helper Functions
 */

function validateStrategyDefinition(strategy: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!strategy.name || typeof strategy.name !== 'string') {
    errors.push('Strategy name is required and must be a string');
  }
  
  if (!strategy.signalTypes || !Array.isArray(strategy.signalTypes) || strategy.signalTypes.length === 0) {
    errors.push('Strategy must specify at least one signal type');
  }
  
  if (!strategy.entryRules || !Array.isArray(strategy.entryRules) || strategy.entryRules.length === 0) {
    errors.push('Strategy must have at least one entry rule');
  }
  
  if (!strategy.positionSizing || typeof strategy.positionSizing !== 'string') {
    errors.push('Strategy must specify a position sizing method');
  }
  
  if (!strategy.rebalanceFrequency || typeof strategy.rebalanceFrequency !== 'string') {
    errors.push('Strategy must specify a rebalance frequency');
  }
  
  // Validate signal types
  const validSignalTypes = ['utilities_spy', 'lumber_gold', 'treasury_curve', 'sp500_ma', 'vix_defensive'];
  const invalidSignalTypes = strategy.signalTypes?.filter((type: string) => !validSignalTypes.includes(type));
  
  if (invalidSignalTypes && invalidSignalTypes.length > 0) {
    errors.push(`Invalid signal types: ${invalidSignalTypes.join(', ')}. Valid types: ${validSignalTypes.join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

function validateAndSetDefaults(config: any): BacktestConfig {
  // Set default values for missing configuration
  const defaultConfig: BacktestConfig = {
    startDate: '2020-01-01',
    endDate: '2023-12-31',
    initialCapital: 100000,
    commissionRate: 0.001, // 0.1%
    slippageRate: 0.0005,  // 0.05%
    maxPositionSize: 0.25, // 25%
    maxDrawdown: 0.20,     // 20%
    riskFreeRate: 0.02,    // 2%
    engines: ['walk_forward', 'monte_carlo', 'cross_validation'],
    enableSaflaValidation: true,
    maxExecutionTime: 300, // 5 minutes
    warningThresholds: {
      maxDrawdown: 0.15,
      minSharpeRatio: 0.5,
      maxVaR: 0.05,
      minWinRate: 0.4
    }
  };
  
  // Merge user config with defaults
  const mergedConfig = { ...defaultConfig, ...config };
  
  // Validate engines
  const validEngines: BacktestEngineType[] = ['walk_forward', 'monte_carlo', 'cross_validation', 'bootstrap', 'synthetic_data'];
  mergedConfig.engines = mergedConfig.engines.filter((engine: BacktestEngineType) => validEngines.includes(engine));
  
  // Ensure at least one engine is selected
  if (mergedConfig.engines.length === 0) {
    mergedConfig.engines = ['walk_forward'];
  }
  
  // Validate date format and order
  if (new Date(mergedConfig.startDate) >= new Date(mergedConfig.endDate)) {
    mergedConfig.startDate = '2020-01-01';
    mergedConfig.endDate = '2023-12-31';
  }
  
  // Validate numeric constraints
  mergedConfig.initialCapital = Math.max(1000, mergedConfig.initialCapital);
  mergedConfig.commissionRate = Math.max(0, Math.min(0.01, mergedConfig.commissionRate));
  mergedConfig.slippageRate = Math.max(0, Math.min(0.01, mergedConfig.slippageRate));
  mergedConfig.maxPositionSize = Math.max(0.01, Math.min(1.0, mergedConfig.maxPositionSize));
  mergedConfig.maxDrawdown = Math.max(0.01, Math.min(0.5, mergedConfig.maxDrawdown));
  mergedConfig.riskFreeRate = Math.max(0, Math.min(0.1, mergedConfig.riskFreeRate));
  mergedConfig.maxExecutionTime = Math.max(60, Math.min(1800, mergedConfig.maxExecutionTime)); // 1-30 minutes
  
  return mergedConfig;
}

/**
 * Example request body for testing:
 * 
 * {
 *   "strategy": {
 *     "name": "Gayed Signal Strategy",
 *     "description": "Multi-signal strategy based on Gayed research",
 *     "signalTypes": ["utilities_spy", "lumber_gold", "sp500_ma"],
 *     "entryRules": [
 *       {
 *         "id": "risk_on_entry",
 *         "description": "Enter on Risk-On signal",
 *         "condition": "signal === 'Risk-On' && confidence > 0.6",
 *         "weight": 1.0
 *       }
 *     ],
 *     "exitRules": [
 *       {
 *         "id": "risk_off_exit", 
 *         "description": "Exit on Risk-Off signal",
 *         "condition": "signal === 'Risk-Off'",
 *         "weight": 1.0
 *       }
 *     ],
 *     "positionSizing": "equal_weight",
 *     "rebalanceFrequency": "signal_based",
 *     "parameters": {}
 *   },
 *   "marketData": {
 *     "SPY": [
 *       { "date": "2020-01-01", "symbol": "SPY", "close": 321.86 },
 *       { "date": "2020-01-02", "symbol": "SPY", "close": 322.87 }
 *     ]
 *   },
 *   "config": {
 *     "startDate": "2020-01-01",
 *     "endDate": "2023-12-31",
 *     "initialCapital": 100000,
 *     "engines": ["walk_forward", "monte_carlo"],
 *     "enableSaflaValidation": true
 *   }
 * }
 */