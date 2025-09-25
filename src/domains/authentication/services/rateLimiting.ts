/**
 * Authentication Rate Limiting System
 * 
 * Provides specialized rate limiting for authentication operations including:
 * - Login attempt limiting with progressive delays
 * - Registration rate limiting
 * - Password reset rate limiting
 * - Account lockout management
 * - IP-based and user-based tracking
 */

export interface RateLimitConfig {
  windowMs: number;
  maxAttempts: number;
  blockDuration: number;
  progressiveDelay: boolean;
  enableIPTracking: boolean;
  enableUserTracking: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  blocked: boolean;
  reason?: string;
}

export interface AttemptRecord {
  timestamp: number;
  ip?: string;
  userAgent?: string;
  success: boolean;
}

export interface LockoutRecord {
  lockedAt: number;
  unlockAt: number;
  reason: string;
  attemptCount: number;
}

/**
 * Rate Limiter Core
 */
export class RateLimiter {
  private attempts = new Map<string, AttemptRecord[]>();
  private lockouts = new Map<string, LockoutRecord>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.startCleanupTimer();
  }

  /**
   * Check if action is allowed
   */
  isAllowed(key: string, context?: {
    ip?: string;
    userAgent?: string;
  }): RateLimitResult {
    const now = Date.now();
    
    // Check if currently locked out
    const lockout = this.lockouts.get(key);
    if (lockout && now < lockout.unlockAt) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: lockout.unlockAt,
        retryAfter: lockout.unlockAt - now,
        blocked: true,
        reason: lockout.reason,
      };
    }

    // Clean expired lockouts
    if (lockout && now >= lockout.unlockAt) {
      this.lockouts.delete(key);
    }

    // Get recent attempts
    const recentAttempts = this.getRecentAttempts(key, now);
    
    // Check rate limit
    if (recentAttempts.length >= this.config.maxAttempts) {
      // Trigger lockout
      this.lockoutKey(key, 'Rate limit exceeded');
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: this.getLockoutEndTime(key),
        retryAfter: this.config.blockDuration,
        blocked: true,
        reason: 'Rate limit exceeded',
      };
    }

    // Calculate progressive delay if enabled
    let retryAfter = 0;
    if (this.config.progressiveDelay && recentAttempts.length > 0) {
      retryAfter = this.calculateProgressiveDelay(recentAttempts.length);
    }

    return {
      allowed: true,
      remaining: this.config.maxAttempts - recentAttempts.length,
      resetTime: now + this.config.windowMs,
      retryAfter,
      blocked: false,
    };
  }

  /**
   * Record an attempt
   */
  recordAttempt(key: string, success: boolean, context?: {
    ip?: string;
    userAgent?: string;
  }): void {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    attempts.push({
      timestamp: now,
      ip: context?.ip,
      userAgent: context?.userAgent,
      success,
    });

    // If successful, clear failed attempts
    if (success) {
      this.clearFailedAttempts(key);
      this.clearLockout(key);
    } else {
      this.attempts.set(key, attempts);
    }
  }

  /**
   * Get remaining attempts
   */
  getRemainingAttempts(key: string): number {
    const recentAttempts = this.getRecentAttempts(key, Date.now());
    return Math.max(0, this.config.maxAttempts - recentAttempts.length);
  }

  /**
   * Get time until reset
   */
  getTimeUntilReset(key: string): number {
    const lockout = this.lockouts.get(key);
    if (lockout) {
      return Math.max(0, lockout.unlockAt - Date.now());
    }

    const attempts = this.attempts.get(key) || [];
    if (attempts.length === 0) return 0;

    const oldestAttempt = Math.min(...attempts.map(a => a.timestamp));
    const timeUntilReset = this.config.windowMs - (Date.now() - oldestAttempt);
    
    return Math.max(0, timeUntilReset);
  }

  /**
   * Reset rate limit for key
   */
  reset(key: string): void {
    this.attempts.delete(key);
    this.lockouts.delete(key);
  }

  /**
   * Check if key is locked out
   */
  isLockedOut(key: string): boolean {
    const lockout = this.lockouts.get(key);
    return lockout ? Date.now() < lockout.unlockAt : false;
  }

  /**
   * Get lockout info
   */
  getLockoutInfo(key: string): LockoutRecord | null {
    return this.lockouts.get(key) || null;
  }

  /**
   * Get recent attempts for key
   */
  private getRecentAttempts(key: string, now: number): AttemptRecord[] {
    const attempts = this.attempts.get(key) || [];
    const windowStart = now - this.config.windowMs;
    
    const recentAttempts = attempts.filter(attempt => 
      attempt.timestamp > windowStart && !attempt.success
    );
    
    // Update stored attempts
    this.attempts.set(key, recentAttempts);
    
    return recentAttempts;
  }

  /**
   * Lock out a key
   */
  private lockoutKey(key: string, reason: string): void {
    const now = Date.now();
    const attempts = this.getRecentAttempts(key, now);
    
    this.lockouts.set(key, {
      lockedAt: now,
      unlockAt: now + this.config.blockDuration,
      reason,
      attemptCount: attempts.length,
    });

    console.warn(`Rate limit lockout for key: ${key}`, {
      reason,
      attemptCount: attempts.length,
      unlockAt: new Date(now + this.config.blockDuration),
    });
  }

  /**
   * Get lockout end time
   */
  private getLockoutEndTime(key: string): number {
    const lockout = this.lockouts.get(key);
    return lockout?.unlockAt || Date.now() + this.config.blockDuration;
  }

  /**
   * Calculate progressive delay
   */
  private calculateProgressiveDelay(attemptCount: number): number {
    if (!this.config.progressiveDelay) return 0;
    
    // Exponential backoff: 1s, 2s, 4s, 8s, etc.
    const baseDelay = 1000; // 1 second
    const maxDelay = 60000; // 1 minute
    
    const delay = Math.min(baseDelay * Math.pow(2, attemptCount - 1), maxDelay);
    return delay;
  }

  /**
   * Clear failed attempts for key
   */
  private clearFailedAttempts(key: string): void {
    const attempts = this.attempts.get(key) || [];
    const successfulAttempts = attempts.filter(attempt => attempt.success);
    
    if (successfulAttempts.length > 0) {
      this.attempts.set(key, successfulAttempts);
    } else {
      this.attempts.delete(key);
    }
  }

  /**
   * Clear lockout for key
   */
  private clearLockout(key: string): void {
    this.lockouts.delete(key);
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Clean up every 5 minutes
  }

  /**
   * Clean up expired data
   */
  private cleanup(): void {
    const now = Date.now();
    
    // Clean up old attempts
    for (const [key, attempts] of this.attempts.entries()) {
      const validAttempts = attempts.filter(
        attempt => now - attempt.timestamp < this.config.windowMs * 2
      );
      
      if (validAttempts.length === 0) {
        this.attempts.delete(key);
      } else {
        this.attempts.set(key, validAttempts);
      }
    }
    
    // Clean up expired lockouts
    for (const [key, lockout] of this.lockouts.entries()) {
      if (now >= lockout.unlockAt) {
        this.lockouts.delete(key);
      }
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalKeys: number;
    lockedOutKeys: number;
    totalAttempts: number;
    averageAttemptsPerKey: number;
  } {
    const totalAttempts = Array.from(this.attempts.values())
      .reduce((sum, attempts) => sum + attempts.length, 0);

    return {
      totalKeys: this.attempts.size,
      lockedOutKeys: this.lockouts.size,
      totalAttempts,
      averageAttemptsPerKey: this.attempts.size > 0 ? totalAttempts / this.attempts.size : 0,
    };
  }
}

