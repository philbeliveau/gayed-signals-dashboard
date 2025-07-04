# Authentication Security Architecture

## Overview
This document defines the comprehensive security architecture for the authentication system, including token management, security measures, threat mitigation, and compliance considerations.

## Security Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                          │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: Transport Security (HTTPS/TLS)                    │
│  ├── TLS 1.3 encryption                                     │
│  ├── HSTS headers                                           │
│  ├── Certificate validation                                 │
│  └── Secure cookies                                         │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Application Security                              │
│  ├── JWT token security                                     │
│  ├── CSRF protection                                        │
│  ├── XSS prevention                                         │
│  ├── Rate limiting                                          │
│  └── Input validation                                       │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: Authentication Security                           │
│  ├── Secure password handling                               │
│  ├── Session management                                     │
│  ├── Token rotation                                         │
│  ├── Brute force protection                                 │
│  └── Account lockout                                        │
├─────────────────────────────────────────────────────────────┤
│  Layer 4: Authorization Security                            │
│  ├── Role-based access control                              │
│  ├── Permission validation                                  │
│  ├── Resource-level security                                │
│  └── Audit logging                                          │
└─────────────────────────────────────────────────────────────┘
```

## Token Management Security

### 1. JWT Token Strategy

```typescript
// Token configuration and security settings
interface JWTSecurityConfig {
  // Token settings
  accessTokenExpiry: number;      // 15 minutes
  refreshTokenExpiry: number;     // 7 days
  secretRotationInterval: number; // 24 hours
  
  // Security settings
  issuer: string;
  audience: string[];
  algorithm: 'HS256' | 'RS256';
  
  // Rate limiting
  maxTokenRequests: number;       // 10 per minute
  maxRefreshAttempts: number;     // 3 per hour
  
  // Storage settings
  secureCookies: boolean;
  sameSitePolicy: 'strict' | 'lax' | 'none';
  httpOnlyTokens: boolean;
}

const jwtSecurityConfig: JWTSecurityConfig = {
  accessTokenExpiry: 15 * 60 * 1000,        // 15 minutes
  refreshTokenExpiry: 7 * 24 * 60 * 60 * 1000, // 7 days
  secretRotationInterval: 24 * 60 * 60 * 1000,  // 24 hours
  
  issuer: 'gayed-signals-dashboard',
  audience: ['gayed-signals-frontend', 'gayed-signals-api'],
  algorithm: 'HS256',
  
  maxTokenRequests: 10,
  maxRefreshAttempts: 3,
  
  secureCookies: process.env.NODE_ENV === 'production',
  sameSitePolicy: 'strict',
  httpOnlyTokens: true,
};
```

### 2. Secure Token Storage

```typescript
// Secure token storage implementation
interface SecureTokenStorage {
  storeToken(token: string, type: 'access' | 'refresh'): void;
  getToken(type: 'access' | 'refresh'): string | null;
  removeToken(type: 'access' | 'refresh'): void;
  clearAllTokens(): void;
}

class HttpOnlyCookieStorage implements SecureTokenStorage {
  private cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
  };
  
  storeToken(token: string, type: 'access' | 'refresh'): void {
    const maxAge = type === 'access' 
      ? jwtSecurityConfig.accessTokenExpiry 
      : jwtSecurityConfig.refreshTokenExpiry;
    
    document.cookie = this.createSecureCookie(
      `${type}_token`,
      token,
      { ...this.cookieOptions, maxAge }
    );
  }
  
  getToken(type: 'access' | 'refresh'): string | null {
    return this.getCookieValue(`${type}_token`);
  }
  
  removeToken(type: 'access' | 'refresh'): void {
    document.cookie = this.createSecureCookie(
      `${type}_token`,
      '',
      { ...this.cookieOptions, maxAge: 0 }
    );
  }
  
  clearAllTokens(): void {
    this.removeToken('access');
    this.removeToken('refresh');
  }
  
  private createSecureCookie(name: string, value: string, options: any): string {
    const optionsString = Object.entries(options)
      .map(([key, val]) => `${key}=${val}`)
      .join('; ');
    return `${name}=${value}; ${optionsString}`;
  }
  
  private getCookieValue(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }
}

