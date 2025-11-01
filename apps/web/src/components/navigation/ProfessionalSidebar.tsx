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
  MessageSquareMore,
  User,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { getNavigationRoutes, NavigationRoute } from '@/lib/navigation';

interface ProfessionalSidebarProps {
  className?: string;
}

/**
 * Professional wide sidebar with grouped sections
 * Features dark theme with full-width navigation items
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

  // Group routes by section
  const groupedRoutes = navigationRoutes.reduce((acc, route) => {
    const section = route.section || 'OTHER';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(route);
    return acc;
  }, {} as Record<string, NavigationRoute[]>);

  // Define section order
  const sectionOrder = ['MAIN', 'ANALYSIS', 'PROFILE'];

  return (
    <aside className={`hidden md:block fixed inset-y-0 left-0 z-50 modern-sidebar ${className}`}>
      <div className="flex flex-col w-[260px] h-full">
        {/* Logo Section */}
        <div className="flex items-center px-6 h-20">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-lg p-1.5 flex items-center justify-center">
              <img
                src="/logo.webp"
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-white text-lg font-semibold tracking-tight">Gayed Report</span>
          </Link>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 px-3 py-6 overflow-y-auto">
          {sectionOrder.map((section) => {
            const routes = groupedRoutes[section];
            if (!routes || routes.length === 0) return null;

            return (
              <div key={section} className="mb-8">
                {/* Section Header */}
                <div className="px-3 mb-3">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {section}
                  </h3>
                </div>

                {/* Section Items */}
                <div className="space-y-1">
                  {routes.map((route) => {
                    const IconComponent = getIcon(route.icon);
                    const isActive = isActiveRoute(route.path);

                    return (
                      <Link
                        key={route.path}
                        href={route.path}
                        className={`
                          flex items-center space-x-3 px-3 py-2.5 rounded-lg
                          transition-all duration-200
                          ${isActive
                            ? 'bg-purple-600 text-white'
                            : 'text-gray-300 hover:bg-white/5 hover:text-white'
                          }
                        `}
                      >
                        <IconComponent className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm font-medium">{route.displayName}</span>
                        {route.adminOnly && (
                          <Shield className="w-3 h-3 text-yellow-300 ml-auto" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Add Profile section items if authenticated */}
          {isSignedIn && !groupedRoutes['PROFILE'] && (
            <div className="mb-8">
              <div className="px-3 mb-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  PROFILE
                </h3>
              </div>
              <div className="space-y-1">
                <Link
                  href="/settings"
                  className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-white/5 hover:text-white transition-all duration-200"
                >
                  <Settings className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">Settings</span>
                </Link>
                <Link
                  href="/help"
                  className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-white/5 hover:text-white transition-all duration-200"
                >
                  <HelpCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">Help</span>
                </Link>
              </div>
            </div>
          )}
        </nav>
      </div>
    </aside>
  );
}