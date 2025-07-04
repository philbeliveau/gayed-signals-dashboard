# Authentication Service Layer Architecture

## Overview
This document defines the service layer architecture for authentication, including API client configuration, token management, and integration with the existing FastAPI backend.

## Service Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Service Layer                   │
├─────────────────────────────────────────────────────────────┤
│  AuthService (Business Logic)                               │
│  ├── login()                                                │
│  ├── register()                                             │
│  ├── logout()                                               │
│  ├── refreshToken()                                         │
│  └── getCurrentUser()                                       │
├─────────────────────────────────────────────────────────────┤
│  APIClient (HTTP Communication)                             │
│  ├── request()                                              │
│  ├── get()                                                  │
│  ├── post()                                                 │
│  ├── put()                                                  │
│  └── delete()                                               │
├─────────────────────────────────────────────────────────────┤
│  TokenManager (Token Handling)                              │
│  ├── getToken()                                             │
│  ├── setToken()                                             │
│  ├── removeToken()                                          │
│  ├── refreshToken()                                         │
│  └── isTokenValid()                                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                          │
├─────────────────────────────────────────────────────────────┤
│  Authentication Endpoints                                   │
│  ├── POST /auth/login                                       │
│  ├── POST /auth/refresh                                     │
│  ├── GET /auth/me                                           │
│  ├── POST /users/                                           │
│  └── PUT /users/me                                          │
└─────────────────────────────────────────────────────────────┘
```

## Core Service Components

### 1. TokenManager

**File**: `/src/lib/auth/tokenManager.ts`

```typescript
interface TokenStorage {
  getToken(): string | null;
  setToken(token: string): void;
  removeToken(): void;
  getRefreshToken(): string | null;
  setRefreshToken(token: string): void;
  removeRefreshToken(): void;
}

interface TokenManager {
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

class TokenManagerImpl implements TokenManager {
  private storage: TokenStorage;
  
  constructor(storage: TokenStorage) {
    this.storage = storage;
  }
  
  getAccessToken(): string | null {
    return this.storage.getToken();
  }
  
  setAccessToken(token: string): void {
    this.storage.setToken(token);
  }
  
  removeAccessToken(): void {
    this.storage.removeToken();
  }
  
  isTokenValid(token?: string): boolean {
    const tokenToCheck = token || this.getAccessToken();
    if (!tokenToCheck) return false;
    
    try {
      const payload = this.decodeToken(tokenToCheck);
      return !this.isTokenExpired(tokenToCheck);
    } catch {
      return false;
    }
  }
  
  private decodeToken(token: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token format');
    
    const payload = parts[1];
    const decoded = atob(payload);
    return JSON.parse(decoded);
  }
  
  isTokenExpired(token?: string): boolean {
    const tokenToCheck = token || this.getAccessToken();
    if (!tokenToCheck) return true;
    
    try {
      const payload = this.decodeToken(tokenToCheck);
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch {
      return true;
    }
  }
  
  async refreshToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    // Call refresh endpoint
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    
    if (!response.ok) {
      throw new Error('Token refresh failed');
    }
    
    const data = await response.json();
    this.setAccessToken(data.access_token);
    
    return data.access_token;
  }
  
  clearAll(): void {
    this.removeAccessToken();
    this.removeRefreshToken();
  }
}
```

### 2. APIClient

**File**: `/src/lib/auth/apiClient.ts`

```typescript
interface APIClientConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  tokenManager: TokenManager;
}

interface APIResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

interface APIError {
  message: string;
  status: number;
  code?: string;
  details?: any;
}

class APIClient {
  private config: APIClientConfig;
  private abortController: AbortController;
  
  constructor(config: APIClientConfig) {
    this.config = config;
    this.abortController = new AbortController();
  }
  
