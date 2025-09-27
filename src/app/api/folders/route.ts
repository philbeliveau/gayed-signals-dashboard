import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Returning mock folders for Vercel deployment...');
    
    // Mock folders for Vercel deployment (no backend needed)
    const folders = [
      {
        id: '1',
        name: 'Root',
        created_at: new Date().toISOString(),
        videos_count: 0
      }
    ];
    
    console.log('✅ Successfully returned mock folders:', folders.length);
    
    return NextResponse.json(folders);
  } catch (error) {
    console.error('❌ Error returning folders:', error);
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
    console.log('🔄 Creating mock folder:', body.name);
    
    // Mock folder creation for Vercel deployment
    const folder = {
      id: Date.now().toString(),
      name: body.name || 'New Folder',
      created_at: new Date().toISOString(),
      videos_count: 0
    };
    
    console.log('✅ Successfully created mock folder:', folder.id);
    
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