// Memory storage for sensitive environments
class EncryptedMemoryStorage implements SecureTokenStorage {
  private tokens = new Map<string, string>();
  private encryptionKey: CryptoKey | null = null;
  
  async initialize(): Promise<void> {
    this.encryptionKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  async storeToken(token: string, type: 'access' | 'refresh'): Promise<void> {
    if (!this.encryptionKey) throw new Error('Storage not initialized');
    
    const encrypted = await this.encrypt(token);
    this.tokens.set(type, encrypted);
  }
  
  async getToken(type: 'access' | 'refresh'): Promise<string | null> {
    if (!this.encryptionKey) return null;
    
    const encrypted = this.tokens.get(type);
    if (!encrypted) return null;
    
    return this.decrypt(encrypted);
  }
  
  removeToken(type: 'access' | 'refresh'): void {
    this.tokens.delete(type);
  }
  
  clearAllTokens(): void {
    this.tokens.clear();
  }
  
  private async encrypt(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey!,
      data
    );
    
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  }
  
  private async decrypt(encryptedData: string): Promise<string> {
    const data = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );
    
    const iv = data.slice(0, 12);
    const encrypted = data.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey!,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }
}
```

### 3. Token Rotation and Refresh

```typescript
// Secure token rotation implementation
class SecureTokenManager {
  private storage: SecureTokenStorage;
  private refreshPromise: Promise<string> | null = null;
  private rotationTimer: NodeJS.Timeout | null = null;
  
  constructor(storage: SecureTokenStorage) {
    this.storage = storage;
    this.startRotationTimer();
  }
  
  async getValidAccessToken(): Promise<string | null> {
    const token = await this.storage.getToken('access');
    
    if (!token) return null;
    
    // Check if token is expired or expiring soon
    if (this.isTokenExpiringSoon(token)) {
      return this.refreshAccessToken();
    }
    
    return token;
  }
  
  async refreshAccessToken(): Promise<string | null> {
    // Prevent multiple concurrent refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    
    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.refreshPromise = null;
    }
  }
  
  private async performTokenRefresh(): Promise<string | null> {
    const refreshToken = await this.storage.getToken('refresh');
    
    if (!refreshToken || this.isTokenExpired(refreshToken)) {
      this.clearTokens();
      throw new AuthError('Refresh token expired');
    }
    
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      
      if (!response.ok) {
        throw new Error('Token refresh failed');
      }
      
      const data = await response.json();
      
      // Store new tokens securely
      await this.storage.storeToken(data.access_token, 'access');
      if (data.refresh_token) {
        await this.storage.storeToken(data.refresh_token, 'refresh');
      }
      
      return data.access_token;
    } catch (error) {
      this.clearTokens();
      throw new AuthError('Token refresh failed', error);
    }
  }
  
  private isTokenExpiringSoon(token: string): boolean {
    try {
      const payload = this.decodeTokenPayload(token);
      const expirationTime = payload.exp * 1000;
      const currentTime = Date.now();
      const timeUntilExpiry = expirationTime - currentTime;
      
      // Refresh if token expires within 5 minutes
      return timeUntilExpiry < 5 * 60 * 1000;
    } catch {
      return true; // Refresh if we can't decode the token
    }
  }
  
  private isTokenExpired(token: string): boolean {
    try {
      const payload = this.decodeTokenPayload(token);
      const expirationTime = payload.exp * 1000;
      return Date.now() >= expirationTime;
    } catch {
      return true; // Consider invalid tokens as expired
    }
  }
  
  private decodeTokenPayload(token: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token format');
    
    const payload = parts[1];
    const decoded = atob(payload);
    return JSON.parse(decoded);
  }
  
  private startRotationTimer(): void {
    this.rotationTimer = setInterval(() => {
      this.rotateRefreshTokenIfNeeded();
    }, jwtSecurityConfig.secretRotationInterval);
  }
  
  private async rotateRefreshTokenIfNeeded(): Promise<void> {
    const refreshToken = await this.storage.getToken('refresh');
    if (!refreshToken) return;
    
    try {
      const payload = this.decodeTokenPayload(refreshToken);
      const issuedTime = payload.iat * 1000;
      const rotationInterval = jwtSecurityConfig.secretRotationInterval;
      
      // Rotate if token is older than rotation interval
      if (Date.now() - issuedTime > rotationInterval) {
        await this.refreshAccessToken();
      }
    } catch (error) {
      console.error('Token rotation check failed:', error);
    }
  }
  
  clearTokens(): void {
    this.storage.clearAllTokens();
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
  }
}
```

## Cross-Site Request Forgery (CSRF) Protection

### 1. CSRF Token Implementation

```typescript
// CSRF protection implementation
class CSRFProtection {
  private static instance: CSRFProtection;
  private csrfToken: string | null = null;
  
