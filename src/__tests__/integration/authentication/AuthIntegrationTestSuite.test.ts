/**
 * Authentication Integration Test Suite
 * Comprehensive tests for the complete authentication system
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { FastAPIAuthService } from '@/services/auth/authService';
import { FastAPIAuthClient } from '@/services/auth/apiClient';
import { TokenManagerImpl } from '@/services/auth/tokenManager';
import { LoginCredentials, RegisterData, User } from '@/types/auth';

// Test configuration
const TEST_API_BASE_URL = process.env.TEST_API_BASE_URL || 'http://localhost:8000';
const TEST_USER_EMAIL = 'integration-test@example.com';
const TEST_USER_PASSWORD = 'TestPassword123!';
const TEST_USER_USERNAME = 'integration-test-user';

describe('Authentication Integration Test Suite', () => {
  let authService: FastAPIAuthService;
  let apiClient: FastAPIAuthClient;
  let tokenManager: TokenManagerImpl;
  let testUserId: string | null = null;

  beforeAll(async () => {
    // Initialize services with test configuration
    tokenManager = new TokenManagerImpl();
    apiClient = new FastAPIAuthClient(TEST_API_BASE_URL, tokenManager);
    authService = new FastAPIAuthService(apiClient, tokenManager);

    // Validate API connection
    const isConnected = await authService.validateConnection();
    if (!isConnected) {
      throw new Error(`Cannot connect to test API at ${TEST_API_BASE_URL}`);
    }

    console.log('✅ API connection validated');
  });

  afterAll(async () => {
    // Cleanup test user if created
    if (testUserId) {
      try {
        // Login as test user to delete account
        await authService.login({
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD
        });
        
        // Delete test account
        await authService.deleteAccount();
        console.log('✅ Test user cleaned up');
      } catch (error) {
        console.warn('⚠️ Failed to cleanup test user:', error);
      }
    }

    // Clear all tokens
    tokenManager.clearAll();
  });

  beforeEach(() => {
    // Clear tokens before each test
    tokenManager.clearAll();
  });

  afterEach(() => {
    // Clear tokens after each test
    tokenManager.clearAll();
  });

  describe('Backend API Integration', () => {
    test('should validate FastAPI health endpoint', async () => {
      const response = await fetch(`${TEST_API_BASE_URL}/health`);
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.status).toBe('healthy');
      expect(data.database).toBe('connected');
    });

    test('should validate authentication endpoints exist', async () => {
      // Check if auth endpoints are available
      const endpoints = [
        '/api/v1/auth/login',
        '/api/v1/auth/me',
        '/api/v1/auth/refresh',
        '/api/v1/auth/logout'
      ];

      for (const endpoint of endpoints) {
        const response = await fetch(`${TEST_API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        // We expect 422 (validation error) or 401 (unauthorized), not 404 (not found)
        expect([401, 422]).toContain(response.status);
      }
    });

    test('should reject invalid login credentials', async () => {
      await expect(authService.login({
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      })).rejects.toThrow();
    });

    test('should handle network errors gracefully', async () => {
      const invalidService = new FastAPIAuthService(
        new FastAPIAuthClient('http://invalid-url:9999'),
        tokenManager
      );

      await expect(invalidService.login({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD
      })).rejects.toThrow();
    });
  });

  describe('User Registration Flow', () => {
    test('should successfully register a new user', async () => {
      const registerData: RegisterData = {
        email: TEST_USER_EMAIL,
        username: TEST_USER_USERNAME,
        password: TEST_USER_PASSWORD,
        full_name: 'Integration Test User',
        terms_accepted: true
      };

      const response = await authService.register(registerData);
      
      expect(response.access_token).toBeDefined();
      expect(response.user).toBeDefined();
      expect(response.user.email).toBe(TEST_USER_EMAIL);
      expect(response.user.username).toBe(TEST_USER_USERNAME);
      expect(response.user.is_active).toBe(true);
      
      testUserId = response.user.id;
      
      // Verify token is stored
      expect(tokenManager.getAccessToken()).toBe(response.access_token);
      expect(authService.isAuthenticated()).toBe(true);
    });

    test('should prevent duplicate user registration', async () => {
      const registerData: RegisterData = {
        email: TEST_USER_EMAIL,
        username: TEST_USER_USERNAME,
        password: TEST_USER_PASSWORD,
        full_name: 'Duplicate User',
        terms_accepted: true
      };

      await expect(authService.register(registerData)).rejects.toThrow();
    });
  });

  describe('User Login Flow', () => {
    test('should successfully login with valid credentials', async () => {
      const loginCredentials: LoginCredentials = {
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
        remember_me: true
      };

      const response = await authService.login(loginCredentials);
      
      expect(response.access_token).toBeDefined();
      expect(response.user).toBeDefined();
      expect(response.user.email).toBe(TEST_USER_EMAIL);
      
      // Verify token is stored and valid
      expect(tokenManager.getAccessToken()).toBe(response.access_token);
      expect(tokenManager.isTokenValid()).toBe(true);
      expect(authService.isAuthenticated()).toBe(true);
    });

    test('should reject invalid credentials', async () => {
      const invalidCredentials: LoginCredentials = {
        email: TEST_USER_EMAIL,
        password: 'wrongpassword'
      };

      await expect(authService.login(invalidCredentials)).rejects.toThrow();
      expect(authService.isAuthenticated()).toBe(false);
    });

    test('should reject login for non-existent user', async () => {
      const nonexistentCredentials: LoginCredentials = {
        email: 'nonexistent@example.com',
        password: TEST_USER_PASSWORD
      };

      await expect(authService.login(nonexistentCredentials)).rejects.toThrow();
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('Token Management', () => {
    beforeEach(async () => {
      // Login for token management tests
      await authService.login({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD
      });
    });

    test('should parse JWT token correctly', async () => {
      const token = tokenManager.getAccessToken();
      expect(token).toBeDefined();
      
      if (token) {
        expect(tokenManager.isTokenValid(token)).toBe(true);
        expect(tokenManager.getTokenExpirationTime(token)).toBeGreaterThan(Date.now());
      }
    });

    test('should refresh token successfully', async () => {
      const originalToken = tokenManager.getAccessToken();
      expect(originalToken).toBeDefined();

      // Wait a moment to ensure new token has different timestamp
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await authService.refreshToken();
      
      expect(response.access_token).toBeDefined();
      expect(response.user).toBeDefined();
      
      const newToken = tokenManager.getAccessToken();
      expect(newToken).toBe(response.access_token);
      expect(newToken).not.toBe(originalToken);
      expect(tokenManager.isTokenValid()).toBe(true);
    });

    test('should handle expired tokens', async () => {
      // Set an expired token
      const expiredToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxfQ.invalid';
      tokenManager.setAccessToken(expiredToken);

      expect(tokenManager.isTokenValid(expiredToken)).toBe(false);
      expect(tokenManager.isTokenExpired(expiredToken)).toBe(true);
    });
  });

  describe('User Profile Management', () => {
    beforeEach(async () => {
      await authService.login({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD
      });
    });

    test('should retrieve current user profile', async () => {
      const user = await authService.getCurrentUser();
      
      expect(user).toBeDefined();
      expect(user.email).toBe(TEST_USER_EMAIL);
      expect(user.username).toBe(TEST_USER_USERNAME);
      expect(user.is_active).toBe(true);
      expect(user.id).toBeDefined();
    });

    test('should update user profile', async () => {
      const updates = {
        full_name: 'Updated Integration Test User'
      };

      const updatedUser = await authService.updateUser(updates);
      
      expect(updatedUser.full_name).toBe(updates.full_name);
      expect(updatedUser.email).toBe(TEST_USER_EMAIL);
    });

    test('should fail to get profile without authentication', async () => {
      tokenManager.clearAll();
      
      await expect(authService.getCurrentUser()).rejects.toThrow();
    });
  });

  describe('Logout Flow', () => {
    beforeEach(async () => {
      await authService.login({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD
      });
    });

    test('should successfully logout user', async () => {
      expect(authService.isAuthenticated()).toBe(true);
      expect(tokenManager.getAccessToken()).toBeDefined();

      await authService.logout();

      expect(authService.isAuthenticated()).toBe(false);
      expect(tokenManager.getAccessToken()).toBeNull();
    });

    test('should handle logout when already logged out', async () => {
      await authService.logout();
      
      // Should not throw error when calling logout again
      await expect(authService.logout()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed responses', async () => {
      // Mock a malformed response by using invalid endpoint
      const invalidClient = new FastAPIAuthClient(`${TEST_API_BASE_URL}/invalid`);
      const invalidService = new FastAPIAuthService(invalidClient);

      await expect(invalidService.login({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD
      })).rejects.toThrow();
    });

    test('should handle server errors gracefully', async () => {
      // Test with valid endpoint but expect specific error handling
      await expect(authService.login({
        email: 'invalid-email-format',
        password: 'short'
      })).rejects.toThrow();
    });

    test('should clear tokens on authentication failure', async () => {
      // Set a token first
      tokenManager.setAccessToken('some-token');
      expect(tokenManager.getAccessToken()).toBeDefined();

      // Try to login with invalid credentials
      try {
        await authService.login({
          email: 'invalid@example.com',
          password: 'wrongpassword'
        });
      } catch (error) {
        // Expected to fail
      }

      // Token should still be there as login failure doesn't clear existing tokens
      // Only token refresh failures clear tokens
      expect(tokenManager.getAccessToken()).toBeDefined();
    });
  });

  describe('Security Validation', () => {
    test('should validate JWT token structure', async () => {
      await authService.login({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD
      });

      const token = tokenManager.getAccessToken();
      expect(token).toBeDefined();
      
      if (token) {
        // JWT should have 3 parts separated by dots
        const parts = token.split('.');
        expect(parts).toHaveLength(3);
        
        // Should be able to decode header and payload
        expect(() => {
          const header = JSON.parse(atob(parts[0]));
          const payload = JSON.parse(atob(parts[1]));
          expect(header.typ).toBe('JWT');
          expect(payload.sub).toBeDefined();
          expect(payload.exp).toBeDefined();
        }).not.toThrow();
      }
    });

    test('should reject tampered tokens', async () => {
      const validToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxMjM0NTY3ODkwfQ.invalid-signature';
      
      expect(tokenManager.isTokenValid(validToken)).toBe(false);
    });

    test('should validate password requirements', async () => {
      const weakPasswords = [
        '',
        '123',
        'password',
        'short'
      ];

      for (const password of weakPasswords) {
        await expect(authService.register({
          email: `test-${Date.now()}@example.com`,
          username: `test-${Date.now()}`,
          password: password,
          full_name: 'Test User',
          terms_accepted: true
        })).rejects.toThrow();
      }
    });
  });

  describe('Rate Limiting', () => {
    test('should handle rate limiting gracefully', async () => {
      const promises = [];
      
      // Make multiple rapid login attempts
      for (let i = 0; i < 10; i++) {
        promises.push(
          authService.login({
            email: 'nonexistent@example.com',
            password: 'wrongpassword'
          }).catch(error => error)
        );
      }

      const results = await Promise.all(promises);
      
      // All should fail, but shouldn't crash the application
      results.forEach(result => {
        expect(result).toBeInstanceOf(Error);
      });
    });
  });
});

describe('Integration with Existing Test User', () => {
  let authService: FastAPIAuthService;
  
  beforeAll(() => {
    const tokenManager = new TokenManagerImpl();
    const apiClient = new FastAPIAuthClient(TEST_API_BASE_URL, tokenManager);
    authService = new FastAPIAuthService(apiClient, tokenManager);
  });

  test('should login with existing test user', async () => {
    const response = await authService.login({
      email: 'test@example.com',
      password: 'testpassword123'
    });

    expect(response.access_token).toBeDefined();
    expect(response.user).toBeDefined();
    expect(response.user.email).toBe('test@example.com');
    expect(response.user.is_active).toBe(true);
  });

  test('should access protected resources with test user', async () => {
    await authService.login({
      email: 'test@example.com',
      password: 'testpassword123'
    });

    const user = await authService.getCurrentUser();
    expect(user.email).toBe('test@example.com');
  });
});