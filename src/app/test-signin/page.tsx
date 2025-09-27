'use client';

import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { useAuthMode } from '../../lib/device-detection';

export default function TestSignIn() {
  const authMode = useAuthMode();

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text p-4">
      <div className="max-w-md mx-auto mt-20 space-y-8">
        <h1 className="text-2xl font-bold text-center">Test Sign-In</h1>
        <p className="text-center text-theme-text-muted text-sm">
          Auth Mode: {authMode} (Mobile uses redirect, Desktop uses modal)
        </p>
        
        <div className="bg-theme-card p-6 rounded-lg border border-theme-border">
          <SignedOut>
            <div className="space-y-4">
              <p className="text-center text-theme-text-muted">You are signed out</p>
              <div className="flex justify-center">
                <SignInButton mode={authMode}>
                  <button className="w-full px-6 py-3 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md touch-manipulation min-h-[44px]">
                    Sign In (Mobile Test)
                  </button>
                </SignInButton>
              </div>
            </div>
          </SignedOut>
          
          <SignedIn>
            <div className="space-y-4">
              <p className="text-center text-theme-text-muted">You are signed in!</p>
              <div className="flex justify-center">
                <UserButton afterSignOutUrl="/test-signin" />
              </div>
            </div>
          </SignedIn>
        </div>
      </div>
    </div>
  );
}