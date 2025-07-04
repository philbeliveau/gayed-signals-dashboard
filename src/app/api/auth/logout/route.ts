import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

interface JWTPayload {
  user_id: string;
  email: string;
  username: string;
  exp: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

async function getTokenFromRequest(request: NextRequest): Promise<string | null> {
  // Try to get token from Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try to get token from cookies
  const cookieStore = await cookies();
  const tokenFromCookie = cookieStore.get('access_token');
  if (tokenFromCookie) {
    return tokenFromCookie.value;
  }

  return null;
}

function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getTokenFromRequest(request);
    
    // Verify token if present (optional for logout)
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        console.log(`User ${payload.email} logging out`);
      }
    }

    // Clear authentication cookies
    const cookieStore = await cookies();
    
    // Set cookies to expire immediately
    cookieStore.set('access_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });

    cookieStore.set('refresh_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });

    // In a real application, you might want to:
    // 1. Add the token to a blacklist
    // 2. Log the logout event
    // 3. Clean up any session data

    return NextResponse.json(
      { message: 'Successfully logged out' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);
    
    // Even if there's an error, we still want to clear cookies
    const cookieStore = await cookies();
    cookieStore.set('access_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });
    
    cookieStore.set('refresh_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });

    return NextResponse.json(
      { message: 'Logged out (with errors)' },
      { status: 200 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { detail: 'Method not allowed' },
    { status: 405 }
  );
}