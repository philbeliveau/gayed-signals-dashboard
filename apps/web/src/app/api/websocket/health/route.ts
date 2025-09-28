/**
 * WebSocket Health Check API Route
 *
 * Provides health check endpoint for WebSocket infrastructure
 * following existing health check patterns.
 */

import { NextRequest, NextResponse } from 'next/server';
import { performWebSocketHealthCheck, getWebSocketInfrastructureStatus } from '@/lib/websocket';
import { getDeploymentStatus, validateDeploymentConfig } from '@/lib/websocket/deployment';

/**
 * GET handler for WebSocket health check
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const requestId = `ws_health_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    console.log(`🏥 [${requestId}] WebSocket health check requested`);

    // Perform comprehensive health check
    const healthCheck = await performWebSocketHealthCheck();
    const status = getWebSocketInfrastructureStatus();
    const deploymentStatus = getDeploymentStatus();
    const configValidation = validateDeploymentConfig();

    const responseTime = Date.now() - startTime;

    // Determine HTTP status code based on health
    let httpStatus = 200;
    if (healthCheck.status === 'unhealthy') {
      httpStatus = 503; // Service Unavailable
    } else if (healthCheck.status === 'warning') {
      httpStatus = 200; // OK but with warnings
    }

    const healthResponse = {
      status: healthCheck.status,
      timestamp: new Date().toISOString(),
      requestId,
      responseTime,

      // Core health information
      websocket: {
        server: {
          status: status.server.isRunning ? 'running' : 'stopped',
          connections: status.server.connections,
          supported: deploymentStatus.websocketSupported
        },
        components: healthCheck.components,
        metrics: status.monitor,
        security: status.security,
        persistence: status.persistence
      },

      // Deployment information
      deployment: {
        platform: deploymentStatus.platform,
        environment: deploymentStatus.environment,
        websocketSupported: deploymentStatus.websocketSupported,
        configValid: configValidation.isValid
      },

      // Configuration validation
      validation: {
        isValid: configValidation.isValid,
        errors: configValidation.errors,
        warnings: configValidation.warnings
      },

      // Recommendations for issues
      recommendations: deploymentStatus.recommendations,

      // Detailed component status
      details: healthCheck.details
    };

    // Log health check result
    console.log(`✅ [${requestId}] WebSocket health check completed:`, {
      status: healthCheck.status,
      responseTime,
      platform: deploymentStatus.platform,
      connections: status.server.connections
    });

    return NextResponse.json(healthResponse, {
      status: httpStatus,
      headers: {
        'X-Request-ID': requestId,
        'X-Response-Time': responseTime.toString(),
        'X-Health-Status': healthCheck.status,
        'X-WebSocket-Supported': deploymentStatus.websocketSupported.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error(`❌ [${requestId}] WebSocket health check failed:`, error);

    const errorResponse = {
      status: 'error',
      error: errorMessage,
      timestamp: new Date().toISOString(),
      requestId,
      responseTime,
      websocket: {
        server: { status: 'unknown', connections: 0, supported: false },
        components: {
          websocket_server: false,
          connection_manager: false,
          error_handler: false,
          persistence_layer: false,
          memory_usage: false
        }
      }
    };

    return NextResponse.json(errorResponse, {
      status: 503,
      headers: {
        'X-Request-ID': requestId,
        'X-Error': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
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
      'Access-Control-Allow-Origin': process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : 'https://gayed-signals-dashboard.vercel.app',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  });
}