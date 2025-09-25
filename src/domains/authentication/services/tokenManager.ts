import { TokenStorage, TokenManager, TokenPayload } from './types';

/**
 * Storage Implementations
 */

/**
 * Cookie-based token storage (Recommended for production)
 * Provides secure storage with httpOnly, secure, and sameSite options
 */
export class CookieTokenStorage implements TokenStorage {
  private cookieOptions = {
    httpOnly: false, // Must be false for client-side access
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
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

  getRefreshToken(): string | null {
    return this.getCookie('refresh_token');
  }

  setRefreshToken(token: string): void {
    this.setCookie('refresh_token', token, {
      ...this.cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days for refresh token
    });
  }

  removeRefreshToken(): void {
    this.deleteCookie('refresh_token');
  }

  clear(): void {
    this.removeToken();
    this.removeRefreshToken();
  }

  private getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      const cookieValue = parts.pop()?.split(';').shift();
      return cookieValue || null;
    }
    return null;
  }

  private setCookie(name: string, value: string, options: any): void {
    if (typeof document === 'undefined') return;
    
    const optionsString = Object.entries(options)
      .filter(([key, val]) => val !== undefined && key !== 'httpOnly') // Skip httpOnly for client-side
      .map(([key, val]) => {
        if (typeof val === 'boolean') {
          return val ? key : '';
        }
        return `${key}=${val}`;
      })
      .filter(Boolean)
      .join('; ');
    
    document.cookie = `${name}=${value}; ${optionsString}`;
  }

  private deleteCookie(name: string): void {
    if (typeof document === 'undefined') return;
    
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }
}

/**
 * localStorage-based token storage
 * Less secure but works in all environments
 */
export class LocalStorageTokenStorage implements TokenStorage {
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('access_token', token);
  }

  removeToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
  }

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token');
  }

  setRefreshToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('refresh_token', token);
  }

  removeRefreshToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('refresh_token');
  }

  clear(): void {
    this.removeToken();
    this.removeRefreshToken();
  }
}

/**
 * Memory-based token storage (Most secure, but lost on page refresh)
 * Recommended for high-security environments
 */
export class MemoryTokenStorage implements TokenStorage {
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

  clear(): void {
    this.tokens.clear();
  }
}

/**
 * JWT Token Payload Interface
 */
interface JWTPayload {
  exp: number;
  iat: number;
  sub: string;
  [key: string]: any;
}

/**
 * Token Manager Implementation
 * Handles JWT token lifecycle, validation, and refresh
 */
export class TokenManagerImpl implements TokenManager {
  private storage: TokenStorage;
  private refreshPromise: Promise<string> | null = null;
  private refreshThreshold: number = 5; // minutes

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

  getRefreshToken(): string | null {
    return this.storage.getRefreshToken();
  }

  setRefreshToken(token: string): void {
    this.storage.setRefreshToken(token);
  }

  removeRefreshToken(): void {
    this.storage.removeRefreshToken();
  }

  isTokenValid(token?: string): boolean {
    const tokenToCheck = token || this.getAccessToken();
    if (!tokenToCheck) return false;

    try {
      const payload = this.decodeJWT(tokenToCheck);
      return !this.isTokenExpired(tokenToCheck);
    } catch (error) {
      console.warn('Token validation failed:', error);
      return false;
    }
  }

  isTokenExpired(token?: string): boolean {
    const tokenToCheck = token || this.getAccessToken();
    if (!tokenToCheck) return true;

    try {
      const payload = this.decodeJWT(tokenToCheck);
      const currentTime = Math.floor(Date.now() / 1000);
      const bufferTime = 30; // 30 seconds buffer
      return payload.exp <= (currentTime + bufferTime);
    } catch (error) {
      console.warn('Token expiration check failed:', error);
      return true;
    }
  }

  getTokenExpirationTime(token?: string): number | null {
    const tokenToCheck = token || this.getAccessToken();
    if (!tokenToCheck) return null;

    try {
      const payload = this.decodeJWT(tokenToCheck);
      return payload.exp * 1000; // Convert to milliseconds
    } catch (error) {
      console.warn('Failed to get token expiration time:', error);
      return null;
    }
  }

