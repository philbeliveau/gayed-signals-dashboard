import { 
  AuthService, 
  LoginCredentials, 
  RegisterData, 
  AuthResponse, 
  User, 
  TokenManager,
  AuthErrorType,
  AuthState,
  UserPreferences
} from './types';
import { APIClient as APIClientImpl, APIErrorImpl } from './apiClient';

/**
 * Authentication Error class with proper error typing
 */
export class AuthError extends Error {
  public type: AuthErrorType;
  public details?: any;
  public originalError?: any;

  constructor(type: AuthErrorType, message: string, originalError?: any, details?: any) {
    super(message);
    this.name = 'AuthError';
    this.type = type;
    this.originalError = originalError;
    this.details = details;
  }

  /**
   * Create AuthError from API error
   */
  static fromAPIError(apiError: APIErrorImpl): AuthError {
    let type: AuthErrorType;
    
    switch (apiError.status) {
      case 401:
        type = AuthErrorType.INVALID_CREDENTIALS;
        break;
      case 403:
        type = AuthErrorType.PERMISSION_DENIED;
        break;
      case 429:
        type = AuthErrorType.RATE_LIMITED;
        break;
      case 422:
        type = AuthErrorType.VALIDATION_ERROR;
        break;
      case 0:
        type = AuthErrorType.NETWORK_ERROR;
        break;
      default:
        type = AuthErrorType.NETWORK_ERROR;
    }

    return new AuthError(type, apiError.message, apiError, apiError.details);
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    return this.type === AuthErrorType.NETWORK_ERROR && 
           this.originalError?.isRetryable?.();
  }
}

/**
 * Authentication Service Implementation
 * Handles all authentication-related business logic
 */
export class AuthServiceImpl implements AuthService {
  private apiClient: APIClientImpl;
  private tokenManager: TokenManager;

  constructor(apiClient: APIClientImpl, tokenManager: TokenManager) {
    this.apiClient = apiClient;
    this.tokenManager = tokenManager;
  }

  /**
   * User login with credentials
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const loginData: any = {
        email: credentials.email,
        password: credentials.password,
        remember_me: credentials.remember_me
      };

      // Add two_factor_code if it exists (for future 2FA support)
      if ('two_factor_code' in credentials) {
        loginData.two_factor_code = (credentials as any).two_factor_code;
      }

      const response = await this.apiClient.post<AuthResponse>('/auth/login', loginData, { 
        requireAuth: false,
        timeout: 10000 // 10 second timeout for login
      });

      // Validate response structure
      if (!response.data.access_token || !response.data.user) {
        throw new AuthError(
          AuthErrorType.VALIDATION_ERROR,
          'Invalid login response from server'
        );
      }

      // Store tokens
      this.tokenManager.setAccessToken(response.data.access_token);
      if (response.data.refresh_token) {
        this.tokenManager.setRefreshToken(response.data.refresh_token);
      }

      return response.data;
    } catch (error) {
      if (error instanceof APIErrorImpl) {
        throw AuthError.fromAPIError(error);
      }
      
      throw new AuthError(
        AuthErrorType.NETWORK_ERROR,
        'Login failed',
        error
      );
    }
  }

  /**
   * User registration
   */
  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const response = await this.apiClient.post<AuthResponse>('/users/', {
        email: userData.email,
        username: userData.username,
        password: userData.password,
        full_name: userData.full_name,
        terms_accepted: userData.terms_accepted
      }, { 
        requireAuth: false,
        timeout: 15000 // 15 second timeout for registration
      });

      // Validate response structure
      if (!response.data.access_token || !response.data.user) {
        throw new AuthError(
          AuthErrorType.VALIDATION_ERROR,
          'Invalid registration response from server'
        );
      }

      // Store tokens
      this.tokenManager.setAccessToken(response.data.access_token);
      if (response.data.refresh_token) {
        this.tokenManager.setRefreshToken(response.data.refresh_token);
      }

