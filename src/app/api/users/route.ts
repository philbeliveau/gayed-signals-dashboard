import { NextRequest, NextResponse } from 'next/server';
import { UserDatabase, PublicUser } from '../lib/users';

// Types
interface CreateUserRequest {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password: string): boolean {
  // At least 8 characters, with at least one letter and one number
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
  return passwordRegex.test(password);
}

function validateUsername(username: string): boolean {
  // 3-20 characters, alphanumeric and underscore only
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateUserRequest = await request.json();
    const { email, username, password, full_name } = body;

    // Validate required fields
    if (!email || !username || !password) {
      return NextResponse.json(
        { detail: 'Email, username, and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!validateEmail(email)) {
      return NextResponse.json(
        { detail: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate username format
    if (!validateUsername(username)) {
      return NextResponse.json(
        { detail: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (!validatePassword(password)) {
      return NextResponse.json(
        { detail: 'Password must be at least 8 characters long and contain at least one letter and one number' },
        { status: 400 }
      );
    }

    // Check if user already exists
    if (UserDatabase.emailExists(email)) {
      return NextResponse.json(
        { detail: 'Email already exists' },
        { status: 409 }
      );
    }

    if (UserDatabase.usernameExists(username)) {
      return NextResponse.json(
        { detail: 'Username already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await UserDatabase.hashPassword(password);

    // Create new user
    const newUser = UserDatabase.createUser({
      email,
      username,
      password: hashedPassword,
      full_name: full_name || '',
      is_active: true,
      is_verified: false // In production, you'd send verification email
    });

    // Return user data (excluding password)
    const userResponse: PublicUser = UserDatabase.toPublicUser(newUser);

    return NextResponse.json(userResponse, { status: 201 });
  } catch (error) {
    console.error('User creation error:', error);
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