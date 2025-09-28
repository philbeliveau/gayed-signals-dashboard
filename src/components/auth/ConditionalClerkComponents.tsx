'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';

// Temporarily disable Clerk to fix React Hook order violations
const hasClerkEnv = false; // Re-enable after fixing hook order issues

// Context for shared Clerk state
const ClerkContext = createContext<{
  isClient: boolean;
  clerkLoaded: boolean;
  components: any;
}>({
  isClient: false,
  clerkLoaded: false,
  components: {},
});

// Mock components for demo mode
const MockAuthHook = () => ({ isSignedIn: false, isLoaded: true });
const MockUserHook = () => ({ user: null, isLoaded: true });

const MockSignedIn = ({ children }: { children: React.ReactNode }) => null;
const MockSignedOut = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const MockSignInButton = ({ children, mode }: { children: React.ReactNode; mode?: string }) => (
  <div
    className="cursor-pointer"
    title="Demo mode - Click to see authentication modal placeholder"
    onClick={() => alert('Demo Mode: Clerk authentication temporarily disabled. Will be re-enabled after fixing React Hook order issues.')}
  >
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

// Provider component to manage Clerk initialization
export function ClerkProvider({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);
  const [clerkLoaded, setClerkLoaded] = useState(false);
  const [components, setComponents] = useState<any>({});

  useEffect(() => {
    setIsClient(true);

    if (hasClerkEnv && typeof window !== 'undefined') {
      try {
        // Dynamic import on client side only
        const clerk = require('@clerk/nextjs');
        const clerkComponents = {
          useAuth: clerk.useAuth,
          useUser: clerk.useUser,
          SignedIn: clerk.SignedIn,
          SignedOut: clerk.SignedOut,
          SignInButton: clerk.SignInButton,
          UserButton: clerk.UserButton,
        };
        setComponents(clerkComponents);
        setClerkLoaded(true);
      } catch (error) {
        console.warn('Clerk not available, using mock components:', error);
        setClerkLoaded(false);
      }
    }
  }, []);

  return (
    <ClerkContext.Provider value={{ isClient, clerkLoaded, components }}>
      {children}
    </ClerkContext.Provider>
  );
}

// Hook to use Clerk context
const useClerkComponents = () => {
  return useContext(ClerkContext);
};

// Export hooks with proper client-side handling
export const useAuth = () => {
  const { isClient, clerkLoaded, components } = useClerkComponents();

  if (!isClient || !clerkLoaded || !components.useAuth) {
    return MockAuthHook();
  }

  try {
    return components.useAuth();
  } catch (error) {
    console.warn('Clerk useAuth error, falling back to mock:', error);
    return MockAuthHook();
  }
};

export const useUser = () => {
  const { isClient, clerkLoaded, components } = useClerkComponents();

  if (!isClient || !clerkLoaded || !components.useUser) {
    return MockUserHook();
  }

  try {
    return components.useUser();
  } catch (error) {
    console.warn('Clerk useUser error, falling back to mock:', error);
    return MockUserHook();
  }
};

// Export components with client-side only rendering
export const SignedIn = ({ children }: { children: React.ReactNode }) => {
  const { isClient, clerkLoaded, components } = useClerkComponents();

  if (!isClient) {
    // During SSR, always show signed-out state
    return null;
  }

  if (!clerkLoaded || !components.SignedIn) {
    return <MockSignedIn>{children}</MockSignedIn>;
  }

  try {
    const ClerkSignedIn = components.SignedIn;
    return <ClerkSignedIn>{children}</ClerkSignedIn>;
  } catch (error) {
    console.warn('Clerk SignedIn error, falling back to mock:', error);
    return <MockSignedIn>{children}</MockSignedIn>;
  }
};

export const SignedOut = ({ children }: { children: React.ReactNode }) => {
  const { isClient, clerkLoaded, components } = useClerkComponents();

  if (!isClient) {
    // During SSR, always show signed-out state
    return <>{children}</>;
  }

  if (!clerkLoaded || !components.SignedOut) {
    return <MockSignedOut>{children}</MockSignedOut>;
  }

  try {
    const ClerkSignedOut = components.SignedOut;
    return <ClerkSignedOut>{children}</ClerkSignedOut>;
  } catch (error) {
    console.warn('Clerk SignedOut error, falling back to mock:', error);
    return <MockSignedOut>{children}</MockSignedOut>;
  }
};

export const SignInButton = ({ children, mode, ...props }: any) => {
  const { isClient, clerkLoaded, components } = useClerkComponents();

  if (!isClient || !clerkLoaded || !components.SignInButton) {
    return <MockSignInButton mode={mode} {...props}>{children}</MockSignInButton>;
  }

  try {
    const ClerkSignInButton = components.SignInButton;
    return <ClerkSignInButton mode={mode} {...props}>{children}</ClerkSignInButton>;
  } catch (error) {
    console.warn('Clerk SignInButton error, falling back to mock:', error);
    return <MockSignInButton mode={mode} {...props}>{children}</MockSignInButton>;
  }
};

export const UserButton = ({ afterSignOutUrl, appearance, ...props }: any) => {
  const { isClient, clerkLoaded, components } = useClerkComponents();

  if (!isClient || !clerkLoaded || !components.UserButton) {
    return <MockUserButton afterSignOutUrl={afterSignOutUrl} appearance={appearance} {...props} />;
  }

  try {
    const ClerkUserButton = components.UserButton;
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