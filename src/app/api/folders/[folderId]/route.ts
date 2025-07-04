import { NextRequest, NextResponse } from 'next/server';

const FASTAPI_BASE_URL = process.env.FASTAPI_URL || 'http://localhost:8002';

export async function GET(
  request: NextRequest,
  { params }: { params: { folderId: string } }
) {
  try {
    const { folderId } = params;
    console.log('🔄 Fetching folder details:', folderId);
    
    const response = await fetch(`${FASTAPI_BASE_URL}/api/v1/folders/${folderId}`, {
      method: 'GET',
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

    const folder = await response.json();
    console.log('✅ Successfully fetched folder details:', folder.name);
    
    return NextResponse.json(folder);
  } catch (error) {
    console.error('❌ Error fetching folder:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch folder',
        detail: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { folderId: string } }
) {
  try {
    const { folderId } = params;
    const body = await request.json();
    console.log('🔄 Updating folder:', folderId);
    
    const response = await fetch(`${FASTAPI_BASE_URL}/api/v1/folders/${folderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authentication headers when auth is implemented
        // 'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    const folder = await response.json();
    console.log('✅ Successfully updated folder:', folder.name);
    
    return NextResponse.json(folder);
  } catch (error) {
    console.error('❌ Error updating folder:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update folder',
        detail: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { folderId: string } }
) {
  try {
    const { folderId } = params;
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === 'true';
    
    console.log('🔄 Deleting folder:', folderId, force ? '(forced)' : '');
    
    const response = await fetch(`${FASTAPI_BASE_URL}/api/v1/folders/${folderId}?force=${force}`, {
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
    console.log('✅ Successfully deleted folder:', result.message);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Error deleting folder:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete folder',
        detail: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}