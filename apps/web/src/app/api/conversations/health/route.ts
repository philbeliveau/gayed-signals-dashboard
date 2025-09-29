/**
 * Next.js API route for conversation database health checks and cross-platform testing.
 *
 * This endpoint provides health monitoring and validates cross-platform
 * data consistency between Next.js frontend and FastAPI backend for Story 1.0c.
 */

import { NextRequest, NextResponse } from 'next/server'
import { conversationService } from '@/lib/services/conversation-service'

/**
 * GET /api/conversations/health
 * Health check for conversation database service
 */
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()

    // Perform comprehensive health check
    const healthResult = await conversationService.healthCheck()

    // Add Next.js specific health information
    const healthData = {
      ...healthResult,
      service: 'next-js-conversation-api',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing',
      prismaConnected: healthResult.databaseConnected,
      frontendHealthCheck: {
        responseTimeMs: Date.now() - startTime,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      }
    }

    // Determine status code based on health
    const statusCode = healthResult.status === 'healthy' ? 200 : 503

    console.log(`✅ Health check completed: ${healthResult.status} (${healthResult.responseTimeMs}ms)`)

    return NextResponse.json(healthData, { status: statusCode })

  } catch (error) {
    console.error('❌ Health check failed:', error)

    return NextResponse.json({
      status: 'unhealthy',
      service: 'next-js-conversation-api',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    }, { status: 503 })
  }
}

/**
 * POST /api/conversations/health
 * Cross-platform consistency test
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conversationId, testType = 'basic' } = body

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required for cross-platform testing' },
        { status: 422 }
      )
    }

    const startTime = Date.now()

    // Perform cross-platform consistency test
    const testResult = await conversationService.testCrossPlatformConsistency(conversationId)

    // Add comprehensive test metadata
    const testData = {
      ...testResult,
      testType,
      conversationId,
      timestamp: new Date().toISOString(),
      totalTestTimeMs: Date.now() - startTime,
      passed: testResult.frontendAccessible && testResult.dataConsistent && testResult.errors.length === 0,
      recommendations: []
    }

    // Add performance recommendations
    if (testResult.performanceMs > 500) {
      testData.recommendations.push('Consider database query optimization - response time exceeds 500ms')
    }

    if (testResult.errors.length > 0) {
      testData.recommendations.push('Investigate and resolve data access errors')
    }

    if (!testResult.dataConsistent) {
      testData.recommendations.push('Check data synchronization between frontend and backend access patterns')
    }

    console.log(`✅ Cross-platform test for conversation ${conversationId}: ${testData.passed ? 'PASSED' : 'FAILED'}`)

    return NextResponse.json(testData)

  } catch (error) {
    console.error('❌ Cross-platform test failed:', error)

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Cross-platform test failed',
      timestamp: new Date().toISOString(),
      passed: false
    }, { status: 500 })
  }
}