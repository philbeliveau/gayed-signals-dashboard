/**
 * Authentication Hooks
 * Convenient hooks for accessing authentication functionality
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UseAuthReturn, 
  UseRequireAuthReturn, 
  UsePermissionsReturn,
  UseSessionReturn,
  UseAuthModalsReturn,
  LoginCredentials,
  RegisterData,
  User,
  AuthError
} from '@/types/auth';
import { useAuth as useAuthContext } from '@/contexts/AuthContext';

/**
 * Main authentication hook
 * Provides access to authentication state and actions
 */
export function useAuth(): UseAuthReturn {
  const { state, actions } = useAuthContext();

  return {
    // State
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    isInitialized: state.isInitialized,
    error: state.error,
    
    // Actions
    login: actions.login,
    register: actions.register,
    logout: actions.logout,
    updateUser: actions.updateUser,
    clearError: actions.clearError
  };
}

/**
 * Hook that requires authentication
 * Redirects to login if user is not authenticated
 */
export function useRequireAuth(redirectTo: string = '/login'): UseRequireAuthReturn {
  const { state } = useAuthContext();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Only redirect if initialization is complete and user is not authenticated
    if (state.isInitialized && !state.isAuthenticated && !hasRedirected) {
      setHasRedirected(true);
      // Store the current path to redirect back after login
      const currentPath = window.location.pathname;
      if (currentPath !== redirectTo) {
        sessionStorage.setItem('auth_redirect_url', currentPath);
      }
      router.push(redirectTo);
    }
  }, [state.isInitialized, state.isAuthenticated, redirectTo, router, hasRedirected]);

  return {
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading || !state.isInitialized,
    user: state.user
  };
}

/**
 * Hook for permissions and role-based access control
 */
export function usePermissions(): UsePermissionsReturn {
  const { state } = useAuthContext();
  
  const hasPermission = useCallback((permission: string): boolean => {
    return state.permissions.includes(permission);
  }, [state.permissions]);

  const hasRole = useCallback((role: string): boolean => {
    return state.roles.includes(role);
  }, [state.roles]);

  const hasAnyRole = useCallback((roles: string[]): boolean => {
    return roles.some(role => state.roles.includes(role));
  }, [state.roles]);

  const hasAllRoles = useCallback((roles: string[]): boolean => {
    return roles.every(role => state.roles.includes(role));
  }, [state.roles]);

  const isAdmin = useCallback((): boolean => {
    return state.user?.is_superuser || false;
  }, [state.user]);

  return {
    permissions: state.permissions,
    roles: state.roles,
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    isAdmin: isAdmin()
  };
}

/**
 * Hook for session management
 */
export function useSession(): UseSessionReturn {
  const { state, actions } = useAuthContext();

  const timeUntilExpiry = useCallback((): number | null => {
    if (!state.sessionExpiry) return null;
    return Math.max(0, state.sessionExpiry - Date.now());
  }, [state.sessionExpiry]);

  const isSessionExpiringSoon = useCallback((): boolean => {
    const timeLeft = timeUntilExpiry();
    if (!timeLeft) return false;
    // Consider session expiring soon if less than 5 minutes left
    return timeLeft < 5 * 60 * 1000;
  }, [timeUntilExpiry]);

  return {
    sessionExpiry: state.sessionExpiry,
    lastActivity: state.lastActivity,
    timeUntilExpiry: timeUntilExpiry(),
    isSessionExpiringSoon: isSessionExpiringSoon(),
    extendSession: actions.extendSession,
    checkSessionValidity: actions.checkSessionValidity
  };
}

/**
 * Hook for authentication modals
 */
export function useAuthModals(): UseAuthModalsReturn {
  const { state, actions } = useAuthContext();

  return {
    isLoginModalOpen: state.isLoginModalOpen,
    isRegisterModalOpen: state.isRegisterModalOpen,
    isPasswordResetModalOpen: state.isPasswordResetModalOpen,
    openLoginModal: actions.openLoginModal,
    closeLoginModal: actions.closeLoginModal,
    openRegisterModal: actions.openRegisterModal,
    closeRegisterModal: actions.closeRegisterModal,
    openPasswordResetModal: actions.openPasswordResetModal,
    closePasswordResetModal: actions.closePasswordResetModal
  };
}

/**
 * Hook for form state management
 */
export function useAuthForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { actions } = useAuthContext();

  const handleLogin = useCallback(async (credentials: LoginCredentials) => {
    try {
      setIsSubmitting(true);
      setFormError(null);
      await actions.login(credentials);
      
      // Check if there's a redirect URL stored
      const redirectUrl = sessionStorage.getItem('auth_redirect_url');
      if (redirectUrl) {
        sessionStorage.removeItem('auth_redirect_url');
        window.location.href = redirectUrl;
      }
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError('Login failed. Please try again.');
      }
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [actions]);

  const handleRegister = useCallback(async (userData: RegisterData) => {
    try {
      setIsSubmitting(true);
      setFormError(null);
      await actions.register(userData);
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError('Registration failed. Please try again.');
      }
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [actions]);

  const clearFormError = useCallback(() => {
    setFormError(null);
  }, []);

  return {
    isSubmitting,
    formError,
    handleLogin,
    handleRegister,
    clearFormError
  };
}

/**
 * Hook for user profile management
 */
export function useUserProfile() {
  const { state, actions } = useAuthContext();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    try {
      setIsUpdating(true);
      setUpdateError(null);
      await actions.updateUser(updates);
    } catch (error) {
      if (error instanceof Error) {
        setUpdateError(error.message);
      } else {
        setUpdateError('Profile update failed. Please try again.');
      }
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [actions]);

  const clearUpdateError = useCallback(() => {
    setUpdateError(null);
  }, []);

  return {
    user: state.user,
    isUpdating,
    updateError,
    updateProfile,
    clearUpdateError
  };
}

/**
 * Hook for logout with confirmation
 */
export function useLogout() {
  const { actions } = useAuthContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = useCallback(async (skipConfirmation = false) => {
    if (!skipConfirmation) {
      const confirmed = window.confirm('Are you sure you want to log out?');
      if (!confirmed) return false;
    }

    try {
      setIsLoggingOut(true);
      await actions.logout();
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    } finally {
      setIsLoggingOut(false);
    }
  }, [actions]);

  return {
    logout,
    isLoggingOut
  };
}

/**
 * Hook for activity monitoring
 */
export function useActivityMonitor() {
  const { state, actions } = useAuthContext();

  useEffect(() => {
    if (!state.isAuthenticated) return;

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      // Throttle activity updates to avoid excessive state updates
      const timeSinceLastActivity = Date.now() - state.lastActivity;
      if (timeSinceLastActivity > 60000) { // Only update if more than 1 minute since last activity
        actions.updateUser({ id: state.user?.id || '' }); // Trigger activity update
      }
    };

    // Add event listeners for activity monitoring
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [state.isAuthenticated, state.lastActivity, state.user?.id, actions]);

  return {
    lastActivity: state.lastActivity,
    isActive: Date.now() - state.lastActivity < 5 * 60 * 1000 // Active if activity within 5 minutes
  };
}

// Re-export the main hook as default
export default useAuth;