  async request<T = any>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      data?: any;
      headers?: Record<string, string>;
      requireAuth?: boolean;
      skipAuthRefresh?: boolean;
    } = {}
  ): Promise<APIResponse<T>> {
    const {
      method = 'GET',
      data,
      headers = {},
      requireAuth = true,
      skipAuthRefresh = false
    } = options;
    
    const url = `${this.config.baseURL}${endpoint}`;
    
    // Add authentication header if required
    if (requireAuth) {
      const token = this.config.tokenManager.getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    
    // Add content type for POST/PUT requests
    if (method !== 'GET' && data) {
      headers['Content-Type'] = 'application/json';
    }
    
    const requestOptions: RequestInit = {
      method,
      headers,
      signal: this.abortController.signal,
      body: data ? JSON.stringify(data) : undefined,
    };
    
    try {
      const response = await fetch(url, requestOptions);
      
      // Handle token refresh for 401 responses
      if (response.status === 401 && !skipAuthRefresh && requireAuth) {
        try {
          await this.config.tokenManager.refreshToken();
          // Retry the request with new token
          return this.request(endpoint, { ...options, skipAuthRefresh: true });
        } catch (refreshError) {
          // Refresh failed, clear tokens and throw
          this.config.tokenManager.clearAll();
          throw new APIError({
            message: 'Authentication failed',
            status: 401,
            code: 'AUTH_FAILED'
          });
        }
      }
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new APIError({
          message: responseData.message || 'Request failed',
          status: response.status,
          code: responseData.code,
          details: responseData.details
        });
      }
      
      return {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      };
      
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      
      throw new APIError({
        message: error instanceof Error ? error.message : 'Network error',
        status: 0,
        code: 'NETWORK_ERROR'
      });
    }
  }
  
  async get<T = any>(endpoint: string, options: Omit<Parameters<typeof this.request>[1], 'method'> = {}): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }
  
  async post<T = any>(endpoint: string, data?: any, options: Omit<Parameters<typeof this.request>[1], 'method' | 'data'> = {}): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', data });
  }
  
  async put<T = any>(endpoint: string, data?: any, options: Omit<Parameters<typeof this.request>[1], 'method' | 'data'> = {}): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', data });
  }
  
  async delete<T = any>(endpoint: string, options: Omit<Parameters<typeof this.request>[1], 'method'> = {}): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
  
  cancelRequests(): void {
    this.abortController.abort();
    this.abortController = new AbortController();
  }
}

// Error class for API errors
class APIError extends Error {
  public status: number;
  public code?: string;
  public details?: any;
  
  constructor(error: APIError) {
    super(error.message);
    this.name = 'APIError';
    this.status = error.status;
    this.code = error.code;
    this.details = error.details;
  }
}
```

### 3. AuthService

**File**: `/src/lib/auth/authService.ts`

```typescript
interface AuthService {
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

class AuthServiceImpl implements AuthService {
  private apiClient: APIClient;
  private tokenManager: TokenManager;
  
  constructor(apiClient: APIClient, tokenManager: TokenManager) {
    this.apiClient = apiClient;
    this.tokenManager = tokenManager;
  }
  
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await this.apiClient.post<AuthResponse>('/auth/login', {
        email: credentials.email,
        password: credentials.password
      }, { requireAuth: false });
      
      // Store tokens
      this.tokenManager.setAccessToken(response.data.access_token);
      if (response.data.refresh_token) {
        this.tokenManager.setRefreshToken(response.data.refresh_token);
      }
      
      return response.data;
    } catch (error) {
      throw new AuthError('Login failed', error);
    }
  }
  
  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const response = await this.apiClient.post<AuthResponse>('/users/', {
        email: userData.email,
        username: userData.username,
        password: userData.password,
        full_name: userData.full_name
      }, { requireAuth: false });
      
      // Store tokens
      this.tokenManager.setAccessToken(response.data.access_token);
      if (response.data.refresh_token) {
        this.tokenManager.setRefreshToken(response.data.refresh_token);
      }
      
      return response.data;
    } catch (error) {
      throw new AuthError('Registration failed', error);
    }
  }
  
  async logout(): Promise<void> {
    try {
      // Call logout endpoint if available
      await this.apiClient.post('/auth/logout');
    } catch (error) {
      // Continue with local logout even if backend fails
      console.warn('Logout endpoint failed, continuing with local logout');
    } finally {
      // Clear all tokens
      this.tokenManager.clearAll();
    }
  }
  
  async refreshToken(): Promise<AuthResponse> {
    try {
      const newToken = await this.tokenManager.refreshToken();
      return {
        access_token: newToken,
        token_type: 'bearer',
        user: await this.getCurrentUser()
      };
    } catch (error) {
      throw new AuthError('Token refresh failed', error);
    }
  }
  
  isAuthenticated(): boolean {
    const token = this.tokenManager.getAccessToken();
    return token !== null && this.tokenManager.isTokenValid(token);
  }
  
  async getCurrentUser(): Promise<User> {
    try {
      const response = await this.apiClient.get<User>('/auth/me');
      return response.data;
    } catch (error) {
      throw new AuthError('Failed to get current user', error);
    }
  }
  
  async updateUser(updates: Partial<User>): Promise<User> {
    try {
      const response = await this.apiClient.put<User>('/users/me', updates);
      return response.data;
    } catch (error) {
      throw new AuthError('Failed to update user', error);
    }
  }
  
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await this.apiClient.put('/users/me/password', {
        current_password: currentPassword,
        new_password: newPassword
      });
    } catch (error) {
      throw new AuthError('Failed to change password', error);
    }
  }
  
  async resetPassword(email: string): Promise<void> {
    try {
      await this.apiClient.post('/auth/reset-password', { email }, { requireAuth: false });
    } catch (error) {
      throw new AuthError('Failed to request password reset', error);
    }
  }
  
  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    try {
      await this.apiClient.post('/auth/reset-password/confirm', {
        token,
        new_password: newPassword
      }, { requireAuth: false });
    } catch (error) {
      throw new AuthError('Failed to reset password', error);
    }
  }
  
  async deleteAccount(): Promise<void> {
    try {
      await this.apiClient.delete('/users/me');
      this.tokenManager.clearAll();
    } catch (error) {
      throw new AuthError('Failed to delete account', error);
    }
  }
  
  async deactivateAccount(): Promise<void> {
    try {
      await this.apiClient.put('/users/me/deactivate');
      this.tokenManager.clearAll();
    } catch (error) {
      throw new AuthError('Failed to deactivate account', error);
    }
  }
}