      return response.data;
    } catch (error) {
      if (error instanceof APIErrorImpl) {
        // Handle specific registration errors
        if (error.status === 409) {
          throw new AuthError(
            AuthErrorType.VALIDATION_ERROR,
            'Email or username already exists',
            error
          );
        }
        throw AuthError.fromAPIError(error);
      }
      
      throw new AuthError(
        AuthErrorType.NETWORK_ERROR,
        'Registration failed',
        error
      );
    }
  }

  /**
   * User logout
   */
  async logout(): Promise<void> {
    try {
      // Call logout endpoint if available
      // Don't fail the logout if the endpoint fails
      await this.apiClient.post('/auth/logout', {}, {
        timeout: 5000,
        retryAttempts: 0
      }).catch(error => {
        console.warn('Logout endpoint failed, continuing with local logout:', error);
      });
    } finally {
      // Always clear tokens, even if backend call fails
      this.tokenManager.clearAll();
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<AuthResponse> {
    try {
      const newToken = await this.tokenManager.refreshToken();
      const user = await this.getCurrentUser();
      
      return {
        access_token: newToken,
        token_type: 'bearer',
        user
      };
    } catch (error) {
      // Clear tokens on refresh failure
      this.tokenManager.clearAll();
      
      throw new AuthError(
        AuthErrorType.TOKEN_EXPIRED,
        'Token refresh failed',
        error
      );
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.tokenManager.getAccessToken();
    return token !== null && this.tokenManager.isTokenValid(token);
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await this.apiClient.get<User>('/auth/me');
      
      if (!response.data || !response.data.id) {
        throw new AuthError(
          AuthErrorType.VALIDATION_ERROR,
          'Invalid user data received from server'
        );
      }
      
      return response.data;
    } catch (error) {
      if (error instanceof APIErrorImpl) {
        throw AuthError.fromAPIError(error);
      }
      
      throw new AuthError(
        AuthErrorType.NETWORK_ERROR,
        'Failed to get current user',
        error
      );
    }
  }

  /**
   * Update user profile
   */
  async updateUser(updates: Partial<User>): Promise<User> {
    try {
      // Filter out read-only fields
      const allowedUpdates = {
        full_name: updates.full_name,
        avatar_url: updates.avatar_url,
        // Add other updatable fields as needed
      };

      // Remove undefined values
      const filteredUpdates = Object.fromEntries(
        Object.entries(allowedUpdates).filter(([_, value]) => value !== undefined)
      );

      const response = await this.apiClient.put<User>('/users/me', filteredUpdates);
      
      if (!response.data || !response.data.id) {
        throw new AuthError(
          AuthErrorType.VALIDATION_ERROR,
          'Invalid user data received from server'
        );
      }
      
      return response.data;
    } catch (error) {
      if (error instanceof APIErrorImpl) {
        throw AuthError.fromAPIError(error);
      }
      
      throw new AuthError(
        AuthErrorType.NETWORK_ERROR,
        'Failed to update user',
        error
      );
    }
  }

  /**
   * Change user password
   */
  async changePassword(request: { current_password: string; new_password: string } | string, newPassword?: string): Promise<void> {
    // Handle both old and new signature for backward compatibility
    const currentPassword = typeof request === 'string' ? request : request.current_password;
    const newPass = typeof request === 'string' ? newPassword! : request.new_password;
    try {
      await this.apiClient.put('/users/me/password', {
        current_password: currentPassword,
        new_password: newPass
      });
    } catch (error) {
      if (error instanceof APIErrorImpl) {
        if (error.status === 400 || error.status === 422) {
          throw new AuthError(
            AuthErrorType.VALIDATION_ERROR,
            error.message || 'Invalid password provided',
            error
          );
        }
        throw AuthError.fromAPIError(error);
      }
      
      throw new AuthError(
        AuthErrorType.NETWORK_ERROR,
        'Failed to change password',
        error
      );
    }
  }

  /**
   * Request password reset
   */
  async resetPassword(request: { email: string } | string): Promise<void> {
    // Handle both old and new signature for backward compatibility
    const email = typeof request === 'string' ? request : request.email;
    try {
      await this.apiClient.post('/auth/reset-password', { email }, { 
        requireAuth: false,
        timeout: 10000
      });
    } catch (error) {
      if (error instanceof APIErrorImpl) {
        // Don't reveal whether email exists or not for security
        if (error.status === 404) {
          // Still return success to prevent email enumeration
          return;
        }
        throw AuthError.fromAPIError(error);
      }
      
      throw new AuthError(
        AuthErrorType.NETWORK_ERROR,
        'Failed to request password reset',
        error
      );
    }
  }

  /**
   * Confirm password reset with token
   */
  async confirmPasswordReset(request: { token: string; new_password: string } | string, newPassword?: string): Promise<void> {
    // Handle both old and new signature for backward compatibility
    const token = typeof request === 'string' ? request : request.token;
    const newPass = typeof request === 'string' ? newPassword! : request.new_password;
    try {
      await this.apiClient.post('/auth/reset-password/confirm', {
        token,
        new_password: newPass
      }, { 
        requireAuth: false,
        timeout: 10000
      });
    } catch (error) {
      if (error instanceof APIErrorImpl) {
        if (error.status === 400 || error.status === 422) {
          throw new AuthError(
            AuthErrorType.VALIDATION_ERROR,
            error.message || 'Invalid or expired reset token',
            error
          );
        }
        throw AuthError.fromAPIError(error);
      }
      
      throw new AuthError(
        AuthErrorType.NETWORK_ERROR,
        'Failed to reset password',
        error
      );
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(): Promise<void> {
    try {
      await this.apiClient.delete('/users/me');
    } catch (error) {
      if (error instanceof APIErrorImpl) {
        throw AuthError.fromAPIError(error);
      }
      
      throw new AuthError(
        AuthErrorType.NETWORK_ERROR,
        'Failed to delete account',
        error
      );
    } finally {
      // Clear tokens after account deletion
      this.tokenManager.clearAll();
    }
  }

  /**
   * Deactivate user account
   */
  async deactivateAccount(): Promise<void> {
    try {
      await this.apiClient.put('/users/me/deactivate');
    } catch (error) {
      if (error instanceof APIErrorImpl) {
        throw AuthError.fromAPIError(error);
      }
      
      throw new AuthError(
        AuthErrorType.NETWORK_ERROR,
        'Failed to deactivate account',
        error
      );
    } finally {
      // Clear tokens after account deactivation
      this.tokenManager.clearAll();
    }
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<void> {
    try {
      await this.apiClient.post('/auth/verify-email', { token }, { 
        requireAuth: false,
        timeout: 10000
      });
    } catch (error) {
      if (error instanceof APIErrorImpl) {
        if (error.status === 400 || error.status === 422) {
          throw new AuthError(
            AuthErrorType.VALIDATION_ERROR,
            error.message || 'Invalid or expired verification token',
            error
          );
        }
        throw AuthError.fromAPIError(error);
      }
      
      throw new AuthError(
        AuthErrorType.NETWORK_ERROR,
        'Failed to verify email',
        error
      );
    }
  }


  /**
   * Enable two-factor authentication
   */
  async enableTwoFactor(): Promise<{ qr_code: string; backup_codes: string[] }> {
    try {
      const response = await this.apiClient.post<{ qr_code: string; backup_codes: string[] }>('/auth/2fa/enable');
      return response.data;
    } catch (error) {
      if (error instanceof APIErrorImpl) {
        throw AuthError.fromAPIError(error);
      }
      
      throw new AuthError(
        AuthErrorType.NETWORK_ERROR,
        'Failed to enable two-factor authentication',
        error
      );
    }
  }

  /**
   * Disable two-factor authentication
   */
  async disableTwoFactor(): Promise<void> {
    try {
      await this.apiClient.post('/auth/2fa/disable');
    } catch (error) {
      if (error instanceof APIErrorImpl) {
        throw AuthError.fromAPIError(error);
      }
      
      throw new AuthError(
        AuthErrorType.NETWORK_ERROR,
        'Failed to disable two-factor authentication',
        error
      );
    }
  }

  /**
   * Verify two-factor authentication code
   */
  async verifyTwoFactor(code: string): Promise<void> {
    try {
      await this.apiClient.post('/auth/2fa/verify', { code });
    } catch (error) {
      if (error instanceof APIErrorImpl) {
        if (error.status === 400 || error.status === 422) {
          throw new AuthError(
            AuthErrorType.VALIDATION_ERROR,
            error.message || 'Invalid two-factor code',
            error
          );
        }
        throw AuthError.fromAPIError(error);
      }
      
      throw new AuthError(
        AuthErrorType.NETWORK_ERROR,
        'Failed to verify two-factor code',
        error
      );
    }
  }

  /**
   * Get user session information
   */
  async getSessionInfo(): Promise<{
    expires_at: string;
    issued_at: string;
    user_agent?: string;
    ip_address?: string;
  }> {
    try {
      const response = await this.apiClient.get<{
        expires_at: string;
        issued_at: string;
        user_agent?: string;
        ip_address?: string;
      }>('/auth/session');
      
      return response.data;
    } catch (error) {
      if (error instanceof APIErrorImpl) {
        throw AuthError.fromAPIError(error);
      }
      
      throw new AuthError(
        AuthErrorType.NETWORK_ERROR,
        'Failed to get session information',
        error
      );
    }
  }

  /**
   * Health check for authentication service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.apiClient.get('/health', { 
        requireAuth: false,
        retryAttempts: 0,
        timeout: 5000
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<User> {
    try {
      const response = await this.apiClient.put<User>('/users/preferences', preferences);
      return response.data;
    } catch (error) {
      if (error instanceof APIErrorImpl) {
        throw AuthError.fromAPIError(error);
      }
      
      throw new AuthError(
        AuthErrorType.NETWORK_ERROR,
        'Failed to update user preferences',
        error
      );
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(): Promise<void> {
    try {
      await this.apiClient.post('/auth/resend-verification');
    } catch (error) {
      if (error instanceof APIErrorImpl) {
        throw AuthError.fromAPIError(error);
      }
      
      throw new AuthError(
        AuthErrorType.NETWORK_ERROR,
        'Failed to resend verification email',
        error
      );
    }
  }

  /**
   * Get authentication state
   */
  getAuthState(): AuthState {
    const token = this.tokenManager.getAccessToken();
    const isAuthenticated = token !== null && this.tokenManager.isTokenValid(token);
    
    return {
      isAuthenticated,
      isLoading: false,
      user: null, // Would need to be fetched separately
      error: null,
      lastActivity: new Date().toISOString(),
      sessionExpiry: null
    };
  }

  /**
   * Extend session
   */
  async extendSession(): Promise<void> {
    try {
      await this.apiClient.post('/auth/extend-session');
    } catch (error) {
      if (error instanceof APIErrorImpl) {
        throw AuthError.fromAPIError(error);
      }
      
      throw new AuthError(
        AuthErrorType.NETWORK_ERROR,
        'Failed to extend session',
        error
      );
    }
  }

  /**
   * Check session validity
   */
  async checkSession(): Promise<boolean> {
    try {
      const response = await this.apiClient.get('/auth/session/check');
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

/**
 * Factory function to create authentication service
 */
export function createAuthService(apiClient: APIClientImpl, tokenManager: TokenManager): AuthService {
  return new AuthServiceImpl(apiClient, tokenManager);
}

export default AuthServiceImpl;