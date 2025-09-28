'use client';

import React, { useState, useEffect } from 'react';

// Check if we're in a Clerk environment
const hasClerkEnv = typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== 'your-clerk-publishable-key-here';

// Store Clerk components after client-side initialization
let ClerkComponents: any = {};

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

// Hook to initialize Clerk components on the client side
const useClerkComponents = () => {
  const [isClient, setIsClient] = useState(false);
  const [clerkLoaded, setClerkLoaded] = useState(false);

  useEffect(() => {
    setIsClient(true);

    if (hasClerkEnv && typeof window !== 'undefined') {
      try {
        // Dynamic import on client side only
        const clerk = require('@clerk/nextjs');
        ClerkComponents = {
          useAuth: clerk.useAuth,
          useUser: clerk.useUser,
          SignedIn: clerk.SignedIn,
          SignedOut: clerk.SignedOut,
          SignInButton: clerk.SignInButton,
          UserButton: clerk.UserButton,
        };
        setClerkLoaded(true);
      } catch (error) {
        console.warn('Clerk not available, using mock components:', error);
        setClerkLoaded(false);
      }
    }
  }, []);

  return { isClient, clerkLoaded };
};

// Export hooks with proper client-side handling
export const useAuth = () => {
  const { isClient, clerkLoaded } = useClerkComponents();

  if (!isClient || !clerkLoaded || !ClerkComponents.useAuth) {
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
  const { isClient, clerkLoaded } = useClerkComponents();

  if (!isClient || !clerkLoaded || !ClerkComponents.useUser) {
    return MockUserHook();
  }

  try {
    return ClerkComponents.useUser();
  } catch (error) {
    console.warn('Clerk useUser error, falling back to mock:', error);
    return MockUserHook();
  }
};

// Export components with client-side only rendering
export const SignedIn = ({ children }: { children: React.ReactNode }) => {
  const { isClient, clerkLoaded } = useClerkComponents();

  if (!isClient) {
    // During SSR, always show signed-out state
    return null;
  }

  if (!clerkLoaded || !ClerkComponents.SignedIn) {
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
  const { isClient, clerkLoaded } = useClerkComponents();

  if (!isClient) {
    // During SSR, always show signed-out state
    return <>{children}</>;
  }

  if (!clerkLoaded || !ClerkComponents.SignedOut) {
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
  const { isClient, clerkLoaded } = useClerkComponents();

  if (!isClient || !clerkLoaded || !ClerkComponents.SignInButton) {
    return <MockSignInButton mode={mode} {...props}>{children}</MockSignInButton>;
  }

  try {
    const ClerkSignInButton = ClerkComponents.SignInButton;
    return <ClerkSignInButton mode={mode} {...props}>{children}</ClerkSignInButton>;
  } catch (error) {
    console.warn('Clerk SignInButton error, falling back to mock:', error);
    return <MockSignInButton mode={mode} {...props}>{children}</MockSignInButton>;
  }
};

export const UserButton = ({ afterSignOutUrl, appearance, ...props }: any) => {
  const { isClient, clerkLoaded } = useClerkComponents();

  if (!isClient || !clerkLoaded || !ClerkComponents.UserButton) {
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