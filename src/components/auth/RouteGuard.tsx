/**
 * Route Guard Component
 * Protects routes based on authentication status
 */

'use client';

import React, { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export interface RouteGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireSuperuser?: boolean;
  fallbackPath?: string;
  loadingComponent?: ReactNode;
}

function RouteGuard({
  children,
  requireAuth = true,
  requireSuperuser = false,
  fallbackPath = '/login',
  loadingComponent
}: RouteGuardProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, isInitialized } = useAuth();

  useEffect(() => {
    // Only check after initialization is complete
    if (!isInitialized) return;

    // Check authentication requirement
    if (requireAuth && !isAuthenticated) {
      // Store current path for redirect after login
      const currentPath = window.location.pathname;
      if (currentPath !== fallbackPath) {
        sessionStorage.setItem('auth_redirect_url', currentPath);
      }
      router.push(fallbackPath);
      return;
    }

    // Check superuser requirement
    if (requireSuperuser && (!user || !user.is_superuser)) {
      router.push('/unauthorized');
      return;
    }
  }, [isInitialized, isAuthenticated, requireAuth, requireSuperuser, user, router, fallbackPath]);

  // Show loading while initializing or checking auth
  if (!isInitialized || (requireAuth && isLoading)) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Don't render if auth requirements aren't met
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  if (requireSuperuser && (!user || !user.is_superuser)) {
    return null;
  }

  // Render children if all checks pass
  return <>{children}</>;
}

// Higher-order component version
export function withRouteGuard<P extends object>(
  Component: React.ComponentType<P>,
  guardProps?: Omit<RouteGuardProps, 'children'>
) {
  return function ProtectedComponent(props: P) {
    return (
      <RouteGuard {...guardProps}>
        <Component {...props} />
      </RouteGuard>
    );
  };
}

export { RouteGuard };
export default RouteGuard;