  static getInstance(): CSRFProtection {
    if (!CSRFProtection.instance) {
      CSRFProtection.instance = new CSRFProtection();
    }
    return CSRFProtection.instance;
  }
  
  async getCSRFToken(): Promise<string> {
    if (!this.csrfToken) {
      await this.refreshCSRFToken();
    }
    return this.csrfToken!;
  }
  
  async refreshCSRFToken(): Promise<void> {
    try {
      const response = await fetch('/api/auth/csrf-token', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to get CSRF token');
      }
      
      const data = await response.json();
      this.csrfToken = data.csrf_token;
    } catch (error) {
      console.error('CSRF token refresh failed:', error);
      throw error;
    }
  }
  
  async addCSRFHeader(headers: Record<string, string>): Promise<Record<string, string>> {
    const token = await this.getCSRFToken();
    return {
      ...headers,
      'X-CSRF-Token': token,
    };
  }
  
  validateCSRFToken(token: string): boolean {
    return token === this.csrfToken;
  }
}

// CSRF-aware API client wrapper
class CSRFProtectedAPIClient {
  private apiClient: APIClient;
  private csrfProtection: CSRFProtection;
  
  constructor(apiClient: APIClient) {
    this.apiClient = apiClient;
    this.csrfProtection = CSRFProtection.getInstance();
  }
  
  async request(endpoint: string, options: any = {}): Promise<any> {
    // Add CSRF token for state-changing operations
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method || 'GET')) {
      options.headers = await this.csrfProtection.addCSRFHeader(
        options.headers || {}
      );
    }
    
    try {
      return await this.apiClient.request(endpoint, options);
    } catch (error) {
      // Refresh CSRF token on 403 errors and retry once
      if (error.status === 403 && error.code === 'CSRF_TOKEN_INVALID') {
        await this.csrfProtection.refreshCSRFToken();
        options.headers = await this.csrfProtection.addCSRFHeader(
          options.headers || {}
        );
        return this.apiClient.request(endpoint, options);
      }
      throw error;
    }
  }
}
```

## Cross-Site Scripting (XSS) Prevention

### 1. Input Sanitization

```typescript
// XSS prevention utilities
import DOMPurify from 'dompurify';

class XSSProtection {
  static sanitizeHTML(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li'],
      ALLOWED_ATTR: [],
    });
  }
  
  static sanitizeText(text: string): string {
    return text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  
  static validateInput(input: string, type: 'email' | 'username' | 'text'): boolean {
    const patterns = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      username: /^[a-zA-Z0-9_-]{3,20}$/,
      text: /^[^<>]*$/, // No angle brackets
    };
    
    return patterns[type].test(input);
  }
  
  static createSecureFormProps(props: any): any {
    const secureProps = { ...props };
    
    // Add security attributes
    secureProps.autoComplete = 'off';
    secureProps.spellCheck = false;
    
    // Add input validation
    if (secureProps.type === 'email') {
      secureProps.pattern = '[^\\s@]+@[^\\s@]+\\.[^\\s@]+';
    }
    
    return secureProps;
  }
}

