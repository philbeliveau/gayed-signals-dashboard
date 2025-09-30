/**
 * Conversation WebSocket Streaming Route
 * Story 2.8: AutoGen-WebSocket Integration Bridge
 *
 * Next.js API route that bridges frontend WebSocket connections
 * to the AutoGen backend WebSocket streaming service.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

interface StreamingParams {
  params: {
    id: string;
  };
}

/**
 * GET handler - Provide WebSocket connection information
 */
export async function GET(
  request: NextRequest,
  { params }: StreamingParams
): Promise<NextResponse> {
  try {
    const conversationId = params.id;

    // Validate conversation ID format
    if (!conversationId || conversationId.length < 10) {
      return NextResponse.json(
        { error: 'Invalid conversation ID' },
        { status: 400 }
      );
    }

    // Get authentication context
    const { userId } = await auth();

    // Determine backend WebSocket URL with proper protocol handling
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const wsUrl = backendUrl.replace(/^https?/, backendUrl.startsWith('https') ? 'wss' : 'ws');

    return NextResponse.json({
      conversationId,
      webSocketUrl: `${wsUrl}/api/v1/ws/conversations/${conversationId}/stream`,
      httpUrl: `${backendUrl}/api/v1/ws/conversations/${conversationId}/start`,
      userId: userId || null,
      status: 'ready',
      instructions: {
        connect: 'Connect to webSocketUrl with WebSocket client',
        authenticate: 'Send start_conversation message with content and auth token',
        format: 'JSON messages with type and data fields'
      }
    });

  } catch (error) {
    console.error('Conversation stream endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to prepare conversation stream' },
      { status: 500 }
    );
  }
}

/**
 * POST handler - Start conversation and prepare streaming
 */
export async function POST(
  request: NextRequest,
  { params }: StreamingParams
): Promise<NextResponse> {
  try {
    const conversationId = params.id;
    const body = await request.json();

    // Validate request
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    if (!body.content || !body.content.trim()) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Get authentication context
    const { userId, getToken } = await auth();

    // Get auth token for backend
    let authToken: string | null = null;
    try {
      authToken = await getToken();
    } catch (error) {
      console.warn('Failed to get auth token:', error);
    }

    // Prepare request for backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const backendResponse = await fetch(
      `${backendUrl}/api/v1/ws/conversations/${conversationId}/start`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        },
        body: JSON.stringify({
          content: body.content,
          content_type: body.contentType || body.content_type || 'text',
          user_id: userId
        })
      }
    );

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      console.error('Backend conversation start failed:', errorData);
      return NextResponse.json(
        {
          error: 'Failed to start conversation',
          details: errorData.detail || 'Backend service unavailable'
        },
        { status: backendResponse.status }
      );
    }

    const backendData = await backendResponse.json();

    // Return success response with WebSocket information
    const backendUrl2 = process.env.BACKEND_URL || 'http://localhost:8000';
    const wsUrl = backendUrl2.replace(/^https?/, backendUrl2.startsWith('https') ? 'wss' : 'ws');

    return NextResponse.json({
      success: true,
      conversationId,
      webSocketUrl: `${wsUrl}/api/v1/ws/conversations/${conversationId}/stream`,
      status: backendData.status || 'ready',
      userId: userId || null,
      authToken: authToken || null,
      startData: {
        type: 'start_conversation',
        data: {
          content: body.content,
          contentType: body.contentType || body.content_type || 'text',
          userId: userId,
          authToken: authToken
        }
      }
    });

  } catch (error) {
    console.error('Conversation start error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  });
}