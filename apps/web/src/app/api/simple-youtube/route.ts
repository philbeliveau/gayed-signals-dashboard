/**
 * Next.js API Proxy for YouTube Processing
 *
 * Proxies YouTube video processing requests to the FastAPI backend.
 * Handles authentication via Clerk and provides consistent error responses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const BACKEND_URL = process.env.FASTAPI_BASE_URL || process.env.BACKEND_URL || 'http://localhost:8000';

interface YouTubeProcessRequest {
  youtube_url: string;
  summary_mode?: string;
  custom_context?: string;
  save_to_database?: boolean;
  trigger_autogen_debate?: boolean;
}

interface YouTubeProcessResponse {
  success: boolean;
  url?: string;
  title?: string;
  transcript?: string;
  summary?: string;
  processing_time?: number;
  error?: string;
  video_id?: string;
  folder_name?: string;
  autogen_conversation_id?: string;
  autogen_status?: string;
  financial_relevance_score?: number;
}

export async function POST(request: NextRequest): Promise<NextResponse<YouTubeProcessResponse>> {
  try {
    // Authenticate user with Clerk (optional when auth is disabled)
    let userId: string | null = null;
    try {
      const authResult = await auth();
      userId = authResult.userId;
    } catch (authError) {
      // Clerk middleware not configured - this is expected in development mode
      console.log('⚠️ Clerk auth not available - using development mode');
    }

    // Allow requests when auth middleware is disabled (development mode)
    const effectiveUserId = userId || 'dev-user';

    // Parse request body
    let body: YouTubeProcessRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body'
      }, { status: 400 });
    }

    // Validate YouTube URL
    if (!body.youtube_url) {
      return NextResponse.json({
        success: false,
        error: 'YouTube URL is required'
      }, { status: 400 });
    }

    console.log(`🎥 Proxying YouTube processing request to backend: ${body.youtube_url}`);

    // Forward request to FastAPI backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/youtube/simple-process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        youtube_url: body.youtube_url,
        summary_mode: body.summary_mode || 'bullet',
        custom_context: body.custom_context,
        save_to_database: body.save_to_database || false,
        trigger_autogen_debate: body.trigger_autogen_debate || false,
        include_signal_context: false
      })
    });

    // Parse backend response
    const result: YouTubeProcessResponse = await backendResponse.json();

    if (!backendResponse.ok) {
      console.error(`❌ Backend error (${backendResponse.status}):`, result.error);
      return NextResponse.json({
        success: false,
        error: result.error || `Backend processing failed with status ${backendResponse.status}`
      }, { status: backendResponse.status });
    }

    console.log(`✅ YouTube processing completed: ${result.title}`);

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('❌ YouTube API proxy error:', error);

    // Check for network/connection errors
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        return NextResponse.json({
          success: false,
          error: 'Backend service unavailable - Please ensure FastAPI backend is running on port 8000'
        }, { status: 503 });
      }

      if (error.message.includes('fetch failed')) {
        return NextResponse.json({
          success: false,
          error: 'Failed to connect to backend service - Check BACKEND_URL configuration'
        }, { status: 503 });
      }
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error occurred'
    }, { status: 500 });
  }
}
