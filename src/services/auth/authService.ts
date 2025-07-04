/**
 * FastAPI Authentication Service Implementation
 * Main authentication business logic
 */

import { 
  AuthService, 
  AuthResponse, 
  LoginCredentials, 
  RegisterData, 
  User 
} from '@/types/auth';
import { FastAPIAuthClient } from './apiClient';
import { TokenManagerImpl } from './tokenManager';

export class FastAPIAuthService implements AuthService {
  private apiClient: FastAPIAuthClient;
  private tokenManager: TokenManagerImpl;

  constructor(
    apiClient?: FastAPIAuthClient,
    tokenManager?: TokenManagerImpl
  ) {
    this.tokenManager = tokenManager || new TokenManagerImpl();
    this.apiClient = apiClient || new FastAPIAuthClient(
      process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
      this.tokenManager
    );
  }

  // Authentication Methods
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('Attempting login for:', credentials.email);
      
      const response = await this.apiClient.login({
        email: credentials.email,
        password: credentials.password,
        remember_me: credentials.remember_me
      });

      console.log('Login successful for:', credentials.email);
      
      // Get user data after successful login
      const user = await this.getCurrentUser();
      
      return {
        ...response,
        user
      };
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      console.log('Attempting registration for:', userData.email);
      
      // Validate terms acceptance
      if (!userData.terms_accepted) {
        throw new Error('Terms and conditions must be accepted');
      }

      const response = await this.apiClient.register({
        email: userData.email,
        username: userData.username,
        password: userData.password,
        full_name: userData.full_name
      });

      console.log('Registration successful for:', userData.email);
      
      // Get user data after successful registration
      const user = await this.getCurrentUser();
      
      return {
        ...response,
        user
      };
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      console.log('Logging out user');
      await this.apiClient.logout();
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout failed:', error);
      // Continue with local logout even if server request fails
    }
  }

  // Token Management
  async refreshToken(): Promise<AuthResponse> {
    try {
      console.log('Refreshing authentication token');
      
      const response = await this.apiClient.refreshToken();
      
      // Get updated user data
      const user = await this.getCurrentUser();
      
      console.log('Token refresh successful');
      
      return {
        ...response,
        user
      };
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  isAuthenticated(): boolean {
    const token = this.tokenManager.getAccessToken();
    return token !== null && this.tokenManager.isTokenValid(token);
  }

  // User Management
  async getCurrentUser(): Promise<User> {
    try {
      const user = await this.apiClient.getCurrentUser();
      console.log('Current user retrieved:', user.email);
      return user;
    } catch (error) {
      console.error('Failed to get current user:', error);
      throw error;
    }
  }

  async updateUser(updates: Partial<User>): Promise<User> {
    try {
      console.log('Updating user with:', updates);
      
      const updatedUser = await this.apiClient.updateUser(updates);
      
      console.log('User update successful');
      return updatedUser;
    } catch (error) {
      console.error('User update failed:', error);
      throw error;
    }
  }

  // Password Management
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      console.log('Changing user password');
      
      // For now, we'll use the user update endpoint
      // In a full implementation, this would be a dedicated password change endpoint
      throw new Error('Password change not yet implemented - requires backend endpoint');
    } catch (error) {
      console.error('Password change failed:', error);
      throw error;
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      console.log('Requesting password reset for:', email);
      
      // This would typically send a password reset email
      // For now, throw not implemented error
      throw new Error('Password reset not yet implemented - requires backend endpoint');
    } catch (error) {
      console.error('Password reset request failed:', error);
      throw error;
    }
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    try {
      console.log('Confirming password reset with token');
      
      // This would confirm the password reset with the provided token
      // For now, throw not implemented error
      throw new Error('Password reset confirmation not yet implemented - requires backend endpoint');
    } catch (error) {
      console.error('Password reset confirmation failed:', error);
      throw error;
    }
  }

  // Account Management
  async deleteAccount(): Promise<void> {
    try {
      console.log('Deleting user account');
      
      // This would delete the user account
      // For now, throw not implemented error
      throw new Error('Account deletion not yet implemented - requires backend endpoint');
    } catch (error) {
      console.error('Account deletion failed:', error);
      throw error;
    }
  }

  async deactivateAccount(): Promise<void> {
    try {
      console.log('Deactivating user account');
      
      // This would deactivate the user account
      // For now, we could use the user update endpoint to set is_active: false
      await this.updateUser({ is_active: false });
      
      // Log out the user after deactivation
      await this.logout();
      
      console.log('Account deactivation successful');
    } catch (error) {
      console.error('Account deactivation failed:', error);
      throw error;
    }
  }

  // Development Helper Methods
  async createTestUser(): Promise<User> {
    try {
      console.log('Creating test user for development');
      
      const testUserData: RegisterData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'testpassword123',
        full_name: 'Test User',
        terms_accepted: true
      };

      // Try to register the test user
      const response = await this.register(testUserData);
      return response.user;
    } catch (error) {
      // If user already exists, try to log in
      if (error instanceof Error && error.message.includes('already exists')) {
        console.log('Test user already exists, attempting login');
        const loginResponse = await this.login({
          email: 'test@example.com',
          password: 'testpassword123'
        });
        return loginResponse.user;
      }
      
      throw error;
    }
  }

  async validateConnection(): Promise<boolean> {
    try {
      // Simple health check to validate API connection
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/health`);
      return response.ok;
    } catch (error) {
      console.error('API connection validation failed:', error);
      return false;
    }
  }

  // Utility Methods
  getTokenManager(): TokenManagerImpl {
    return this.tokenManager;
  }

  getApiClient(): FastAPIAuthClient {
    return this.apiClient;
  }

  // Token utilities exposed for convenience
  isTokenExpired(): boolean {
    return this.tokenManager.isTokenExpired();
  }

  getTokenExpirationTime(): number | null {
    return this.tokenManager.getTokenExpirationTime();
  }

  clearTokens(): void {
    this.tokenManager.clearAll();
  }
}

// Singleton instance for use throughout the application
export const authService = new FastAPIAuthService();

// Export as default for convenience
export default authService;