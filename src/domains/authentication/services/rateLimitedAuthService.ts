/**
 * Rate-Limited Authentication Service
 * 
 * Wrapper service that adds rate limiting to authentication operations:
 * - Login with progressive delays
 * - Registration with IP tracking
 * - Password reset with dual tracking
 * - Token refresh with burst protection
 * - User feedback and error messages
 */

import { authRateLimiters, RateLimitResult } from './rateLimiting';
import { csrfAPIClient } from './csrfProtection';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegistrationData {
  email: string;
  password: string;
  fullName: string;
  acceptedTerms: boolean;
}

export interface PasswordResetRequest {
  email: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user?: {
      id: string;
      email: string;
      fullName: string;
      isVerified: boolean;
    };
    tokens?: {
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
    };
  };
  message?: string;
  error?: string;
}

export interface RateLimitError extends Error {
  code: 'RATE_LIMIT_EXCEEDED';
  retryAfter: number;
  resetTime: number;
  details: {
    type: 'email' | 'ip' | 'combined';
    remaining: number;
    reason?: string;
  };
}

export class AuthRateLimitError extends Error implements RateLimitError {
  public readonly code = 'RATE_LIMIT_EXCEEDED' as const;
  
  constructor(
    message: string,
    public retryAfter: number,
    public resetTime: number,
    public details: {
      type: 'email' | 'ip' | 'combined';
      remaining: number;
      reason?: string;
    }
  ) {
    super(message);
    this.name = 'AuthRateLimitError';
  }
}

/**
 * Rate-Limited Authentication Service
 */
export class RateLimitedAuthService {
  private getClientIP(): string {
    // In a real implementation, this would get the client IP
    // For client-side, we'll use a placeholder
    if (typeof window !== 'undefined') {
      return 'client-ip-placeholder';
    }
    return '127.0.0.1';
  }

  private getUserAgent(): string {
    if (typeof navigator !== 'undefined') {
      return navigator.userAgent;
    }
    return 'unknown';
  }

  private formatRateLimitError(
    result: RateLimitResult,
    type: 'email' | 'ip' | 'combined',
    action: string
  ): AuthRateLimitError {
    const retryAfterMinutes = Math.ceil((result.retryAfter || 0) / 1000 / 60);
    const resetTimeMinutes = Math.ceil((result.resetTime - Date.now()) / 1000 / 60);
    
    let message = `Too many ${action} attempts. `;
    
    if (result.retryAfter) {
      message += `Please try again in ${retryAfterMinutes} minute${retryAfterMinutes !== 1 ? 's' : ''}.`;
    } else {
      message += `Rate limit will reset in ${resetTimeMinutes} minute${resetTimeMinutes !== 1 ? 's' : ''}.`;
    }

    return new AuthRateLimitError(
      message,
      result.retryAfter || 0,
      result.resetTime,
      {
        type,
        remaining: result.remaining,
        reason: result.reason,
      }
    );
  }

  /**
   * Login with rate limiting
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const ip = this.getClientIP();
    const userAgent = this.getUserAgent();
    
    // Check rate limits
    const rateLimitCheck = authRateLimiters.checkLoginLimit(credentials.email, ip);
    
    if (!rateLimitCheck.allowed) {
      // Determine which limit was hit
      if (!rateLimitCheck.emailAllowed.allowed) {
        authRateLimiters.recordLoginAttempt(credentials.email, ip, false, userAgent);
        throw this.formatRateLimitError(rateLimitCheck.emailAllowed, 'email', 'login');
      }
      
      if (!rateLimitCheck.ipAllowed.allowed) {
        authRateLimiters.recordLoginAttempt(credentials.email, ip, false, userAgent);
        throw this.formatRateLimitError(rateLimitCheck.ipAllowed, 'ip', 'login');
      }
    }

    try {
      // Attempt login
      const response = await csrfAPIClient.post<AuthResponse>('/api/auth/login', credentials);
      
      // Record successful attempt
      authRateLimiters.recordLoginAttempt(credentials.email, ip, true, userAgent);
      
      return response;
    } catch (error) {
      // Record failed attempt
      authRateLimiters.recordLoginAttempt(credentials.email, ip, false, userAgent);
      
      // Re-throw the original error
      throw error;
    }
  }

  /**
   * Registration with rate limiting
   */
  async register(data: RegistrationData): Promise<AuthResponse> {
    const ip = this.getClientIP();
    const userAgent = this.getUserAgent();
    
    // Check rate limits
    const rateLimitCheck = authRateLimiters.checkRegistrationLimit(ip);
    
    if (!rateLimitCheck.allowed) {
      authRateLimiters.recordRegistrationAttempt(ip, false, userAgent);
      throw this.formatRateLimitError(rateLimitCheck, 'ip', 'registration');
    }

    try {
      // Attempt registration
      const response = await csrfAPIClient.post<AuthResponse>('/api/auth/register', data);
      
      // Record successful attempt
      authRateLimiters.recordRegistrationAttempt(ip, true, userAgent);
      
      return response;
    } catch (error) {
      // Record failed attempt
      authRateLimiters.recordRegistrationAttempt(ip, false, userAgent);
      
      // Re-throw the original error
      throw error;
    }
  }

