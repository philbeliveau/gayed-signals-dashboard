/**
 * Risk Management Monitoring API Endpoint
 * 
 * Provides comprehensive monitoring data for the Risk Management Dashboard
 * including health metrics, security stats, data source status, and alerts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { riskManager } from '../../../../lib/risk/risk-manager';
import { dataFallbackManager } from '../../../../lib/risk/data-fallback';
import { securityManager } from '../../../../lib/risk/security';
import { gracefulDegradationManager } from '../../../../lib/risk/graceful-degradation';
import { enhancedYahooFinanceClient } from '../../../../lib/risk/enhanced-yahoo-finance';

export interface MonitoringResponse {
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: object | null;
    uptime: number;
    circuitBreakerState: string;
  };
  security: {
    rateLimiting: {
      totalIPs: number;
      suspiciousIPs: number;
      totalRequests: number;
    };
    events: {
      total: number;
      recent: Array<{
        timestamp: Date;
        event: string;
        metadata: unknown;
      }>;
    };
    suspiciousIPs: string[];
  };
  dataSources: Record<string, boolean>;
  alerts: Array<{
    id: string;
    level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    message: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
  }>;
  cache: {
    size: number;
    entries: Array<{
      key: string;
      source: string;
      age: number;
      expiresIn: number;
    }>;
  };
  degradation: {
    currentLevel: {
      level: 'full' | 'partial' | 'minimal' | 'emergency';
      description: string;
      availableFeatures: string[];
      disabledFeatures: string[];
      dataReliability: number;
    };
    serviceStatus: {
      dataFetching: 'healthy' | 'degraded' | 'failed';
      signalCalculation: 'healthy' | 'degraded' | 'failed';
      consensus: 'healthy' | 'degraded' | 'failed';
      alerts: 'healthy' | 'degraded' | 'failed';
    };
  };
  performance: {
    requestStats: {
      total: number;
      successful: number;
      failed: number;
      averageResponseTime: number;
    };
    clientStats: ReturnType<typeof enhancedYahooFinanceClient.getStats>;
  };
  timestamp: string;
  requestId: string;
}

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const requestId = `monitoring_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`📊 [${requestId}] Fetching comprehensive monitoring data...`);

    // Get health status from risk manager
    const riskHealthStatus = riskManager.getHealthStatus();
    const riskStats = riskManager.getStats();
    const recentAlerts = riskManager.getRecentAlerts(50);

    // Get security statistics
    const securityStats = securityManager.getSecurityStats();

    // Get data source health
    const dataSourceHealth = dataFallbackManager.getProviderHealth();

    // Get cache statistics
    const cacheStats = dataFallbackManager.getCacheStats();

    // Get degradation status
    const degradationLevel = gracefulDegradationManager.getCurrentDegradationLevel();
    const serviceStatus = gracefulDegradationManager.getServiceStatus();

    // Get client performance stats
    const clientStats = enhancedYahooFinanceClient.getStats();

    // Perform quick health check of Yahoo Finance
    let yahooFinanceHealthy = false;
    try {
      const healthCheck = await Promise.race([
        enhancedYahooFinanceClient.healthCheck(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        )
      ]) as Awaited<ReturnType<typeof enhancedYahooFinanceClient.healthCheck>>;
      
      yahooFinanceHealthy = healthCheck.details.yahoo_finance;
    } catch (error) {
      console.warn(`⚠️ [${requestId}] Yahoo Finance health check failed:`, error);
      yahooFinanceHealthy = false;
    }

    // Combine data source health with live check
    const combinedDataSources = {
      ...dataSourceHealth,
      'yahoo-finance-live': yahooFinanceHealthy
    };

    // Prepare monitoring response
    const monitoringData: MonitoringResponse = {
      health: {
        status: riskHealthStatus.status,
        metrics: riskHealthStatus.metrics,
        uptime: riskHealthStatus.uptime,
        circuitBreakerState: riskHealthStatus.circuitBreakerState
      },
      security: {
        rateLimiting: securityStats?.rateLimiting || {
          totalIPs: 0,
          suspiciousIPs: 0,
          totalRequests: 0
        },
        events: securityStats?.events || { total: 0, recent: [] },
        suspiciousIPs: securityStats?.suspiciousIPs || []
      },
      dataSources: combinedDataSources,
      alerts: recentAlerts,
      cache: cacheStats,
      degradation: {
        currentLevel: degradationLevel,
        serviceStatus: serviceStatus
      },
      performance: {
        requestStats: {
          ...riskStats.requests,
          averageResponseTime: riskStats.requests.responseTimes?.length > 0 
            ? riskStats.requests.responseTimes.reduce((a, b) => a + b, 0) / riskStats.requests.responseTimes.length
            : 0
        },
        clientStats: clientStats
      },
      timestamp: new Date().toISOString(),
      requestId
    };

    const responseTime = Date.now() - startTime;
    console.log(`✅ [${requestId}] Monitoring data collected successfully in ${responseTime}ms`);

    return NextResponse.json(monitoringData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        'X-Response-Time': responseTime.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown monitoring error';
    
    console.error(`❌ [${requestId}] Monitoring API error:`, error);

    // Create error response with minimal data
    const errorResponse = {
      error: 'Failed to fetch monitoring data',
      details: errorMessage,
      timestamp: new Date().toISOString(),
      requestId,
      responseTime,
      // Provide basic health status even on error
      health: {
        status: 'unhealthy' as const,
        metrics: null,
        uptime: 0,
        circuitBreakerState: 'UNKNOWN'
      },
      alerts: [{
        id: `monitoring_error_${Date.now()}`,
        level: 'ERROR' as const,
        message: `Monitoring system error: ${errorMessage}`,
        timestamp: new Date(),
        metadata: { error: errorMessage, requestId }
      }]
    };

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        'X-Error': 'true'
      }
    });
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}