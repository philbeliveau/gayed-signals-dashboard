'use client';

import React, { createContext, useContext } from 'react';
import { ClerkProvider } from '@clerk/nextjs';

// Mock auth context for when Clerk isn't available
interface MockAuthContext {
  isSignedIn: boolean;
  isLoaded: boolean;
}

interface MockUserContext {
  user: null;
  isLoaded: boolean;
}

const MockAuthContext = createContext<MockAuthContext>({
  isSignedIn: false,
  isLoaded: true,
});

const MockUserContext = createContext<MockUserContext>({
  user: null,
  isLoaded: true,
});

// Mock components for when Clerk isn't available
export function MockSignedIn({ children }: { children: React.ReactNode }) {
  return null; // Never show signed-in content in demo mode
}

export function MockSignedOut({ children }: { children: React.ReactNode }) {
  return <>{children}</>; // Always show signed-out content in demo mode
}

export function MockSignInButton({ children }: { children: React.ReactNode }) {
  return (
    <div className="cursor-not-allowed opacity-50" title="Authentication disabled in demo mode">
      {children}
    </div>
  );
}

export function MockUserButton() {
  return (
    <div
      className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center cursor-not-allowed"
      title="Authentication disabled in demo mode"
    >
      <span className="text-gray-600 text-sm">?</span>
    </div>
  );
}

export function MockClerkProvider({ children }: { children: React.ReactNode }) {
  return (
    <MockAuthContext.Provider value={{ isSignedIn: false, isLoaded: true }}>
      <MockUserContext.Provider value={{ user: null, isLoaded: true }}>
        {children}
      </MockUserContext.Provider>
    </MockAuthContext.Provider>
  );
}

// Mock hooks
export function useAuth() {
  return useContext(MockAuthContext);
}

export function useUser() {
  return useContext(MockUserContext);
}

interface ConditionalClerkProviderProps {
  children: React.ReactNode;
  publishableKey?: string;
}

export function ConditionalClerkProvider({ children, publishableKey }: ConditionalClerkProviderProps) {
  if (publishableKey) {
    return (
      <ClerkProvider publishableKey={publishableKey}>
        {children}
      </ClerkProvider>
    );
  }

  return (
    <MockClerkProvider>
      {children}
    </MockClerkProvider>
  );
}