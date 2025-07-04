/**
 * Authentication Context Provider
 * Manages global authentication state using React Context
 */

'use client';

import React, { 
  createContext, 
  useContext, 
  useReducer, 
  useEffect, 
  useCallback,
  ReactNode 
} from 'react';

import { 
  AuthContextValue,
  AuthState, 
  AuthAction,
  AuthError,
  AuthErrorType,
  LoginCredentials,
  RegisterData,
  User,
  initialAuthState,
  AuthService
} from '@/types/auth';

import { authService } from '@/services/auth/authService';

// Authentication Context
const AuthContext = createContext<AuthContextValue | null>(null);

// Authentication Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_USER':
      return { 
        ...state, 
        user: action.payload,
        isAuthenticated: action.payload !== null 
      };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'SET_AUTHENTICATED':
      return { ...state, isAuthenticated: action.payload };
    
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload };
    
    case 'SET_SESSION_EXPIRY':
      return { ...state, sessionExpiry: action.payload };
    
    case 'UPDATE_LAST_ACTIVITY':
      return { ...state, lastActivity: Date.now() };
    
    case 'SET_PERMISSIONS':
      return { ...state, permissions: action.payload };
    
    case 'SET_ROLES':
      return { ...state, roles: action.payload };
    
    case 'OPEN_LOGIN_MODAL':
      return { ...state, isLoginModalOpen: true };
    
    case 'CLOSE_LOGIN_MODAL':
      return { ...state, isLoginModalOpen: false };
    
    case 'OPEN_REGISTER_MODAL':
      return { ...state, isRegisterModalOpen: true };
    
    case 'CLOSE_REGISTER_MODAL':
      return { ...state, isRegisterModalOpen: false };
    
    case 'OPEN_PASSWORD_RESET_MODAL':
      return { ...state, isPasswordResetModalOpen: true };
    
    case 'CLOSE_PASSWORD_RESET_MODAL':
      return { ...state, isPasswordResetModalOpen: false };
    
    case 'SET_REMEMBER_ME':
      return { ...state, rememberMe: action.payload };
    
    case 'SET_TWO_FACTOR_ENABLED':
      return { ...state, twoFactorEnabled: action.payload };
    
    case 'RESET_STATE':
      return { 
        ...initialAuthState, 
        isInitialized: true 
      };
    
    default:
      return state;
  }
}

// Provider Props
interface AuthProviderProps {
  children: ReactNode;
  service?: AuthService;
}

