/**
 * Health Check API Endpoint
 * 
 * Provides comprehensive system health information for monitoring
 * and load balancer health checks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { healthCheckHandler } from '../../../domains/risk-management/services/enhanced-api-route';

/**
 * Health check endpoint that provides detailed system status
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return healthCheckHandler(request);
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