// ========================================
// AUTHENTICATION TYPES
// ========================================

/**
 * Core User Interface
 */
export interface User {
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

/**
 * Authentication State Interface
 */
export interface AuthState {
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

/**
 * Authentication Error Types
 */
export enum AuthErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  RATE_LIMITED = 'RATE_LIMITED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  TWO_FACTOR_REQUIRED = 'TWO_FACTOR_REQUIRED'
}

export interface AuthError {
  type: AuthErrorType;
  message: string;
  details?: any;
  timestamp: number;
}

/**
 * Authentication Actions Interface
 */
export interface AuthActions {
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

/**
 * Authentication Context Value
 */
export interface AuthContextValue {
  state: AuthState;
  actions: AuthActions;
}

/**
 * Authentication Credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
  remember_me?: boolean;
  two_factor_code?: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  full_name?: string;
  terms_accepted: boolean;
}

/**
 * Authentication Response
 */
export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
  user: User;
}

/**
 * Authentication Reducer Actions
 */
export type AuthAction =
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

/**
 * Token Management Interfaces
 */
export interface TokenStorage {
  getToken(): string | null;
  setToken(token: string): void;
  removeToken(): void;
  getRefreshToken(): string | null;
  setRefreshToken(token: string): void;
  removeRefreshToken(): void;
}

export interface TokenManager {
  // Token lifecycle
  getAccessToken(): string | null;
  setAccessToken(token: string): void;
  removeAccessToken(): void;
  
  // Refresh token handling
  getRefreshToken(): string | null;
  setRefreshToken(token: string): void;
  removeRefreshToken(): void;
  
  // Token validation
  isTokenValid(token?: string): boolean;
  isTokenExpired(token?: string): boolean;
  getTokenExpirationTime(token?: string): number | null;
  
  // Token refresh
  refreshToken(): Promise<string>;
  
  // Cleanup
  clearAll(): void;
}

/**
 * API Client Interfaces
 */
export interface APIClientConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  tokenManager: TokenManager;
}

export interface APIResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface APIError {
  message: string;
  status: number;
  code?: string;
  details?: any;
}

/**
 * Authentication Service Interface
 */
export interface AuthService {
  // Authentication
  login(credentials: LoginCredentials): Promise<AuthResponse>;
  register(userData: RegisterData): Promise<AuthResponse>;
  logout(): Promise<void>;
  
  // Token management
  refreshToken(): Promise<AuthResponse>;
  isAuthenticated(): boolean;
  
  // User management
  getCurrentUser(): Promise<User>;
  updateUser(updates: Partial<User>): Promise<User>;
  
  // Password management
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  resetPassword(email: string): Promise<void>;
  confirmPasswordReset(token: string, newPassword: string): Promise<void>;
  
  // Account management
  deleteAccount(): Promise<void>;
  deactivateAccount(): Promise<void>;
}

/**
 * Authentication Configuration
 */
export interface AuthConfig {
  // Session settings
  sessionTimeout: number;
  autoLogoutOnInactivity: boolean;
  tokenRefreshThreshold: number;
  
  // Storage settings
  enablePersistence: boolean;
  storageType: 'cookie' | 'memory' | 'localStorage';
  
  // Monitoring settings
  enableActivityMonitoring: boolean;
  activityEvents: string[];
  
  // Security settings
  maxLoginAttempts: number;
  lockoutDuration: number;
  requireEmailVerification: boolean;
  enableTwoFactor: boolean;
  
  // API settings
  apiBaseURL: string;
  requestTimeout: number;
  retryAttempts: number;
  enableLogging: boolean;
}

/**
 * Hook Return Types
 */
export interface UseAuthReturn {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: AuthError | null;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  clearError: () => void;
}

export interface UseRequireAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
}

export interface UsePermissionsReturn {
  permissions: string[];
  roles: string[];
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAllRoles: (roles: string[]) => boolean;
  isAdmin: boolean;
}

export interface UseSessionReturn {
  sessionExpiry: number | null;
  lastActivity: number;
  timeUntilExpiry: number | null;
  isSessionExpiringSoon: boolean;
  extendSession: () => Promise<void>;
  checkSessionValidity: () => Promise<boolean>;
}

export interface UseAuthModalsReturn {
  isLoginModalOpen: boolean;
  isRegisterModalOpen: boolean;
  isPasswordResetModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  openRegisterModal: () => void;
  closeRegisterModal: () => void;
  openPasswordResetModal: () => void;
  closePasswordResetModal: () => void;
}

/**
 * Authentication Provider Props
 */
export interface AuthProviderProps {
  children: React.ReactNode;
  authService: AuthService;
  config?: Partial<AuthConfig>;
}

/**
 * Default Configuration
 */
export const defaultAuthConfig: AuthConfig = {
  // Session settings
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  autoLogoutOnInactivity: true,
  tokenRefreshThreshold: 5 * 60 * 1000, // 5 minutes
  
  // Storage settings
  enablePersistence: true,
  storageType: 'cookie',
  
  // Monitoring settings
  enableActivityMonitoring: true,
  activityEvents: ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'],
  
  // Security settings
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  requireEmailVerification: true,
  enableTwoFactor: false,
  
  // API settings
  apiBaseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
  requestTimeout: 30000,
  retryAttempts: 3,
  enableLogging: process.env.NODE_ENV === 'development'
};

/**
 * Initial Authentication State
 */
export const initialAuthState: AuthState = {
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
  twoFactorEnabled: false
};