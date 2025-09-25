/**
 * Authentication Service Tests
 * 
 * Comprehensive tests for the authentication service layer components
 */

import {
  createTestAuthService,
  TokenManager,
  APIClient,
  AuthService,
  AuthErrorType,
  LoginCredentials,
  RegisterData,
  User,
  MemoryTokenStorage
} from '../index';

// ========================================
// MOCK DATA
// ========================================

const mockUser: User = {
  id: '123',
  email: 'test@example.com',
  username: 'testuser',
  full_name: 'Test User',
  is_active: true,
  is_superuser: false,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  preferences: {
    theme: 'light',
    timezone: 'UTC',
    language: 'en',
    notifications: {
      email: true,
      browser: true,
      signals: true,
      performance: true
    },
    dashboard: {
      defaultView: 'overview',
      chartsConfig: {}
    }
  }
};

const mockCredentials: LoginCredentials = {
  email: 'test@example.com',
  password: 'password123'
};

const mockRegisterData: RegisterData = {
  email: 'test@example.com',
  username: 'testuser',
  password: 'password123',
  full_name: 'Test User',
  terms_accepted: true
};

const mockAuthResponse = {
  access_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJleHAiOjE2ODg5NzM2MDB9.mock_signature',
  refresh_token: 'mock_refresh_token',
  token_type: 'bearer',
  expires_in: 3600,
  user: mockUser
};

// ========================================
// MOCK API CLIENT
// ========================================

class MockAPIClient implements APIClient {
  private responses = new Map<string, any>();
  private errors = new Map<string, any>();
  private callLog: Array<{ endpoint: string; config?: any }> = [];

  setMockResponse(endpoint: string, response: any): void {
    this.responses.set(endpoint, response);
  }

  setMockError(endpoint: string, error: any): void {
    this.errors.set(endpoint, error);
  }

  getCallLog(): Array<{ endpoint: string; config?: any }> {
    return [...this.callLog];
  }

  clearCallLog(): void {
    this.callLog = [];
  }

  async request<T>(endpoint: string, config: any = {}): Promise<{ data: T; status: number; statusText: string; headers: Record<string, string> }> {
    this.callLog.push({ endpoint, config });

    if (this.errors.has(endpoint)) {
      throw this.errors.get(endpoint);
    }

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

  async get<T>(endpoint: string, config: any = {}): Promise<{ data: T; status: number; statusText: string; headers: Record<string, string> }> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any, config: any = {}): Promise<{ data: T; status: number; statusText: string; headers: Record<string, string> }> {
    return this.request<T>(endpoint, { ...config, method: 'POST', data });
  }

  async put<T>(endpoint: string, data?: any, config: any = {}): Promise<{ data: T; status: number; statusText: string; headers: Record<string, string> }> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', data });
  }

  async delete<T>(endpoint: string, config: any = {}): Promise<{ data: T; status: number; statusText: string; headers: Record<string, string> }> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  async patch<T>(endpoint: string, data?: any, config: any = {}): Promise<{ data: T; status: number; statusText: string; headers: Record<string, string> }> {
    return this.request<T>(endpoint, { ...config, method: 'PATCH', data });
  }

  cancelRequests(): void {
    // Mock implementation
  }
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function createMockAuthService() {
  const mockAPIClient = new MockAPIClient();
  const storage = new MemoryTokenStorage();
  const tokenManager = new TokenManager(storage);
  const authService = new AuthService(mockAPIClient, tokenManager);

  return {
    authService,
    tokenManager,
    apiClient: mockAPIClient,
    storage
  };
}

// ========================================
// TOKEN MANAGER TESTS
// ========================================

