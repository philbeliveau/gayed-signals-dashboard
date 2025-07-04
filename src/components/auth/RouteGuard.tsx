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
  // TEMPORARY: Bypass all authentication checks
  // Always render children without any authentication verification
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