  /**
   * Refresh the access token using the refresh token
   * Implements single-flight pattern to prevent multiple simultaneous refresh requests
   */
  async refreshToken(): Promise<string> {
    // If there's already a refresh in progress, return that promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();

    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      // Clear the promise regardless of success or failure
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    // Check if refresh token is valid
    if (this.isTokenExpired(refreshToken)) {
      throw new Error('Refresh token is expired');
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Token refresh failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.access_token) {
        throw new Error('No access token in refresh response');
      }

      // Store the new access token
      this.setAccessToken(data.access_token);

      // Update refresh token if provided
      if (data.refresh_token) {
        this.setRefreshToken(data.refresh_token);
      }

      return data.access_token;
    } catch (error) {
      // Clear tokens on refresh failure
      this.clearAll();
      throw error;
    }
  }

  clearAll(): void {
    this.removeAccessToken();
    this.removeRefreshToken();
    this.refreshPromise = null;
  }

  /**
   * Decode JWT token payload
   * Note: This only decodes the payload, it doesn't verify the signature
   */
  /**
   * Decode a JWT token and return its payload
   * Public method to fulfill interface requirements
   */
  decodeToken(token: string): TokenPayload | null {
    try {
      const payload = this.decodeJWT(token);
      return {
        sub: payload.sub,
        exp: payload.exp,
        iat: payload.iat,
        email: payload.email,
        username: payload.username,
        full_name: payload.full_name,
        is_superuser: payload.is_superuser,
        is_active: payload.is_active
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if token should be refreshed based on threshold
   */
  shouldRefreshToken(token?: string): boolean {
    const tokenToCheck = token || this.getAccessToken();
    if (!tokenToCheck) return false;
    
    try {
      const payload = this.decodeJWT(tokenToCheck);
      const now = Math.floor(Date.now() / 1000);
      const threshold = this.refreshThreshold * 60; // Convert minutes to seconds
      
      return payload.exp - now <= threshold;
    } catch (error) {
      return false;
    }
  }

  private decodeJWT(token: string): JWTPayload {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }

      const payload = parts[1];
      // Add padding if needed for base64 decoding
      const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
      const decoded = atob(paddedPayload);
      return JSON.parse(decoded) as JWTPayload;
    } catch (error) {
      throw new Error(`Failed to decode token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get token subject (usually user ID)
   */
  getTokenSubject(token?: string): string | null {
    const tokenToCheck = token || this.getAccessToken();
    if (!tokenToCheck) return null;

    try {
      const payload = this.decodeJWT(tokenToCheck);
      return payload.sub || null;
    } catch (error) {
      console.warn('Failed to get token subject:', error);
      return null;
    }
  }

  /**
   * Get time until token expires (in milliseconds)
   */
  getTimeUntilExpiry(token?: string): number | null {
    const expirationTime = this.getTokenExpirationTime(token);
    if (!expirationTime) return null;

    return Math.max(0, expirationTime - Date.now());
  }

  /**
   * Check if token will expire within a given threshold
   */
  willExpireSoon(threshold: number = 5 * 60 * 1000, token?: string): boolean {
    const timeUntilExpiry = this.getTimeUntilExpiry(token);
    if (timeUntilExpiry === null) return true;

    return timeUntilExpiry <= threshold;
  }

  /**
   * Get token metadata
   */
  getTokenMetadata(token?: string): {
    isValid: boolean;
    isExpired: boolean;
    expiresAt: Date | null;
    timeUntilExpiry: number | null;
    subject: string | null;
  } {
    const tokenToCheck = token || this.getAccessToken();
    
    if (!tokenToCheck) {
      return {
        isValid: false,
        isExpired: true,
        expiresAt: null,
        timeUntilExpiry: null,
        subject: null
      };
    }

    const isValid = this.isTokenValid(tokenToCheck);
    const isExpired = this.isTokenExpired(tokenToCheck);
    const expirationTime = this.getTokenExpirationTime(tokenToCheck);
    const timeUntilExpiry = this.getTimeUntilExpiry(tokenToCheck);
    const subject = this.getTokenSubject(tokenToCheck);

    return {
      isValid,
      isExpired,
      expiresAt: expirationTime ? new Date(expirationTime) : null,
      timeUntilExpiry,
      subject
    };
  }
}

/**
 * Factory function to create token manager with appropriate storage
 */
export function createTokenManager(storageType: 'cookie' | 'localStorage' | 'memory' = 'cookie'): TokenManager {
  let storage: TokenStorage;

  switch (storageType) {
    case 'cookie':
      storage = new CookieTokenStorage();
      break;
    case 'localStorage':
      storage = new LocalStorageTokenStorage();
      break;
    case 'memory':
      storage = new MemoryTokenStorage();
      break;
    default:
      storage = new CookieTokenStorage();
  }

  return new TokenManagerImpl(storage);
}

export default TokenManagerImpl;