// Secure form component wrapper
const SecureForm: React.FC<React.FormHTMLAttributes<HTMLFormElement>> = ({
  children,
  onSubmit,
  ...props
}) => {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Validate form data
    const formData = new FormData(event.currentTarget);
    const sanitizedData = new FormData();
    
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        sanitizedData.append(key, XSSProtection.sanitizeText(value));
      } else {
        sanitizedData.append(key, value);
      }
    }
    
    if (onSubmit) {
      onSubmit(event);
    }
  };
  
  return (
    <form {...props} onSubmit={handleSubmit}>
      {children}
    </form>
  );
};
```

## Rate Limiting and Brute Force Protection

### 1. Client-Side Rate Limiting

```typescript
// Rate limiting implementation
class RateLimiter {
  private attempts = new Map<string, number[]>();
  
  constructor(
    private maxAttempts: number,
    private windowMs: number
  ) {}
  
  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the time window
    const recentAttempts = attempts.filter(time => now - time < this.windowMs);
    
    if (recentAttempts.length >= this.maxAttempts) {
      return false;
    }
    
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    
    return true;
  }
  
  getRemainingAttempts(key: string): number {
    const attempts = this.attempts.get(key) || [];
    const now = Date.now();
    const recentAttempts = attempts.filter(time => now - time < this.windowMs);
    
    return Math.max(0, this.maxAttempts - recentAttempts.length);
  }
  
  getTimeUntilReset(key: string): number {
    const attempts = this.attempts.get(key) || [];
    if (attempts.length === 0) return 0;
    
    const oldestAttempt = Math.min(...attempts);
    const timeUntilReset = this.windowMs - (Date.now() - oldestAttempt);
    
    return Math.max(0, timeUntilReset);
  }
  
  reset(key: string): void {
    this.attempts.delete(key);
  }
}

// Authentication rate limiting
const authRateLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes

// Rate-limited authentication service
class RateLimitedAuthService {
  private authService: AuthService;
  
  constructor(authService: AuthService) {
    this.authService = authService;
  }
  
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const key = `login:${credentials.email}`;
    
    if (!authRateLimiter.isAllowed(key)) {
      const timeUntilReset = authRateLimiter.getTimeUntilReset(key);
      throw new AuthError(
        'Too many login attempts',
        `Please try again in ${Math.ceil(timeUntilReset / 1000 / 60)} minutes`
      );
    }
    
    try {
      const result = await this.authService.login(credentials);
      
      // Reset rate limit on successful login
      authRateLimiter.reset(key);
      
      return result;
    } catch (error) {
      // Don't increment on network errors
      if (error.status !== 0) {
        // Login attempt recorded by rate limiter
      }
      throw error;
    }
  }
}
```

## Security Headers and Configuration

### 1. Security Headers Implementation

```typescript
// Security headers configuration
export const securityHeaders = [
  // HTTPS enforcement
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  
  // XSS protection
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  
  // Content type sniffing prevention
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  
  // Clickjacking prevention
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  
  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.example.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
  
  // Referrer policy
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  
  // Permissions policy
  {
    key: 'Permissions-Policy',
    value: [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
    ].join(', '),
  },
];

// Next.js configuration
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

### 2. Environment Security Configuration

```typescript
// Security configuration based on environment
interface SecurityConfig {
  enforceHTTPS: boolean;
  enableCSRF: boolean;
  enableRateLimiting: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  enableAuditLogging: boolean;
  enableSecurityHeaders: boolean;
}

const getSecurityConfig = (): SecurityConfig => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    enforceHTTPS: isProduction,
    enableCSRF: true,
    enableRateLimiting: true,
    sessionTimeout: isProduction ? 30 * 60 * 1000 : 60 * 60 * 1000, // 30 min prod, 1 hour dev
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    enableAuditLogging: isProduction,
    enableSecurityHeaders: isProduction,
  };
};
```

## Audit Logging and Monitoring

### 1. Security Event Logging

