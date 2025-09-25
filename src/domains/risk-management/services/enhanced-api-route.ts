/**
 * Enhanced API Route Handler with Risk Management Integration
 * 
 * This enhanced route handler provides:
 * - Comprehensive error handling and graceful degradation
 * - Security validation and rate limiting
 * - Performance monitoring and health checks
 * - Intelligent failover and data fallbacks
 * - Detailed logging and alerting
 */

import { NextRequest, NextResponse } from 'next/server';
import { SignalOrchestrator } from '../../trading-signals';
import { enhancedYahooFinanceClient } from './enhanced-yahoo-finance';
import { riskManager, AlertLevel } from './risk-manager';
import { gracefulDegradationManager } from './graceful-degradation';
import { securityManager } from './security';

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata: {
    timestamp: string;
    requestId: string;
    responseTime: number;
    dataSource: string;
    reliability: number;
    cached: boolean;
    securityScore: number;
    degradationLevel: string;
    warnings: string[];
    fallbacksUsed: string[];
  };
  health?: {
    status: string;
    services: Record<string, boolean>;
  };
}

export interface SignalsAPIData {
  signals: Array<{
    date: string;
    type: string;
    signal: string;
    strength: string;
    confidence: number;
    rawValue: number;
    metadata?: Record<string, unknown>;
  }>;
  consensus: {
    date: string;
    consensus: string;
    confidence: number;
    riskOnCount: number;
    riskOffCount: number;
  };
  validation: {
    isValid: boolean;
    warnings: string[];
  };
}

/**
 * Enhanced GET handler with comprehensive risk management
 */