// Auth error class
class AuthError extends Error {
  public originalError?: any;
  
  constructor(message: string, originalError?: any) {
    super(message);
    this.name = 'AuthError';
    this.originalError = originalError;
  }
}
```

## Storage Strategies

### 1. Secure Token Storage

```typescript
// Cookie-based storage (preferred for security)
class CookieTokenStorage implements TokenStorage {
  private cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };
  
  getToken(): string | null {
    return this.getCookie('access_token');
  }
  
  setToken(token: string): void {
    this.setCookie('access_token', token, this.cookieOptions);
  }
  
  removeToken(): void {
    this.deleteCookie('access_token');
  }
  
  private getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  }
  
  private setCookie(name: string, value: string, options: any): void {
    const optionsString = Object.entries(options)
      .map(([key, val]) => `${key}=${val}`)
      .join('; ');
    document.cookie = `${name}=${value}; ${optionsString}`;
  }
  
  private deleteCookie(name: string): void {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }
}

// Memory storage for sensitive environments
class MemoryTokenStorage implements TokenStorage {
  private tokens: Map<string, string> = new Map();
  
  getToken(): string | null {
    return this.tokens.get('access_token') || null;
  }
  
  setToken(token: string): void {
    this.tokens.set('access_token', token);
  }
  
  removeToken(): void {
    this.tokens.delete('access_token');
  }
  
  getRefreshToken(): string | null {
    return this.tokens.get('refresh_token') || null;
  }
  
  setRefreshToken(token: string): void {
    this.tokens.set('refresh_token', token);
  }
  
  removeRefreshToken(): void {
    this.tokens.delete('refresh_token');
  }
}
```

### 2. Service Factory

```typescript
// Service factory for dependency injection
interface AuthServiceFactory {
  createAuthService(): AuthService;
  createAPIClient(): APIClient;
  createTokenManager(): TokenManager;
}

class AuthServiceFactoryImpl implements AuthServiceFactory {
  private config: {
    apiBaseURL: string;
    storageType: 'cookie' | 'memory' | 'localStorage';
    tokenRefreshThreshold: number;
  };
  
  constructor(config: AuthServiceFactoryImpl['config']) {
    this.config = config;
  }
  
  createAuthService(): AuthService {
    const apiClient = this.createAPIClient();
    const tokenManager = this.createTokenManager();
    return new AuthServiceImpl(apiClient, tokenManager);
  }
  
  createAPIClient(): APIClient {
    const tokenManager = this.createTokenManager();
    return new APIClient({
      baseURL: this.config.apiBaseURL,
      timeout: 30000,
      retryAttempts: 3,
      tokenManager
    });
  }
  
  createTokenManager(): TokenManager {
    const storage = this.createTokenStorage();
    return new TokenManagerImpl(storage);
  }
  
  private createTokenStorage(): TokenStorage {
    switch (this.config.storageType) {
      case 'cookie':
        return new CookieTokenStorage();
      case 'memory':
        return new MemoryTokenStorage();
      case 'localStorage':
        return new LocalStorageTokenStorage();
      default:
        return new CookieTokenStorage();
    }
  }
}
```

## Error Handling Strategy

### 1. Error Types

```typescript
// Comprehensive error handling
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

class AuthError extends Error {
  public type: AuthErrorType;
  public details?: any;
  
  constructor(type: AuthErrorType, message: string, details?: any) {
    super(message);
    this.name = 'AuthError';
    this.type = type;
    this.details = details;
  }
}

