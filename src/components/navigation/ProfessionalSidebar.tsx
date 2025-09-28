'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Activity,
  BarChart,
  TrendingUp,
  LineChart,
  Video,
  Users,
  Settings,
  Shield,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { getNavigationRoutes } from '../../lib/navigation';

interface ProfessionalSidebarProps {
  className?: string;
}

/**
 * Professional dark sidebar matching the reference design
 * Features dark theme with light icons and clean navigation
 */
export default function ProfessionalSidebar({ className = '' }: ProfessionalSidebarProps) {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();

  // For now, assume no admin users - this can be enhanced with Clerk metadata
  const isAdmin = false;

  // Get navigation routes based on auth status
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

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 bg-theme-sidebar ${className}`}>
      {/* Mobile sidebar (icon only) */}
      <div className="flex flex-col w-16 lg:hidden">
        {/* Trading Logo */}
        <div className="flex items-center justify-center h-16 border-b border-gray-600">
          <Link href="/" className="flex items-center justify-center w-10 h-10 bg-white rounded-lg hover:bg-gray-100 transition-colors">
            <BarChart3 className="w-6 h-6 text-theme-primary" />
          </Link>
        </div>

        {/* Navigation Icons */}
        <nav className="flex-1 px-2 py-4 space-y-2">
          {navigationRoutes.map((route) => {
            const IconComponent = getIcon(route.icon);
            const isActive = isActiveRoute(route.path);

            return (
              <Link
                key={route.path}
                href={route.path}
                className={`
                  group flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200
                  ${isActive
                    ? 'bg-white text-theme-primary shadow-sm'
                    : 'text-theme-sidebar-text-muted hover:text-white hover:bg-gray-600'
                  }
                `}
                title={route.displayName}
              >
                <IconComponent className="w-5 h-5" />
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Desktop sidebar (full width) */}
      <div className="hidden lg:flex lg:flex-col lg:w-60">
        {/* Trading Logo and brand */}
        <div className="flex items-center px-6 h-16 border-b border-gray-600">
          <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
              <BarChart3 className="w-6 h-6 text-theme-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-theme-sidebar">Trading Hub</h1>
              <p className="text-xs text-theme-sidebar-muted">Market Intelligence</p>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigationRoutes.map((route) => {
            const IconComponent = getIcon(route.icon);
            const isActive = isActiveRoute(route.path);

            return (
              <Link
                key={route.path}
                href={route.path}
                className={`
                  group flex items-center space-x-3 px-4 py-3 rounded-full transition-all duration-200 mx-2
                  ${isActive
                    ? 'bg-white text-theme-primary shadow-sm'
                    : 'text-theme-sidebar-text-muted hover:text-white hover:bg-gray-600'
                  }
                `}
              >
                <IconComponent className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-105 ${
                  isActive ? 'text-theme-primary' : ''
                }`} />
                <span className="font-medium">{route.displayName}</span>
                {route.adminOnly && (
                  <Shield className="w-3 h-3 text-yellow-400 flex-shrink-0 ml-auto" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section for additional info */}
        <div className="px-4 py-4 border-t border-gray-600">
          <div className="flex items-center space-x-2 px-3 py-2 bg-gray-600/50 rounded-lg">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-theme-sidebar-muted font-medium">Live Data</span>
          </div>
        </div>
      </div>
    </aside>
  );
}