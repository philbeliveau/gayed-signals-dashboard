'use client';

import React from 'react';

// Check if we're in a Clerk environment
const hasClerk = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Dynamic imports that will work at runtime
let ClerkComponents: any = {};

if (hasClerk) {
  try {
    const clerk = require('@clerk/nextjs');
    ClerkComponents = {
      useAuth: clerk.useAuth,
      useUser: clerk.useUser,
      SignedIn: clerk.SignedIn,
      SignedOut: clerk.SignedOut,
      SignInButton: clerk.SignInButton,
      UserButton: clerk.UserButton,
    };
  } catch (error) {
    console.warn('Clerk not available, using mock components');
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

// Export the appropriate components based on environment
export const useAuth = ClerkComponents.useAuth || MockAuthHook;
export const useUser = ClerkComponents.useUser || MockUserHook;
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