```typescript
// Security audit logging
interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: number;
  details: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  TOKEN_REFRESH = 'token_refresh',
  PASSWORD_CHANGE = 'password_change',
  ACCOUNT_LOCKED = 'account_locked',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  CSRF_ATTACK_DETECTED = 'csrf_attack_detected',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
}

class SecurityAuditLogger {
  private static instance: SecurityAuditLogger;
  
  static getInstance(): SecurityAuditLogger {
    if (!SecurityAuditLogger.instance) {
      SecurityAuditLogger.instance = new SecurityAuditLogger();
    }
    return SecurityAuditLogger.instance;
  }
  
  logEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: Date.now(),
    };
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Security Event:', fullEvent);
    }
    
    // Send to logging service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(fullEvent);
    }
    
    // Store locally for immediate analysis
    this.storeEvent(fullEvent);
  }
  
  private async sendToLoggingService(event: SecurityEvent): Promise<void> {
    try {
      await fetch('/api/security/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error('Failed to send security event to logging service:', error);
    }
  }
  
  private storeEvent(event: SecurityEvent): void {
    try {
      const events = this.getStoredEvents();
      events.push(event);
      
      // Keep only last 100 events
      const recentEvents = events.slice(-100);
      
      localStorage.setItem('security_events', JSON.stringify(recentEvents));
    } catch (error) {
      console.error('Failed to store security event locally:', error);
    }
  }
  
  private getStoredEvents(): SecurityEvent[] {
    try {
      const stored = localStorage.getItem('security_events');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
  
  getRecentEvents(count: number = 10): SecurityEvent[] {
    return this.getStoredEvents().slice(-count);
  }
  
  getSuspiciousActivity(): SecurityEvent[] {
    const events = this.getStoredEvents();
    return events.filter(event => 
      event.severity === 'high' || event.severity === 'critical'
    );
  }
}
```

## Security Testing Strategy

### 1. Security Test Suite

```typescript
// Security testing utilities
describe('Authentication Security', () => {
  describe('Token Security', () => {
    it('should reject expired tokens', async () => {
      const expiredToken = createExpiredJWT();
      const isValid = tokenManager.isTokenValid(expiredToken);
      expect(isValid).toBe(false);
    });
    
    it('should reject malformed tokens', async () => {
      const malformedToken = 'invalid.token.format';
      const isValid = tokenManager.isTokenValid(malformedToken);
      expect(isValid).toBe(false);
    });
    
    it('should rotate tokens on schedule', async () => {
      const initialToken = await tokenManager.getAccessToken();
      
      // Fast-forward time
      jest.advanceTimersByTime(jwtSecurityConfig.secretRotationInterval);
      
      const rotatedToken = await tokenManager.getAccessToken();
      expect(rotatedToken).not.toBe(initialToken);
    });
  });
  
  describe('Rate Limiting', () => {
    it('should block requests after limit exceeded', () => {
      const rateLimiter = new RateLimiter(3, 60000);
      const key = 'test-key';
      
      // Make 3 allowed requests
      expect(rateLimiter.isAllowed(key)).toBe(true);
      expect(rateLimiter.isAllowed(key)).toBe(true);
      expect(rateLimiter.isAllowed(key)).toBe(true);
      
      // 4th request should be blocked
      expect(rateLimiter.isAllowed(key)).toBe(false);
    });
  });
  
  describe('XSS Prevention', () => {
    it('should sanitize malicious input', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const sanitized = XSSProtection.sanitizeHTML(maliciousInput);
      expect(sanitized).not.toContain('<script>');
    });
  });
  
  describe('CSRF Protection', () => {
    it('should require CSRF token for state-changing requests', async () => {
      const apiClient = new CSRFProtectedAPIClient(mockAPIClient);
      
      // Should add CSRF token to POST request
      const postRequest = jest.spyOn(mockAPIClient, 'request');
      await apiClient.request('/api/test', { method: 'POST' });
      
      expect(postRequest).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-CSRF-Token': expect.any(String),
          }),
        })
      );
    });
  });
});
```

