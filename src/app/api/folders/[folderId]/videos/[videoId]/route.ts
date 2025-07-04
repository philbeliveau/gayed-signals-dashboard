import { NextRequest, NextResponse } from 'next/server';

const FASTAPI_BASE_URL = process.env.FASTAPI_URL || 'http://localhost:8002';

export async function POST(
  request: NextRequest,
  { params }: { params: { folderId: string; videoId: string } }
) {
  try {
    const { folderId, videoId } = params;
    console.log('🔄 Adding video to folder:', videoId, '->', folderId);
    
    const response = await fetch(`${FASTAPI_BASE_URL}/api/v1/folders/${folderId}/videos/${videoId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authentication headers when auth is implemented
        // 'Authorization': `Bearer ${token}`
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Successfully added video to folder:', result.message);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Error adding video to folder:', error);
    return NextResponse.json(
      { 
        error: 'Failed to add video to folder',
        detail: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { folderId: string; videoId: string } }
) {
  try {
    const { folderId, videoId } = params;
    console.log('🔄 Removing video from folder:', videoId, 'from', folderId);
    
    const response = await fetch(`${FASTAPI_BASE_URL}/api/v1/folders/${folderId}/videos/${videoId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authentication headers when auth is implemented
        // 'Authorization': `Bearer ${token}`
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Successfully removed video from folder:', result.message);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Error removing video from folder:', error);
    return NextResponse.json(
      { 
        error: 'Failed to remove video from folder',
        detail: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}