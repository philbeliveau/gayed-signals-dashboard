import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { UserDatabase, PublicUser } from '../../lib/users';

// Types
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

export async function GET(request: NextRequest) {
  try {
    const token = await getTokenFromRequest(request);
    
    if (!token) {
      return NextResponse.json(
        { detail: 'Authentication token required' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { detail: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Find user by ID
    const user = UserDatabase.findUserById(payload.user_id);
    if (!user) {
      return NextResponse.json(
        { detail: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is still active
    if (!user.is_active) {
      return NextResponse.json(
        { detail: 'Account is deactivated' },
        { status: 401 }
      );
    }

    // Return user data (excluding password)
    const userResponse: PublicUser = UserDatabase.toPublicUser(user);

    return NextResponse.json(userResponse);
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { detail: 'Method not allowed' },
    { status: 405 }
  );
}