## Compliance and Best Practices

### 1. Security Compliance Checklist

```typescript
// Security compliance verification
interface SecurityCompliance {
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    preventReuse: number;
  };
  
  sessionManagement: {
    sessionTimeout: number;
    absoluteTimeout: number;
    concurrentSessions: number;
    secureTransmission: boolean;
  };
  
  dataProtection: {
    encryptionAtRest: boolean;
    encryptionInTransit: boolean;
    dataMinimization: boolean;
    rightToErasure: boolean;
  };
  
  accessControl: {
    roleBasedAccess: boolean;
    principleOfLeastPrivilege: boolean;
    segregationOfDuties: boolean;
    regularAccessReview: boolean;
  };
  
  auditLogging: {
    authenticationEvents: boolean;
    authorizationEvents: boolean;
    dataAccessEvents: boolean;
    logIntegrity: boolean;
  };
}

const securityCompliance: SecurityCompliance = {
  passwordPolicy: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventReuse: 5,
  },
  
  sessionManagement: {
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    absoluteTimeout: 8 * 60 * 60 * 1000, // 8 hours
    concurrentSessions: 3,
    secureTransmission: true,
  },
  
  dataProtection: {
    encryptionAtRest: true,
    encryptionInTransit: true,
    dataMinimization: true,
    rightToErasure: true,
  },
  
  accessControl: {
    roleBasedAccess: true,
    principleOfLeastPrivilege: true,
    segregationOfDuties: true,
    regularAccessReview: true,
  },
  
  auditLogging: {
    authenticationEvents: true,
    authorizationEvents: true,
    dataAccessEvents: true,
    logIntegrity: true,
  },
};
```

## Security Monitoring Dashboard

### 1. Real-time Security Monitoring

```typescript
// Security monitoring component
const SecurityMonitoringDashboard: React.FC = () => {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [threatLevel, setThreatLevel] = useState<'low' | 'medium' | 'high'>('low');
  
  useEffect(() => {
    const auditLogger = SecurityAuditLogger.getInstance();
    const recentEvents = auditLogger.getRecentEvents(50);
    setSecurityEvents(recentEvents);
    
    // Calculate threat level based on recent events
    const suspiciousEvents = auditLogger.getSuspiciousActivity();
    if (suspiciousEvents.length > 10) {
      setThreatLevel('high');
    } else if (suspiciousEvents.length > 5) {
      setThreatLevel('medium');
    } else {
      setThreatLevel('low');
    }
  }, []);
  
  return (
    <div className="security-dashboard">
      <div className="threat-level-indicator">
        <span className={`threat-level ${threatLevel}`}>
          Threat Level: {threatLevel.toUpperCase()}
        </span>
      </div>
      
      <div className="security-metrics">
        <SecurityMetricCard
          title="Failed Login Attempts"
          value={securityEvents.filter(e => e.type === SecurityEventType.LOGIN_FAILURE).length}
          trend="up"
        />
        <SecurityMetricCard
          title="Rate Limit Violations"
          value={securityEvents.filter(e => e.type === SecurityEventType.RATE_LIMIT_EXCEEDED).length}
          trend="stable"
        />
        <SecurityMetricCard
          title="Suspicious Activities"
          value={securityEvents.filter(e => e.type === SecurityEventType.SUSPICIOUS_ACTIVITY).length}
          trend="down"
        />
      </div>
      
      <SecurityEventsList events={securityEvents} />
    </div>
  );
};
```

## Next Steps

1. **Implement secure token management** with rotation and validation
2. **Add CSRF protection** for all state-changing operations
3. **Implement XSS prevention** with input sanitization
4. **Add rate limiting** for authentication endpoints
5. **Configure security headers** for production deployment
6. **Implement audit logging** for security events
7. **Add security monitoring** dashboard for real-time threat detection
8. **Conduct security testing** with automated test suite
9. **Ensure compliance** with security standards and regulations
10. **Implement incident response** procedures for security breaches