  /**
   * Password reset with rate limiting
   */
  async requestPasswordReset(request: PasswordResetRequest): Promise<AuthResponse> {
    const ip = this.getClientIP();
    const userAgent = this.getUserAgent();
    
    // Check rate limits
    const rateLimitCheck = authRateLimiters.checkPasswordResetLimit(request.email, ip);
    
    if (!rateLimitCheck.allowed) {
      // Determine which limit was hit
      if (!rateLimitCheck.emailAllowed.allowed) {
        authRateLimiters.recordPasswordResetAttempt(request.email, ip, false, userAgent);
        throw this.formatRateLimitError(rateLimitCheck.emailAllowed, 'email', 'password reset');
      }
      
      if (!rateLimitCheck.ipAllowed.allowed) {
        authRateLimiters.recordPasswordResetAttempt(request.email, ip, false, userAgent);
        throw this.formatRateLimitError(rateLimitCheck.ipAllowed, 'ip', 'password reset');
      }
    }

    try {
      // Attempt password reset
      const response = await csrfAPIClient.post<AuthResponse>('/api/auth/password-reset', request);
      
      // Record successful attempt
      authRateLimiters.recordPasswordResetAttempt(request.email, ip, true, userAgent);
      
      return response;
    } catch (error) {
      // Record failed attempt
      authRateLimiters.recordPasswordResetAttempt(request.email, ip, false, userAgent);
      
      // Re-throw the original error
      throw error;
    }
  }

  /**
   * Token refresh with rate limiting
   */
  async refreshToken(): Promise<AuthResponse> {
    const ip = this.getClientIP();
    const userAgent = this.getUserAgent();
    
    // For token refresh, we'll use IP-based rate limiting since we might not have user info
    const ipKey = `token_refresh:ip:${ip}`;
    const rateLimitCheck = authRateLimiters.tokenRefresh.isAllowed(ipKey);
    
    if (!rateLimitCheck.allowed) {
      authRateLimiters.tokenRefresh.recordAttempt(ipKey, false, { ip, userAgent });
      throw this.formatRateLimitError(rateLimitCheck, 'ip', 'token refresh');
    }

    try {
      // Attempt token refresh
      const response = await csrfAPIClient.post<AuthResponse>('/api/auth/refresh');
      
      // Record successful attempt
      authRateLimiters.tokenRefresh.recordAttempt(ipKey, true, { ip, userAgent });
      
      return response;
    } catch (error) {
      // Record failed attempt
      authRateLimiters.tokenRefresh.recordAttempt(ipKey, false, { ip, userAgent });
      
      // Re-throw the original error
      throw error;
    }
  }

  /**
   * Logout (no rate limiting needed)
   */
  async logout(): Promise<AuthResponse> {
    try {
      const response = await csrfAPIClient.post<AuthResponse>('/api/auth/logout');
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify email with rate limiting
   */
  async verifyEmail(token: string): Promise<AuthResponse> {
    const ip = this.getClientIP();
    const userAgent = this.getUserAgent();
    
    // Use IP-based rate limiting for email verification
    const ipKey = `email_verification:ip:${ip}`;
    const rateLimitCheck = authRateLimiters.emailVerification.isAllowed(ipKey);
    
    if (!rateLimitCheck.allowed) {
      authRateLimiters.emailVerification.recordAttempt(ipKey, false, { ip, userAgent });
      throw this.formatRateLimitError(rateLimitCheck, 'ip', 'email verification');
    }

    try {
      // Attempt email verification
      const response = await csrfAPIClient.post<AuthResponse>('/api/auth/verify-email', { token });
      
      // Record successful attempt
      authRateLimiters.emailVerification.recordAttempt(ipKey, true, { ip, userAgent });
      
      return response;
    } catch (error) {
      // Record failed attempt
      authRateLimiters.emailVerification.recordAttempt(ipKey, false, { ip, userAgent });
      
      // Re-throw the original error
      throw error;
    }
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(email?: string): {
    login?: { email?: RateLimitResult; ip?: RateLimitResult };
    registration?: RateLimitResult;
    passwordReset?: { email?: RateLimitResult; ip?: RateLimitResult };
    tokenRefresh?: { email?: RateLimitResult; ip?: RateLimitResult };
  } {
    const ip = this.getClientIP();
    return authRateLimiters.getRateLimitStatus(email, ip);
  }

  /**
   * Reset rate limits for current user (admin function)
   */
  async resetUserRateLimits(email: string): Promise<void> {
    // This would typically require admin privileges
    authRateLimiters.resetUserLimits(email);
  }

  /**
   * Reset rate limits for current IP (admin function)
   */
  async resetIPRateLimits(): Promise<void> {
    // This would typically require admin privileges
    const ip = this.getClientIP();
    authRateLimiters.resetIPLimits(ip);
  }

  /**
   * Get user-friendly rate limit message
   */
  getRateLimitMessage(error: AuthRateLimitError): string {
    const { type, remaining, reason } = error.details;
    const retryAfterMinutes = Math.ceil(error.retryAfter / 1000 / 60);
    
    let message = '';
    
    switch (type) {
      case 'email':
        message = 'Too many attempts for this email address. ';
        break;
      case 'ip':
        message = 'Too many attempts from your location. ';
        break;
      case 'combined':
        message = 'Too many attempts. ';
        break;
    }
    
    if (reason === 'Rate limit exceeded') {
      message += 'Please wait before trying again.';
    }
    
    if (error.retryAfter > 0) {
      message += ` You can try again in ${retryAfterMinutes} minute${retryAfterMinutes !== 1 ? 's' : ''}.`;
    }
    
    if (remaining === 0) {
      message += ' Your account has been temporarily locked for security.';
    }
    
    return message;
  }

  /**
   * Check if error is a rate limit error
   */
  isRateLimitError(error: any): error is AuthRateLimitError {
    return error instanceof AuthRateLimitError || error?.code === 'RATE_LIMIT_EXCEEDED';
  }
}

// Export singleton instance
export const rateLimitedAuthService = new RateLimitedAuthService();