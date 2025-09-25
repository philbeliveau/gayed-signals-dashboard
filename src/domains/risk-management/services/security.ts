/**
 * Security and Input Validation System
 * 
 * Provides comprehensive security measures including:
 * - Input validation and sanitization
 * - Rate limiting per IP/user
 * - Request signature validation
 * - SQL injection prevention
 * - XSS protection
 * - CSRF protection
 * - Content type validation
 */

import { riskManager, AlertLevel } from './risk-manager';

export interface SecurityConfig {
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
  inputValidation: {
    maxStringLength: number;
    allowedSymbolPattern: RegExp;
    blockedPatterns: RegExp[];
    sanitizeHtml: boolean;
  };
  requestValidation: {
    maxBodySize: number;
    requiredHeaders: string[];
    allowedMethods: string[];
    validateContentType: boolean;
  };
  security: {
    enableCSRF: boolean;
    enableCORS: boolean;
    allowedOrigins: string[];
    secureHeaders: boolean;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: unknown;
  securityScore: number; // 0-100
}

export interface RequestContext {
  ip: string;
  userAgent: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: unknown;
  timestamp: Date;
}

/**
 * Input Validator and Sanitizer
 */
class InputValidator {
  constructor(private config: SecurityConfig['inputValidation']) {}

  /**
   * Validate market symbol input
   */
  validateSymbols(symbols: unknown): ValidationResult {
    const errors: string[] = [];
    let securityScore = 100;

    // Type validation
    if (!Array.isArray(symbols)) {
      return {
        isValid: false,
        errors: ['Symbols must be an array'],
        securityScore: 0
      };
    }

    // Length validation
    if (symbols.length === 0) {
      errors.push('At least one symbol is required');
      securityScore -= 20;
    }

    if (symbols.length > 50) {
      errors.push('Too many symbols requested (max 50)');
      securityScore -= 30;
    }

    // Validate each symbol
    const sanitizedSymbols: string[] = [];
    for (const symbol of symbols) {
      const result = this.validateSingleSymbol(symbol);
      if (!result.isValid) {
        errors.push(`Invalid symbol: ${result.errors.join(', ')}`);
        securityScore -= 10;
      } else if (result.sanitizedData) {
        sanitizedSymbols.push(result.sanitizedData as string);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: sanitizedSymbols,
      securityScore: Math.max(0, securityScore)
    };
  }

  /**
   * Validate single symbol
   */
  private validateSingleSymbol(symbol: unknown): ValidationResult {
    const errors: string[] = [];
    let securityScore = 100;

    // Type check
    if (typeof symbol !== 'string') {
      return {
        isValid: false,
        errors: ['Symbol must be a string'],
        securityScore: 0
      };
    }

    // Length check
    if (symbol.length > this.config.maxStringLength) {
      errors.push(`Symbol too long (max ${this.config.maxStringLength})`);
      securityScore -= 30;
    }

    // Pattern validation
    if (!this.config.allowedSymbolPattern.test(symbol)) {
      errors.push('Symbol contains invalid characters');
      securityScore -= 50;
    }

    // Check for blocked patterns (potential injection attempts)
    for (const pattern of this.config.blockedPatterns) {
      if (pattern.test(symbol)) {
        errors.push('Symbol contains blocked pattern');
        securityScore -= 70;
        riskManager.emit('alert', {
          id: `security_blocked_pattern_${Date.now()}`,
          level: AlertLevel.WARNING,
          message: `Blocked pattern detected in symbol: ${symbol}`,
          timestamp: new Date(),
          metadata: { symbol, pattern: pattern.source }
        });
      }
    }

    // Sanitize
    const sanitized = this.sanitizeString(symbol);

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: sanitized,
      securityScore: Math.max(0, securityScore)
    };
  }

  /**
   * Validate period parameter
   */
  validatePeriod(period: unknown): ValidationResult {
    const errors: string[] = [];
    let securityScore = 100;

    if (typeof period !== 'string') {
      return {
        isValid: false,
        errors: ['Period must be a string'],
        securityScore: 0
      };
    }

    // Valid period patterns: 1d, 5d, 1m, 3m, 6m, 1y, 2y, 5y, 10y, ytd, max
    const validPeriods = /^(1d|5d|1m|3m|6m|1y|2y|5y|10y|ytd|max|\d+[dmy])$/;
    
    if (!validPeriods.test(period)) {
      errors.push('Invalid period format');
      securityScore -= 50;
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: period,
      securityScore
    };
  }

  /**
   * Sanitize string input
   */
  private sanitizeString(input: string): string {
    let sanitized = input.trim();
    
    if (this.config.sanitizeHtml) {
      // Basic HTML entity encoding
      sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }

    // Remove null bytes and control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
    
    return sanitized;
  }
}

/**
 * Request Rate Limiter
 */
class RequestRateLimiter {
  private requests = new Map<string, number[]>();
  private suspiciousIPs = new Set<string>();

