import { AuthState, AuthAction, initialAuthState } from '../types/auth';

/**
 * Authentication State Reducer
 * 
 * Handles all authentication state transitions in a predictable way.
 * Each action type corresponds to a specific state change.
 */
export const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    // Loading state management
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    // User authentication
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: action.payload !== null,
        isLoading: false,
        error: null, // Clear any previous errors when user is set
      };

    // Error handling
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false, // Stop loading when error occurs
      };

    // Authentication status
    case 'SET_AUTHENTICATED':
      return {
        ...state,
        isAuthenticated: action.payload,
      };

    // Initialization status
    case 'SET_INITIALIZED':
      return {
        ...state,
        isInitialized: action.payload,
        isLoading: action.payload ? false : state.isLoading, // Stop loading when initialized
      };

    // Session management
    case 'SET_SESSION_EXPIRY':
      return {
        ...state,
        sessionExpiry: action.payload,
      };

    case 'UPDATE_LAST_ACTIVITY':
      return {
        ...state,
        lastActivity: Date.now(),
      };

    // Permissions and roles
    case 'SET_PERMISSIONS':
      return {
        ...state,
        permissions: action.payload,
      };

    case 'SET_ROLES':
      return {
        ...state,
        roles: action.payload,
      };

    // Modal state management
    case 'OPEN_LOGIN_MODAL':
      return {
        ...state,
        isLoginModalOpen: true,
        // Close other modals when opening login
        isRegisterModalOpen: false,
        isPasswordResetModalOpen: false,
      };

    case 'CLOSE_LOGIN_MODAL':
      return {
        ...state,
        isLoginModalOpen: false,
      };

    case 'OPEN_REGISTER_MODAL':
      return {
        ...state,
        isRegisterModalOpen: true,
        // Close other modals when opening register
        isLoginModalOpen: false,
        isPasswordResetModalOpen: false,
      };

    case 'CLOSE_REGISTER_MODAL':
      return {
        ...state,
        isRegisterModalOpen: false,
      };

    case 'OPEN_PASSWORD_RESET_MODAL':
      return {
        ...state,
        isPasswordResetModalOpen: true,
        // Close other modals when opening password reset
        isLoginModalOpen: false,
        isRegisterModalOpen: false,
      };

    case 'CLOSE_PASSWORD_RESET_MODAL':
      return {
        ...state,
        isPasswordResetModalOpen: false,
      };

    // Settings management
    case 'SET_REMEMBER_ME':
      return {
        ...state,
        rememberMe: action.payload,
      };

    case 'SET_TWO_FACTOR_ENABLED':
      return {
        ...state,
        twoFactorEnabled: action.payload,
      };

    // State reset (for logout)
    case 'RESET_STATE':
      return {
        ...initialAuthState,
        isInitialized: true, // Keep initialized state after reset
      };

    // Default case for unknown actions
    default:
      console.warn(`Unknown auth action type: ${(action as any).type}`);
      return state;
  }
};

/**
 * Action Creators
 * 
 * Helper functions to create action objects with proper typing.
 * These ensure consistency and reduce typos in action dispatching.
 */
export const authActionCreators = {
  setLoading: (loading: boolean): AuthAction => ({
    type: 'SET_LOADING',
    payload: loading,
  }),

  setUser: (user: AuthState['user']): AuthAction => ({
    type: 'SET_USER',
    payload: user,
  }),

  setError: (error: AuthState['error']): AuthAction => ({
    type: 'SET_ERROR',
    payload: error,
  }),

  setAuthenticated: (authenticated: boolean): AuthAction => ({
    type: 'SET_AUTHENTICATED',
    payload: authenticated,
  }),

  setInitialized: (initialized: boolean): AuthAction => ({
    type: 'SET_INITIALIZED',
    payload: initialized,
  }),

  setSessionExpiry: (expiry: number | null): AuthAction => ({
    type: 'SET_SESSION_EXPIRY',
    payload: expiry,
  }),

  updateLastActivity: (): AuthAction => ({
    type: 'UPDATE_LAST_ACTIVITY',
  }),

  setPermissions: (permissions: string[]): AuthAction => ({
    type: 'SET_PERMISSIONS',
    payload: permissions,
  }),

  setRoles: (roles: string[]): AuthAction => ({
    type: 'SET_ROLES',
    payload: roles,
  }),

  openLoginModal: (): AuthAction => ({
    type: 'OPEN_LOGIN_MODAL',
  }),

  closeLoginModal: (): AuthAction => ({
    type: 'CLOSE_LOGIN_MODAL',
  }),

  openRegisterModal: (): AuthAction => ({
    type: 'OPEN_REGISTER_MODAL',
  }),

  closeRegisterModal: (): AuthAction => ({
    type: 'CLOSE_REGISTER_MODAL',
  }),

  openPasswordResetModal: (): AuthAction => ({
    type: 'OPEN_PASSWORD_RESET_MODAL',
  }),

  closePasswordResetModal: (): AuthAction => ({
    type: 'CLOSE_PASSWORD_RESET_MODAL',
  }),

  setRememberMe: (remember: boolean): AuthAction => ({
    type: 'SET_REMEMBER_ME',
    payload: remember,
  }),

  setTwoFactorEnabled: (enabled: boolean): AuthAction => ({
    type: 'SET_TWO_FACTOR_ENABLED',
    payload: enabled,
  }),

  resetState: (): AuthAction => ({
    type: 'RESET_STATE',
  }),
};

