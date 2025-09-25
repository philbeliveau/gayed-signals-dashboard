/**
 * Authentication Module - Main Entry Point
 * 
 * This module provides the main exports and factory functions for the authentication system.
 * It includes service factories, configuration management, and convenient exports.
 */

// ========================================
// TYPE EXPORTS
// ========================================

import type {
  // User types
  User,
  UserPreferences,
  
  // Authentication types
  LoginCredentials,
  RegisterData,
  AuthResponse,
  TokenRefreshRequest,
  TokenRefreshResponse,
  PasswordChangeRequest,
  PasswordResetRequest,
  PasswordResetConfirmation,
  
  // Error types
  FastAPIError,
  FastAPIValidationError,
  
  // State types
  AuthState,
  AuthStatus,
  
  // Service interfaces
  TokenStorage,
  TokenManager,
  APIClient,
  AuthService,
  
  // Configuration types
  AuthConfig,
  CookieOptions,
  AuthServiceFactory,
  TokenStorageType,
  APIClientConfig,
  APIRequestConfig,
  APIResponse,
  
  // Token types
  TokenPayload,
  
  // Utility types
  PartialExcept,
  APIEndpoint,
  HTTPMethod,
  EventHandler,
  AsyncEventHandler,
  CleanupFunction,
  Subscription,
  Observable
} from './types';

// Import implementation types for factory usage
import { TokenManagerImpl, createTokenManager } from './tokenManager';
import { APIClient as APIClientImpl, createAPIClient } from './apiClient';
import { AuthServiceImpl, AuthError, createAuthService } from './authService';

export type {
  // User types
  User,
  UserPreferences,
  
  // Authentication types
  LoginCredentials,
  RegisterData,
  AuthResponse,
  TokenRefreshRequest,
  TokenRefreshResponse,
  PasswordChangeRequest,
  PasswordResetRequest,
  PasswordResetConfirmation,
  
  // Error types
  FastAPIError,
  FastAPIValidationError,
  
  // State types
  AuthState,
  AuthStatus,
  
  // Service interfaces
  TokenStorage,
  
  // Configuration types
  AuthConfig,
  CookieOptions,
  AuthServiceFactory,
  TokenStorageType,
  APIClientConfig,
  APIRequestConfig,
  APIResponse,
  
  // Token types
  TokenPayload,
  
  // Utility types
  PartialExcept,
  APIEndpoint,
  HTTPMethod,
  EventHandler,
  AsyncEventHandler,
  CleanupFunction,
  Subscription,
  Observable
};

// ========================================
// IMPLEMENTATION EXPORTS
// ========================================

// Token Manager
export {
  TokenManagerImpl as TokenManager,
  createTokenManager,
  CookieTokenStorage,
  MemoryTokenStorage,
  LocalStorageTokenStorage
} from './tokenManager';

// API Client
export {
  APIClient as APIClientImpl,
  APIErrorImpl as APIError,
  createAPIClient
} from './apiClient';

// Auth Service
export {
  AuthServiceImpl as AuthService,
  AuthError,
  createAuthService
} from './authService';

// Re-export auth error types enum
export { AuthErrorType } from './types';

// ========================================
// CONFIGURATION MANAGEMENT
// ========================================

/**
 * Default authentication configuration
 */
export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  apiBaseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api',
  tokenStorageType: 'cookie', // Secure httpOnly cookies preferred
  tokenRefreshThreshold: 5, // Refresh 5 minutes before expiry
  sessionTimeout: 60 * 24, // 24 hours in minutes
  rememberMeMaxAge: 30, // 30 days
  maxRetryAttempts: 3,
  retryDelay: 1000, // 1 second
  enableLogging: process.env.NODE_ENV === 'development',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    path: '/',
    domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN
  }
};

/**
 * Get authentication configuration with environment overrides
 */
export function getAuthConfig(overrides: Partial<AuthConfig> = {}): AuthConfig {
  return {
    ...DEFAULT_AUTH_CONFIG,
    ...overrides,
    cookieOptions: {
      ...DEFAULT_AUTH_CONFIG.cookieOptions,
      ...overrides.cookieOptions
    }
  };
}

// ========================================
// SERVICE FACTORY IMPLEMENTATION
// ========================================

/**
 * Authentication Service Factory Implementation
 * 
 * Provides a centralized way to create and configure authentication services
 */
export class AuthServiceFactoryImpl implements AuthServiceFactory {
  private config: AuthConfig;
  private tokenManagerInstance?: TokenManager;
  private apiClientInstance?: APIClientImpl;
  private authServiceInstance?: AuthService;

  constructor(config: Partial<AuthConfig> = {}) {
    this.config = getAuthConfig(config);
  }

  /**
   * Create or get singleton token manager
   */
  createTokenManager(config?: Partial<AuthConfig>): TokenManager {
    if (this.tokenManagerInstance && !config) {
      return this.tokenManagerInstance;
    }

    const finalConfig = config ? getAuthConfig({ ...this.config, ...config }) : this.config;
    
    this.tokenManagerInstance = createTokenManager(
      finalConfig.tokenStorageType
    );

    return this.tokenManagerInstance;
  }

  /**
   * Create or get singleton API client
   */
  createAPIClient(config?: Partial<AuthConfig>): APIClient {
    if (this.apiClientInstance && !config) {
      return this.apiClientInstance as APIClient;
    }

    const finalConfig = config ? getAuthConfig({ ...this.config, ...config }) : this.config;
    const tokenManager = this.createTokenManager(finalConfig);

    this.apiClientInstance = createAPIClient({
      baseURL: finalConfig.apiBaseURL,
      timeout: 30000,
      retryAttempts: finalConfig.maxRetryAttempts,
      tokenManager
    });

    return this.apiClientInstance as APIClient;
  }