/**
 * Authentication Rate Limiters
 */
export class AuthRateLimiters {
  private static instance: AuthRateLimiters;
  
  public readonly login: RateLimiter;
  public readonly registration: RateLimiter;
  public readonly passwordReset: RateLimiter;
  public readonly tokenRefresh: RateLimiter;
  public readonly emailVerification: RateLimiter;

  private constructor() {
    // Login rate limiter - strict limits
    this.login = new RateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxAttempts: 5,
      blockDuration: 30 * 60 * 1000, // 30 minutes
      progressiveDelay: true,
      enableIPTracking: true,
      enableUserTracking: true,
    });

    // Registration rate limiter - moderate limits
    this.registration = new RateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      maxAttempts: 3,
      blockDuration: 60 * 60 * 1000, // 1 hour
      progressiveDelay: false,
      enableIPTracking: true,
      enableUserTracking: false,
    });

    // Password reset rate limiter - very strict
    this.passwordReset = new RateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      maxAttempts: 3,
      blockDuration: 60 * 60 * 1000, // 1 hour
      progressiveDelay: false,
      enableIPTracking: true,
      enableUserTracking: true,
    });

    // Token refresh rate limiter - moderate
    this.tokenRefresh = new RateLimiter({
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxAttempts: 10,
      blockDuration: 5 * 60 * 1000, // 5 minutes
      progressiveDelay: false,
      enableIPTracking: true,
      enableUserTracking: true,
    });

    // Email verification rate limiter
    this.emailVerification = new RateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      maxAttempts: 5,
      blockDuration: 60 * 60 * 1000, // 1 hour
      progressiveDelay: false,
      enableIPTracking: true,
      enableUserTracking: true,
    });
  }

  static getInstance(): AuthRateLimiters {
    if (!AuthRateLimiters.instance) {
      AuthRateLimiters.instance = new AuthRateLimiters();
    }
    return AuthRateLimiters.instance;
  }

  /**
   * Generate key for rate limiting
   */
  static generateKey(type: 'ip' | 'user' | 'combined', identifier: string, action?: string): string {
    const prefix = action ? `${action}:` : '';
    return `${prefix}${type}:${identifier}`;
  }

  /**
   * Check login rate limit
   */
  checkLoginLimit(email: string, ip: string): {
    emailAllowed: RateLimitResult;
    ipAllowed: RateLimitResult;
    allowed: boolean;
  } {
    const emailKey = AuthRateLimiters.generateKey('user', email, 'login');
    const ipKey = AuthRateLimiters.generateKey('ip', ip, 'login');

    const emailAllowed = this.login.isAllowed(emailKey);
    const ipAllowed = this.login.isAllowed(ipKey);

    return {
      emailAllowed,
      ipAllowed,
      allowed: emailAllowed.allowed && ipAllowed.allowed,
    };
  }

  /**
   * Record login attempt
   */
  recordLoginAttempt(email: string, ip: string, success: boolean, userAgent?: string): void {
    const emailKey = AuthRateLimiters.generateKey('user', email, 'login');
    const ipKey = AuthRateLimiters.generateKey('ip', ip, 'login');

    const context = { ip, userAgent };
    
    this.login.recordAttempt(emailKey, success, context);
    this.login.recordAttempt(ipKey, success, context);
  }

  /**
   * Check registration rate limit
   */
  checkRegistrationLimit(ip: string): RateLimitResult {
    const ipKey = AuthRateLimiters.generateKey('ip', ip, 'registration');
    return this.registration.isAllowed(ipKey);
  }

  /**
   * Record registration attempt
   */
  recordRegistrationAttempt(ip: string, success: boolean, userAgent?: string): void {
    const ipKey = AuthRateLimiters.generateKey('ip', ip, 'registration');
    this.registration.recordAttempt(ipKey, success, { ip, userAgent });
  }

  /**
   * Check password reset rate limit
   */
  checkPasswordResetLimit(email: string, ip: string): {
    emailAllowed: RateLimitResult;
    ipAllowed: RateLimitResult;
    allowed: boolean;
  } {
    const emailKey = AuthRateLimiters.generateKey('user', email, 'password_reset');
    const ipKey = AuthRateLimiters.generateKey('ip', ip, 'password_reset');

    const emailAllowed = this.passwordReset.isAllowed(emailKey);
    const ipAllowed = this.passwordReset.isAllowed(ipKey);

    return {
      emailAllowed,
      ipAllowed,
      allowed: emailAllowed.allowed && ipAllowed.allowed,
    };
  }

  /**
   * Record password reset attempt
   */
  recordPasswordResetAttempt(email: string, ip: string, success: boolean, userAgent?: string): void {
    const emailKey = AuthRateLimiters.generateKey('user', email, 'password_reset');
    const ipKey = AuthRateLimiters.generateKey('ip', ip, 'password_reset');

    const context = { ip, userAgent };
    
    this.passwordReset.recordAttempt(emailKey, success, context);
    this.passwordReset.recordAttempt(ipKey, success, context);
  }

  /**
   * Get comprehensive rate limit status
   */
  getRateLimitStatus(email?: string, ip?: string): {
    login?: { email?: RateLimitResult; ip?: RateLimitResult };
    registration?: RateLimitResult;
    passwordReset?: { email?: RateLimitResult; ip?: RateLimitResult };
    tokenRefresh?: { email?: RateLimitResult; ip?: RateLimitResult };
  } {
    const status: any = {};

    if (email && ip) {
      // Login status
      const loginStatus = this.checkLoginLimit(email, ip);
      status.login = loginStatus;

      // Password reset status
      const passwordResetStatus = this.checkPasswordResetLimit(email, ip);
      status.passwordReset = passwordResetStatus;

      // Token refresh status
      const emailKey = AuthRateLimiters.generateKey('user', email, 'token_refresh');
      const ipKey = AuthRateLimiters.generateKey('ip', ip, 'token_refresh');
      status.tokenRefresh = {
        email: this.tokenRefresh.isAllowed(emailKey),
        ip: this.tokenRefresh.isAllowed(ipKey),
      };
    }

    if (ip) {
      // Registration status
      status.registration = this.checkRegistrationLimit(ip);
    }

    return status;
  }

  /**
   * Reset all rate limits for user
   */
  resetUserLimits(email: string): void {
    const actions = ['login', 'password_reset', 'token_refresh'];
    
    for (const action of actions) {
      const emailKey = AuthRateLimiters.generateKey('user', email, action);
      this.login.reset(emailKey);
      this.passwordReset.reset(emailKey);
      this.tokenRefresh.reset(emailKey);
    }
  }

  /**
   * Reset all rate limits for IP
   */
  resetIPLimits(ip: string): void {
    const actions = ['login', 'registration', 'password_reset', 'token_refresh'];
    
    for (const action of actions) {
      const ipKey = AuthRateLimiters.generateKey('ip', ip, action);
      this.login.reset(ipKey);
      this.registration.reset(ipKey);
      this.passwordReset.reset(ipKey);
      this.tokenRefresh.reset(ipKey);
    }
  }

  /**
   * Get overall statistics
   */
  getOverallStats(): {
    login: ReturnType<RateLimiter['getStats']>;
    registration: ReturnType<RateLimiter['getStats']>;
    passwordReset: ReturnType<RateLimiter['getStats']>;
    tokenRefresh: ReturnType<RateLimiter['getStats']>;
  } {
    return {
      login: this.login.getStats(),
      registration: this.registration.getStats(),
      passwordReset: this.passwordReset.getStats(),
      tokenRefresh: this.tokenRefresh.getStats(),
    };
  }
}

// Export singleton instance
export const authRateLimiters = AuthRateLimiters.getInstance();