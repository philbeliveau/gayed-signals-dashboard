/**
 * WebSocket API Route
 *
 * Initializes Socket.io server integrated with existing API infrastructure.
 * Follows existing API patterns and authentication systems.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createWebSocketServer } from '@/lib/websocket/server';

/**
 * GET handler for WebSocket server initialization status
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const serverStatus = await createWebSocketServer();

    return NextResponse.json({
      status: 'active',
      server: serverStatus,
      endpoint: '/api/websocket',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('WebSocket server status error:', error);
    return NextResponse.json(
      {
        error: 'WebSocket server unavailable',
        status: 'inactive'
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS support following existing patterns
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