describe('TokenManager', () => {
  let tokenManager: TokenManager;
  let storage: MemoryTokenStorage;

  beforeEach(() => {
    storage = new MemoryTokenStorage();
    tokenManager = new TokenManager(storage);
  });

  describe('Token Storage', () => {
    test('should store and retrieve access token', () => {
      const token = 'test_access_token';
      tokenManager.setAccessToken(token);
      expect(tokenManager.getAccessToken()).toBe(token);
    });

    test('should store and retrieve refresh token', () => {
      const token = 'test_refresh_token';
      tokenManager.setRefreshToken(token);
      expect(tokenManager.getRefreshToken()).toBe(token);
    });

    test('should remove tokens', () => {
      tokenManager.setAccessToken('access_token');
      tokenManager.setRefreshToken('refresh_token');
      
      tokenManager.removeAccessToken();
      tokenManager.removeRefreshToken();
      
      expect(tokenManager.getAccessToken()).toBeNull();
      expect(tokenManager.getRefreshToken()).toBeNull();
    });

    test('should clear all tokens', () => {
      tokenManager.setAccessToken('access_token');
      tokenManager.setRefreshToken('refresh_token');
      
      tokenManager.clearAll();
      
      expect(tokenManager.getAccessToken()).toBeNull();
      expect(tokenManager.getRefreshToken()).toBeNull();
    });
  });

  describe('Token Validation', () => {
    test('should validate valid token', () => {
      const validToken = mockAuthResponse.access_token;
      expect(tokenManager.isTokenValid(validToken)).toBe(true);
    });

    test('should invalidate malformed token', () => {
      const invalidToken = 'invalid.token';
      expect(tokenManager.isTokenValid(invalidToken)).toBe(false);
    });

    test('should decode token payload', () => {
      const token = mockAuthResponse.access_token;
      const payload = tokenManager.decodeToken(token);
      
      expect(payload).toBeTruthy();
      expect(payload?.sub).toBe('123');
      expect(payload?.email).toBe('test@example.com');
    });

    test('should get user ID from token', () => {
      tokenManager.setAccessToken(mockAuthResponse.access_token);
      expect(tokenManager.getUserId()).toBe('123');
    });

    test('should get user email from token', () => {
      tokenManager.setAccessToken(mockAuthResponse.access_token);
      expect(tokenManager.getUserEmail()).toBe('test@example.com');
    });
  });
});

// ========================================
// API CLIENT TESTS
// ========================================

describe('MockAPIClient', () => {
  let apiClient: MockAPIClient;

  beforeEach(() => {
    apiClient = new MockAPIClient();
  });

  test('should make GET requests', async () => {
    apiClient.setMockResponse('/test', { message: 'success' });
    
    const response = await apiClient.get('/test');
    
    expect(response.data).toEqual({ message: 'success' });
    expect(response.status).toBe(200);
  });

  test('should make POST requests with data', async () => {
    apiClient.setMockResponse('/test', { id: 1 });
    
    const response = await apiClient.post('/test', { name: 'test' });
    
    expect(response.data).toEqual({ id: 1 });
    
    const calls = apiClient.getCallLog();
    expect(calls[0].config.data).toEqual({ name: 'test' });
  });

  test('should handle errors', async () => {
    const error = new Error('Network error');
    apiClient.setMockError('/test', error);
    
    await expect(apiClient.get('/test')).rejects.toThrow('Network error');
  });
});

// ========================================
// AUTH SERVICE TESTS
// ========================================

