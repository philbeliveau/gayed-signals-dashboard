import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🔄 YouTube processing not available on Vercel:', body.youtube_url);
    
    // YouTube processing requires Python backend which is not available on Vercel
    return NextResponse.json({
      success: false,
      error: 'YouTube video processing is not available on Vercel deployment. This feature requires the Python FastAPI backend with yt-dlp and Whisper API integration.',
      url: body.youtube_url || '',
      title: '',
      transcript: '',
      summary: 'YouTube processing requires local deployment with Python backend services. Please use the local development version to access this feature.',
      processing_time: 0,
      note: 'This platform focuses on trading signals analysis. YouTube processing is an additional feature available in local deployment only.'
    });
  } catch (error) {
    console.error('❌ YouTube processing error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'YouTube processing not available on Vercel',
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