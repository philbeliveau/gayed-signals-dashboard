'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
  User, 
  Settings, 
  LogOut, 
  Shield, 
  ChevronDown,
  Mail,
  Calendar,
  Bell,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { InlineSpinner } from '../auth/LoadingSpinner';

export interface UserMenuProps {
  variant?: 'dropdown' | 'sidebar' | 'inline';
  className?: string;
  showNotifications?: boolean;
  showFullName?: boolean;
  onLogout?: () => void;
}

/**
 * User menu component with authentication-aware features
 */
export default function UserMenu({
  variant = 'dropdown',
  className = '',
  showNotifications = true,
  showFullName = true,
  onLogout,
}: UserMenuProps) {
  const auth = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle logout
  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
      return;
    }

    setIsLoggingOut(true);
    try {
      await auth.actions.logout();
      setIsOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // If not authenticated, show login button
  if (!auth.state.isAuthenticated) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Link
          href="/login"
          className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-lg transition-colors font-medium"
        >
          Log In
        </Link>
        <Link
          href="/register"
          className="px-4 py-2 bg-theme-card-secondary hover:bg-theme-card-hover text-theme-text border border-theme-border rounded-lg transition-colors font-medium"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  // If loading or no user data
  if (auth.state.isLoading || !auth.state.user) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <InlineSpinner size="small" />
        <span className="text-sm text-theme-text-muted">Loading...</span>
      </div>
    );
  }

  const user = auth.state.user;

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user.full_name) {
      return user.full_name
        .split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user.email[0].toUpperCase();
  };

  // Get display name
  const getDisplayName = () => {
    if (showFullName && user.full_name) {
      return user.full_name;
    }
    return user.email.split('@')[0];
  };

  // Sidebar variant
  if (variant === 'sidebar') {
    return (
      <div className={`space-y-3 ${className}`}>
        {/* User info */}
        <div className="flex items-center space-x-3 p-3 bg-theme-card-secondary rounded-lg">
          <div className="w-10 h-10 bg-theme-primary rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">
              {getUserInitials()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-theme-text truncate">
              {getDisplayName()}
            </div>
            <div className="text-xs text-theme-text-muted truncate">
              {user.email}
            </div>
            {user.is_superuser && (
              <div className="flex items-center space-x-1 mt-1">
                <Shield className="w-3 h-3 text-theme-warning" />
                <span className="text-xs text-theme-warning font-medium">Admin</span>
              </div>
            )}
          </div>
        </div>

        {/* Menu items */}
        <nav className="space-y-1">
          <Link
            href="/profile"
            className="flex items-center space-x-2 px-3 py-2 text-theme-text-muted hover:text-theme-text hover:bg-theme-card-hover rounded-lg transition-colors"
          >
            <User className="w-4 h-4" />
            <span>Profile</span>
          </Link>
          
          <Link
            href="/settings"
            className="flex items-center space-x-2 px-3 py-2 text-theme-text-muted hover:text-theme-text hover:bg-theme-card-hover rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </Link>

          {user.is_superuser && (
            <Link
              href="/admin"
              className="flex items-center space-x-2 px-3 py-2 text-theme-warning hover:bg-theme-warning-bg rounded-lg transition-colors"
            >
              <Shield className="w-4 h-4" />
              <span>Admin Panel</span>
            </Link>
          )}

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center space-x-2 px-3 py-2 text-theme-danger hover:bg-theme-danger-bg rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoggingOut ? (
              <InlineSpinner size="small" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            <span>Sign Out</span>
          </button>
        </nav>
      </div>
    );
  }

  // Inline variant
  if (variant === 'inline') {
    return (
      <div className={`flex items-center space-x-4 ${className}`}>
        {/* User avatar and info */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-theme-primary rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">
              {getUserInitials()}
            </span>
          </div>
          <div>
            <div className="text-sm font-medium text-theme-text">
              {getDisplayName()}
            </div>
            {user.is_superuser && (
              <div className="flex items-center space-x-1">
                <Shield className="w-3 h-3 text-theme-warning" />
                <span className="text-xs text-theme-warning">Admin</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center space-x-2">
          <Link
            href="/settings"
            className="p-2 hover:bg-theme-card-hover rounded-lg text-theme-text-muted hover:text-theme-text transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
          
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="p-2 hover:bg-theme-danger-bg rounded-lg text-theme-text-muted hover:text-theme-danger transition-colors disabled:opacity-50"
            title="Sign Out"
          >
            {isLoggingOut ? (
              <InlineSpinner size="small" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    );
  }

  // Default dropdown variant
  return (
    <div className={`relative ${className}`} ref={menuRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-theme-card-secondary hover:bg-theme-card-hover border border-theme-border rounded-lg transition-colors"
      >
        {/* User avatar */}
        <div className="w-8 h-8 bg-theme-primary rounded-full flex items-center justify-center">
          <span className="text-white font-medium text-sm">
            {getUserInitials()}
          </span>
        </div>

        {/* User name */}
        <div className="hidden sm:block text-left">
          <div className="text-sm font-medium text-theme-text">
            {getDisplayName()}
          </div>
          {user.is_superuser && (
            <div className="flex items-center space-x-1">
              <Shield className="w-3 h-3 text-theme-warning" />
              <span className="text-xs text-theme-warning">Admin</span>
            </div>
          )}
        </div>

        {/* Dropdown arrow */}
        <ChevronDown className={`w-4 h-4 text-theme-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-theme-card border border-theme-border rounded-xl shadow-lg z-50">
          {/* User info header */}
          <div className="p-4 border-b border-theme-border">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-theme-primary rounded-full flex items-center justify-center">
                <span className="text-white font-medium">
                  {getUserInitials()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-theme-text truncate">
                  {user.full_name || 'User'}
                </div>
                <div className="text-xs text-theme-text-muted truncate">
                  {user.email}
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  {user.is_superuser && (
                    <div className="flex items-center space-x-1">
                      <Shield className="w-3 h-3 text-theme-warning" />
                      <span className="text-xs text-theme-warning font-medium">Administrator</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-theme-success rounded-full"></div>
                    <span className="text-xs text-theme-success">Online</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="p-2">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-3 py-2 text-theme-text hover:bg-theme-card-hover rounded-lg transition-colors"
            >
              <User className="w-4 h-4" />
              <span>Your Profile</span>
            </Link>

            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-3 py-2 text-theme-text hover:bg-theme-card-hover rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Link>

            {showNotifications && (
              <button
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center space-x-3 px-3 py-2 text-theme-text hover:bg-theme-card-hover rounded-lg transition-colors"
              >
                <Bell className="w-4 h-4" />
                <span>Notifications</span>
                <span className="ml-auto bg-theme-primary text-white text-xs px-2 py-1 rounded-full">3</span>
              </button>
            )}

            {user.is_superuser && (
              <>
                <div className="border-t border-theme-border my-2"></div>
                <Link
                  href="/admin"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-3 px-3 py-2 text-theme-warning hover:bg-theme-warning-bg rounded-lg transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin Panel</span>
                </Link>
              </>
            )}

            <div className="border-t border-theme-border my-2"></div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center space-x-3 px-3 py-2 text-theme-text hover:bg-theme-card-hover rounded-lg transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Help & Support</span>
            </button>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center space-x-3 px-3 py-2 text-theme-danger hover:bg-theme-danger-bg rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoggingOut ? (
                <InlineSpinner size="small" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}