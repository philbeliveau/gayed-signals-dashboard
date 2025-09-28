'use client';

import React, { useState } from 'react';
import { Search, Bell, ChevronDown } from 'lucide-react';
import { useAuth, useUser, SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { useAuthMode } from '@/lib/device-detection';
import { getNavigationRoutes } from '@/lib/navigation';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
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
  const pathname = usePathname();
  const [searchValue, setSearchValue] = useState('');

  // Get navigation routes (same as sidebar)
  const isAdmin = false; // Can be enhanced with Clerk metadata
  const navigationRoutes = getNavigationRoutes(isSignedIn || false, isAdmin);

  // Check if route is active
  const isActiveRoute = (routePath: string) => {
    if (routePath === '/' && pathname === '/') return true;
    if (routePath !== '/' && pathname.startsWith(routePath)) return true;
    return false;
  };

  return (
    <header className={`modern-topnav relative md:sticky top-0 z-40 ${className}`}>
      <div className="px-3 md:px-6 py-3 md:py-5">
        <div className="flex items-center justify-between">
          {/* Search Section - Mobile optimized */}
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 md:h-5 md:w-5 text-theme-primary" />
              </div>
              <input
                type="text"
                placeholder="Search markets, signals, analysis..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="
                  modern-search mobile-search-input block w-full pl-10 md:pl-12 pr-3 md:pr-4 py-2 md:py-3 text-theme-text placeholder-gray-500
                  focus:outline-none text-sm md:text-base
                "
              />
            </div>
          </div>

          {/* Right Side Controls - Mobile optimized */}
          <div className="flex items-center space-x-2 md:space-x-4 ml-3 md:ml-6">

            {/* Notifications - Hidden on mobile */}
            <SignedIn>
              <button className="modern-nav-button relative hidden md:block">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 block h-3 w-3 rounded-full bg-red-400 ring-2 ring-theme-card animate-pulse"></span>
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

      </div>
    </header>
  );
}