'use client';

import React from 'react';

// Check if we're in a Clerk environment
const hasClerk = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Import Clerk components conditionally
let ClerkComponents: any = {};

if (hasClerk) {
  try {
    // Use dynamic import for better handling
    const {
      useAuth: ClerkUseAuth,
      useUser: ClerkUseUser,
      SignedIn: ClerkSignedIn,
      SignedOut: ClerkSignedOut,
      SignInButton: ClerkSignInButton,
      UserButton: ClerkUserButton,
    } = require('@clerk/nextjs');

    ClerkComponents = {
      useAuth: ClerkUseAuth,
      useUser: ClerkUseUser,
      SignedIn: ClerkSignedIn,
      SignedOut: ClerkSignedOut,
      SignInButton: ClerkSignInButton,
      UserButton: ClerkUserButton,
    };
  } catch (error) {
    console.warn('Clerk not available, using mock components:', error);
    ClerkComponents = {};
  }
}

// Mock components for demo mode
const MockAuthHook = () => ({ isSignedIn: false, isLoaded: true });
const MockUserHook = () => ({ user: null, isLoaded: true });

const MockSignedIn = ({ children }: { children: React.ReactNode }) => null;
const MockSignedOut = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const MockSignInButton = ({ children, mode }: { children: React.ReactNode; mode?: string }) => (
  <div className="cursor-not-allowed opacity-50" title="Authentication disabled in demo mode">
    {children}
  </div>
);
const MockUserButton = ({ afterSignOutUrl, appearance }: any) => (
  <div
    className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center cursor-not-allowed"
    title="Authentication disabled in demo mode"
  >
    <span className="text-gray-600 text-sm">?</span>
  </div>
);

// Export the appropriate components based on environment with error handling
export const useAuth = () => {
  if (ClerkComponents.useAuth) {
    try {
      return ClerkComponents.useAuth();
    } catch (error) {
      console.warn('Clerk useAuth error, falling back to mock:', error);
      return MockAuthHook();
    }
  }
  return MockAuthHook();
};

export const useUser = () => {
  if (ClerkComponents.useUser) {
    try {
      return ClerkComponents.useUser();
    } catch (error) {
      console.warn('Clerk useUser error, falling back to mock:', error);
      return MockUserHook();
    }
  }
  return MockUserHook();
};

export const SignedIn = ClerkComponents.SignedIn || MockSignedIn;
export const SignedOut = ClerkComponents.SignedOut || MockSignedOut;
export const SignInButton = ClerkComponents.SignInButton || MockSignInButton;
export const UserButton = ClerkComponents.UserButton || MockUserButton;

export const ConditionalClerkComponents = {
  useAuth,
  useUser,
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
};