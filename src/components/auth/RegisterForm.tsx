'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, UserPlus, Mail, Lock, User as UserIcon, Check, X, AlertTriangle } from 'lucide-react';
import { FormField } from './FormField';
import LoadingSpinner from './LoadingSpinner';
import { ErrorAlert } from './ErrorAlert';
import { User, RegisterData } from '@/types/auth';
import { useAuthForm } from '@/hooks/useAuth';

export interface RegisterFormProps {
  onSuccess?: (user: User) => void;
  onError?: (error: string) => void;
  redirectTo?: string;
  showLoginLink?: boolean;
  requireTerms?: boolean;
  className?: string;
}

interface RegisterFormState {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  termsAccepted: boolean;
  isCheckingUsername: boolean;
  errors: {
    email?: string;
    username?: string;
    password?: string;
    confirmPassword?: string;
    fullName?: string;
    terms?: string;
    general?: string;
  };
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  suggestions: string[];
}

// Simple username validation - can be enhanced with real API calls later
const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  // For now, just check against some reserved usernames
  const unavailableUsernames = ['admin', 'test', 'user', 'demo', 'root', 'api', 'www'];
  return !unavailableUsernames.includes(username.toLowerCase());
};

function RegisterForm({
  onSuccess,
  onError,
  redirectTo = '/dashboard',
  showLoginLink = true,
  requireTerms = true,
  className = ''
}: RegisterFormProps) {
  const router = useRouter();
  const { handleRegister, isSubmitting, formError, clearFormError } = useAuthForm();
  const [state, setState] = useState<RegisterFormState>({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    termsAccepted: false,
    isCheckingUsername: false,
    errors: {}
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    label: '',
    color: '',
    suggestions: []
  });

  // Password strength calculation
  const calculatePasswordStrength = (password: string): PasswordStrength => {
    let score = 0;
    const suggestions: string[] = [];

    if (password.length >= 8) score += 1;
    else suggestions.push('Use at least 8 characters');

    if (/[a-z]/.test(password)) score += 1;
    else suggestions.push('Include lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else suggestions.push('Include uppercase letters');

    if (/\d/.test(password)) score += 1;
    else suggestions.push('Include numbers');

    if (/[^a-zA-Z\d]/.test(password)) score += 1;
    else suggestions.push('Include special characters');

    const strengthMap = {
      0: { label: 'Very Weak', color: 'bg-red-500' },
      1: { label: 'Weak', color: 'bg-red-400' },
      2: { label: 'Fair', color: 'bg-yellow-500' },
      3: { label: 'Good', color: 'bg-yellow-400' },
      4: { label: 'Strong', color: 'bg-green-500' },
      5: { label: 'Very Strong', color: 'bg-green-600' }
    };

    const strength = strengthMap[score as keyof typeof strengthMap];

    return {
      score,
      label: strength.label,
      color: strength.color,
      suggestions
    };
  };

  // Update password strength when password changes
  useEffect(() => {
    if (state.password) {
      setPasswordStrength(calculatePasswordStrength(state.password));
    } else {
      setPasswordStrength({ score: 0, label: '', color: '', suggestions: [] });
    }
  }, [state.password]);

  // Check username availability with debounce
  useEffect(() => {
    const checkUsername = async () => {
      if (state.username.length < 3) {
        setUsernameAvailable(null);
        return;
      }

      setState(prev => ({ ...prev, isCheckingUsername: true }));
      
      try {
        const available = await checkUsernameAvailability(state.username);
        setUsernameAvailable(available);
      } catch (error) {
        setUsernameAvailable(null);
      } finally {
        setState(prev => ({ ...prev, isCheckingUsername: false }));
      }
    };

    const timer = setTimeout(checkUsername, 500);
    return () => clearTimeout(timer);
  }, [state.username]);

  // Validation functions
  const validateEmail = (email: string): string | undefined => {
    if (!email) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Please enter a valid email address';
    }
    return undefined;
  };

  const validateUsername = (username: string): string | undefined => {
    if (!username) return 'Username is required';
    if (username.length < 3) return 'Username must be at least 3 characters';
    if (username.length > 20) return 'Username must be less than 20 characters';
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return 'Username can only contain letters, numbers, hyphens, and underscores';
    }
    if (usernameAvailable === false) return 'Username is not available';
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (passwordStrength.score < 3) return 'Password is too weak';
    return undefined;
  };

  const validateConfirmPassword = (password: string, confirmPassword: string): string | undefined => {
    if (!confirmPassword) return 'Please confirm your password';
    if (password !== confirmPassword) return 'Passwords do not match';
    return undefined;
  };

  const validateFullName = (fullName: string): string | undefined => {
    if (!fullName) return 'Full name is required';
    if (fullName.trim().length < 2) return 'Full name must be at least 2 characters';
    return undefined;
  };

  const validateTerms = (accepted: boolean): string | undefined => {
    if (requireTerms && !accepted) return 'You must accept the terms and conditions';
    return undefined;
  };

  const validateForm = (): boolean => {
    const emailError = validateEmail(state.email);
    const usernameError = validateUsername(state.username);
    const passwordError = validatePassword(state.password);
    const confirmPasswordError = validateConfirmPassword(state.password, state.confirmPassword);
    const fullNameError = validateFullName(state.fullName);
    const termsError = validateTerms(state.termsAccepted);

    setState(prev => ({
      ...prev,
      errors: {
        email: emailError,
        username: usernameError,
        password: passwordError,
        confirmPassword: confirmPasswordError,
        fullName: fullNameError,
        terms: termsError
      }
    }));

    return !emailError && !usernameError && !passwordError && !confirmPasswordError && !fullNameError && !termsError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setState(prev => ({ ...prev, errors: {} }));
    clearFormError();

    try {
      const registerData: RegisterData = {
        email: state.email,
        username: state.username,
        password: state.password,
        full_name: state.fullName || undefined,
        terms_accepted: state.termsAccepted
      };

      await handleRegister(registerData);

      // Registration successful - the user is now logged in
      if (onSuccess) {
        // We don't have direct access to the user object here, but auth context is updated
        onSuccess({ 
          email: state.email, 
          username: state.username,
          full_name: state.fullName || null
        } as User);
      }

      // Handle redirect
      if (redirectTo) {
        router.push(redirectTo);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed. Please try again.';
      
      setState(prev => ({
        ...prev,
        errors: { general: errorMessage }
      }));

      if (onError) {
        onError(errorMessage);
      }
    }
  };

  const handleInputChange = (field: keyof Omit<RegisterFormState, 'isSubmitting' | 'isCheckingUsername' | 'errors' | 'termsAccepted'>) => 
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setState(prev => ({
        ...prev,
        [field]: e.target.value,
        errors: {
          ...prev.errors,
          [field]: undefined
        }
      }));
    };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({
      ...prev,
      termsAccepted: e.target.checked,
      errors: {
        ...prev.errors,
        terms: undefined
      }
    }));
  };

  return (
    <div className={`max-w-md mx-auto p-6 bg-theme-card border border-theme-border rounded-xl shadow-lg ${className}`}>
      <div className="text-center mb-6">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-theme-primary rounded-full">
            <UserPlus className="w-6 h-6 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-theme-text">Create Account</h2>
        <p className="text-theme-text-muted mt-2">Join the Gayed Signals Dashboard</p>
      </div>

      {(state.errors.general || formError) && (
        <ErrorAlert
          message={state.errors.general || formError || ''}
          type="error"
          onDismiss={() => {
            setState(prev => ({ ...prev, errors: { ...prev.errors, general: undefined } }));
            clearFormError();
          }}
          className="mb-4"
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Full Name"
          error={state.errors.fullName}
          required
        >
          <input
            type="text"
            value={state.fullName}
            onChange={handleInputChange('fullName')}
            placeholder="Enter your full name"
            disabled={isSubmitting}
            autoComplete="name"
            className="pl-10"
          />
          <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
        </FormField>

        <FormField
          label="Email Address"
          error={state.errors.email}
          required
        >
          <input
            type="email"
            value={state.email}
            onChange={handleInputChange('email')}
            placeholder="Enter your email"
            disabled={isSubmitting}
            autoComplete="email"
            className="pl-10"
          />
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
        </FormField>

        <FormField
          label="Username"
          error={state.errors.username}
          required
          helpText="3-20 characters, letters, numbers, hyphens, and underscores only"
        >
          <input
            type="text"
            value={state.username}
            onChange={handleInputChange('username')}
            placeholder="Choose a username"
            disabled={isSubmitting}
            autoComplete="username"
            className="pl-10 pr-10"
          />
          <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
          
          {state.isCheckingUsername && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <LoadingSpinner size="small" />
            </div>
          )}
          
          {!state.isCheckingUsername && state.username.length >= 3 && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {usernameAvailable === true ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : usernameAvailable === false ? (
                <X className="w-4 h-4 text-red-500" />
              ) : null}
            </div>
          )}
        </FormField>

        <FormField
          label="Password"
          error={state.errors.password}
          required
        >
          <input
            type={showPassword ? 'text' : 'password'}
            value={state.password}
            onChange={handleInputChange('password')}
            placeholder="Create a strong password"
            disabled={isSubmitting}
            autoComplete="new-password"
            className="pl-10 pr-10"
          />
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-theme-text-muted hover:text-theme-text"
            disabled={isSubmitting}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </FormField>

        {/* Password Strength Indicator */}
        {state.password && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-theme-text-muted">Password Strength</span>
              <span className="text-xs font-medium text-theme-text">{passwordStrength.label}</span>
            </div>
            <div className="h-2 bg-theme-bg-secondary rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
              />
            </div>
            {passwordStrength.suggestions.length > 0 && (
              <div className="text-xs text-theme-text-muted">
                <div className="font-medium mb-1">Suggestions:</div>
                <ul className="space-y-1">
                  {passwordStrength.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-theme-text-muted">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <FormField
          label="Confirm Password"
          error={state.errors.confirmPassword}
          required
        >
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            value={state.confirmPassword}
            onChange={handleInputChange('confirmPassword')}
            placeholder="Confirm your password"
            disabled={isSubmitting}
            autoComplete="new-password"
            className="pl-10 pr-10"
          />
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-theme-text-muted hover:text-theme-text"
            disabled={isSubmitting}
          >
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </FormField>

        {requireTerms && (
          <div className="space-y-2">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={state.termsAccepted}
                onChange={handleCheckboxChange}
                disabled={isSubmitting}
                className="mt-1 w-4 h-4 text-theme-primary bg-theme-card border-theme-border rounded focus:ring-theme-primary focus:ring-2"
              />
              <span className="text-sm text-theme-text">
                I agree to the{' '}
                <button
                  type="button"
                  className="text-theme-primary hover:text-theme-primary-hover font-medium"
                  disabled={isSubmitting}
                >
                  Terms of Service
                </button>
                {' '}and{' '}
                <button
                  type="button"
                  className="text-theme-primary hover:text-theme-primary-hover font-medium"
                  disabled={isSubmitting}
                >
                  Privacy Policy
                </button>
              </span>
            </label>
            {state.errors.terms && (
              <p className="text-xs text-theme-danger flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {state.errors.terms}
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || state.isCheckingUsername}
          className="w-full bg-theme-primary hover:bg-theme-primary-hover text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <LoadingSpinner size="small" />
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              Create Account
            </>
          )}
        </button>

        {showLoginLink && (
          <div className="text-center mt-6">
            <p className="text-sm text-theme-text-muted">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-theme-primary hover:text-theme-primary-hover font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        )}
      </form>
    </div>
  );
}

export { RegisterForm };
export default RegisterForm;