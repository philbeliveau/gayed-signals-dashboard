'use client';

import React, { ReactNode } from 'react';
import RouteGuard, { RouteGuardProps } from './RouteGuard';
import UnauthorizedMessage from './UnauthorizedMessage';

export interface AdminRouteGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  loadingComponent?: ReactNode;
  unauthorizedComponent?: ReactNode;
  redirectTo?: string;
  onUnauthorized?: () => void;
  requireEmailVerification?: boolean;
}

/**
 * Specialized route guard for admin-only routes
 * Automatically requires authentication and admin privileges
 */
export default function AdminRouteGuard({
  children,
  fallback,
  loadingComponent,
  unauthorizedComponent,
  redirectTo,
  onUnauthorized,
  requireEmailVerification = false,
}: AdminRouteGuardProps) {
  const defaultUnauthorizedComponent = (
    <UnauthorizedMessage
      title="Administrator Access Required"
      message="This page is restricted to administrators only. Please contact your system administrator if you believe you should have access."
      showLoginButton={false}
      showHomeButton={true}
      showContactSupport={true}
    />
  );

  return (
    <RouteGuard
      requireAuth={true}
      requireSuperuser={true}
      fallbackPath={redirectTo}
      loadingComponent={loadingComponent}
    >
      {children}
    </RouteGuard>
  );
}

/**
 * Higher-order component version of AdminRouteGuard
 */
export function withAdminGuard<P extends object>(
  Component: React.ComponentType<P>,
  guardProps?: Omit<AdminRouteGuardProps, 'children'>
) {
  return function AdminGuardedComponent(props: P) {
    return (
      <AdminRouteGuard {...guardProps}>
        <Component {...props} />
      </AdminRouteGuard>
    );
  };
}