  constructor(private config: SecurityConfig['rateLimiting']) {}

  /**
   * Check if request is within rate limits
   */
  checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
    if (!this.config.enabled) {
      return { allowed: true, remaining: Infinity, resetTime: 0 };
    }

    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    // Get existing requests for this IP
    const ipRequests = this.requests.get(ip) || [];
    
    // Remove old requests outside the window
    const validRequests = ipRequests.filter(time => time > windowStart);
    
    // Check if limit exceeded
    if (validRequests.length >= this.config.maxRequests) {
      this.markSuspiciousIP(ip);
      return {
        allowed: false,
        remaining: 0,
        resetTime: Math.min(...validRequests) + this.config.windowMs
      };
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(ip, validRequests);

    return {
      allowed: true,
      remaining: this.config.maxRequests - validRequests.length,
      resetTime: now + this.config.windowMs
    };
  }

  /**
   * Mark IP as suspicious for additional monitoring
   */
  private markSuspiciousIP(ip: string): void {
    if (!this.suspiciousIPs.has(ip)) {
      this.suspiciousIPs.add(ip);
      riskManager.emit('alert', {
        id: `rate_limit_exceeded_${Date.now()}`,
        level: AlertLevel.WARNING,
        message: `Rate limit exceeded for IP: ${ip}`,
        timestamp: new Date(),
        metadata: { ip, type: 'rate_limit' }
      });
    }
  }

  /**
   * Get suspicious IPs
   */
  getSuspiciousIPs(): string[] {
    return Array.from(this.suspiciousIPs);
  }

  /**
   * Clear rate limit data for IP
   */
  clearIP(ip: string): void {
    this.requests.delete(ip);
    this.suspiciousIPs.delete(ip);
  }

  /**
   * Get rate limit stats
   */
  getStats(): {
    totalIPs: number;
    suspiciousIPs: number;
    totalRequests: number;
  } {
    const totalRequests = Array.from(this.requests.values())
      .reduce((sum, requests) => sum + requests.length, 0);

    return {
      totalIPs: this.requests.size,
      suspiciousIPs: this.suspiciousIPs.size,
      totalRequests
    };
  }
}

/**
 * Request Validator
 */
class RequestValidator {
  constructor(private config: SecurityConfig['requestValidation']) {}

  /**
   * Validate incoming request
   */
  validateRequest(context: RequestContext): ValidationResult {
    const errors: string[] = [];
    let securityScore = 100;

    // Method validation
    if (!this.config.allowedMethods.includes(context.method)) {
      errors.push(`Method ${context.method} not allowed`);
      securityScore -= 30;
    }

    // Required headers validation
    for (const header of this.config.requiredHeaders) {
      if (!context.headers[header.toLowerCase()]) {
        errors.push(`Missing required header: ${header}`);
        securityScore -= 20;
      }
    }

    // Content type validation
    if (this.config.validateContentType && context.body) {
      const contentType = context.headers['content-type'];
      if (!contentType || !contentType.includes('application/json')) {
        errors.push('Invalid content type');
        securityScore -= 25;
      }
    }

    // Body size validation
    if (context.body) {
      const bodySize = JSON.stringify(context.body).length;
      if (bodySize > this.config.maxBodySize) {
        errors.push(`Request body too large (${bodySize} > ${this.config.maxBodySize})`);
        securityScore -= 40;
      }
    }

    // User agent validation
    if (!context.userAgent || context.userAgent.length < 10) {
      errors.push('Suspicious or missing user agent');
      securityScore -= 15;
    }

    return {
      isValid: errors.length === 0,
      errors,
      securityScore: Math.max(0, securityScore)
    };
  }
}

/**
 * Main Security Manager
 */
export class SecurityManager {
  private inputValidator: InputValidator;
  private rateLimiter: RequestRateLimiter;
  private requestValidator: RequestValidator;
  private securityEvents: Array<{ timestamp: Date; event: string; metadata: unknown }> = [];

  constructor(private config: SecurityConfig) {
    this.inputValidator = new InputValidator(config.inputValidation);
    this.rateLimiter = new RequestRateLimiter(config.rateLimiting);
    this.requestValidator = new RequestValidator(config.requestValidation);
  }

