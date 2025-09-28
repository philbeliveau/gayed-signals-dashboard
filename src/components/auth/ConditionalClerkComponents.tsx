'use client';

import React from 'react';

// Check if we're in a Clerk environment
const hasClerkEnv = typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== 'your-clerk-publishable-key-here';

// Import Clerk components conditionally
let ClerkComponents: any = {};

if (hasClerkEnv) {
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
  // Always use mock during SSR or if Clerk isn't properly initialized
  if (typeof window === 'undefined' || !hasClerkEnv || !ClerkComponents.useAuth) {
    return MockAuthHook();
  }

  try {
    return ClerkComponents.useAuth();
  } catch (error) {
    console.warn('Clerk useAuth error, falling back to mock:', error);
    return MockAuthHook();
  }
};

export const useUser = () => {
  // Always use mock during SSR or if Clerk isn't properly initialized
  if (typeof window === 'undefined' || !hasClerkEnv || !ClerkComponents.useUser) {
    return MockUserHook();
  }

  try {
    return ClerkComponents.useUser();
  } catch (error) {
    console.warn('Clerk useUser error, falling back to mock:', error);
    return MockUserHook();
  }
};

// Export components with conditional logic
export const SignedIn = ({ children }: { children: React.ReactNode }) => {
  // Always use mock during SSR or if Clerk isn't properly initialized
  if (typeof window === 'undefined' || !hasClerkEnv || !ClerkComponents.SignedIn) {
    return <MockSignedIn>{children}</MockSignedIn>;
  }

  try {
    const ClerkSignedIn = ClerkComponents.SignedIn;
    return <ClerkSignedIn>{children}</ClerkSignedIn>;
  } catch (error) {
    console.warn('Clerk SignedIn error, falling back to mock:', error);
    return <MockSignedIn>{children}</MockSignedIn>;
  }
};

export const SignedOut = ({ children }: { children: React.ReactNode }) => {
  // Always use mock during SSR or if Clerk isn't properly initialized
  if (typeof window === 'undefined' || !hasClerkEnv || !ClerkComponents.SignedOut) {
    return <MockSignedOut>{children}</MockSignedOut>;
  }

  try {
    const ClerkSignedOut = ClerkComponents.SignedOut;
    return <ClerkSignedOut>{children}</ClerkSignedOut>;
  } catch (error) {
    console.warn('Clerk SignedOut error, falling back to mock:', error);
    return <MockSignedOut>{children}</MockSignedOut>;
  }
};

export const SignInButton = ({ children, mode, ...props }: any) => {
  // Always use mock during SSR or if Clerk isn't properly initialized
  if (typeof window === 'undefined' || !hasClerkEnv || !ClerkComponents.SignInButton) {
    return <MockSignInButton>{children}</MockSignInButton>;
  }

  try {
    const ClerkSignInButton = ClerkComponents.SignInButton;
    return <ClerkSignInButton mode={mode} {...props}>{children}</ClerkSignInButton>;
  } catch (error) {
    console.warn('Clerk SignInButton error, falling back to mock:', error);
    return <MockSignInButton>{children}</MockSignInButton>;
  }
};

export const UserButton = ({ afterSignOutUrl, appearance, ...props }: any) => {
  // Always use mock during SSR or if Clerk isn't properly initialized
  if (typeof window === 'undefined' || !hasClerkEnv || !ClerkComponents.UserButton) {
    return <MockUserButton afterSignOutUrl={afterSignOutUrl} appearance={appearance} {...props} />;
  }

  try {
    const ClerkUserButton = ClerkComponents.UserButton;
    return <ClerkUserButton afterSignOutUrl={afterSignOutUrl} appearance={appearance} {...props} />;
  } catch (error) {
    console.warn('Clerk UserButton error, falling back to mock:', error);
    return <MockUserButton afterSignOutUrl={afterSignOutUrl} appearance={appearance} {...props} />;
  }
};

export const ConditionalClerkComponents = {
  useAuth,
  useUser,
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
};