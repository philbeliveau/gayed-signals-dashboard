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
  Shield
} from 'lucide-react';
import { useAuth, useUser, SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { getNavigationRoutes } from '../../lib/navigation';
import ThemeToggle from '../ThemeToggle';

export interface AuthNavigationProps {
  className?: string;
  variant?: 'header' | 'sidebar' | 'tabs';
  showUserMenu?: boolean;
  showThemeToggle?: boolean;
}

/**
 * Authentication-aware navigation component
 * Dynamically shows/hides menu items based on user auth status and permissions
 */
export default function AuthNavigation({
  className = '',
  variant = 'header',
  showUserMenu = true,
  showThemeToggle = true,
}: AuthNavigationProps) {
  const pathname = usePathname();
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Render navigation items
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
            flex items-center space-x-2 px-4 py-3 rounded-lg transition-colors whitespace-nowrap
            ${isActive 
              ? 'bg-theme-primary text-white' 
              : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-card-hover'
            }
          `}
        >
          <IconComponent className="w-4 h-4" />
          <span>{route.displayName}</span>
          {route.adminOnly && (
            <Shield className="w-3 h-3 text-theme-warning" />
          )}
        </Link>
      );
    });
  };

  // Header variant (horizontal navigation)
  if (variant === 'header') {
    return (
      <header className={`border-b border-theme-border bg-theme-card/80 backdrop-blur-sm sticky top-0 z-50 ${className}`}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            {/* Logo and brand */}
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-theme-primary to-theme-primary-hover rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">G</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-theme-text">Gayed Signal Dashboard</h1>
                <p className="text-theme-text-muted text-sm">Professional Market Regime Analysis</p>
              </div>
            </div>
            
            {/* Right side controls */}
            <div className="flex items-center space-x-6">
              {/* Auth status indicator */}
              <SignedIn>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-theme-success rounded-full animate-pulse"></div>
                  <span className="text-sm text-theme-success font-medium">Authenticated</span>
                </div>
              </SignedIn>
              
              {/* Theme toggle */}
              {showThemeToggle && <ThemeToggle />}
              
              {/* Authentication buttons */}
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-lg transition-colors">
                    Sign In
                  </button>
                </SignInButton>
              </SignedOut>
              
              <SignedIn>
                {/* User button from Clerk */}
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
              
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 hover:bg-theme-card-hover rounded-lg text-theme-text-secondary hover:text-theme-text transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Navigation tabs */}
          <div className="mt-4">
            <div className="flex space-x-1 bg-theme-bg p-1 rounded-xl border border-theme-border overflow-x-auto">
              {renderNavigationItems()}
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 p-4 bg-theme-card border border-theme-border rounded-xl">
              <div className="flex flex-col space-y-2">
                {renderNavigationItems()}
                
                {/* Mobile user info */}
                <SignedIn>
                  <div className="pt-4 border-t border-theme-border">
                    <div className="flex items-center space-x-3 px-4 py-2">
                      <div className="w-8 h-8 bg-theme-primary rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress[0].toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-theme-text">
                          {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User'}
                        </div>
                        <div className="text-xs text-theme-text-muted">
                          {user?.emailAddresses[0]?.emailAddress || ''}
                        </div>
                      </div>
                    </div>
                  </div>
                </SignedIn>
              </div>
            </div>
          )}
        </div>
      </header>
    );
  }

  // Sidebar variant (vertical navigation)
  if (variant === 'sidebar') {
    return (
      <aside className={`w-64 bg-theme-card border-r border-theme-border ${className}`}>
        <div className="p-6">
          {/* Logo */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-8 h-8 bg-gradient-to-br from-theme-primary to-theme-primary-hover rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">G</span>
            </div>
            <span className="text-lg font-bold text-theme-text">Gayed Signals</span>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            {renderNavigationItems()}
          </nav>

          {/* User section */}
          <SignedIn>
            {showUserMenu && (
              <div className="mt-8 pt-4 border-t border-theme-border">
                <UserButton afterSignOutUrl="/" />
              </div>
            )}
          </SignedIn>
        </div>
      </aside>
    );
  }

  // Tabs variant (simple horizontal tabs)
  if (variant === 'tabs') {
    return (
      <div className={`border-b border-theme-border ${className}`}>
        <div className="flex space-x-1 p-1 overflow-x-auto">
          {renderNavigationItems()}
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Simplified navigation for mobile
 */
export function MobileNavigation({ 
  className = '' 
}: { 
  className?: string; 
}) {
  const { isSignedIn } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!isSignedIn) {
    return null;
  }

  return (
    <div className={`md:hidden ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 w-14 h-14 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-full shadow-lg flex items-center justify-center z-50"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setIsOpen(false)}>
          <div className="fixed bottom-20 right-4 bg-theme-card border border-theme-border rounded-xl shadow-xl p-4 min-w-[200px]">
            <AuthNavigation variant="tabs" showUserMenu={false} showThemeToggle={false} />
          </div>
        </div>
      )}
    </div>
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