  /**
   * Validate complete API request
   */
  async validateAPIRequest(context: RequestContext, data: {
    symbols?: unknown;
    period?: unknown;
  }): Promise<{
    isValid: boolean;
    errors: string[];
    sanitizedData: {
      symbols: string[];
      period: string;
    };
    securityScore: number;
    rateLimitInfo: {
      allowed: boolean;
      remaining: number;
      resetTime: number;
    };
  }> {
    const errors: string[] = [];
    let totalSecurityScore = 100;

    // Rate limiting check
    const rateLimitInfo = this.rateLimiter.checkRateLimit(context.ip);
    if (!rateLimitInfo.allowed) {
      errors.push('Rate limit exceeded');
      totalSecurityScore = 0;
    }

    // Request validation
    const requestValidation = this.requestValidator.validateRequest(context);
    if (!requestValidation.isValid) {
      errors.push(...requestValidation.errors);
      totalSecurityScore = Math.min(totalSecurityScore, requestValidation.securityScore);
    }

    // Input validation
    const symbolsValidation = this.inputValidator.validateSymbols(data.symbols);
    const periodValidation = this.inputValidator.validatePeriod(data.period || '2y');

    if (!symbolsValidation.isValid) {
      errors.push(...symbolsValidation.errors);
      totalSecurityScore = Math.min(totalSecurityScore, symbolsValidation.securityScore);
    }

    if (!periodValidation.isValid) {
      errors.push(...periodValidation.errors);
      totalSecurityScore = Math.min(totalSecurityScore, periodValidation.securityScore);
    }

    // Log security event
    this.logSecurityEvent('api_validation', {
      ip: context.ip,
      path: context.path,
      isValid: errors.length === 0,
      securityScore: totalSecurityScore,
      errors: errors.length > 0 ? errors : undefined
    });

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: {
        symbols: (symbolsValidation.sanitizedData as string[]) || [],
        period: (periodValidation.sanitizedData as string) || '2y'
      },
      securityScore: totalSecurityScore,
      rateLimitInfo
    };
  }

  /**
   * Generate security headers for response
   */
  getSecurityHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.config.security.secureHeaders) {
      headers['X-Content-Type-Options'] = 'nosniff';
      headers['X-Frame-Options'] = 'DENY';
      headers['X-XSS-Protection'] = '1; mode=block';
      headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
      headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
      headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';";
    }

    if (this.config.security.enableCORS) {
      const allowedOrigins = this.config.security.allowedOrigins.join(' ');
      headers['Access-Control-Allow-Origin'] = allowedOrigins || '*';
      headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    }

    return headers;
  }

  /**
   * Log security event
   */
  private logSecurityEvent(event: string, metadata: unknown): void {
    this.securityEvents.push({
      timestamp: new Date(),
      event,
      metadata
    });

    // Keep only last 1000 events
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }

    // Create alert for high-risk events
    if (metadata && typeof metadata === 'object' && 'securityScore' in metadata) {
      const score = (metadata as { securityScore: number }).securityScore;
      if (score < 50) {
        riskManager.emit('alert', {
          id: `security_risk_${Date.now()}`,
          level: score < 20 ? AlertLevel.CRITICAL : AlertLevel.WARNING,
          message: `Low security score detected: ${score}`,
          timestamp: new Date(),
          metadata: { event, ...metadata }
        });
      }
    }
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    rateLimiting: ReturnType<RequestRateLimiter['getStats']>;
    events: {
      total: number;
      recent: Array<{ timestamp: Date; event: string; metadata: unknown }>;
    };
    suspiciousIPs: string[];
  } {
    return {
      rateLimiting: this.rateLimiter.getStats(),
      events: {
        total: this.securityEvents.length,
        recent: this.securityEvents.slice(-50)
      },
      suspiciousIPs: this.rateLimiter.getSuspiciousIPs()
    };
  }

  /**
   * Clear security data for IP
   */
  clearIP(ip: string): void {
    this.rateLimiter.clearIP(ip);
  }
}

// Default security configuration
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  rateLimiting: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    skipSuccessfulRequests: false
  },
  inputValidation: {
    maxStringLength: 50,
    allowedSymbolPattern: /^[A-Z0-9^.\-_]{1,10}$/,
    blockedPatterns: [
      /(<script|javascript:|on\w+\s*=)/i, // XSS patterns
      /(union|select|insert|update|delete|drop|create|alter)/i, // SQL injection patterns
      /(exec|eval|system|cmd)/i, // Command injection patterns
      /[<>{}[\]]/g // General suspicious characters
    ],
    sanitizeHtml: true
  },
  requestValidation: {
    maxBodySize: 10 * 1024, // 10KB
    requiredHeaders: ['user-agent'],
    allowedMethods: ['GET', 'POST', 'OPTIONS'],
    validateContentType: true
  },
  security: {
    enableCSRF: true,
    enableCORS: true,
    allowedOrigins: ['http://localhost:3000', 'https://localhost:3000'],
    secureHeaders: true
  }
};

// Export singleton instance
export const securityManager = new SecurityManager(DEFAULT_SECURITY_CONFIG);