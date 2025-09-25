'use client';

import React, { ReactNode } from 'react';
import RouteGuard, { RouteGuardProps } from './RouteGuard';
import UnauthorizedMessage from './UnauthorizedMessage';

export interface RoleGuardProps {
  children: ReactNode;
  roles: string[];
  requireAll?: boolean; // true = require ALL roles, false = require ANY role
  fallback?: ReactNode;
  loadingComponent?: ReactNode;
  unauthorizedComponent?: ReactNode;
  redirectTo?: string;
  onUnauthorized?: () => void;
  requireEmailVerification?: boolean;
}

/**
 * Specialized route guard for role-based access control
 * Allows control based on user roles/groups
 */
export default function RoleGuard({
  children,
  roles,
  requireAll = false, // Default to "any role" for more flexibility
  fallback,
  loadingComponent,
  unauthorizedComponent,
  redirectTo,
  onUnauthorized,
  requireEmailVerification = false,
}: RoleGuardProps) {
  const roleText = requireAll 
    ? `all of these roles: ${roles.join(', ')}`
    : `one of these roles: ${roles.join(', ')}`;

  const defaultUnauthorizedComponent = (
    <UnauthorizedMessage
      title="Insufficient Role Privileges"
      message={`You need ${roleText} to access this content.`}
      showLoginButton={false}
      showHomeButton={true}
      showContactSupport={true}
    />
  );

  const { useAuth } = require('../../contexts/AuthContext');
  const auth = useAuth();

  // Show loading component while auth is initializing
  if (!auth.isInitialized || auth.isLoading) {
    return <>{loadingComponent || <div>Loading...</div>}</>;
  }

  // Check if user is authenticated
  if (!auth.isAuthenticated) {
    if (onUnauthorized) onUnauthorized();
    return <>{unauthorizedComponent || defaultUnauthorizedComponent}</>;
  }

  // Check roles
  const hasRequiredRoles = requireAll
    ? roles.every(role => auth.hasRole(role))
    : roles.some(role => auth.hasRole(role));

  if (!hasRequiredRoles) {
    if (onUnauthorized) onUnauthorized();
    return <>{unauthorizedComponent || defaultUnauthorizedComponent}</>;
  }

  return <>{children}</>;
}

/**
 * Wrapper component for "any role" logic
 */
function AnyRoleWrapper({
  children,
  roles,
  fallback,
}: {
  children: ReactNode;
  roles: string[];
  fallback: ReactNode;
}) {
  const { useAuth } = require('../../contexts/AuthContext');
  const auth = useAuth();

  // Check if user has any of the required roles
  const hasAnyRole = roles.some(role => auth.hasRole(role));

  if (!hasAnyRole) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Higher-order component version of RoleGuard
 */
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  guardProps: Omit<RoleGuardProps, 'children'>
) {
  return function RoleGuardedComponent(props: P) {
    return (
      <RoleGuard {...guardProps}>
        <Component {...props} />
      </RoleGuard>
    );
  };
}

/**
 * Hook for checking roles without rendering
 */
export function useRoles(roles: string[], requireAll = false) {
  const { useAuth } = require('../../contexts/AuthContext');
  const auth = useAuth();

  const hasRoles = requireAll
    ? roles.every(role => auth.hasRole(role))
    : roles.some(role => auth.hasRole(role));

  return {
    hasRoles,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    user: auth.user,
    isAdmin: auth.isAdmin(),
  };
}