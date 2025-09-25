/**
 * CSRF Protection System
 * 
 * Provides comprehensive CSRF protection for authentication endpoints including:
 * - CSRF token management and rotation
 * - Automatic token inclusion in requests
 * - Token validation and refresh logic
 * - Error handling and retry mechanisms
 */

import { securityManager } from '../../../lib/risk/security';

export interface CSRFConfig {
  tokenEndpoint: string;
  headerName: string;
  refreshOnError: boolean;
  maxRetries: number;
  tokenTTL: number;
}

export interface CSRFTokenResponse {
  csrf_token: string;
  expires_at: number;
}

export class CSRFError extends Error {
  constructor(message: string, public code: string = 'CSRF_ERROR') {
    super(message);
    this.name = 'CSRFError';
  }
}

/**
 * CSRF Protection Manager
 */
export class CSRFProtection {
  private static instance: CSRFProtection;
  private csrfToken: string | null = null;
  private tokenExpiry: number | null = null;
  private refreshPromise: Promise<void> | null = null;
  public config: CSRFConfig;

  private constructor(config: Partial<CSRFConfig> = {}) {
    this.config = {
      tokenEndpoint: '/api/auth/csrf-token',
      headerName: 'X-CSRF-Token',
      refreshOnError: true,
      maxRetries: 2,
      tokenTTL: 30 * 60 * 1000, // 30 minutes
      ...config
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<CSRFConfig>): CSRFProtection {
    if (!CSRFProtection.instance) {
      CSRFProtection.instance = new CSRFProtection(config);
    }
    return CSRFProtection.instance;
  }

  /**
   * Get valid CSRF token
   */
  async getCSRFToken(): Promise<string> {
    if (!this.csrfToken || this.isTokenExpired()) {
      await this.refreshCSRFToken();
    }
    return this.csrfToken!;
  }

  /**
   * Refresh CSRF token
   */
  async refreshCSRFToken(): Promise<void> {
    // Prevent multiple concurrent refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    
    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Add CSRF token to request headers
   */
  async addCSRFHeader(headers: Record<string, string>): Promise<Record<string, string>> {
    const token = await this.getCSRFToken();
    return {
      ...headers,
      [this.config.headerName]: token,
    };
  }

  /**
   * Validate CSRF token
   */
  validateCSRFToken(token: string): boolean {
    return token === this.csrfToken && !this.isTokenExpired();
  }

  /**
   * Clear stored CSRF token
   */
  clearToken(): void {
    this.csrfToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(): boolean {
    if (!this.tokenExpiry) return true;
    return Date.now() >= this.tokenExpiry;
  }

  /**
   * Perform actual token refresh
   */
  private async performTokenRefresh(): Promise<void> {
    try {
      const response = await fetch(this.config.tokenEndpoint, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new CSRFError(
          `Failed to fetch CSRF token: ${response.status} ${response.statusText}`,
          'CSRF_FETCH_ERROR'
        );
      }

      const data: CSRFTokenResponse = await response.json();
      
      if (!data.csrf_token) {
        throw new CSRFError('Invalid CSRF token response', 'CSRF_INVALID_RESPONSE');
      }

      this.csrfToken = data.csrf_token;
      this.tokenExpiry = data.expires_at || (Date.now() + this.config.tokenTTL);

      // Log successful token refresh
      console.log('CSRF token refreshed successfully');
    } catch (error) {
      this.clearToken();
      
      if (error instanceof CSRFError) {
        throw error;
      }
      
      throw new CSRFError(
        `CSRF token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CSRF_REFRESH_ERROR'
      );
    }
  }
}

/**
 * CSRF-Protected API Client
 */
export class CSRFProtectedAPIClient {
  private csrfProtection: CSRFProtection;
  private baseURL: string;

  constructor(baseURL: string = '', config?: Partial<CSRFConfig>) {
    this.baseURL = baseURL;
    this.csrfProtection = CSRFProtection.getInstance(config);
  }

  /**
   * Make CSRF-protected request
   */
  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const method = options.method || 'GET';
    const url = this.baseURL + endpoint;
    
    // Add CSRF token for state-changing operations
    if (this.requiresCSRFToken(method)) {
      options.headers = await this.csrfProtection.addCSRFHeader(
        (options.headers as Record<string, string>) || {}
      );
    }

    // Add default headers
    options.headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add credentials for cookie-based auth
    options.credentials = 'include';

    let lastError: Error | null = null;
    let attempts = 0;

    while (attempts <= this.csrfProtection.config.maxRetries) {
      try {
        const response = await fetch(url, options);
        
        // Handle CSRF token errors
        if (response.status === 403) {
          const errorData = await response.json().catch(() => ({}));
          
          if (errorData.code === 'CSRF_TOKEN_INVALID' || errorData.code === 'CSRF_TOKEN_EXPIRED') {
            if (attempts < this.csrfProtection.config.maxRetries) {
              await this.csrfProtection.refreshCSRFToken();
              
              // Update headers with new token
              if (this.requiresCSRFToken(method)) {
                options.headers = await this.csrfProtection.addCSRFHeader(
                  (options.headers as Record<string, string>) || {}
                );
              }
              
              attempts++;
              continue;
            }
          }
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `HTTP ${response.status}: ${response.statusText}`
          );
        }

        return await response.json();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry on non-CSRF errors
        if (attempts === 0 && !this.isCSRFError(error)) {
          break;
        }
        
        attempts++;
      }
    }

    throw lastError || new Error('Request failed after maximum retries');
  }

  /**
   * Check if method requires CSRF token
   */
  private requiresCSRFToken(method: string): boolean {
    return ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase());
  }

  /**
   * Check if error is CSRF-related
   */
  private isCSRFError(error: unknown): boolean {
    if (error instanceof CSRFError) return true;
    if (error instanceof Error) {
      return error.message.includes('CSRF') || error.message.includes('403');
    }
    return false;
  }

  /**
   * Convenience methods for common HTTP operations
   */
  async get<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

/**
 * CSRF Token Generator (for backend integration)
 */
export class CSRFTokenGenerator {
  private static tokens = new Map<string, { token: string; expires: number }>();
  
  /**
   * Generate new CSRF token
   */
  static generateToken(sessionId: string): string {
    const token = this.generateSecureToken();
    const expires = Date.now() + 30 * 60 * 1000; // 30 minutes
    
    this.tokens.set(sessionId, { token, expires });
    return token;
  }

  /**
   * Validate CSRF token
   */
  static validateToken(sessionId: string, token: string): boolean {
    const stored = this.tokens.get(sessionId);
    if (!stored) return false;
    
    if (Date.now() > stored.expires) {
      this.tokens.delete(sessionId);
      return false;
    }
    
    return stored.token === token;
  }

  /**
   * Clean expired tokens
   */
  static cleanExpiredTokens(): void {
    const now = Date.now();
    for (const [sessionId, { expires }] of this.tokens.entries()) {
      if (now > expires) {
        this.tokens.delete(sessionId);
      }
    }
  }

  /**
   * Generate cryptographically secure token
   */
  private static generateSecureToken(): string {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    // Fallback for environments without crypto
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

// Export singleton instance
export const csrfProtection = CSRFProtection.getInstance();
export const csrfAPIClient = new CSRFProtectedAPIClient();