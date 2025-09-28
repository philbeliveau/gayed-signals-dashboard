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
import { useAuth } from '../auth/ConditionalClerkComponents';
import { getNavigationRoutes } from '@/lib/navigation';

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
    <aside className={`hidden md:block fixed inset-y-0 left-0 z-50 modern-sidebar ${className}`}>
      {/* Ultra Slim Sidebar - Hidden on mobile, visible on desktop */}
      <div className="flex flex-col w-[70px] h-full">
        {/* Trading Logo */}
        <div className="flex items-center justify-center h-16 border-b border-theme-border/30">
          <div className="nav-item-container relative">
            <Link href="/" className="modern-nav-container w-12 h-12 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-theme-sidebar-text" />
            </Link>
            <div className="nav-tooltip">Trading Hub</div>
          </div>
        </div>

        {/* Navigation Icons */}
        <nav className="flex-1 px-2 py-6 space-y-4">
          {navigationRoutes.map((route) => {
            const IconComponent = getIcon(route.icon);
            const isActive = isActiveRoute(route.path);

            return (
              <div key={route.path} className="nav-item-container relative flex justify-center">
                <Link
                  href={route.path}
                  className={`modern-nav-button ${isActive ? 'active pulse-glow' : ''}`}
                >
                  <IconComponent className="w-5 h-5" />
                  {route.adminOnly && (
                    <Shield className="w-2 h-2 text-yellow-300 absolute -top-1 -right-1" />
                  )}
                </Link>
                <div className="nav-tooltip">{route.displayName}</div>
              </div>
            );
          })}
        </nav>

        {/* Bottom section for live data indicator */}
        <div className="px-2 py-4 border-t border-theme-border/30">
          <div className="nav-item-container relative flex justify-center">
            <div className="modern-nav-button">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            </div>
            <div className="nav-tooltip">Live Market Data</div>
          </div>
        </div>
      </div>
    </aside>
  );
}