describe('AuthService', () => {
  let authService: AuthService;
  let tokenManager: TokenManager;
  let apiClient: MockAPIClient;

  beforeEach(() => {
    const mocks = createMockAuthService();
    authService = mocks.authService;
    tokenManager = mocks.tokenManager;
    apiClient = mocks.apiClient;
  });

  describe('Login', () => {
    test('should login successfully', async () => {
      apiClient.setMockResponse('/auth/login', mockAuthResponse);
      apiClient.setMockResponse('/auth/me', mockUser);
      
      const result = await authService.login(mockCredentials);
      
      expect(result.access_token).toBe(mockAuthResponse.access_token);
      expect(result.user).toEqual(mockUser);
      expect(tokenManager.getAccessToken()).toBe(mockAuthResponse.access_token);
      expect(authService.isAuthenticated()).toBe(true);
    });

    test('should handle login failure', async () => {
      const error = { status: 401, message: 'Invalid credentials' };
      apiClient.setMockError('/auth/login', error);
      
      await expect(authService.login(mockCredentials)).rejects.toThrow();
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('Registration', () => {
    test('should register and auto-login successfully', async () => {
      apiClient.setMockResponse('/users/', mockUser);
      apiClient.setMockResponse('/auth/login', mockAuthResponse);
      apiClient.setMockResponse('/auth/me', mockUser);
      
      const result = await authService.register(mockRegisterData);
      
      expect(result.access_token).toBe(mockAuthResponse.access_token);
      expect(result.user).toEqual(mockUser);
      expect(authService.isAuthenticated()).toBe(true);
    });

    test('should handle registration failure', async () => {
      const error = { status: 422, message: 'Email already exists' };
      apiClient.setMockError('/users/', error);
      
      await expect(authService.register(mockRegisterData)).rejects.toThrow();
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('Logout', () => {
    test('should logout successfully', async () => {
      // First login
      tokenManager.setAccessToken(mockAuthResponse.access_token);
      apiClient.setMockResponse('/auth/logout', {});
      
      await authService.logout();
      
      expect(tokenManager.getAccessToken()).toBeNull();
      expect(authService.isAuthenticated()).toBe(false);
    });

    test('should logout even if backend call fails', async () => {
      tokenManager.setAccessToken(mockAuthResponse.access_token);
      apiClient.setMockError('/auth/logout', new Error('Server error'));
      
      await authService.logout();
      
      expect(tokenManager.getAccessToken()).toBeNull();
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('User Management', () => {
    beforeEach(() => {
      tokenManager.setAccessToken(mockAuthResponse.access_token);
    });

    test('should get current user', async () => {
      apiClient.setMockResponse('/auth/me', mockUser);
      
      const user = await authService.getCurrentUser();
      
      expect(user).toEqual(mockUser);
    });

    test('should update user', async () => {
      const updates = { full_name: 'Updated Name' };
      const updatedUser = { ...mockUser, ...updates };
      
      apiClient.setMockResponse('/users/me', updatedUser);
      
      const result = await authService.updateUser(updates);
      
      expect(result.full_name).toBe('Updated Name');
    });

    test('should update user preferences', async () => {
      const preferences = { theme: 'dark' as const };
      const updatedUser = {
        ...mockUser,
        preferences: { ...mockUser.preferences!, theme: 'dark' as const }
      };
      
      apiClient.setMockResponse('/users/me/preferences', updatedUser);
      
      const result = await authService.updateUserPreferences(preferences);
      
      expect(result.preferences?.theme).toBe('dark');
    });
  });

  describe('Password Management', () => {
    beforeEach(() => {
      tokenManager.setAccessToken(mockAuthResponse.access_token);
    });

    test('should change password', async () => {
      apiClient.setMockResponse('/users/me/password', {});
      
      await expect(authService.changePassword({
        current_password: 'old_password',
        new_password: 'new_password'
      })).resolves.not.toThrow();
    });

    test('should request password reset', async () => {
      apiClient.setMockResponse('/auth/reset-password', {});
      
      await expect(authService.resetPassword({
        email: 'test@example.com'
      })).resolves.not.toThrow();
    });

    test('should confirm password reset', async () => {
      apiClient.setMockResponse('/auth/reset-password/confirm', {});
      
      await expect(authService.confirmPasswordReset({
        token: 'reset_token',
        new_password: 'new_password'
      })).resolves.not.toThrow();
    });
  });

  describe('Session Management', () => {
    test('should check authentication status', () => {
      expect(authService.isAuthenticated()).toBe(false);
      
      tokenManager.setAccessToken(mockAuthResponse.access_token);
      expect(authService.isAuthenticated()).toBe(true);
    });

    test('should check session validity', async () => {
      tokenManager.setAccessToken(mockAuthResponse.access_token);
      apiClient.setMockResponse('/auth/me', mockUser);
      
      const isValid = await authService.checkSession();
      
      expect(isValid).toBe(true);
    });

    test('should handle invalid session', async () => {
      tokenManager.setAccessToken('invalid_token');
      apiClient.setMockError('/auth/me', { status: 401 });
      
      const isValid = await authService.checkSession();
      
      expect(isValid).toBe(false);
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('Service Initialization', () => {
    test('should initialize with valid token', async () => {
      tokenManager.setAccessToken(mockAuthResponse.access_token);
      apiClient.setMockResponse('/auth/me', mockUser);
      
      const initialized = await authService.initialize();
      
      expect(initialized).toBe(true);
      expect(authService.getAuthState().user).toEqual(mockUser);
    });

    test('should fail initialization with invalid token', async () => {
      tokenManager.setAccessToken('invalid_token');
      apiClient.setMockError('/auth/me', { status: 401 });
      
      const initialized = await authService.initialize();
      
      expect(initialized).toBe(false);
      expect(tokenManager.getAccessToken()).toBeNull();
    });
  });
});

// ========================================
// INTEGRATION TESTS
// ========================================

describe('Authentication Integration', () => {
  test('should create test auth service', () => {
    const { authService, tokenManager, apiClient, factory } = createTestAuthService();
    
    expect(authService).toBeDefined();
    expect(tokenManager).toBeDefined();
    expect(apiClient).toBeDefined();
    expect(factory).toBeDefined();
  });

  test('should use memory storage in test environment', () => {
    const { tokenManager } = createTestAuthService();
    
    tokenManager.setAccessToken('test_token');
    expect(tokenManager.getAccessToken()).toBe('test_token');
  });

  test('should handle full authentication flow', async () => {
    const { authService, tokenManager, apiClient } = createTestAuthService();
    const mockAPIClient = apiClient as any as MockAPIClient;
    
    // Setup mocks
    mockAPIClient.setMockResponse('/auth/login', mockAuthResponse);
    mockAPIClient.setMockResponse('/auth/me', mockUser);
    mockAPIClient.setMockResponse('/auth/logout', {});
    
    // Login
    const loginResult = await authService.login(mockCredentials);
    expect(loginResult.access_token).toBe(mockAuthResponse.access_token);
    expect(authService.isAuthenticated()).toBe(true);
    
    // Get user
    const user = await authService.getCurrentUser();
    expect(user).toEqual(mockUser);
    
    // Logout
    await authService.logout();
    expect(authService.isAuthenticated()).toBe(false);
    expect(tokenManager.getAccessToken()).toBeNull();
  });
});

// ========================================
// ERROR HANDLING TESTS
// ========================================

describe('Error Handling', () => {
  let authService: AuthService;
  let apiClient: MockAPIClient;

  beforeEach(() => {
    const mocks = createMockAuthService();
    authService = mocks.authService;
    apiClient = mocks.apiClient;
  });

  test('should handle network errors', async () => {
    apiClient.setMockError('/auth/login', { status: 0, message: 'Network error' });
    
    try {
      await authService.login(mockCredentials);
    } catch (error: any) {
      expect(error.type).toBe(AuthErrorType.NETWORK_ERROR);
    }
  });

  test('should handle validation errors', async () => {
    apiClient.setMockError('/auth/login', { 
      status: 422, 
      message: 'Validation failed',
      details: { email: ['Invalid email format'] }
    });
    
    try {
      await authService.login(mockCredentials);
    } catch (error: any) {
      expect(error.type).toBe(AuthErrorType.VALIDATION_ERROR);
    }
  });

  test('should handle server errors', async () => {
    apiClient.setMockError('/auth/login', { status: 500, message: 'Internal server error' });
    
    try {
      await authService.login(mockCredentials);
    } catch (error: any) {
      expect(error.type).toBe(AuthErrorType.SERVER_ERROR);
    }
  });
});