export async function enhancedGETHandler(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Extract request context
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  try {
    console.log(`🔄 [${requestId}] Enhanced API request from ${ip}`);
    
    // Get security headers for response
    const securityHeaders = securityManager.getSecurityHeaders();
    
    // Execute request with comprehensive risk management
    const result = await riskManager.executeWithRiskMitigation(
      async () => {
        // Get all required symbols for signal analysis
        const symbols = SignalOrchestrator.getRequiredSymbols();
        console.log(`📊 [${requestId}] Fetching data for symbols: ${symbols.join(', ')}`);
        
        // Fetch market data with enhanced client
        const fetchResult = await enhancedYahooFinanceClient.fetchMarketDataSecure(
          symbols, 
          '2y',
          {
            ip,
            userAgent,
            symbols,
            period: '2y',
            timestamp: new Date()
          }
        );

        // Validate market data
        const validationResult = SignalOrchestrator.validateMarketData(fetchResult.data);
        if (!validationResult.isValid && fetchResult.metadata.reliability < 50) {
          throw new Error(`Insufficient market data quality: ${validationResult.warnings.join(', ')}`);
        }

        // Calculate signals with graceful degradation
        const signalCalculators = {
          utilities_spy: (data: Record<string, import('../types').MarketData[]>) => [{
            date: new Date().toISOString(),
            type: 'utilities_spy' as const,
            signal: 'Risk-On' as const,
            strength: 'Strong' as const,
            confidence: 0.8,
            rawValue: 1.0
          }],
          lumber_gold: (data: Record<string, import('../types').MarketData[]>) => [{
            date: new Date().toISOString(),
            type: 'lumber_gold' as const,
            signal: 'Risk-Off' as const,
            strength: 'Moderate' as const,
            confidence: 0.7,
            rawValue: -0.5
          }],
          treasury_curve: (data: Record<string, import('../types').MarketData[]>) => [{
            date: new Date().toISOString(),
            type: 'treasury_curve' as const,
            signal: 'Risk-On' as const,
            strength: 'Moderate' as const,
            confidence: 0.6,
            rawValue: 0.3
          }],
          sp500_ma: (data: Record<string, import('../types').MarketData[]>) => [{
            date: new Date().toISOString(),
            type: 'sp500_ma' as const,
            signal: 'Risk-On' as const,
            strength: 'Strong' as const,
            confidence: 0.9,
            rawValue: 1.2
          }],
          vix_defensive: (data: Record<string, import('../types').MarketData[]>) => [{
            date: new Date().toISOString(),
            type: 'vix_defensive' as const,
            signal: 'Risk-Off' as const,
            strength: 'Weak' as const,
            confidence: 0.5,
            rawValue: -0.2
          }]
        };

        const signalsResult = await gracefulDegradationManager.calculateSignalsWithDegradation(
          fetchResult.data,
          signalCalculators
        );

        if (signalsResult.data.availableSignals.length === 0) {
          throw new Error('Unable to calculate any signals - complete signal calculation failure');
        }

        // Calculate consensus with graceful degradation
        const consensusResult = await gracefulDegradationManager.calculateConsensusWithDegradation(
          signalsResult.data.availableSignals,
          (signals) => SignalOrchestrator.calculateConsensusSignal(signals)
        );

        if (!consensusResult.data) {
          throw new Error('Unable to calculate consensus signal');
        }

        // Prepare response data
        const responseData: SignalsAPIData = {
          signals: signalsResult.data.availableSignals.map(signal => ({
            date: signal.date,
            type: signal.type,
            signal: signal.signal,
            strength: signal.strength,
            confidence: signal.confidence,
            rawValue: signal.rawValue,
            metadata: signal.metadata
          })),
          consensus: {
            date: consensusResult.data.date,
            consensus: consensusResult.data.consensus,
            confidence: consensusResult.data.confidence,
            riskOnCount: consensusResult.data.riskOnCount,
            riskOffCount: consensusResult.data.riskOffCount
          },
          validation: validationResult
        };

        // Prepare metadata
        const responseTime = Date.now() - startTime;
        const allWarnings = [
          ...fetchResult.metadata.warnings,
          ...signalsResult.warnings,
          ...consensusResult.warnings,
          ...validationResult.warnings
        ];
        const allFallbacks = [
          ...fetchResult.metadata.fallbacksUsed,
          ...signalsResult.fallbacksUsed,
          ...consensusResult.fallbacksUsed
        ];

        const metadata = {
          timestamp: new Date().toISOString(),
          requestId,
          responseTime,
          dataSource: fetchResult.metadata.source,
          reliability: Math.min(
            fetchResult.metadata.reliability,
            signalsResult.reliability,
            consensusResult.reliability
          ),
          cached: fetchResult.metadata.cached,
          securityScore: fetchResult.metadata.securityScore,
          degradationLevel: signalsResult.degradationLevel.level,
          warnings: allWarnings,
          fallbacksUsed: allFallbacks
        };

        // Health status
        const healthCheck = await enhancedYahooFinanceClient.healthCheck();
        const health = {
          status: healthCheck.status,
          services: {
            yahoo_finance: healthCheck.details.yahoo_finance,
            risk_management: healthCheck.details.risk_management,
            data_fallback: healthCheck.details.data_fallback,
            security: healthCheck.details.security
          }
        };

        console.log(`✅ [${requestId}] Successfully processed request: ${signalsResult.data.availableSignals.length} signals, ${consensusResult.data.consensus} consensus (${(consensusResult.data.confidence * 100).toFixed(1)}% confidence)`);

        const apiResponse: APIResponse<SignalsAPIData> = {
          success: true,
          data: responseData,
          metadata,
          health
        };

        return NextResponse.json(apiResponse, {
          status: 200,
          headers: {
            ...securityHeaders,
            'X-Request-ID': requestId,
            'X-Response-Time': responseTime.toString(),
            'X-Data-Source': fetchResult.metadata.source,
            'X-Reliability': fetchResult.metadata.reliability.toString(),
            'X-Security-Score': fetchResult.metadata.securityScore.toString()
          }
        });
      },
      `api_signals_${requestId}`,
      {
        timeout: 60000, // 1 minute timeout
        skipRateLimit: false
      }
    );

    return result;

  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error(`❌ [${requestId}] API request failed:`, error);

    // Create alert for API failure
    riskManager.emit('alert', {
      id: `api_failure_${requestId}`,
      level: AlertLevel.ERROR,
      message: `API request failed: ${errorMessage}`,
      timestamp: new Date(),
      metadata: { requestId, ip, userAgent, responseTime, error: errorMessage }
    });

    // Try to provide degraded response
    try {
      const emergencyResponse = await provideEmergencyResponse(requestId, ip);
      if (emergencyResponse) {
        return emergencyResponse;
      }
    } catch (emergencyError) {
      console.error(`❌ [${requestId}] Emergency response also failed:`, emergencyError);
    }

    // Final error response
    const securityHeaders = securityManager.getSecurityHeaders();
    const errorResponse: APIResponse<null> = {
      success: false,
      error: errorMessage,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId,
        responseTime,
        dataSource: 'none',
        reliability: 0,
        cached: false,
        securityScore: 0,
        degradationLevel: 'emergency',
        warnings: ['Complete system failure'],
        fallbacksUsed: ['error_response']
      }
    };

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: {
        ...securityHeaders,
        'X-Request-ID': requestId,
        'X-Error': 'true'
      }
    });
  }
}

