/**
 * Authentication Service Types
 * 
 * This module defines all TypeScript interfaces and types for the authentication service layer.
 * It includes user models, credentials, responses, errors, and service interfaces.
 */

// ========================================
// USER TYPES
// ========================================

/**
 * User interface matching the FastAPI backend model
 */
export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
  email_verified?: boolean;
  avatar_url?: string;
  preferences?: UserPreferences;
}

/**
 * User preferences for personalization
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  timezone: string;
  language: string;
  notifications: {
    email: boolean;
    browser: boolean;
    signals: boolean;
    performance: boolean;
  };
  dashboard: {
    defaultView: string;
    chartsConfig: Record<string, unknown>;
  };
}

// ========================================
// AUTHENTICATION TYPES
// ========================================

/**
 * Login credentials interface
 */
export interface LoginCredentials {
  email: string;
  password: string;
  remember_me?: boolean;
  two_factor_code?: string;
}

/**
 * User registration data interface
 */
export interface RegisterData {
  email: string;
  username: string;
  password: string;
  full_name: string;
  terms_accepted: boolean;
  marketing_emails?: boolean;
}

/**
 * Authentication response from backend
 */
export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
  user: User;
}

/**
 * Token refresh request
 */
export interface TokenRefreshRequest {
  refresh_token: string;
}

/**
 * Token refresh response
 */
export interface TokenRefreshResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
}

/**
 * Password change request
 */
export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password reset confirmation
 */
export interface PasswordResetConfirmation {
  token: string;
  new_password: string;
}

// ========================================
// ERROR TYPES
// ========================================

/**
 * Authentication error types
 */
export enum AuthErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  REFRESH_TOKEN_EXPIRED = 'REFRESH_TOKEN_EXPIRED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Authentication error interface
 */
export interface AuthError {
  type: AuthErrorType;
  message: string;
  details?: Record<string, unknown>;
  status?: number;
  timestamp: string;
}

/**
 * FastAPI validation error format
 */
export interface FastAPIValidationError {
  detail: Array<{
    loc: (string | number)[];
    msg: string;
    type: string;
    ctx?: Record<string, unknown>;
  }>;
}

/**
 * FastAPI error response format
 */
export interface FastAPIError {
  detail: string | FastAPIValidationError;
  type?: string;
  status_code?: number;
}

// ========================================
// AUTH STATE TYPES
// ========================================

/**
 * Authentication state interface
 */
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  error: AuthError | null;
  lastActivity: string | null;
  sessionExpiry: string | null;
}

/**
 * Authentication status
 */
export type AuthStatus = 'authenticated' | 'unauthenticated' | 'loading' | 'error';

// ========================================
// TOKEN MANAGEMENT TYPES
// ========================================

/**
 * Token storage interface
 */
export interface TokenStorage {
  getToken(): string | null;
  setToken(token: string): void;
  removeToken(): void;
  getRefreshToken(): string | null;
  setRefreshToken(token: string): void;
  removeRefreshToken(): void;
  clear(): void;
}

/**
 * Token manager interface
 */
export interface TokenManager {
  // Access token management
  getAccessToken(): string | null;
  setAccessToken(token: string): void;
  removeAccessToken(): void;
  
  // Refresh token management
  getRefreshToken(): string | null;
  setRefreshToken(token: string): void;
  removeRefreshToken(): void;
  
  // Token validation
  isTokenValid(token?: string): boolean;
  isTokenExpired(token?: string): boolean;
  getTokenExpirationTime(token?: string): number | null;
  shouldRefreshToken(token?: string): boolean;
  
  // Token refresh
  refreshToken(): Promise<string>;
  
  // Utility methods
  decodeToken(token: string): TokenPayload | null;
  clearAll(): void;
}

/**
 * JWT token payload interface
 */
export interface TokenPayload {
  sub: string; // Subject (user ID)
  email: string;
  username: string;
  exp: number; // Expiration time (Unix timestamp)
  iat: number; // Issued at time (Unix timestamp)
  jti?: string; // JWT ID
  scope?: string; // Token scope
  [key: string]: unknown; // Additional claims
}

/**
 * Token storage types
 */
export type TokenStorageType = 'cookie' | 'memory' | 'localStorage';

// ========================================
// API CLIENT TYPES
// ========================================

/**
 * API client configuration
 */
export interface APIClientConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  tokenManager: TokenManager;
  enableLogging?: boolean;
}

/**
 * API response interface
 */
export interface APIResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config?: APIRequestConfig;
}

/**
 * API request configuration
 */