// Error handling utility
const handleAuthError = (error: any): AuthError => {
  if (error instanceof AuthError) {
    return error;
  }
  
  if (error.status === 401) {
    return new AuthError(AuthErrorType.INVALID_CREDENTIALS, 'Invalid credentials');
  }
  
  if (error.status === 403) {
    return new AuthError(AuthErrorType.PERMISSION_DENIED, 'Permission denied');
  }
  
  if (error.status === 429) {
    return new AuthError(AuthErrorType.RATE_LIMITED, 'Too many requests');
  }
  
  return new AuthError(AuthErrorType.NETWORK_ERROR, 'Network error occurred');
};
```

### 2. Retry Logic

```typescript
// Retry mechanism for failed requests
class RetryableAPIClient extends APIClient {
  private async retryRequest<T>(
    fn: () => Promise<APIResponse<T>>,
    attempts: number = 3,
    delay: number = 1000
  ): Promise<APIResponse<T>> {
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === attempts - 1) throw error;
        
        // Don't retry auth errors
        if (error instanceof APIError && error.status === 401) {
          throw error;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
    
    throw new Error('Max retries exceeded');
  }
}
```

## Performance Optimization

### 1. Request Caching

```typescript
// Response caching for expensive operations
class CachedAPIClient extends APIClient {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes
  
  async get<T = any>(endpoint: string, options: any = {}): Promise<APIResponse<T>> {
    const cacheKey = `${endpoint}:${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return { data: cached.data, status: 200, statusText: 'OK', headers: {} };
    }
    
    const response = await super.get<T>(endpoint, options);
    this.cache.set(cacheKey, { data: response.data, timestamp: Date.now() });
    
    return response;
  }
}
```

### 2. Request Debouncing

```typescript
// Debounced requests for frequent operations
class DebouncedAPIClient extends APIClient {
  private debounceMap = new Map<string, NodeJS.Timeout>();
  
  async debouncedRequest<T>(
    key: string,
    fn: () => Promise<APIResponse<T>>,
    delay: number = 300
  ): Promise<APIResponse<T>> {
    return new Promise((resolve, reject) => {
      const existingTimeout = this.debounceMap.get(key);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      
      const timeout = setTimeout(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.debounceMap.delete(key);
        }
      }, delay);
      
      this.debounceMap.set(key, timeout);
    });
  }
}
```

## Testing Strategy

### 1. Service Testing

```typescript
// Mock API client for testing
class MockAPIClient implements APIClient {
  private responses = new Map<string, any>();
  
  setMockResponse(endpoint: string, response: any): void {
    this.responses.set(endpoint, response);
  }
  
  async request<T>(endpoint: string, options: any = {}): Promise<APIResponse<T>> {
    const response = this.responses.get(endpoint);
    if (!response) {
      throw new Error(`No mock response configured for ${endpoint}`);
    }
    
    return {
      data: response,
      status: 200,
      statusText: 'OK',
      headers: {}
    };
  }
}

// Test example
describe('AuthService', () => {
  let authService: AuthService;
  let mockAPIClient: MockAPIClient;
  
  beforeEach(() => {
    mockAPIClient = new MockAPIClient();
    const tokenManager = new TokenManagerImpl(new MemoryTokenStorage());
    authService = new AuthServiceImpl(mockAPIClient, tokenManager);
  });
  
  it('should login successfully', async () => {
    mockAPIClient.setMockResponse('/auth/login', {
      access_token: 'mock_token',
      user: { id: '1', email: 'test@example.com' }
    });
    
    const result = await authService.login({
      email: 'test@example.com',
      password: 'password'
    });
    
    expect(result.access_token).toBe('mock_token');
  });
});
```

## Configuration

### 1. Environment Configuration

```typescript
// Configuration management
interface AuthConfig {
  apiBaseURL: string;
  tokenStorageType: 'cookie' | 'memory' | 'localStorage';
  tokenRefreshThreshold: number;
  requestTimeout: number;
  retryAttempts: number;
  enableLogging: boolean;
}

const getAuthConfig = (): AuthConfig => ({
  apiBaseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
  tokenStorageType: process.env.NEXT_PUBLIC_TOKEN_STORAGE_TYPE as any || 'cookie',
  tokenRefreshThreshold: 5 * 60 * 1000, // 5 minutes
  requestTimeout: 30000,
  retryAttempts: 3,
  enableLogging: process.env.NODE_ENV === 'development'
});
```

### 2. Service Initialization

```typescript
// Service initialization
const authConfig = getAuthConfig();
const authServiceFactory = new AuthServiceFactoryImpl(authConfig);
const authService = authServiceFactory.createAuthService();

export { authService, authServiceFactory };
```

## Next Steps

1. **Implement token management** with secure storage
2. **Create API client** with automatic token refresh
3. **Build authentication service** with error handling
4. **Add comprehensive testing** for all service methods
5. **Configure environment variables** for different environments
6. **Implement request caching** for performance optimization
7. **Add monitoring and logging** for production debugging