/**
 * State Selectors
 * 
 * Helper functions to derive computed values from the auth state.
 * These provide a clean interface for accessing complex state calculations.
 */
export const authSelectors = {
  isLoggedIn: (state: AuthState): boolean => state.isAuthenticated && state.user !== null,
  
  isLoading: (state: AuthState): boolean => state.isLoading,
  
  hasError: (state: AuthState): boolean => state.error !== null,
  
  getUser: (state: AuthState) => state.user,
  
  getUserId: (state: AuthState): string | null => state.user?.id || null,
  
  getUserEmail: (state: AuthState): string | null => state.user?.email || null,
  
  isAdmin: (state: AuthState): boolean => state.user?.is_superuser || false,
  
  isEmailVerified: (state: AuthState): boolean => state.user?.email_verified || false,
  
  hasRole: (state: AuthState, role: string): boolean => state.roles.includes(role),
  
  hasPermission: (state: AuthState, permission: string): boolean => state.permissions.includes(permission),
  
  hasAnyRole: (state: AuthState, roles: string[]): boolean => 
    roles.some(role => state.roles.includes(role)),
  
  hasAllRoles: (state: AuthState, roles: string[]): boolean => 
    roles.every(role => state.roles.includes(role)),
  
  isSessionExpired: (state: AuthState): boolean => {
    if (!state.sessionExpiry) return false;
    return Date.now() >= state.sessionExpiry;
  },
  
  isSessionExpiringSoon: (state: AuthState, threshold: number = 5 * 60 * 1000): boolean => {
    if (!state.sessionExpiry) return false;
    return Date.now() >= (state.sessionExpiry - threshold);
  },
  
  getTimeUntilExpiry: (state: AuthState): number | null => {
    if (!state.sessionExpiry) return null;
    return Math.max(0, state.sessionExpiry - Date.now());
  },
  
  isInactive: (state: AuthState, timeout: number = 30 * 60 * 1000): boolean => {
    return Date.now() - state.lastActivity > timeout;
  },
  
  anyModalOpen: (state: AuthState): boolean => 
    state.isLoginModalOpen || state.isRegisterModalOpen || state.isPasswordResetModalOpen,
};

/**
 * State Validation
 * 
 * Helper functions to validate auth state integrity.
 * These can be used in development to catch state inconsistencies.
 */
export const authStateValidators = {
  isValidState: (state: AuthState): boolean => {
    // Basic state integrity checks
    if (state.isAuthenticated && !state.user) {
      console.error('Auth state invalid: authenticated but no user');
      return false;
    }
    
    if (!state.isAuthenticated && state.user) {
      console.error('Auth state invalid: user present but not authenticated');
      return false;
    }
    
    if (state.sessionExpiry && state.sessionExpiry < 0) {
      console.error('Auth state invalid: negative session expiry');
      return false;
    }
    
    if (state.lastActivity && state.lastActivity > Date.now()) {
      console.error('Auth state invalid: future last activity time');
      return false;
    }
    
    return true;
  },
  
  validateStateTransition: (oldState: AuthState, newState: AuthState, action: AuthAction): boolean => {
    // Validate state transitions make sense
    switch (action.type) {
      case 'SET_USER':
        if (action.payload && !newState.isAuthenticated) {
          console.error('State transition error: user set but not authenticated');
          return false;
        }
        break;
        
      case 'SET_AUTHENTICATED':
        if (action.payload && !newState.user) {
          console.error('State transition error: authenticated but no user');
          return false;
        }
        break;
        
      case 'RESET_STATE':
        if (newState.user || newState.isAuthenticated) {
          console.error('State transition error: state not properly reset');
          return false;
        }
        break;
    }
    
    return true;
  }
};

export default authReducer;