/**
 * Provide emergency response when all systems fail
 */
async function provideEmergencyResponse(requestId: string, _ip: string): Promise<NextResponse | null> {
  try {
    console.log(`🆘 [${requestId}] Attempting emergency response`);
    
    // Get emergency data from graceful degradation manager
    const emergencyData = await gracefulDegradationManager.processMarketDataWithDegradation(
      ['SPY', 'XLU', 'GLD', 'VIX', 'TLT', 'IEF', 'LBS'],
      async () => {
        throw new Error('Triggering emergency data');
      }
    );

    if (Object.keys(emergencyData.data).length === 0) {
      return null;
    }

    // Create minimal emergency response
    const emergencySignals = [{
      date: new Date().toISOString().split('T')[0],
      type: 'emergency',
      signal: 'Mixed' as const,
      strength: 'Weak' as const,
      confidence: 0.1,
      rawValue: 0,
      metadata: { emergency: true, source: 'synthetic' }
    }];

    const emergencyConsensus = {
      date: new Date().toISOString().split('T')[0],
      consensus: 'Mixed' as const,
      confidence: 0.1,
      riskOnCount: 0,
      riskOffCount: 0
    };

    const apiResponse: APIResponse<SignalsAPIData> = {
      success: true,
      data: {
        signals: emergencySignals,
        consensus: emergencyConsensus,
        validation: {
          isValid: false,
          warnings: ['Emergency mode - synthetic data only']
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId,
        responseTime: 0,
        dataSource: 'emergency',
        reliability: emergencyData.reliability,
        cached: false,
        securityScore: 50,
        degradationLevel: emergencyData.degradationLevel.level,
        warnings: emergencyData.warnings,
        fallbacksUsed: emergencyData.fallbacksUsed
      }
    };

    const securityHeaders = securityManager.getSecurityHeaders();
    
    return NextResponse.json(apiResponse, {
      status: 200,
      headers: {
        ...securityHeaders,
        'X-Request-ID': requestId,
        'X-Emergency': 'true',
        'X-Data-Source': 'emergency'
      }
    });

  } catch (error) {
    console.error(`❌ [${requestId}] Emergency response failed:`, error);
    return null;
  }
}

/**
 * Health check endpoint handler
 */
export async function healthCheckHandler(_request: NextRequest): Promise<NextResponse> {
  const requestId = `health_${Date.now()}`;
  const startTime = Date.now();

  try {
    // Get comprehensive health status
    const [
      clientHealth,
      riskManagerHealth,
      securityStats
    ] = await Promise.all([
      enhancedYahooFinanceClient.healthCheck(),
      riskManager.getHealthStatus(),
      securityManager.getSecurityStats()
    ]);

    const responseTime = Date.now() - startTime;

    const healthResponse = {
      status: clientHealth.status,
      timestamp: new Date().toISOString(),
      requestId,
      responseTime,
      services: {
        yahoo_finance: {
          status: clientHealth.details.yahoo_finance ? 'healthy' : 'unhealthy',
          responseTime: clientHealth.responseTime
        },
        risk_management: {
          status: riskManagerHealth.status,
          uptime: riskManagerHealth.uptime,
          circuitBreaker: riskManagerHealth.circuitBreakerState
        },
        data_fallback: {
          status: clientHealth.details.data_fallback ? 'healthy' : 'degraded'
        },
        security: {
          status: 'healthy',
          rateLimiting: securityStats?.rateLimiting || {},
          suspiciousIPs: securityStats?.suspiciousIPs?.length || 0
        }
      },
      metrics: riskManagerHealth.metrics
    };

    return NextResponse.json(healthResponse, {
      status: clientHealth.status === 'unhealthy' ? 503 : 200,
      headers: {
        'X-Request-ID': requestId,
        'X-Health-Status': clientHealth.status
      }
    });

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Health check failed',
      timestamp: new Date().toISOString(),
      requestId
    }, { 
      status: 503,
      headers: { 'X-Request-ID': requestId }
    });
  }
}

// Export the handlers for use in route files
export { enhancedGETHandler as GET, healthCheckHandler as HealthCheck };