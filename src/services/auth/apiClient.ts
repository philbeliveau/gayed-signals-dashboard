/**
 * FastAPI Authentication Client
 * Handles HTTP requests to the authentication backend
 */

import { 
  APIResponse, 
  AuthResponse, 
  LoginCredentials, 
  RegisterData, 
  User 
} from '@/types/auth';
import { TokenManagerImpl } from './tokenManager';

export class FastAPIAuthClient {
  private baseURL: string;
  private tokenManager: TokenManagerImpl;
  private timeout: number;
  private retryAttempts: number;

  constructor(
    baseURL: string = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
    tokenManager: TokenManagerImpl = new TokenManagerImpl(),
    timeout: number = 30000,
    retryAttempts: number = 3
  ) {
    this.baseURL = baseURL.replace(/\/$/, ''); // Remove trailing slash
    this.tokenManager = tokenManager;
    this.timeout = timeout;
    this.retryAttempts = retryAttempts;
  }

  // Core HTTP methods
  async request<T = any>(
    endpoint: string,
    options: RequestInit = {},
    skipTokenRefresh: boolean = false
  ): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const accessToken = this.tokenManager.getAccessToken();

    // Default headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Merge options headers if present
    if (options.headers) {
      const optionHeaders = options.headers as Record<string, string>;
      Object.assign(headers, optionHeaders);
    }

    // Add authorization header if token exists
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Request configuration
    const config: RequestInit = {
      ...options,
      headers,
      signal: AbortSignal.timeout(this.timeout),
    };

    try {
      const response = await this.makeRequestWithRetry(url, config);
      
      if (!response.ok) {
        // Handle specific authentication errors
        if (response.status === 401 && !skipTokenRefresh) {
          // Try to refresh token (but not during login/register)
          const refreshed = await this.handleUnauthorized();
          if (refreshed) {
            // Retry request with new token
            headers['Authorization'] = `Bearer ${this.tokenManager.getAccessToken()}`;
            const retryResponse = await fetch(url, { ...config, headers });
            if (retryResponse.ok) {
              return this.parseResponse<T>(retryResponse);
            }
          }
        }
        
        throw await this.createAuthAPIError(response);
      }

      return this.parseResponse<T>(response);
    } catch (error) {
      if (error instanceof AuthAPIError) {
        throw error;
      }
      
      console.error('API request failed:', error);
      throw new AuthAPIError(
        error instanceof Error ? error.message : 'Network request failed',
        0,
        'NETWORK_ERROR'
      );
    }
  }

  async get<T = any>(endpoint: string, params?: Record<string, string>): Promise<APIResponse<T>> {
    const url = new URL(`${this.baseURL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    
    return this.request<T>(url.pathname + url.search);
  }

  async post<T = any>(endpoint: string, data?: any, skipTokenRefresh: boolean = false): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }, skipTokenRefresh);
  }

  async put<T = any>(endpoint: string, data?: any): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // Authentication-specific methods
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await this.post<AuthResponse>('/api/auth/login', credentials, true);
      
      if (response.data.access_token) {
        this.tokenManager.setAccessToken(response.data.access_token);
        if (response.data.refresh_token) {
          this.tokenManager.setRefreshToken(response.data.refresh_token);
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      throw this.normalizeAuthError(error);
    }
  }

  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      // First create user
      const userResponse = await this.post<User>('/api/users/', {
        email: userData.email,
        username: userData.username,
        password: userData.password,
        full_name: userData.full_name || null
      }, true);

      // Then login with the new credentials
      return await this.login({
        email: userData.email,
        password: userData.password
      });
    } catch (error) {
      console.error('Registration failed:', error);
      throw this.normalizeAuthError(error);
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await this.get<User>('/api/auth/me');
      return response.data;
    } catch (error) {
      console.error('Get current user failed:', error);
      throw this.normalizeAuthError(error);
    }
  }

  async refreshToken(): Promise<AuthResponse> {
    try {
      const response = await this.post<AuthResponse>('/api/auth/refresh');
      
      if (response.data.access_token) {
        this.tokenManager.setAccessToken(response.data.access_token);
        if (response.data.refresh_token) {
          this.tokenManager.setRefreshToken(response.data.refresh_token);
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.tokenManager.clearAll();
      throw this.normalizeAuthError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout request failed:', error);
      // Continue with local logout even if server request fails
    } finally {
      this.tokenManager.clearAll();
    }
  }

  async updateUser(updates: Partial<User>): Promise<User> {
    try {
      const response = await this.put<User>('/api/users/me', updates);
      return response.data;
    } catch (error) {
      console.error('Update user failed:', error);
      throw this.normalizeAuthError(error);
    }
  }

  // Helper methods
  private async makeRequestWithRetry(url: string, config: RequestInit): Promise<Response> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, config);
        
        // Don't retry on 4xx errors (client errors)
        if (response.status >= 400 && response.status < 500) {
          return response;
        }
        
        // Return successful responses
        if (response.ok) {
          return response;
        }
        
        // Retry on 5xx errors
        if (attempt === this.retryAttempts - 1) {
          return response;
        }
        
        await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === this.retryAttempts - 1) {
          throw lastError;
        }
        
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }
    
    throw lastError || new Error('Max retry attempts reached');
  }

  private async handleUnauthorized(): Promise<boolean> {
    try {
      await this.refreshToken();
      return true;
    } catch (error) {
      console.error('Token refresh failed during 401 handling:', error);
      this.tokenManager.clearAll();
      return false;
    }
  }

  private async parseResponse<T>(response: Response): Promise<APIResponse<T>> {
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    let data: T;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = (await response.text()) as unknown as T;
    }

    return {
      data,
      status: response.status,
      statusText: response.statusText,
      headers,
    };
  }

  private async createAuthAPIError(response: Response): Promise<AuthAPIError> {
    let errorData: any;
    
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }

    return new AuthAPIError(
      errorData.detail || errorData.message || `Request failed with status ${response.status}`,
      response.status,
      errorData.code || `HTTP_${response.status}`
    );
  }

  private normalizeAuthError(error: any): AuthAPIError {
    if (error instanceof AuthAPIError) {
      return error;
    }
    
    if (error instanceof Error) {
      return new AuthAPIError(error.message, 0, 'CLIENT_ERROR');
    }
    
    return new AuthAPIError('An unknown error occurred', 0, 'UNKNOWN_ERROR');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public getters for configuration
  get isAuthenticated(): boolean {
    return this.tokenManager.isTokenValid();
  }

  get currentToken(): string | null {
    return this.tokenManager.getAccessToken();
  }
}

// API Error class
export class AuthAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Default export
// Default export
export const authApiClient = new FastAPIAuthClient();