'use client';

import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { useAuthMode } from '../../lib/device-detection';

export default function TestSignIn() {
  const authMode = useAuthMode();

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text p-4 sm:p-6">
      <div className="max-w-md mx-auto mt-16 sm:mt-20 space-y-6 sm:space-y-8">
        <h1 className="text-xl sm:text-2xl font-bold text-center">Test Sign-In</h1>
        <p className="text-center text-theme-text-muted text-xs sm:text-sm px-2">
          Auth Mode: <span className="font-medium">{authMode}</span>
          <br className="sm:hidden" />
          <span className="hidden sm:inline"> </span>(Mobile uses redirect, Desktop uses modal)
        </p>

        <div className="bg-theme-card p-5 sm:p-6 rounded-lg border border-theme-border">
          <SignedOut>
            <div className="space-y-4">
              <p className="text-center text-theme-text-muted text-sm sm:text-base">You are signed out</p>
              <div className="flex justify-center">
                <SignInButton mode={authMode}>
                  <button className="w-full px-6 py-3 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md touch-manipulation min-h-[44px] text-sm sm:text-base">
                    Sign In (Mobile Test)
                  </button>
                </SignInButton>
              </div>
            </div>
          </SignedOut>

          <SignedIn>
            <div className="space-y-4">
              <p className="text-center text-theme-text-muted text-sm sm:text-base">You are signed in!</p>
              <div className="flex justify-center">
                <UserButton afterSignOutUrl="/test-signin"
                  appearance={{
                    elements: {
                      avatarBox: "w-10 h-10 sm:w-12 sm:h-12"
                    }
                  }}
                />
              </div>
            </div>
          </SignedIn>
        </div>
      </div>
    </div>
  );
}