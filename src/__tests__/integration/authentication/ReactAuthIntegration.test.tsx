/**
 * React Authentication Component Integration Tests
 * Tests authentication components with real services
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AuthProvider } from '@/contexts/AuthContext';
import { LoginForm } from '@/components/auth/LoginForm';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { FastAPIAuthService } from '@/services/auth/authService';
import { TokenManagerImpl } from '@/services/auth/tokenManager';
import { useAuth } from '@/hooks/useAuth';

// Mock Next.js router
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/test',
}));

// Test component that uses authentication
function TestProtectedComponent() {
  const { user, isAuthenticated, logout } = useAuth();
  
  if (!isAuthenticated) {
    return <div>Not authenticated</div>;
  }
  
  return (
    <div>
      <h1>Protected Content</h1>
      <p data-testid="user-email">{user?.email}</p>
      <button onClick={() => logout()} data-testid="logout-btn">
        Logout
      </button>
    </div>
  );
}

describe('React Authentication Integration Tests', () => {
  let authService: FastAPIAuthService;
  let tokenManager: TokenManagerImpl;
  
  beforeEach(() => {
    // Clear all mocks
    mockPush.mockClear();
    mockReplace.mockClear();
    
    // Create fresh instances
    tokenManager = new TokenManagerImpl();
    authService = new FastAPIAuthService(undefined, tokenManager);
    
    // Clear any existing tokens
    tokenManager.clearAll();
    
    // Clear session storage
    sessionStorage.clear();
  });
  
  afterEach(() => {
    tokenManager.clearAll();
    sessionStorage.clear();
  });

  describe('AuthProvider Integration', () => {
    test('should initialize with unauthenticated state', async () => {
      let authState: any = {};
      
      function TestComponent() {
        const auth = useAuth();
        authState = auth;
        return <div>Test</div>;
      }
      
      render(
        <AuthProvider service={authService}>
          <TestComponent />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(authState.isInitialized).toBe(true);
      });
      
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBe(null);
      expect(authState.isLoading).toBe(false);
    });

    test('should handle existing valid token on initialization', async () => {
      // Mock a valid token scenario
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User',
        is_active: true,
        is_superuser: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email_verified: true
      };
      
      // Mock token validation and user retrieval
      jest.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
      jest.spyOn(authService, 'getCurrentUser').mockResolvedValue(mockUser);
      
      let authState: any = {};
      
      function TestComponent() {
        const auth = useAuth();
        authState = auth;
        return <div>Test</div>;
      }
      
      render(
        <AuthProvider service={authService}>
          <TestComponent />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(authState.isAuthenticated).toBe(true);
      });
      
      expect(authState.user).toEqual(mockUser);
      expect(authState.isInitialized).toBe(true);
    });

    test('should clear state on invalid token', async () => {
      // Mock invalid token scenario
      jest.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
      jest.spyOn(authService, 'getCurrentUser').mockRejectedValue(new Error('Invalid token'));
      jest.spyOn(authService, 'clearTokens').mockImplementation(() => {});
      
      let authState: any = {};
      
      function TestComponent() {
        const auth = useAuth();
        authState = auth;
        return <div>Test</div>;
      }
      
      render(
        <AuthProvider service={authService}>
          <TestComponent />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(authState.isInitialized).toBe(true);
      });
      
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBe(null);
      expect(authService.clearTokens).toHaveBeenCalled();
    });
  });

  describe('LoginForm Integration', () => {
    test('should render login form correctly', () => {
      render(
        <AuthProvider service={authService}>
          <LoginForm />
        </AuthProvider>
      );
      
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByText(/sign in to your gayed signals dashboard/i)).toBeInTheDocument();
    });

    test('should validate form inputs', async () => {
      const user = userEvent.setup();
      
      render(
        <AuthProvider service={authService}>
          <LoginForm />
        </AuthProvider>
      );
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      // Try to submit empty form
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    test('should show password toggle functionality', async () => {
      const user = userEvent.setup();
      
      render(
        <AuthProvider service={authService}>
          <LoginForm />
        </AuthProvider>
      );
      
      const passwordInput = screen.getByLabelText(/password/i);
      const toggleButton = screen.getByRole('button', { name: '' }); // Eye icon button
      
      expect(passwordInput).toHaveAttribute('type', 'password');
      
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');
      
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should handle successful login', async () => {
      const user = userEvent.setup();
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User',
        is_active: true,
        is_superuser: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email_verified: true
      };
      
      const onSuccessMock = jest.fn();
      
      // Mock successful login
      jest.spyOn(authService, 'login').mockResolvedValue({
        access_token: 'mock-token',
        token_type: 'bearer',
        user: mockUser
      });
      
      render(
        <AuthProvider service={authService}>
          <LoginForm onSuccess={onSuccessMock} />
        </AuthProvider>
      );
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'testpassword123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'testpassword123',
          remember_me: false
        });
      });
      
      expect(onSuccessMock).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    test('should handle login failure', async () => {
      const user = userEvent.setup();
      
      // Mock failed login
      jest.spyOn(authService, 'login').mockRejectedValue(new Error('Invalid credentials'));
      
      render(
        <AuthProvider service={authService}>
          <LoginForm />
        </AuthProvider>
      );
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });

    test('should fill test credentials in development', async () => {
      const user = userEvent.setup();
      
      // Mock development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      render(
        <AuthProvider service={authService}>
          <LoginForm />
        </AuthProvider>
      );
      
      const fillTestButton = screen.getByText(/fill test credentials/i);
      await user.click(fillTestButton);
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      expect(emailInput).toHaveValue('test@example.com');
      expect(passwordInput).toHaveValue('testpassword123');
      
      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('RouteGuard Integration', () => {
    test('should render children when authenticated', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User',
        is_active: true,
        is_superuser: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email_verified: true
      };
      
      // Mock authenticated state
      jest.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
      jest.spyOn(authService, 'getCurrentUser').mockResolvedValue(mockUser);
      
      render(
        <AuthProvider service={authService}>
          <RouteGuard>
            <TestProtectedComponent />
          </RouteGuard>
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
      });
    });

    test('should redirect to login when not authenticated', async () => {
      // Mock unauthenticated state
      jest.spyOn(authService, 'isAuthenticated').mockReturnValue(false);
      
      render(
        <AuthProvider service={authService}>
          <RouteGuard>
            <TestProtectedComponent />
          </RouteGuard>
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
      
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    test('should show loading component while initializing', () => {
      // Mock loading state
      jest.spyOn(authService, 'isAuthenticated').mockReturnValue(false);
      
      const customLoadingComponent = <div>Custom Loading...</div>;
      
      render(
        <AuthProvider service={authService}>
          <RouteGuard loadingComponent={customLoadingComponent}>
            <TestProtectedComponent />
          </RouteGuard>
        </AuthProvider>
      );
      
      expect(screen.getByText('Custom Loading...')).toBeInTheDocument();
    });

    test('should store redirect URL in session storage', async () => {
      // Mock current path
      Object.defineProperty(window, 'location', {
        value: { pathname: '/protected-route' },
        writable: true
      });
      
      // Mock unauthenticated state
      jest.spyOn(authService, 'isAuthenticated').mockReturnValue(false);
      
      render(
        <AuthProvider service={authService}>
          <RouteGuard>
            <TestProtectedComponent />
          </RouteGuard>
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(sessionStorage.getItem('auth_redirect_url')).toBe('/protected-route');
      });
    });

    test('should handle superuser requirement', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User',
        is_active: true,
        is_superuser: false, // Not a superuser
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email_verified: true
      };
      
      // Mock authenticated but not superuser
      jest.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
      jest.spyOn(authService, 'getCurrentUser').mockResolvedValue(mockUser);
      
      render(
        <AuthProvider service={authService}>
          <RouteGuard requireSuperuser={true}>
            <TestProtectedComponent />
          </RouteGuard>
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/unauthorized');
      });
      
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Authentication Flow Integration', () => {
    test('should complete full authentication flow', async () => {
      const user = userEvent.setup();
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User',
        is_active: true,
        is_superuser: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email_verified: true
      };
      
      // Mock login and logout
      jest.spyOn(authService, 'login').mockResolvedValue({
        access_token: 'mock-token',
        token_type: 'bearer',
        user: mockUser
      });
      jest.spyOn(authService, 'logout').mockResolvedValue();
      
      render(
        <AuthProvider service={authService}>
          <TestProtectedComponent />
        </AuthProvider>
      );
      
      // Initially should show not authenticated
      expect(screen.getByText('Not authenticated')).toBeInTheDocument();
      
      // Simulate login by calling the login action directly
      await act(async () => {
        await authService.login({
          email: 'test@example.com',
          password: 'testpassword123'
        });
      });
      
      // Should now show protected content
      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
      });
      
      // Test logout
      const logoutButton = screen.getByTestId('logout-btn');
      await user.click(logoutButton);
      
      await waitFor(() => {
        expect(screen.getByText('Not authenticated')).toBeInTheDocument();
      });
    });
  });

  describe('Error State Integration', () => {
    test('should handle and display authentication errors', async () => {
      const user = userEvent.setup();
      
      // Mock login failure
      jest.spyOn(authService, 'login').mockRejectedValue(new Error('Network connection failed'));
      
      render(
        <AuthProvider service={authService}>
          <LoginForm />
        </AuthProvider>
      );
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'testpassword123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/network connection failed/i)).toBeInTheDocument();
      });
    });

    test('should clear errors on successful actions', async () => {
      const user = userEvent.setup();
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User',
        is_active: true,
        is_superuser: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email_verified: true
      };
      
      // First mock failure, then success
      jest.spyOn(authService, 'login')
        .mockRejectedValueOnce(new Error('Invalid credentials'))
        .mockResolvedValueOnce({
          access_token: 'mock-token',
          token_type: 'bearer',
          user: mockUser
        });
      
      render(
        <AuthProvider service={authService}>
          <LoginForm />
        </AuthProvider>
      );
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      // First attempt - should fail
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
      
      // Fix password and try again
      await user.clear(passwordInput);
      await user.type(passwordInput, 'correctpassword');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.queryByText(/invalid credentials/i)).not.toBeInTheDocument();
      });
    });
  });
});