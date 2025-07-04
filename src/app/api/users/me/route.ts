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

interface UpdateUserRequest {
  email?: string;
  username?: string;
  full_name?: string;
  is_active?: boolean;
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

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateUsername(username: string): boolean {
  // 3-20 characters, alphanumeric and underscore only
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
}

// GET /api/users/me - Get current user
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

// PUT /api/users/me - Update current user
export async function PUT(request: NextRequest) {
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

    const body: UpdateUserRequest = await request.json();

    // Validate updates
    if (body.email !== undefined) {
      if (!validateEmail(body.email)) {
        return NextResponse.json(
          { detail: 'Invalid email format' },
          { status: 400 }
        );
      }
      // Check if email is already taken by another user
      if (UserDatabase.emailExists(body.email, user.id)) {
        return NextResponse.json(
          { detail: 'Email already exists' },
          { status: 409 }
        );
      }
    }

    if (body.username !== undefined) {
      if (!validateUsername(body.username)) {
        return NextResponse.json(
          { detail: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores' },
          { status: 400 }
        );
      }
      // Check if username is already taken by another user
      if (UserDatabase.usernameExists(body.username, user.id)) {
        return NextResponse.json(
          { detail: 'Username already exists' },
          { status: 409 }
        );
      }
    }

    // Update user
    const updatedUser = UserDatabase.updateUser(user.id, body);
    if (!updatedUser) {
      return NextResponse.json(
        { detail: 'Failed to update user' },
        { status: 500 }
      );
    }

    // Return updated user data (excluding password)
    const userResponse: PublicUser = UserDatabase.toPublicUser(updatedUser);

    return NextResponse.json(userResponse);
  } catch (error) {
    console.error('Update user error:', error);
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