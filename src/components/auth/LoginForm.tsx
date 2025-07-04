/**
 * Login Form Component
 * Handles user authentication with email and password
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { LoginCredentials } from '@/types/auth';
import { useAuthForm } from '@/hooks/useAuth';

export interface LoginFormProps {
  onSuccess?: (user: any) => void;
  redirectTo?: string;
  showRegisterLink?: boolean;
  className?: string;
}

export function LoginForm({ 
  onSuccess, 
  redirectTo = '/dashboard', 
  showRegisterLink = true,
  className = '' 
}: LoginFormProps) {
  const router = useRouter();
  const { handleLogin, isSubmitting, formError, clearFormError } = useAuthForm();
  
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: '',
    remember_me: false
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Form validation
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    
    // Email validation
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await handleLogin(formData);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess({ email: formData.email });
      }
      
      // Redirect to specified path
      router.push(redirectTo);
    } catch (error) {
      console.error('Login failed:', error);
    }
  }, [formData, validateForm, handleLogin, onSuccess, router, redirectTo]);

  // Handle input changes
  const handleInputChange = useCallback((field: keyof LoginCredentials, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific validation error
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Clear form error
    if (formError) {
      clearFormError();
    }
  }, [validationErrors, formError, clearFormError]);

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-theme-text">
          Sign In
        </h1>
        <p className="mt-2 text-theme-text-muted">
          Sign in to your Gayed Signals Dashboard account
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Global Error */}
        {formError && (
          <div className="rounded-md bg-theme-danger-bg border border-theme-danger-border p-4">
            <div className="text-sm text-theme-danger">
              {formError}
            </div>
          </div>
        )}

        {/* Email Field */}
        <div>
          <label 
            htmlFor="email" 
            className="block text-sm font-medium text-theme-text-secondary"
          >
            Email Address
          </label>
          <div className="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`
                block w-full px-3 py-2 border rounded-md shadow-sm 
                bg-theme-card 
                text-theme-text
                placeholder-theme-text-muted
                border-theme-border
                focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-theme-primary
                transition-colors duration-200
                ${validationErrors.email 
                  ? 'border-theme-danger text-theme-danger placeholder-theme-danger focus:ring-theme-danger focus:border-theme-danger' 
                  : 'hover:border-theme-border-hover'
                }
              `}
              placeholder="Enter your email"
              disabled={isSubmitting}
            />
            {validationErrors.email && (
              <p className="mt-1 text-sm text-theme-danger">
                {validationErrors.email}
              </p>
            )}
          </div>
        </div>

        {/* Password Field */}
        <div>
          <label 
            htmlFor="password" 
            className="block text-sm font-medium text-theme-text-secondary"
          >
            Password
          </label>
          <div className="mt-1 relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className={`
                block w-full px-3 py-2 pr-10 border rounded-md shadow-sm 
                bg-theme-card 
                text-theme-text
                placeholder-theme-text-muted
                border-theme-border
                focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-theme-primary
                transition-colors duration-200
                ${validationErrors.password 
                  ? 'border-theme-danger text-theme-danger placeholder-theme-danger focus:ring-theme-danger focus:border-theme-danger' 
                  : 'hover:border-theme-border-hover'
                }
              `}
              placeholder="Enter your password"
              disabled={isSubmitting}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isSubmitting}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5 text-theme-text-muted hover:text-theme-text-secondary transition-colors" />
              ) : (
                <EyeIcon className="h-5 w-5 text-theme-text-muted hover:text-theme-text-secondary transition-colors" />
              )}
            </button>
            {validationErrors.password && (
              <p className="mt-1 text-sm text-theme-danger">
                {validationErrors.password}
              </p>
            )}
          </div>
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={formData.remember_me || false}
              onChange={(e) => handleInputChange('remember_me', e.target.checked)}
              className="h-4 w-4 text-theme-primary focus:ring-theme-primary border-theme-border rounded"
              disabled={isSubmitting}
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-theme-text-secondary">
              Remember me
            </label>
          </div>

          <div className="text-sm">
            <Link
              href="/forgot-password"
              className="font-medium text-theme-primary hover:text-theme-primary-hover transition-colors"
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`
              group relative w-full flex justify-center py-2 px-4 border border-transparent 
              text-sm font-medium rounded-md text-white 
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              ${isSubmitting 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800'
              }
            `}
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </div>
            ) : (
              'Sign in'
            )}
          </button>
        </div>

        {/* Register Link */}
        {showRegisterLink && (
          <div className="text-center">
            <p className="text-sm text-theme-text-muted">
              Don't have an account?{' '}
              <Link
                href="/register"
                className="font-medium text-theme-primary hover:text-theme-primary-hover transition-colors"
              >
                Sign up here
              </Link>
            </p>
          </div>
        )}
      </form>

      {/* Development Test User */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-theme-warning-bg border border-theme-warning-border rounded-md">
          <h3 className="text-sm font-medium text-theme-warning">
            Development Test User
          </h3>
          <p className="mt-1 text-sm text-theme-text-secondary">
            Email: test@example.com<br />
            Password: testpassword123
          </p>
          <button
            type="button"
            onClick={() => {
              setFormData({
                email: 'test@example.com',
                password: 'testpassword123',
                remember_me: false
              });
            }}
            className="mt-2 text-sm text-theme-warning underline hover:no-underline transition-colors"
            disabled={isSubmitting}
          >
            Fill test credentials
          </button>
        </div>
      )}
    </div>
  );
}

export default LoginForm;