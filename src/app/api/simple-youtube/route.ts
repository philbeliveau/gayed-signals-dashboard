import { NextRequest, NextResponse } from 'next/server';

const FASTAPI_BASE_URL = process.env.FASTAPI_URL || 'http://localhost:8002';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🔄 Processing YouTube video with simple endpoint:', body.youtube_url);
    
    // Forward request to simple endpoint
    const response = await fetch(`${FASTAPI_BASE_URL}/api/v1/youtube/simple-process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      // Use 2 minute timeout since processing can take time
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Simple YouTube processing completed:', data.success ? 'SUCCESS' : 'FAILED');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Simple YouTube processing failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Processing failed',
        url: '',
        title: '',
        transcript: '',
        summary: '',
        processing_time: 0
      },
      { status: 500 }
    );
  }
}