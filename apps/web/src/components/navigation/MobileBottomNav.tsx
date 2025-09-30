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
  Sun,
  Moon,
  Monitor,
  MessageSquareMore
} from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { useTheme } from '@/contexts/ThemeContext';
import { getNavigationRoutes } from '@/lib/navigation';

/**
 * Mobile bottom navigation component
 * Provides easy thumb access to main navigation items
 */
export default function MobileBottomNav() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const { theme, setTheme } = useTheme();

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
    'youtube': Video,
    'users': Users,
    'bar-chart': BarChart,
    'shield': Shield,
    'settings': Settings,
    'message-square-more': MessageSquareMore,
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

  // Get theme icon
  const ThemeIcon = theme === 'dark' ? Sun : theme === 'light' ? Moon : Monitor;

  // Cycle through themes
  const toggleTheme = () => {
    const themes = ['light', 'dark', 'system'] as const;
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  // Show max 4 main nav items + theme toggle to fit mobile screen
  const mainRoutes = navigationRoutes.slice(0, 4);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 mobile-bottom-nav border-t border-theme-border shadow-theme-card-hover">
      {/* Safe area for devices with home indicator */}
      <div className="safe-bottom-nav">
        <div className="flex items-center justify-around px-2 py-1">
          {/* Main Navigation Items */}
          {mainRoutes.map((route) => {
            const IconComponent = getIcon(route.icon);
            const isActive = isActiveRoute(route.path);

            return (
              <Link
                key={route.path}
                href={route.path}
                className={`
                  flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 mobile-bottom-nav-item bottom-nav-haptic
                  ${isActive
                    ? 'text-theme-primary bg-theme-primary-bg'
                    : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-card-hover'
                  }
                `}
              >
                <IconComponent className={`w-5 h-5 mb-1 bottom-nav-icon ${isActive ? 'active' : ''}`} />
                <span className="text-xs font-medium leading-none">
                  {route.displayName.split(' ')[0]} {/* Show first word only */}
                </span>
                {route.adminOnly && (
                  <Shield className="w-2 h-2 text-yellow-400 absolute top-1 right-1" />
                )}
              </Link>
            );
          })}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 mobile-bottom-nav-item bottom-nav-haptic text-theme-text-muted hover:text-theme-text hover:bg-theme-card-hover"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark'} theme`}
          >
            <ThemeIcon className="w-5 h-5 mb-1 bottom-nav-icon" />
            <span className="text-xs font-medium leading-none">Theme</span>
          </button>
        </div>
      </div>
    </nav>
  );
}