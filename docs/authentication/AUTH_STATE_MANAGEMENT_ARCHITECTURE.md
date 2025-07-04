# Authentication State Management Architecture

## Overview
This document defines the state management architecture for authentication using React Context, including state structure, action patterns, and hook interfaces.

## State Management Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Root                         │
├─────────────────────────────────────────────────────────────┤
│  AuthProvider (Global State)                                │
│  ├── authState: AuthState                                   │
│  ├── authActions: AuthActions                               │
│  └── authConfig: AuthConfig                                 │
├─────────────────────────────────────────────────────────────┤
│  Component Tree                                              │
│  ├── useAuth() → AuthContextValue                           │
│  ├── useAuthActions() → AuthActions                         │
│  ├── useUser() → User | null                                │
│  └── useAuthState() → AuthState                             │
└─────────────────────────────────────────────────────────────┘
```

## Core State Structure

### 1. AuthState Interface

```typescript
interface AuthState {
  // User data
  user: User | null;
  
  // Authentication status
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  
  // Error handling
  error: AuthError | null;
  
  // UI state
  isLoginModalOpen: boolean;
  isRegisterModalOpen: boolean;
  isPasswordResetModalOpen: boolean;
  
  // Session management
  sessionExpiry: number | null;
  lastActivity: number;
  
  // Permissions and roles
  permissions: string[];
  roles: string[];
  
  // Settings
  rememberMe: boolean;
  twoFactorEnabled: boolean;
}

interface User {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
  avatar_url?: string;
  email_verified: boolean;
  last_login?: string;
}

interface AuthError {
  type: AuthErrorType;
  message: string;
  details?: any;
  timestamp: number;
}

enum AuthErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  RATE_LIMITED = 'RATE_LIMITED'
}
```

### 2. AuthActions Interface

```typescript
interface AuthActions {
  // Authentication actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  
  // User management
  updateUser: (updates: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  
  // Password reset
  resetPassword: (email: string) => Promise<void>;
  confirmPasswordReset: (token: string, newPassword: string) => Promise<void>;
  
  // Session management
  extendSession: () => Promise<void>;
  checkSessionValidity: () => Promise<boolean>;
  
  // Error handling
  clearError: () => void;
  setError: (error: AuthError) => void;
  
  // UI state management
  openLoginModal: () => void;
  closeLoginModal: () => void;
  openRegisterModal: () => void;
  closeRegisterModal: () => void;
  openPasswordResetModal: () => void;
  closePasswordResetModal: () => void;
  
  // Settings
  setRememberMe: (remember: boolean) => void;
  enableTwoFactor: () => Promise<void>;
  disableTwoFactor: () => Promise<void>;
}
```

## AuthContext Implementation

### 1. AuthContext Definition

```typescript
// AuthContext.tsx
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';

interface AuthContextValue {
  state: AuthState;
  actions: AuthActions;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuthContext = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
```

### 2. AuthReducer Implementation

```typescript
// AuthReducer.ts
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_ERROR'; payload: AuthError | null }
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'SET_SESSION_EXPIRY'; payload: number | null }
  | { type: 'UPDATE_LAST_ACTIVITY' }
  | { type: 'SET_PERMISSIONS'; payload: string[] }
  | { type: 'SET_ROLES'; payload: string[] }
  | { type: 'OPEN_LOGIN_MODAL' }
  | { type: 'CLOSE_LOGIN_MODAL' }
  | { type: 'OPEN_REGISTER_MODAL' }
  | { type: 'CLOSE_REGISTER_MODAL' }
  | { type: 'OPEN_PASSWORD_RESET_MODAL' }
  | { type: 'CLOSE_PASSWORD_RESET_MODAL' }
  | { type: 'SET_REMEMBER_ME'; payload: boolean }
  | { type: 'SET_TWO_FACTOR_ENABLED'; payload: boolean }
  | { type: 'RESET_STATE' };

const initialAuthState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,
  isLoginModalOpen: false,
  isRegisterModalOpen: false,
  isPasswordResetModalOpen: false,
  sessionExpiry: null,
  lastActivity: Date.now(),
  permissions: [],
  roles: [],
  rememberMe: false,
  twoFactorEnabled: false,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: action.payload !== null,
        error: null,
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    
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
      return { ...initialAuthState, isInitialized: true };
    
