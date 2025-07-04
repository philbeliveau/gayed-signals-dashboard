'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Home, LogIn, Mail, ArrowLeft } from 'lucide-react';

export interface UnauthorizedMessageProps {
  title?: string;
  message?: string;
  showLoginButton?: boolean;
  showHomeButton?: boolean;
  showBackButton?: boolean;
  showContactSupport?: boolean;
  customActions?: React.ReactNode;
  variant?: 'unauthorized' | 'forbidden' | 'expired' | 'maintenance';
  className?: string;
}

/**
 * Professional unauthorized/error message component
 */
export default function UnauthorizedMessage({
  title,
  message,
  showLoginButton = true,
  showHomeButton = true,
  showBackButton = false,
  showContactSupport = false,
  customActions,
  variant = 'unauthorized',
  className = '',
}: UnauthorizedMessageProps) {
  const variants = {
    unauthorized: {
      icon: Shield,
      iconColor: 'text-theme-warning',
      bgColor: 'bg-theme-warning-bg',
      borderColor: 'border-theme-warning-border',
      defaultTitle: 'Authentication Required',
      defaultMessage: 'You need to be logged in to access this page.',
    },
    forbidden: {
      icon: Shield,
      iconColor: 'text-theme-danger',
      bgColor: 'bg-theme-danger-bg',
      borderColor: 'border-theme-danger-border',
      defaultTitle: 'Access Forbidden',
      defaultMessage: 'You don\'t have permission to access this resource.',
    },
    expired: {
      icon: Shield,
      iconColor: 'text-theme-warning',
      bgColor: 'bg-theme-warning-bg',
      borderColor: 'border-theme-warning-border',
      defaultTitle: 'Session Expired',
      defaultMessage: 'Your session has expired. Please log in again.',
    },
    maintenance: {
      icon: Shield,
      iconColor: 'text-theme-info',
      bgColor: 'bg-theme-info-bg',
      borderColor: 'border-theme-info-border',
      defaultTitle: 'Maintenance Mode',
      defaultMessage: 'This feature is temporarily unavailable for maintenance.',
    },
  };

  const config = variants[variant];
  const IconComponent = config.icon;

  const finalTitle = title || config.defaultTitle;
  const finalMessage = message || config.defaultMessage;

  return (
    <div className={`min-h-screen bg-theme-bg text-theme-text flex items-center justify-center p-4 ${className}`}>
      <div className={`max-w-md w-full mx-auto text-center p-8 bg-theme-card border ${config.borderColor} rounded-xl shadow-lg`}>
        {/* Icon */}
        <div className={`inline-flex items-center justify-center w-16 h-16 ${config.bgColor} rounded-full mb-6`}>
          <IconComponent className={`w-8 h-8 ${config.iconColor}`} />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-theme-text mb-4">
          {finalTitle}
        </h1>

        {/* Message */}
        <p className="text-theme-text-secondary mb-8 leading-relaxed">
          {finalMessage}
        </p>

        {/* Action Buttons */}
        <div className="space-y-4">
          {/* Custom actions */}
          {customActions && (
            <div className="mb-4">
              {customActions}
            </div>
          )}

          {/* Default action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {showLoginButton && (
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-6 py-3 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-lg transition-colors duration-200 font-medium"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Log In
              </Link>
            )}

            {showHomeButton && (
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 bg-theme-card-secondary hover:bg-theme-card-hover text-theme-text border border-theme-border rounded-lg transition-colors duration-200 font-medium"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Link>
            )}

            {showBackButton && (
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center justify-center px-6 py-3 bg-theme-card-secondary hover:bg-theme-card-hover text-theme-text border border-theme-border rounded-lg transition-colors duration-200 font-medium"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </button>
            )}
          </div>

          {/* Contact support */}
          {showContactSupport && (
            <div className="pt-4 border-t border-theme-border">
              <p className="text-sm text-theme-text-light mb-3">
                Need help? Contact support for assistance.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-4 py-2 text-theme-primary hover:text-theme-primary-hover border border-theme-primary/20 hover:border-theme-primary/40 rounded-lg transition-colors duration-200 text-sm font-medium"
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact Support
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Specific unauthorized message variants
 */
export function LoginRequiredMessage(props: Omit<UnauthorizedMessageProps, 'variant'>) {
  return (
    <UnauthorizedMessage
      variant="unauthorized"
      title="Login Required"
      message="Please log in to access this page."
      showLoginButton={true}
      showHomeButton={true}
      {...props}
    />
  );
}

export function ForbiddenMessage(props: Omit<UnauthorizedMessageProps, 'variant'>) {
  return (
    <UnauthorizedMessage
      variant="forbidden"
      title="Access Forbidden"
      message="You don't have permission to view this page."
      showLoginButton={false}
      showHomeButton={true}
      showContactSupport={true}
      {...props}
    />
  );
}

export function SessionExpiredMessage(props: Omit<UnauthorizedMessageProps, 'variant'>) {
  return (
    <UnauthorizedMessage
      variant="expired"
      title="Session Expired"
      message="Your session has expired. Please log in again to continue."
      showLoginButton={true}
      showHomeButton={true}
      {...props}
    />
  );
}

export function MaintenanceMessage(props: Omit<UnauthorizedMessageProps, 'variant'>) {
  return (
    <UnauthorizedMessage
      variant="maintenance"
      title="Under Maintenance"
      message="This page is temporarily unavailable while we perform maintenance."
      showLoginButton={false}
      showHomeButton={true}
      {...props}
    />
  );
}

/**
 * Inline unauthorized component for use within other components
 */
export function InlineUnauthorized({
  title = 'Access Restricted',
  message = 'You don\'t have permission to view this content.',
  showActions = true,
}: {
  title?: string;
  message?: string;
  showActions?: boolean;
}) {
  return (
    <div className="text-center p-8 bg-theme-card-secondary border border-theme-border rounded-lg">
      <div className="inline-flex items-center justify-center w-12 h-12 bg-theme-warning-bg rounded-full mb-4">
        <Shield className="w-6 h-6 text-theme-warning" />
      </div>
      
      <h3 className="text-lg font-semibold text-theme-text mb-2">{title}</h3>
      <p className="text-theme-text-secondary mb-4">{message}</p>
      
      {showActions && (
        <div className="flex justify-center space-x-3">
          <Link
            href="/login"
            className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-lg text-sm font-medium transition-colors"
          >
            Log In
          </Link>
          <Link
            href="/"
            className="px-4 py-2 bg-theme-card-secondary hover:bg-theme-card-hover text-theme-text border border-theme-border rounded-lg text-sm font-medium transition-colors"
          >
            Home
          </Link>
        </div>
      )}
    </div>
  );
}