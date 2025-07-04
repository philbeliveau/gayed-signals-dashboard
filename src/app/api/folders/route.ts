import { NextRequest, NextResponse } from 'next/server';

const FASTAPI_BASE_URL = process.env.FASTAPI_URL || 'http://localhost:8002';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Fetching user folders from backend...');
    
    const response = await fetch(`${FASTAPI_BASE_URL}/api/v1/folders/`, {
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

    const folders = await response.json();
    console.log('✅ Successfully fetched folders:', folders.length);
    
    return NextResponse.json(folders);
  } catch (error) {
    console.error('❌ Error fetching folders:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch folders',
        detail: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔄 Creating new folder:', body.name);
    
    const response = await fetch(`${FASTAPI_BASE_URL}/api/v1/folders/`, {
      method: 'POST',
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
    console.log('✅ Successfully created folder:', folder.id);
    
    return NextResponse.json(folder);
  } catch (error) {
    console.error('❌ Error creating folder:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create folder',
        detail: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}