export interface APIRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: unknown;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  requireAuth?: boolean;
  skipAuthRefresh?: boolean;
  timeout?: number;
  retryAttempts?: number;
  signal?: AbortSignal;
}

/**
 * API error interface
 */
export interface APIError {
  message: string;
  status: number;
  code?: string;
  details?: unknown;
  response?: APIResponse;
  request?: APIRequestConfig;
}

// ========================================
// AUTH SERVICE TYPES
// ========================================

/**
 * Authentication service interface
 */
export interface AuthService {
  // Authentication methods
  login(credentials: LoginCredentials): Promise<AuthResponse>;
  register(userData: RegisterData): Promise<AuthResponse>;
  logout(): Promise<void>;
  refreshToken(): Promise<AuthResponse>;
  
  // User management
  getCurrentUser(): Promise<User>;
  updateUser(updates: Partial<User>): Promise<User>;
  updateUserPreferences(preferences: Partial<UserPreferences>): Promise<User>;
  
  // Password management
  changePassword(request: PasswordChangeRequest): Promise<void>;
  resetPassword(request: PasswordResetRequest): Promise<void>;
  confirmPasswordReset(request: PasswordResetConfirmation): Promise<void>;
  
  // Account management
  deleteAccount(): Promise<void>;
  deactivateAccount(): Promise<void>;
  verifyEmail(token: string): Promise<void>;
  resendVerificationEmail(): Promise<void>;
  
  // State management
  isAuthenticated(): boolean;
  getAuthState(): AuthState;
  
  // Session management
  extendSession(): Promise<void>;
  checkSession(): Promise<boolean>;
}

/**
 * Authentication service events
 */
export interface AuthServiceEvents {
  'auth:login': { user: User };
  'auth:logout': { reason: string };
  'auth:token-refresh': { user: User };
  'auth:session-expired': { user: User };
  'auth:user-updated': { user: User };
  'auth:error': { error: AuthError };
}

// ========================================
// CONFIGURATION TYPES
// ========================================

/**
 * Authentication configuration
 */
export interface AuthConfig {
  apiBaseURL: string;
  tokenStorageType: TokenStorageType;
  tokenRefreshThreshold: number; // Minutes before expiry to refresh
  sessionTimeout: number; // Minutes
  rememberMeMaxAge: number; // Days
  maxRetryAttempts: number;
  retryDelay: number; // Milliseconds
  enableLogging: boolean;
  cookieOptions: CookieOptions;
}

/**
 * Cookie options for token storage
 */
export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number; // Seconds
  path: string;
  domain?: string;
}

/**
 * Service factory interface
 */
export interface AuthServiceFactory {
  createAuthService(config?: Partial<AuthConfig>): AuthService;
  createTokenManager(config?: Partial<AuthConfig>): TokenManager;
  createAPIClient(config?: Partial<AuthConfig>): APIClient;
}

/**
 * Generic API client interface
 */
export interface APIClient {
  request<T = unknown>(endpoint: string, config?: APIRequestConfig): Promise<APIResponse<T>>;
  get<T = unknown>(endpoint: string, config?: Omit<APIRequestConfig, 'method'>): Promise<APIResponse<T>>;
  post<T = unknown>(endpoint: string, data?: unknown, config?: Omit<APIRequestConfig, 'method' | 'data'>): Promise<APIResponse<T>>;
  put<T = unknown>(endpoint: string, data?: unknown, config?: Omit<APIRequestConfig, 'method' | 'data'>): Promise<APIResponse<T>>;
  delete<T = unknown>(endpoint: string, config?: Omit<APIRequestConfig, 'method'>): Promise<APIResponse<T>>;
  patch<T = unknown>(endpoint: string, data?: unknown, config?: Omit<APIRequestConfig, 'method' | 'data'>): Promise<APIResponse<T>>;
  cancelRequests(): void;
}

// ========================================
// UTILITY TYPES
// ========================================

/**
 * Utility type for making properties optional
 */
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Utility type for API endpoints
 */
export type APIEndpoint = string;

/**
 * Utility type for HTTP methods
 */
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * Utility type for event handler
 */
export type EventHandler<T = unknown> = (event: T) => void;

/**
 * Utility type for async event handler
 */
export type AsyncEventHandler<T = unknown> = (event: T) => Promise<void>;

/**
 * Utility type for cleanup function
 */
export type CleanupFunction = () => void;

/**
 * Utility type for subscription
 */
export interface Subscription {
  unsubscribe: CleanupFunction;
}

/**
 * Utility type for observable
 */
export interface Observable<T> {
  subscribe(handler: EventHandler<T>): Subscription;
}