'use client';

import React from 'react';

export interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'spinner' | 'skeleton' | 'dots';
  fullScreen?: boolean;
  className?: string;
}

/**
 * Loading spinner component for authentication states
 */
export default function LoadingSpinner({
  message = 'Loading...',
  size = 'medium',
  variant = 'spinner',
  fullScreen = false,
  className = '',
}: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  const containerClasses = fullScreen
    ? 'fixed inset-0 bg-theme-bg text-theme-text flex items-center justify-center z-50'
    : 'flex items-center justify-center p-8';

  if (variant === 'skeleton') {
    return (
      <div className={`${containerClasses} ${className}`}>
        <div className="space-y-4 w-full max-w-md">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-theme-border h-12 w-12"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-theme-border rounded w-3/4"></div>
              <div className="h-4 bg-theme-border rounded w-1/2"></div>
            </div>
          </div>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-theme-border rounded"></div>
            <div className="h-4 bg-theme-border rounded w-5/6"></div>
            <div className="h-4 bg-theme-border rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'dots') {
    return (
      <div className={`${containerClasses} ${className}`}>
        <div className="text-center">
          <div className="flex space-x-1 mb-4">
            <div className="w-2 h-2 bg-theme-primary rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-theme-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-theme-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          {message && (
            <div className="text-theme-text-secondary text-sm font-medium">{message}</div>
          )}
        </div>
      </div>
    );
  }

  // Default spinner variant
  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="text-center">
        <div className={`${sizeClasses[size]} mx-auto mb-4 animate-spin rounded-full border-2 border-theme-border border-t-theme-primary`}></div>
        {message && (
          <div className="text-theme-text-secondary text-sm font-medium">{message}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Inline loading spinner for use within components
 */
export function InlineSpinner({
  size = 'small',
  className = '',
}: Pick<LoadingSpinnerProps, 'size' | 'className'>) {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8',
  };

  return (
    <div
      className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-theme-border border-t-theme-primary ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Page-level loading component
 */
export function PageLoading({
  title = 'Loading',
  message = 'Please wait while we load your content...',
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="min-h-screen bg-theme-bg text-theme-text flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="w-16 h-16 mx-auto mb-6 animate-spin rounded-full border-4 border-theme-border border-t-theme-primary"></div>
        <h2 className="text-2xl font-semibold text-theme-text mb-4">{title}</h2>
        <p className="text-theme-text-secondary">{message}</p>
        
        {/* Progress indicator */}
        <div className="mt-8">
          <div className="w-full bg-theme-border rounded-full h-1">
            <div className="bg-theme-primary h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Auth-specific loading states
 */
export function AuthLoading({
  action = 'authenticating',
}: {
  action?: 'authenticating' | 'logging-in' | 'logging-out' | 'verifying' | 'redirecting';
}) {
  const messages = {
    authenticating: 'Authenticating your account...',
    'logging-in': 'Logging you in...',
    'logging-out': 'Logging you out...',
    verifying: 'Verifying your access...',
    redirecting: 'Redirecting...',
  };

  const icons = {
    authenticating: '🔐',
    'logging-in': '🚪',
    'logging-out': '👋',
    verifying: '✅',
    redirecting: '↩️',
  };

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8 bg-theme-card border border-theme-border rounded-xl shadow-lg">
        <div className="text-6xl mb-4">{icons[action]}</div>
        <div className="w-12 h-12 mx-auto mb-6 animate-spin rounded-full border-4 border-theme-border border-t-theme-primary"></div>
        <h2 className="text-xl font-semibold text-theme-text mb-2">Please Wait</h2>
        <p className="text-theme-text-secondary">{messages[action]}</p>
      </div>
    </div>
  );
}