    default:
      return state;
  }
};
```

### 3. AuthProvider Implementation

```typescript
// AuthProvider.tsx
interface AuthProviderProps {
  children: React.ReactNode;
  authService: AuthService;
  config?: AuthConfig;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  authService,
  config = defaultAuthConfig,
}) => {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  
  // Session monitoring
  const sessionTimeoutRef = useRef<NodeJS.Timeout>();
  const activityTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Initialize authentication state on mount
  useEffect(() => {
    initializeAuth();
  }, []);
  
  // Activity monitoring
  useEffect(() => {
    if (state.isAuthenticated && config.sessionTimeout) {
      setupActivityMonitoring();
    }
    
    return () => {
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, [state.isAuthenticated]);
  
  const initializeAuth = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      if (authService.isAuthenticated()) {
        const user = await authService.getCurrentUser();
        dispatch({ type: 'SET_USER', payload: user });
        
        // Set session expiry
        const token = tokenManager.getAccessToken();
        if (token) {
          const expiry = tokenManager.getTokenExpirationTime(token);
          dispatch({ type: 'SET_SESSION_EXPIRY', payload: expiry });
        }
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      // Clear invalid tokens
      await authService.logout();
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_INITIALIZED', payload: true });
    }
  }, [authService]);
  
  const setupActivityMonitoring = useCallback(() => {
    const handleActivity = () => {
      dispatch({ type: 'UPDATE_LAST_ACTIVITY' });
      
      // Reset activity timeout
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      
      activityTimeoutRef.current = setTimeout(() => {
        // Auto-logout on inactivity
        if (config.autoLogoutOnInactivity) {
          logout();
        }
      }, config.sessionTimeout);
    };
    
    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });
    
    // Setup initial timeout
    handleActivity();
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [config]);
  
  // Authentication actions
  const login = useCallback(async (credentials: LoginCredentials) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const response = await authService.login(credentials);
      dispatch({ type: 'SET_USER', payload: response.user });
      
      // Set remember me preference
      dispatch({ type: 'SET_REMEMBER_ME', payload: credentials.remember_me || false });
      
      // Close login modal
      dispatch({ type: 'CLOSE_LOGIN_MODAL' });
      
    } catch (error) {
      const authError = createAuthError(error);
      dispatch({ type: 'SET_ERROR', payload: authError });
      throw authError;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [authService]);
  
  const register = useCallback(async (userData: RegisterData) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const response = await authService.register(userData);
      dispatch({ type: 'SET_USER', payload: response.user });
      
      // Close register modal
      dispatch({ type: 'CLOSE_REGISTER_MODAL' });
      
    } catch (error) {
      const authError = createAuthError(error);
      dispatch({ type: 'SET_ERROR', payload: authError });
      throw authError;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [authService]);
  
  const logout = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: 'RESET_STATE' });
    }
  }, [authService]);
  
  const updateUser = useCallback(async (updates: Partial<User>) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const updatedUser = await authService.updateUser(updates);
      dispatch({ type: 'SET_USER', payload: updatedUser });
    } catch (error) {
      const authError = createAuthError(error);
      dispatch({ type: 'SET_ERROR', payload: authError });
      throw authError;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [authService]);
  
  const refreshToken = useCallback(async () => {
    try {
      const response = await authService.refreshToken();
      dispatch({ type: 'SET_USER', payload: response.user });
      
      // Update session expiry
      const token = tokenManager.getAccessToken();
      if (token) {
        const expiry = tokenManager.getTokenExpirationTime(token);
        dispatch({ type: 'SET_SESSION_EXPIRY', payload: expiry });
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
    }
  }, [authService, logout]);
  
  // Error helper
  const createAuthError = (error: any): AuthError => ({
    type: error.type || AuthErrorType.NETWORK_ERROR,
    message: error.message || 'An error occurred',
    details: error.details,
    timestamp: Date.now(),
  });
  
  // Actions object
  const actions: AuthActions = {
    login,
    register,
    logout,
    refreshToken,
    updateUser,
    changePassword: async (currentPassword: string, newPassword: string) => {
      await authService.changePassword(currentPassword, newPassword);
    },
    deleteAccount: async () => {
      await authService.deleteAccount();
      dispatch({ type: 'RESET_STATE' });
    },
    resetPassword: async (email: string) => {
      await authService.resetPassword(email);
    },
    confirmPasswordReset: async (token: string, newPassword: string) => {
      await authService.confirmPasswordReset(token, newPassword);
    },
    extendSession: async () => {
      await refreshToken();
    },
    checkSessionValidity: async () => {
      return authService.isAuthenticated();
    },
    clearError: () => {
      dispatch({ type: 'SET_ERROR', payload: null });
    },
    setError: (error: AuthError) => {
      dispatch({ type: 'SET_ERROR', payload: error });
    },
    openLoginModal: () => {
      dispatch({ type: 'OPEN_LOGIN_MODAL' });
    },
    closeLoginModal: () => {
      dispatch({ type: 'CLOSE_LOGIN_MODAL' });
    },
    openRegisterModal: () => {
      dispatch({ type: 'OPEN_REGISTER_MODAL' });
    },
    closeRegisterModal: () => {
      dispatch({ type: 'CLOSE_REGISTER_MODAL' });
    },
    openPasswordResetModal: () => {
      dispatch({ type: 'OPEN_PASSWORD_RESET_MODAL' });
    },
    closePasswordResetModal: () => {
      dispatch({ type: 'CLOSE_PASSWORD_RESET_MODAL' });
    },
    setRememberMe: (remember: boolean) => {
      dispatch({ type: 'SET_REMEMBER_ME', payload: remember });
    },
    enableTwoFactor: async () => {
      // Implementation depends on backend
      dispatch({ type: 'SET_TWO_FACTOR_ENABLED', payload: true });
    },
    disableTwoFactor: async () => {
      // Implementation depends on backend
      dispatch({ type: 'SET_TWO_FACTOR_ENABLED', payload: false });
    },
  };
  
  const contextValue: AuthContextValue = {
    state,
    actions,
  };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
```

## Custom Hooks

### 1. Core Authentication Hooks

```typescript
// useAuth.ts
export const useAuth = () => {
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
    clearError: actions.clearError,
  };
};