  /**
   * Create or get singleton auth service
   */
  createAuthService(config?: Partial<AuthConfig>): AuthService {
    if (this.authServiceInstance && !config) {
      return this.authServiceInstance;
    }

    const finalConfig = config ? getAuthConfig({ ...this.config, ...config }) : this.config;
    const apiClient = this.createAPIClient(finalConfig);
    const tokenManager = this.createTokenManager(finalConfig);

    this.authServiceInstance = createAuthService(apiClient as APIClientImpl, tokenManager);

    return this.authServiceInstance;
  }

  /**
   * Get current configuration
   */
  getConfig(): AuthConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<AuthConfig>): void {
    this.config = getAuthConfig({ ...this.config, ...updates });
    
    // Clear instances to force recreation with new config
    this.tokenManagerInstance = undefined;
    this.apiClientInstance = undefined;
    this.authServiceInstance = undefined;
  }

  /**
   * Reset all instances (useful for testing)
   */
  reset(): void {
    this.tokenManagerInstance = undefined;
    this.apiClientInstance = undefined;
    this.authServiceInstance = undefined;
  }
}

// ========================================
// SINGLETON FACTORY INSTANCE
// ========================================

/**
 * Default singleton auth service factory
 */
export const authServiceFactory = new AuthServiceFactoryImpl();

/**
 * Get the default auth service instance
 */
export const authService = authServiceFactory.createAuthService();

/**
 * Get the default token manager instance
 */
export const tokenManager = authServiceFactory.createTokenManager();

/**
 * Get the default API client instance
 */
export const apiClient = authServiceFactory.createAPIClient();

// ========================================
// CONVENIENCE FUNCTIONS
// ========================================

/**
 * Create a new auth service factory with custom configuration
 */
export function createAuthServiceFactory(config: Partial<AuthConfig> = {}): AuthServiceFactoryImpl {
  return new AuthServiceFactoryImpl(config);
}

/**
 * Quick setup for testing environments
 */
export function createTestAuthService(config: Partial<AuthConfig> = {}): {
  authService: AuthService;
  tokenManager: TokenManager;
  apiClient: APIClient;
  factory: AuthServiceFactoryImpl;
} {
  const testConfig = getAuthConfig({
    tokenStorageType: 'memory', // Use memory storage for tests
    enableLogging: false,
    ...config
  });

  const factory = new AuthServiceFactoryImpl(testConfig);
  
  return {
    authService: factory.createAuthService(),
    tokenManager: factory.createTokenManager(),
    apiClient: factory.createAPIClient(),
    factory
  };
}

/**
 * Setup for server-side rendering
 */
export function createSSRAuthService(config: Partial<AuthConfig> = {}): {
  authService: AuthService;
  tokenManager: TokenManager;
  apiClient: APIClient;
} {
  const ssrConfig = getAuthConfig({
    tokenStorageType: 'memory', // Use memory storage for SSR
    enableLogging: false,
    ...config
  });

  const factory = new AuthServiceFactoryImpl(ssrConfig);
  
  return {
    authService: factory.createAuthService(),
    tokenManager: factory.createTokenManager(),
    apiClient: factory.createAPIClient()
  };
}

/**
 * Setup for production environments
 */
export function createProductionAuthService(config: Partial<AuthConfig> = {}): {
  authService: AuthService;
  tokenManager: TokenManager;
  apiClient: APIClient;
} {
  const productionConfig = getAuthConfig({
    tokenStorageType: 'cookie',
    enableLogging: false,
    cookieOptions: {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 86400, // 24 hours in seconds
      path: '/'
    },
    ...config
  });

  const factory = new AuthServiceFactoryImpl(productionConfig);
  
  return {
    authService: factory.createAuthService(),
    tokenManager: factory.createTokenManager(),
    apiClient: factory.createAPIClient()
  };
}

// ========================================
// UTILITY EXPORTS
// ========================================

/**
 * Check if running in browser environment
 */
export const isBrowser = typeof window !== 'undefined';

/**
 * Check if running in development mode
 */
export const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Check if running in production mode
 */
export const isProduction = process.env.NODE_ENV === 'production';

/**
 * Get API base URL
 */
export const getAPIBaseURL = (): string => {
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
};

/**
 * Auth service hook utility (for React integration)
 */
export interface AuthServiceHook {
  authService: AuthService;
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: AuthError | null;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (userData: RegisterData) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<User>;
  refreshToken: () => Promise<AuthResponse>;
}

// ========================================
// VERSION INFORMATION
// ========================================

export const AUTH_SERVICE_VERSION = '1.0.0';

export const AUTH_SERVICE_INFO = {
  version: AUTH_SERVICE_VERSION,
  features: [
    'JWT Token Management',
    'Secure Cookie Storage',
    'Automatic Token Refresh',
    'FastAPI Integration',
    'Comprehensive Error Handling',
    'Retry Logic',
    'TypeScript Support'
  ],
  storageTypes: ['cookie', 'memory', 'localStorage', 'sessionStorage'],
  supportedBackends: ['FastAPI']
} as const;

// ========================================
// DEFAULT EXPORT
// ========================================

/**
 * Default export provides the main auth service
 */
export default authService;