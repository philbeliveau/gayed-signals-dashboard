/**
 * Token Manager Implementation with Secure Storage
 */

import { TokenManager } from '@/types/auth';

export class TokenManagerImpl implements TokenManager {
  private storage: Storage;
  private isServer: boolean;
  
  private readonly ACCESS_TOKEN_KEY = 'gayed_signals_access_token';
  private readonly REFRESH_TOKEN_KEY = 'gayed_signals_refresh_token';

  constructor() {
    this.isServer = typeof window === 'undefined';
    this.storage = this.isServer ? new MemoryStorage() : window.localStorage;
  }

  // Access Token Management
  getAccessToken(): string | null {
    if (this.isServer) return null;
    
    try {
      return this.storage.getItem(this.ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  setAccessToken(token: string): void {
    if (this.isServer) return;
    
    try {
      this.storage.setItem(this.ACCESS_TOKEN_KEY, token);
    } catch (error) {
      console.error('Error setting access token:', error);
    }
  }

  removeAccessToken(): void {
    if (this.isServer) return;
    
    try {
      this.storage.removeItem(this.ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Error removing access token:', error);
    }
  }

  // Refresh Token Management
  getRefreshToken(): string | null {
    if (this.isServer) return null;
    
    try {
      return this.storage.getItem(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  setRefreshToken(token: string): void {
    if (this.isServer) return;
    
    try {
      this.storage.setItem(this.REFRESH_TOKEN_KEY, token);
    } catch (error) {
      console.error('Error setting refresh token:', error);
    }
  }

  removeRefreshToken(): void {
    if (this.isServer) return;
    
    try {
      this.storage.removeItem(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error removing refresh token:', error);
    }
  }

  // Token Validation
  isTokenValid(token?: string): boolean {
    const tokenToCheck = token || this.getAccessToken();
    if (!tokenToCheck) return false;

    try {
      const payload = this.parseJWT(tokenToCheck);
      return payload.exp > Date.now() / 1000;
    } catch (error) {
      return false;
    }
  }

  isTokenExpired(token?: string): boolean {
    return !this.isTokenValid(token);
  }

  getTokenExpirationTime(token?: string): number | null {
    const tokenToCheck = token || this.getAccessToken();
    if (!tokenToCheck) return null;

    try {
      const payload = this.parseJWT(tokenToCheck);
      return payload.exp * 1000; // Convert to milliseconds
    } catch (error) {
      return null;
    }
  }

  // Token Refresh
  async refreshToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.access_token) {
        this.setAccessToken(data.access_token);
        if (data.refresh_token) {
          this.setRefreshToken(data.refresh_token);
        }
      }

      return data.access_token;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearAll();
      throw error;
    }
  }

  // Cleanup
  clearAll(): void {
    this.removeAccessToken();
    this.removeRefreshToken();
  }

  // Private helper methods
  private parseJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      throw new Error('Invalid JWT token');
    }
  }
}

// Memory storage for server-side rendering
class MemoryStorage implements Storage {
  private data: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.data).length;
  }

  clear(): void {
    this.data = {};
  }

  getItem(key: string): string | null {
    return this.data[key] || null;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.data);
    return keys[index] || null;
  }

  removeItem(key: string): void {
    delete this.data[key];
  }

  setItem(key: string, value: string): void {
    this.data[key] = value;
  }
}

// HTTP-only cookie storage (more secure for production)
export class HttpOnlyCookieStorage implements Storage {
  get length(): number {
    if (typeof document === 'undefined') return 0;
    return document.cookie.split(';').length;
  }

  clear(): void {
    if (typeof document === 'undefined') return;
    
    document.cookie.split(';').forEach(cookie => {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
  }

  getItem(key: string): string | null {
    if (typeof document === 'undefined') return null;
    
    const name = key + '=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) === 0) {
        return c.substring(name.length, c.length);
      }
    }
    return null;
  }

  key(index: number): string | null {
    if (typeof document === 'undefined') return null;
    
    const cookies = document.cookie.split(';');
    if (index >= cookies.length) return null;
    
    const cookie = cookies[index];
    const eqPos = cookie.indexOf('=');
    return eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
  }

  removeItem(key: string): void {
    if (typeof document === 'undefined') return;
    
    document.cookie = `${key}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  }

  setItem(key: string, value: string): void {
    if (typeof document === 'undefined') return;
    
    // Set cookie with secure flags
    const secure = window.location.protocol === 'https:' ? ';secure' : '';
    const sameSite = ';samesite=strict';
    const httpOnly = ''; // Can't set httpOnly from client-side
    
    document.cookie = `${key}=${value};path=/${secure}${sameSite}${httpOnly}`;
  }
}

// Export default instance
export const tokenManager = new TokenManagerImpl();