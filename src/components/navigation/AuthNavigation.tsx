'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Activity, 
  LineChart, 
  Home, 
  Users, 
  Youtube, 
  BarChart, 
  TrendingUp,
  Video,
  Menu,
  X,
  Settings,
  Shield,
  ChevronDown
} from 'lucide-react';
import { useAuth, useUser, SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { getNavigationRoutes } from '../../lib/navigation';
import { useAuthMode } from '../../lib/device-detection';
import ThemeToggle from '../ThemeToggle';

export interface AuthNavigationProps {
  className?: string;
  showUserMenu?: boolean;
  showThemeToggle?: boolean;
}

/**
 * Authentication-aware navigation component
 * Dynamically shows/hides menu items based on user auth status and permissions
 */
export default function AuthNavigation({
  className = '',
  showUserMenu = true,
  showThemeToggle = true,
}: AuthNavigationProps) {
  const pathname = usePathname();
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const authMode = useAuthMode();

  // For now, assume no admin users - this can be enhanced with Clerk metadata
  const isAdmin = false;

  // Get navigation routes based on Clerk auth status
  const navigationRoutes = getNavigationRoutes(isSignedIn || false, isAdmin);

  // Icon mapping for navigation items
  const iconMap: Record<string, React.ComponentType<any>> = {
    'home': Home,
    'layout-dashboard': Activity,
    'trending-up': TrendingUp,
    'activity': BarChart,
    'line-chart': LineChart,
    'video': Video,
    'users': Users,
    'bar-chart': BarChart,
    'youtube': Youtube,
    'shield': Shield,
    'settings': Settings,
  };

  const getIcon = (iconName?: string) => {
    if (!iconName) return Activity;
    return iconMap[iconName] || Activity;
  };

  // Check if route is active
  const isActiveRoute = (routePath: string) => {
    if (routePath === '/' && pathname === '/') return true;
    if (routePath !== '/' && pathname.startsWith(routePath)) return true;
    return false;
  };

  // Render navigation items with unified design
  const renderNavigationItems = () => {
    return navigationRoutes.map((route) => {
      const IconComponent = getIcon(route.icon);
      const isActive = isActiveRoute(route.path);
      
      return (
        <Link
          key={route.path}
          href={route.path}
          onClick={() => setMobileMenuOpen(false)}
          className={`
            nav-item group flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 whitespace-nowrap touch-manipulation
            ${isActive 
              ? 'bg-theme-primary text-white shadow-sm' 
              : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-card-hover'
            }
            lg:px-3 lg:py-2 lg:text-sm
          `}
        >
          <IconComponent className={`w-5 h-5 flex-shrink-0 lg:w-4 lg:h-4 transition-transform group-hover:scale-105 ${
            isActive ? 'text-white' : 'text-theme-text-muted group-hover:text-theme-text'
          }`} />
          <span className="font-medium">{route.displayName}</span>
          {route.adminOnly && (
            <Shield className="w-3 h-3 text-theme-warning flex-shrink-0" />
          )}
        </Link>
      );
    });
  };

  // Unified professional navigation
  return (
      <header className={`bg-theme-card/95 backdrop-blur-md border-b border-theme-border sticky top-0 z-50 ${className}`}>
        <div className="max-w-7xl mx-auto">
          {/* Main navigation bar */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
            {/* Logo and brand */}
            <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-gradient-to-br from-theme-primary to-theme-primary-hover rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">G</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-theme-text">Gayed Signals</h1>
                <p className="text-xs text-theme-text-muted">Market Intelligence</p>
              </div>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {renderNavigationItems()}
            </nav>
            
            {/* Right side controls */}
            <div className="flex items-center space-x-3">
              {/* Auth status indicator - desktop only */}
              <SignedIn>
                <div className="hidden xl:flex items-center space-x-2 px-3 py-1.5 bg-theme-success/10 rounded-full">
                  <div className="w-2 h-2 bg-theme-success rounded-full animate-pulse"></div>
                  <span className="text-xs text-theme-success font-medium">Live</span>
                </div>
              </SignedIn>
              
              {/* Theme toggle */}
              {showThemeToggle && (
                <div className="hidden sm:block">
                  <ThemeToggle />
                </div>
              )}
              
              {/* Authentication */}
              <SignedOut>
                <SignInButton mode={authMode}>
                  <button className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-lg transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md touch-manipulation min-h-[44px]">
                    Sign In
                  </button>
                </SignInButton>
              </SignedOut>
              
              <SignedIn>
                <div className="relative z-50">
                  <UserButton 
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: "w-9 h-9"
                      }
                    }}
                  />
                </div>
              </SignedIn>
              
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2.5 hover:bg-theme-card-hover rounded-lg text-theme-text transition-colors touch-manipulation min-h-[44px] min-w-[44px]"
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Overlay */}
          {mobileMenuOpen && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden" 
                onClick={() => setMobileMenuOpen(false)}
              />
              
              {/* Mobile Menu */}
              <div className="absolute top-full left-0 right-0 bg-theme-card border-b border-theme-border shadow-2xl z-50 md:hidden">
                <div className="px-4 py-6 space-y-6">
                  {/* Navigation Links */}
                  <nav className="space-y-2">
                    {renderNavigationItems()}
                  </nav>
                  
                  {/* Mobile Controls */}
                  <div className="border-t border-theme-border pt-6 space-y-4">
                    {/* Theme Toggle */}
                    {showThemeToggle && (
                      <div className="flex items-center justify-between px-4 py-3 bg-theme-card-hover rounded-lg">
                        <span className="text-sm font-medium text-theme-text">Dark Mode</span>
                        <ThemeToggle />
                      </div>
                    )}
                    
                    {/* User Info */}
                    <SignedIn>
                      <div className="flex items-center space-x-4 px-4 py-4 bg-theme-primary/5 rounded-lg border border-theme-primary/20">
                        <div className="w-12 h-12 bg-theme-primary rounded-full flex items-center justify-center">
                          <span className="text-white text-lg font-semibold">
                            {user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress[0].toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-theme-text truncate">
                            {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User'}
                          </div>
                          <div className="text-xs text-theme-text-muted truncate">
                            {user?.emailAddresses[0]?.emailAddress || ''}
                          </div>
                          <div className="flex items-center space-x-1 mt-1">
                            <div className="w-2 h-2 bg-theme-success rounded-full animate-pulse"></div>
                            <span className="text-xs text-theme-success font-medium">Active</span>
                          </div>
                        </div>
                      </div>
                    </SignedIn>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </header>
    );
}


/**
 * Breadcrumb navigation with auth awareness
 */
export function AuthBreadcrumb({
  className = ''
}: {
  className?: string;
}) {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  // For now, assume no admin users - this can be enhanced with Clerk metadata
  const isAdmin = false;

  // Generate breadcrumb items based on current path and auth status
  const generateBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'Home', href: '/' }];

    let currentPath = '';
    for (const segment of segments) {
      currentPath += `/${segment}`;
      
      // Check if user has access to this path
      const navigationRoutes = getNavigationRoutes(isSignedIn || false, isAdmin);
      const route = navigationRoutes.find(r => r.path === currentPath);
      
      if (route) {
        breadcrumbs.push({
          label: route.displayName || segment.charAt(0).toUpperCase() + segment.slice(1),
          href: currentPath,
        });
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav className={`flex text-sm text-theme-text-muted ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {breadcrumbs.map((breadcrumb, index) => (
          <li key={breadcrumb.href} className="flex items-center">
            {index > 0 && (
              <span className="mx-2 text-theme-text-light">/</span>
            )}
            {index === breadcrumbs.length - 1 ? (
              <span className="text-theme-text font-medium">{breadcrumb.label}</span>
            ) : (
              <Link
                href={breadcrumb.href}
                className="hover:text-theme-text transition-colors"
              >
                {breadcrumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}