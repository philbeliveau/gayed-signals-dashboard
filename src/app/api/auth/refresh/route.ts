import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { UserDatabase, PublicUser } from '../../lib/users';

interface RefreshPayload {
  user_id: string;
  type: string;
  exp: number;
}

interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  user: PublicUser;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';

async function getRefreshTokenFromRequest(request: NextRequest): Promise<string | null> {
  // Try to get token from Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try to get token from cookies
  const cookieStore = await cookies();
  const tokenFromCookie = cookieStore.get('refresh_token');
  if (tokenFromCookie) {
    return tokenFromCookie.value;
  }

  return null;
}

function verifyRefreshToken(token: string): RefreshPayload | null {
  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET) as RefreshPayload;
    if (payload.type !== 'refresh') {
      return null;
    }
    return payload;
  } catch (error) {
    console.error('Refresh token verification failed:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const refreshToken = await getRefreshTokenFromRequest(request);
    
    if (!refreshToken) {
      return NextResponse.json(
        { detail: 'Refresh token required' },
        { status: 401 }
      );
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return NextResponse.json(
        { detail: 'Invalid or expired refresh token' },
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

    // Generate new access token
    const accessToken = jwt.sign(
      {
        user_id: user.id,
        email: user.email,
        username: user.username,
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
      },
      JWT_SECRET
    );

    // Generate new refresh token
    const newRefreshToken = jwt.sign(
      {
        user_id: user.id,
        type: 'refresh',
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
      },
      JWT_REFRESH_SECRET
    );

    // Update cookies
    const cookieStore = await cookies();
    cookieStore.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60, // 1 hour
      path: '/'
    });

    cookieStore.set('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });

    // Prepare response
    const response: AuthResponse = {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      token_type: 'bearer',
      expires_in: 60 * 60, // 1 hour
      user: UserDatabase.toPublicUser(user)
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { detail: 'Method not allowed' },
    { status: 405 }
  );
}