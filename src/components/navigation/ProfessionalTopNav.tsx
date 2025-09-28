'use client';

import React, { useState } from 'react';
import { Search, Bell, ChevronDown } from 'lucide-react';
import { useAuth, useUser, SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { useAuthMode } from '../../lib/device-detection';
import ThemeToggle from '../ThemeToggle';

interface ProfessionalTopNavProps {
  className?: string;
  showThemeToggle?: boolean;
}

/**
 * Professional top navigation with search bar and user profile
 * Matches the reference design with white background and professional styling
 */
export default function ProfessionalTopNav({
  className = '',
  showThemeToggle = true
}: ProfessionalTopNavProps) {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const authMode = useAuthMode();
  const [searchValue, setSearchValue] = useState('');

  return (
    <header className={`modern-topnav sticky top-0 z-40 ${className}`}>
      <div className="px-6 py-5">
        <div className="flex items-center justify-between">
          {/* Search Section */}
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-theme-primary" />
              </div>
              <input
                type="text"
                placeholder="Search markets, signals, analysis..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="
                  modern-search block w-full pl-12 pr-4 py-3 text-theme-text placeholder-gray-500
                  focus:outline-none
                "
              />
            </div>
          </div>

          {/* Right Side Controls */}
          <div className="flex items-center space-x-4 ml-6">
            {/* Navigation Pills - for larger screens */}
            <div className="hidden md:flex items-center space-x-3">
              <button className="modern-pill">
                Trader
              </button>
              <button className="modern-pill inactive">
                Collector
              </button>
            </div>

            {/* Notifications */}
            <SignedIn>
              <button className="modern-nav-button relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 block h-3 w-3 rounded-full bg-red-400 ring-2 ring-white animate-pulse"></span>
              </button>
            </SignedIn>

            {/* Theme Toggle */}
            {showThemeToggle && (
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>
            )}

            {/* User Section */}
            <div className="flex items-center space-x-3">
              <SignedOut>
                <SignInButton mode={authMode}>
                  <button className="modern-pill px-6">
                    Sign In
                  </button>
                </SignInButton>
              </SignedOut>

              <SignedIn>
                <div className="flex items-center space-x-3">
                  {/* User Greeting - Desktop Only */}
                  <div className="hidden lg:block text-right">
                    <div className="text-sm text-theme-text-muted">
                      Hello 👋
                    </div>
                    <div className="text-sm font-semibold text-theme-text">
                      {user?.firstName || 'Marco Rivera'}
                    </div>
                  </div>

                  {/* User Avatar */}
                  <div className="relative">
                    <UserButton
                      afterSignOutUrl="/"
                      appearance={{
                        elements: {
                          avatarBox: "w-10 h-10 rounded-full ring-2 ring-gray-200 hover:ring-theme-primary transition-all duration-200"
                        }
                      }}
                    />
                  </div>

                  {/* Additional Options - Desktop */}
                  <div className="hidden xl:flex items-center space-x-2">
                    <button className="p-1.5 text-theme-text-muted hover:text-theme-text transition-colors">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </SignedIn>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Pills */}
        <div className="md:hidden mt-6 flex items-center justify-center space-x-4">
          <button className="modern-pill text-sm px-5">
            Trader
          </button>
          <button className="modern-pill inactive text-sm px-5">
            Collector
          </button>
        </div>
      </div>
    </header>
  );
}