// useUser.ts
export const useUser = () => {
  const { state } = useAuthContext();
  return state.user;
};

// useAuthState.ts
export const useAuthState = () => {
  const { state } = useAuthContext();
  return state;
};

// useAuthActions.ts
export const useAuthActions = () => {
  const { actions } = useAuthContext();
  return actions;
};
```

### 2. Specialized Hooks

```typescript
// useRequireAuth.ts
export const useRequireAuth = (redirectTo = '/login') => {
  const { isAuthenticated, isLoading, isInitialized } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (isInitialized && !isLoading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, isInitialized, redirectTo, router]);
  
  return { isAuthenticated, isLoading };
};

// usePermissions.ts
export const usePermissions = () => {
  const { state } = useAuthContext();
  
  const hasPermission = useCallback((permission: string) => {
    return state.permissions.includes(permission);
  }, [state.permissions]);
  
  const hasRole = useCallback((role: string) => {
    return state.roles.includes(role);
  }, [state.roles]);
  
  const hasAnyRole = useCallback((roles: string[]) => {
    return roles.some(role => state.roles.includes(role));
  }, [state.roles]);
  
  const hasAllRoles = useCallback((roles: string[]) => {
    return roles.every(role => state.roles.includes(role));
  }, [state.roles]);
  
  return {
    permissions: state.permissions,
    roles: state.roles,
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    isAdmin: state.user?.is_superuser || false,
  };
};

// useSession.ts
export const useSession = () => {
  const { state, actions } = useAuthContext();
  
  const timeUntilExpiry = useMemo(() => {
    if (!state.sessionExpiry) return null;
    return Math.max(0, state.sessionExpiry - Date.now());
  }, [state.sessionExpiry]);
  
  const isSessionExpiringSoon = useMemo(() => {
    if (!timeUntilExpiry) return false;
    return timeUntilExpiry < 5 * 60 * 1000; // 5 minutes
  }, [timeUntilExpiry]);
  
  return {
    sessionExpiry: state.sessionExpiry,
    lastActivity: state.lastActivity,
    timeUntilExpiry,
    isSessionExpiringSoon,
    extendSession: actions.extendSession,
    checkSessionValidity: actions.checkSessionValidity,
  };
};

// useAuthModals.ts
export const useAuthModals = () => {
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
    closePasswordResetModal: actions.closePasswordResetModal,
  };
};
```

## State Persistence

### 1. Local Storage Integration

```typescript
// useAuthPersistence.ts
const AUTH_STORAGE_KEY = 'auth_state';

