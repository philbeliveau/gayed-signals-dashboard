'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { User } from '@/types/auth';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'register' | 'forgot-password';
  onModeChange?: (mode: 'login' | 'register' | 'forgot-password') => void;
  onSuccess?: (user: User) => void;
  className?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  mode,
  onModeChange,
  onSuccess,
  className = ''
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Handle ESC key press
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => document.removeEventListener('keydown', handleEscapeKey);
    }
  }, [isOpen, onClose]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Store the previously focused element
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      // Focus the modal container
      if (modalRef.current) {
        modalRef.current.focus();
      }
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restore focus to the previously focused element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
      
      // Restore body scroll
      document.body.style.overflow = 'unset';
    }

    // Cleanup
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Focus trap functionality
  useEffect(() => {
    if (!isOpen) return;

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const modal = modalRef.current;
      if (!modal) return;

      const focusableElements = modal.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleModeSwitch = (newMode: 'login' | 'register' | 'forgot-password') => {
    if (onModeChange) {
      onModeChange(newMode);
    }
  };

  const handleAuthSuccess = (user: User) => {
    if (onSuccess) {
      onSuccess(user);
    }
    onClose();
  };

  if (!isOpen) return null;

  const renderContent = () => {
    switch (mode) {
      case 'login':
        return (
          <LoginForm
            onSuccess={handleAuthSuccess}
            showRegisterLink={false}
            className="max-w-none p-0 bg-transparent border-0 shadow-none"
          />
        );
      
      case 'register':
        return (
          <RegisterForm
            onSuccess={handleAuthSuccess}
            showLoginLink={false}
            className="max-w-none p-0 bg-transparent border-0 shadow-none"
          />
        );
      
      case 'forgot-password':
        return (
          <div className="text-center p-6">
            <h3 className="text-lg font-semibold text-theme-text mb-4">
              Forgot Password
            </h3>
            <p className="text-theme-text-muted mb-4">
              Password reset functionality will be implemented here.
            </p>
            <button
              onClick={() => handleModeSwitch('login')}
              className="text-theme-primary hover:text-theme-primary-hover font-medium"
            >
              Back to Login
            </button>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        ref={modalRef}
        className={`
          bg-theme-card border border-theme-border rounded-xl shadow-2xl w-full max-w-md
          transform transition-all duration-200 scale-100 opacity-100
          focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2 focus:ring-offset-theme-bg
          ${className}
        `}
        tabIndex={-1}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-theme-border">
          <h2 id="auth-modal-title" className="text-xl font-semibold text-theme-text">
            {mode === 'login' && 'Welcome Back'}
            {mode === 'register' && 'Create Account'}
            {mode === 'forgot-password' && 'Reset Password'}
          </h2>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-theme-bg-secondary rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-theme-primary"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-theme-text-muted" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {renderContent()}
        </div>

        {/* Modal Footer - Mode Switching */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-center space-x-1 text-sm">
            {mode === 'login' && (
              <>
                <span className="text-theme-text-muted">Don't have an account?</span>
                <button
                  onClick={() => handleModeSwitch('register')}
                  className="text-theme-primary hover:text-theme-primary-hover font-medium focus:outline-none focus:underline"
                >
                  Sign up
                </button>
              </>
            )}
            
            {mode === 'register' && (
              <>
                <span className="text-theme-text-muted">Already have an account?</span>
                <button
                  onClick={() => handleModeSwitch('login')}
                  className="text-theme-primary hover:text-theme-primary-hover font-medium focus:outline-none focus:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>

          {mode === 'login' && (
            <div className="text-center mt-3">
              <button
                onClick={() => handleModeSwitch('forgot-password')}
                className="text-sm text-theme-primary hover:text-theme-primary-hover font-medium focus:outline-none focus:underline"
              >
                Forgot your password?
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};