// Authentication Provider Component
export function AuthProvider({ children, service = authService }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  // Helper function to create auth errors
  const createAuthError = useCallback((
    type: AuthErrorType, 
    message: string, 
    details?: any
  ): AuthError => ({
    type,
    message,
    details,
    timestamp: Date.now()
  }), []);

  // Helper function to handle errors
  const handleError = useCallback((error: any) => {
    console.error('Authentication error:', error);
    
    let authError: AuthError;
    
    if (error.status === 401) {
      authError = createAuthError(
        AuthErrorType.INVALID_CREDENTIALS,
        'Invalid email or password'
      );
    } else if (error.status === 429) {
      authError = createAuthError(
        AuthErrorType.RATE_LIMITED,
        'Too many login attempts. Please try again later.'
      );
    } else if (error.message?.includes('network') || error.status === 0) {
      authError = createAuthError(
        AuthErrorType.NETWORK_ERROR,
        'Network connection error. Please check your internet connection.'
      );
    } else {
      authError = createAuthError(
        AuthErrorType.VALIDATION_ERROR,
        error.message || 'An unexpected error occurred'
      );
    }
    
    dispatch({ type: 'SET_ERROR', payload: authError });
  }, [createAuthError]);

  // Authentication Actions
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await service.login(credentials);
      
      dispatch({ type: 'SET_USER', payload: response.user });
      dispatch({ type: 'SET_AUTHENTICATED', payload: true });
      
      // Set session expiry if provided
      if (response.expires_in) {
        const expiryTime = Date.now() + (response.expires_in * 1000);
        dispatch({ type: 'SET_SESSION_EXPIRY', payload: expiryTime });
      }
      
      // Set remember me preference
      if (credentials.remember_me) {
        dispatch({ type: 'SET_REMEMBER_ME', payload: true });
      }
      
      dispatch({ type: 'UPDATE_LAST_ACTIVITY' });
      
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [service, handleError]);

  const register = useCallback(async (userData: RegisterData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await service.register(userData);
      
      dispatch({ type: 'SET_USER', payload: response.user });
      dispatch({ type: 'SET_AUTHENTICATED', payload: true });
      dispatch({ type: 'UPDATE_LAST_ACTIVITY' });
      
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [service, handleError]);

  const logout = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      await service.logout();
      
      dispatch({ type: 'RESET_STATE' });
      
    } catch (error) {
      console.error('Logout error:', error);
      // Still reset state even if server logout fails
      dispatch({ type: 'RESET_STATE' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [service]);

  const refreshToken = useCallback(async () => {
    try {
      const response = await service.refreshToken();
      
      dispatch({ type: 'SET_USER', payload: response.user });
      dispatch({ type: 'SET_AUTHENTICATED', payload: true });
      
      if (response.expires_in) {
        const expiryTime = Date.now() + (response.expires_in * 1000);
        dispatch({ type: 'SET_SESSION_EXPIRY', payload: expiryTime });
      }
      
    } catch (error) {
      console.error('Token refresh failed:', error);
      dispatch({ type: 'RESET_STATE' });
    }
  }, [service]);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const updatedUser = await service.updateUser(updates);
      
      dispatch({ type: 'SET_USER', payload: updatedUser });
      
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [service, handleError]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      await service.changePassword(currentPassword, newPassword);
      
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [service, handleError]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      await service.resetPassword(email);
      
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [service, handleError]);

  const confirmPasswordReset = useCallback(async (token: string, newPassword: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      await service.confirmPasswordReset(token, newPassword);
      
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [service, handleError]);

  const deleteAccount = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      await service.deleteAccount();
      dispatch({ type: 'RESET_STATE' });
      
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [service, handleError]);

  // UI State Management
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const setError = useCallback((error: AuthError) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const openLoginModal = useCallback(() => {
    dispatch({ type: 'OPEN_LOGIN_MODAL' });
  }, []);

  const closeLoginModal = useCallback(() => {
    dispatch({ type: 'CLOSE_LOGIN_MODAL' });
  }, []);

  const openRegisterModal = useCallback(() => {
    dispatch({ type: 'OPEN_REGISTER_MODAL' });
  }, []);

  const closeRegisterModal = useCallback(() => {
    dispatch({ type: 'CLOSE_REGISTER_MODAL' });
  }, []);

  const openPasswordResetModal = useCallback(() => {
    dispatch({ type: 'OPEN_PASSWORD_RESET_MODAL' });
  }, []);

  const closePasswordResetModal = useCallback(() => {
    dispatch({ type: 'CLOSE_PASSWORD_RESET_MODAL' });
  }, []);

  // Session Management
  const extendSession = useCallback(async () => {
    await refreshToken();
    dispatch({ type: 'UPDATE_LAST_ACTIVITY' });
  }, [refreshToken]);

  const checkSessionValidity = useCallback(async (): Promise<boolean> => {
    try {
      if (!service.isAuthenticated()) {
        return false;
      }
      
      await service.getCurrentUser();
      return true;
    } catch (error) {
      return false;
    }
  }, [service]);

  // Settings
  const setRememberMe = useCallback((remember: boolean) => {
    dispatch({ type: 'SET_REMEMBER_ME', payload: remember });
  }, []);

  const enableTwoFactor = useCallback(async () => {
    // Implementation would depend on backend support
    dispatch({ type: 'SET_TWO_FACTOR_ENABLED', payload: true });
  }, []);

  const disableTwoFactor = useCallback(async () => {
    // Implementation would depend on backend support
    dispatch({ type: 'SET_TWO_FACTOR_ENABLED', payload: false });
  }, []);

  // Initialize authentication state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        // Check if user is already authenticated
        if (service.isAuthenticated()) {
          try {
            const user = await service.getCurrentUser();
            dispatch({ type: 'SET_USER', payload: user });
            dispatch({ type: 'SET_AUTHENTICATED', payload: true });
            dispatch({ type: 'UPDATE_LAST_ACTIVITY' });
          } catch (error) {
            console.log('Failed to get current user, clearing tokens');
            await service.logout();
            dispatch({ type: 'RESET_STATE' });
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        dispatch({ type: 'SET_INITIALIZED', payload: true });
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeAuth();
  }, [service]);

  // Context value
  const contextValue: AuthContextValue = {
    state,
    actions: {
      login,
      register,
      logout,
      refreshToken,
      updateUser,
      changePassword,
      resetPassword,
      confirmPasswordReset,
      deleteAccount,
      extendSession,
      checkSessionValidity,
      clearError,
      setError,
      openLoginModal,
      closeLoginModal,
      openRegisterModal,
      closeRegisterModal,
      openPasswordResetModal,
      closePasswordResetModal,
      setRememberMe,
      enableTwoFactor,
      disableTwoFactor
    }
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use authentication context
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// Export context for advanced usage
export { AuthContext };