export const useAuthPersistence = () => {
  const { state } = useAuthContext();
  
  // Save state to localStorage
  useEffect(() => {
    const persistableState = {
      rememberMe: state.rememberMe,
      twoFactorEnabled: state.twoFactorEnabled,
      lastActivity: state.lastActivity,
    };
    
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(persistableState));
  }, [state.rememberMe, state.twoFactorEnabled, state.lastActivity]);
  
  // Load state from localStorage
  const loadPersistedState = useCallback(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, []);
  
  return { loadPersistedState };
};
```

### 2. Session Restoration

```typescript
// useSessionRestoration.ts
export const useSessionRestoration = () => {
  const { actions } = useAuthContext();
  
  const restoreSession = useCallback(async () => {
    try {
      // Check if we have a valid token
      if (authService.isAuthenticated()) {
        // Attempt to get current user to validate session
        const user = await authService.getCurrentUser();
        return user;
      }
    } catch (error) {
      // Session is invalid, clear it
      await actions.logout();
    }
    
    return null;
  }, [actions]);
  
  return { restoreSession };
};
```

## Performance Optimization

### 1. Memoization

```typescript
// Memoized context value to prevent unnecessary re-renders
const AuthProvider: React.FC<AuthProviderProps> = ({ children, authService }) => {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  
  const actions = useMemo(() => ({
    login: async (credentials: LoginCredentials) => {
      // Implementation
    },
    logout: async () => {
      // Implementation
    },
    // ... other actions
  }), [authService]);
  
  const contextValue = useMemo(() => ({
    state,
    actions,
  }), [state, actions]);
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 2. Selective Re-rendering

```typescript
// Split context to reduce re-renders
const AuthStateContext = createContext<AuthState | null>(null);
const AuthActionsContext = createContext<AuthActions | null>(null);

export const useAuthState = () => {
  const context = useContext(AuthStateContext);
  if (!context) throw new Error('useAuthState must be used within AuthProvider');
  return context;
};

export const useAuthActions = () => {
  const context = useContext(AuthActionsContext);
  if (!context) throw new Error('useAuthActions must be used within AuthProvider');
  return context;
};
```

## Testing Strategy

### 1. Context Testing

```typescript
// Test utilities
const AuthTestProvider: React.FC<{ children: React.ReactNode; initialState?: Partial<AuthState> }> = ({
  children,
  initialState = {},
}) => {
  const mockAuthService = {
    login: jest.fn(),
    logout: jest.fn(),
    isAuthenticated: jest.fn(),
    getCurrentUser: jest.fn(),
  };
  
  return (
    <AuthProvider authService={mockAuthService}>
      {children}
    </AuthProvider>
  );
};

// Hook testing
const renderAuthHook = <T,>(hook: () => T, initialState?: Partial<AuthState>) => {
  return renderHook(hook, {
    wrapper: ({ children }) => (
      <AuthTestProvider initialState={initialState}>
        {children}
      </AuthTestProvider>
    ),
  });
};

// Test example
describe('useAuth', () => {
  it('should provide authentication state and actions', () => {
    const { result } = renderAuthHook(() => useAuth());
    
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBe(null);
    expect(typeof result.current.login).toBe('function');
  });
});
```

## Error Boundary Integration

```typescript
// AuthErrorBoundary.tsx
interface AuthErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class AuthErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  AuthErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error): AuthErrorBoundaryState {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Auth error boundary caught an error:', error, errorInfo);
    
    // Log to monitoring service
    if (typeof window !== 'undefined') {
      // Send error to monitoring service
    }
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="auth-error-fallback">
          <h2>Authentication Error</h2>
          <p>Something went wrong with the authentication system.</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

## Configuration

```typescript
// AuthConfig.ts
interface AuthConfig {
  sessionTimeout: number;
  autoLogoutOnInactivity: boolean;
  tokenRefreshThreshold: number;
  enablePersistence: boolean;
  enableActivityMonitoring: boolean;
  maxLoginAttempts: number;
  lockoutDuration: number;
}

const defaultAuthConfig: AuthConfig = {
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  autoLogoutOnInactivity: true,
  tokenRefreshThreshold: 5 * 60 * 1000, // 5 minutes
  enablePersistence: true,
  enableActivityMonitoring: true,
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
};
```

## Next Steps

1. **Implement AuthProvider** with state management
2. **Create authentication hooks** for component integration
3. **Add session management** with activity monitoring
4. **Implement error handling** with comprehensive error types
5. **Add state persistence** for user preferences
6. **Create testing utilities** for hook and context testing
7. **Add performance optimizations** with memoization
8. **Implement error boundaries** for graceful error handling