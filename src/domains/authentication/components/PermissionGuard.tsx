'use client';

import React, { ReactNode } from 'react';
import RouteGuard, { RouteGuardProps } from './RouteGuard';
import UnauthorizedMessage from './UnauthorizedMessage';

export interface PermissionGuardProps {
  children: ReactNode;
  permissions: string[];
  requireAll?: boolean; // true = require ALL permissions, false = require ANY permission
  fallback?: ReactNode;
  loadingComponent?: ReactNode;
  unauthorizedComponent?: ReactNode;
  redirectTo?: string;
  onUnauthorized?: () => void;
  requireEmailVerification?: boolean;
}

/**
 * Specialized route guard for permission-based access control
 * Allows granular control over feature access
 */
export default function PermissionGuard({
  children,
  permissions,
  requireAll = true,
  fallback,
  loadingComponent,
  unauthorizedComponent,
  redirectTo,
  onUnauthorized,
  requireEmailVerification = false,
}: PermissionGuardProps) {
  const permissionText = requireAll 
    ? `all of these permissions: ${permissions.join(', ')}`
    : `one of these permissions: ${permissions.join(', ')}`;

  const defaultUnauthorizedComponent = (
    <UnauthorizedMessage
      title="Insufficient Permissions"
      message={`You need ${permissionText} to access this feature.`}
      showLoginButton={false}
      showHomeButton={true}
      showContactSupport={true}
    />
  );

  // Custom permission checking logic
  const customRequiredPermissions = requireAll ? permissions : [];
  
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

  // Check permissions
  const hasRequiredPermissions = requireAll
    ? permissions.every(permission => auth.hasPermission(permission))
    : permissions.some(permission => auth.hasPermission(permission));

  if (!hasRequiredPermissions) {
    if (onUnauthorized) onUnauthorized();
    return <>{unauthorizedComponent || defaultUnauthorizedComponent}</>;
  }

  return <>{children}</>;
}

/**
 * Wrapper component for "any permission" logic
 */
function AnyPermissionWrapper({
  children,
  permissions,
  fallback,
}: {
  children: ReactNode;
  permissions: string[];
  fallback: ReactNode;
}) {
  const { useAuth } = require('../../contexts/AuthContext');
  const auth = useAuth();

  // Check if user has any of the required permissions
  const hasAnyPermission = permissions.some(permission => 
    auth.hasPermission(permission)
  );

  if (!hasAnyPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Higher-order component version of PermissionGuard
 */
export function withPermissionGuard<P extends object>(
  Component: React.ComponentType<P>,
  guardProps: Omit<PermissionGuardProps, 'children'>
) {
  return function PermissionGuardedComponent(props: P) {
    return (
      <PermissionGuard {...guardProps}>
        <Component {...props} />
      </PermissionGuard>
    );
  };
}

/**
 * Hook for checking permissions without rendering
 */
export function usePermissions(permissions: string[], requireAll = true) {
  const { useAuth } = require('../../contexts/AuthContext');
  const auth = useAuth();

  const hasPermissions = requireAll
    ? permissions.every(permission => auth.hasPermission(permission))
    : permissions.some(permission => auth.hasPermission(permission));

  return {
    hasPermissions,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    user: auth.user,
  };
}