'use client';

import React from 'react';
import { Bell } from 'lucide-react';
import { useAuth, useUser, SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { useAuthMode } from '@/lib/device-detection';
import ThemeToggle from '../ThemeToggle';

interface ProfessionalTopNavProps {
  className?: string;
  showThemeToggle?: boolean;
}

/**
 * Professional top navigation with user profile
 * Matches the reference design with white background and professional styling
 */
export default function ProfessionalTopNav({
  className = '',
  showThemeToggle = true
}: ProfessionalTopNavProps) {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const authMode = useAuthMode();

  return (
    <header className={`modern-topnav relative md:sticky top-0 z-40 ${className}`}>
      <div className="px-3 md:px-6 py-3 md:py-5">
        <div className="flex items-center justify-between">
          {/* Logo - Left side */}
          <div className="flex items-center space-x-3">
            <img
              src="/logo.webp"
              alt="The Gayed Report"
              className="h-10 w-10 md:h-12 md:w-12 object-contain"
            />
            <div className="hidden md:block">
              <h1 className="text-lg font-light text-theme-text tracking-wide">
                THE GAYED REPORT
              </h1>
            </div>
          </div>

          {/* Controls - Mobile optimized */}
          <div className="flex items-center space-x-2 md:space-x-4">

            {/* Notifications - Hidden on mobile */}
            <SignedIn>
              <button className="modern-nav-button relative hidden md:block">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500"></span>
              </button>
            </SignedIn>

            {/* Theme Toggle - Desktop only (mobile has it in bottom nav) */}
            {showThemeToggle && (
              <div className="hidden md:flex">
                <ThemeToggle />
              </div>
            )}

            {/* User Section */}
            <div className="flex items-center space-x-2 md:space-x-3">
              <SignedOut>
                <SignInButton mode={authMode}>
                  <button className="modern-pill px-3 md:px-6 py-2 text-sm md:text-base">
                    Sign In
                  </button>
                </SignInButton>
              </SignedOut>

              <SignedIn>
                <div className="flex items-center space-x-3">

                  {/* User Avatar */}
                  <div className="relative">
                    <UserButton
                      afterSignOutUrl="/"
                      appearance={{
                        elements: {
                          avatarBox: "w-10 h-10 rounded-full ring-2 ring-theme-border hover:ring-theme-primary transition-all duration-200"
                        }
                      }}
                    />
                  </div>
                </div>
              </SignedIn>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}