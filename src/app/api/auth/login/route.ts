import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { UserDatabase, PublicUser } from '../../lib/users';

// Types
interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
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

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { email, password, remember_me } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { detail: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = UserDatabase.findUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { detail: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await UserDatabase.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { detail: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.is_active) {
      return NextResponse.json(
        { detail: 'Account is deactivated' },
        { status: 401 }
      );
    }

    // Generate JWT tokens
    const accessTokenExpiry = remember_me ? '7d' : '1h';
    const refreshTokenExpiry = remember_me ? '30d' : '7d';

    const accessToken = jwt.sign(
      {
        user_id: user.id,
        email: user.email,
        username: user.username,
        exp: Math.floor(Date.now() / 1000) + (remember_me ? 7 * 24 * 60 * 60 : 60 * 60)
      },
      JWT_SECRET
    );

    const refreshToken = jwt.sign(
      {
        user_id: user.id,
        type: 'refresh',
        exp: Math.floor(Date.now() / 1000) + (remember_me ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60)
      },
      JWT_REFRESH_SECRET
    );

    // Set HTTP-only cookies
    const cookieStore = await cookies();
    cookieStore.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: remember_me ? 7 * 24 * 60 * 60 : 60 * 60,
      path: '/'
    });

    cookieStore.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: remember_me ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60,
      path: '/'
    });

    // Prepare response
    const response: AuthResponse = {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
      expires_in: remember_me ? 7 * 24 * 60 * 60 : 60 * 60,
      user: UserDatabase.toPublicUser(user)
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Login error:', error);
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