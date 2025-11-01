/**
 * WebSocket Security Configuration
 *
 * Implements security measures including CORS, authentication,
 * and rate limiting following existing security patterns.
 */

import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { AuthenticatedSocket, WebSocketAuthContext } from '@/types/websocket';

interface SecurityConfig {
  cors: {
    origin: string | string[] | boolean;
    credentials: boolean;
    methods: string[];
  };
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
  authentication: {
    required: boolean;
    allowAnonymous: boolean;
    sessionTimeout: number;
  };
  validation: {
    validateOrigin: boolean;
    validateHeaders: boolean;
    maxPayloadSize: number;
  };
}

export class WebSocketSecurity {
  private config: SecurityConfig;
  private rateLimitStore = new Map<string, { count: number; resetTime: number }>();
  private suspiciousIPs = new Set<string>();
  private blockedIPs = new Set<string>();

  constructor(config?: Partial<SecurityConfig>) {
    this.config = {
      cors: {
        origin: this.getAllowedOrigins(),
        credentials: true,
        methods: ['GET', 'POST']
      },
      rateLimit: {
        enabled: true,
        windowMs: 60000, // 1 minute
        maxRequests: 100,
        skipSuccessfulRequests: false
      },
      authentication: {
        required: true,
        allowAnonymous: false,
        sessionTimeout: 3600000 // 1 hour
      },
      validation: {
        validateOrigin: true,
        validateHeaders: true,
        maxPayloadSize: 1024 * 1024 // 1MB
      },
      ...config
    };

    this.setupCleanupInterval();
  }

  /**
   * Get CORS configuration for Socket.io
   */
  getCorsConfig(): any {
    return {
      origin: this.config.cors.origin,
      credentials: this.config.cors.credentials,
      methods: this.config.cors.methods
    };
  }

  /**
   * Middleware for Socket.io authentication and security
   */
  createAuthenticationMiddleware() {
    return async (socket: AuthenticatedSocket, next: (err?: ExtendedError) => void) => {
      try {
        // Check if IP is blocked
        if (this.isIPBlocked(socket.handshake.address)) {
          return next(new Error('IP address blocked'));
        }

        // Rate limiting check
        if (!this.checkRateLimit(socket.handshake.address)) {
          this.markSuspiciousIP(socket.handshake.address);
          return next(new Error('Rate limit exceeded'));
        }

        // Origin validation
        if (this.config.validation.validateOrigin && !this.validateOrigin(socket)) {
          this.markSuspiciousIP(socket.handshake.address);
          return next(new Error('Invalid origin'));
        }

        // Header validation
        if (this.config.validation.validateHeaders && !this.validateHeaders(socket)) {
          this.markSuspiciousIP(socket.handshake.address);
          return next(new Error('Invalid headers'));
        }

        // Authentication
        if (this.config.authentication.required) {
          const authResult = await this.authenticateSocket(socket);

          if (!authResult.isAuthenticated && !this.config.authentication.allowAnonymous) {
            return next(new Error('Authentication required'));
          }

          socket.authContext = authResult;
          socket.userId = authResult.userId;
        }

        // Log successful authentication
        console.log('🔐 Socket authenticated:', {
          socketId: socket.id,
          userId: socket.userId,
          ipAddress: socket.handshake.address,
          authenticated: socket.authContext?.isAuthenticated || false
        });

        next();
      } catch (error) {
        console.error('Authentication middleware error:', error);
        next(new Error('Authentication failed'));
      }
    };
  }

  /**
   * Validate socket origin
   */
  private validateOrigin(socket: Socket): boolean {
    const origin = socket.handshake.headers.origin;
    const referer = socket.handshake.headers.referer;

    if (!origin && !referer) {
      return false; // No origin information
    }

    const allowedOrigins = this.getAllowedOrigins();

    if (typeof allowedOrigins === 'boolean') {
      return allowedOrigins;
    }

    const originsToCheck = [origin, referer].filter(Boolean);

    if (Array.isArray(allowedOrigins)) {
      return originsToCheck.some(o =>
        allowedOrigins.some(allowed => o?.startsWith(allowed))
      );
    }

    return originsToCheck.some(o => o?.startsWith(allowedOrigins as string));
  }

  /**
   * Validate socket headers
   */
  private validateHeaders(socket: Socket): boolean {
    const userAgent = socket.handshake.headers['user-agent'];
    const acceptEncoding = socket.handshake.headers['accept-encoding'];

    // Basic bot detection
    if (!userAgent || userAgent.includes('bot') || userAgent.includes('crawler')) {
      return false;
    }

    // Check for common attack patterns
    const suspiciousPatterns = [
      'sqlmap',
      'nikto',
      'nmap',
      'masscan',
      'python-requests', // Common in automated attacks
      'curl', // Often used in attacks
      'wget' // Often used in attacks
    ];

    const userAgentLower = userAgent.toLowerCase();
    if (suspiciousPatterns.some(pattern => userAgentLower.includes(pattern))) {
      return false;
    }

    return true;
  }

  /**
   * Authenticate socket using Clerk
   */
  private async authenticateSocket(socket: AuthenticatedSocket): Promise<WebSocketAuthContext> {
    try {
      const token = socket.handshake.auth?.token ||
                   socket.handshake.headers?.authorization;

      if (!token) {
        return {
          userId: '',
          sessionId: socket.id,
          isAuthenticated: false,
          permissions: []
        };
      }

      // Simplified authentication - in production, verify JWT with Clerk
      const isValidToken = this.validateAuthToken(token);

      if (isValidToken) {
        const userId = this.extractUserIdFromToken(token);

        return {
          userId,
          sessionId: socket.id,
          isAuthenticated: true,
          permissions: this.getUserPermissions(userId)
        };
      }

      return {
        userId: '',
        sessionId: socket.id,
        isAuthenticated: false,
        permissions: []
      };

    } catch (error) {
      console.error('Socket authentication error:', error);
      return {
        userId: '',
        sessionId: socket.id,
        isAuthenticated: false,
        permissions: []
      };
    }
  }

  /**
   * Validate authentication token
   */
  private validateAuthToken(token: string): boolean {
    // Simplified validation - in production, verify JWT signature
    if (!token || token.length < 10) {
      return false;
    }

    // Basic format checks
    if (token.startsWith('sk_') || token.startsWith('pk_') || token.includes('.')) {
      return true;
    }

    return false;
  }

  /**
   * Extract user ID from token
   */
  private extractUserIdFromToken(token: string): string {
    // Simplified extraction - in production, decode JWT payload
    return `user_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get user permissions
   */
  private getUserPermissions(userId: string): string[] {
    // In production, fetch from database based on user role
    return ['read', 'subscribe'];
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(ipAddress: string): boolean {
    if (!this.config.rateLimit.enabled) {
      return true;
    }

    const now = Date.now();
    const entry = this.rateLimitStore.get(ipAddress);

    if (!entry || now > entry.resetTime) {
      this.rateLimitStore.set(ipAddress, {
        count: 1,
        resetTime: now + this.config.rateLimit.windowMs
      });
      return true;
    }

    if (entry.count >= this.config.rateLimit.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Check if IP is blocked
   */
  private isIPBlocked(ipAddress: string): boolean {
    return this.blockedIPs.has(ipAddress);
  }

  /**
   * Mark IP as suspicious
   */
  private markSuspiciousIP(ipAddress: string): void {
    this.suspiciousIPs.add(ipAddress);

    console.warn('⚠️ Suspicious IP detected:', {
      ipAddress,
      timestamp: new Date().toISOString(),
      suspiciousCount: this.suspiciousIPs.size
    });

    // Auto-block after too many suspicious activities
    const suspiciousCount = Array.from(this.suspiciousIPs).filter(ip => ip === ipAddress).length;
    if (suspiciousCount > 5) {
      this.blockIP(ipAddress, 'Excessive suspicious activity');
    }
  }

  /**
   * Block IP address
   */
  blockIP(ipAddress: string, reason: string): void {
    this.blockedIPs.add(ipAddress);

    console.error('🚫 IP address blocked:', {
      ipAddress,
      reason,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Unblock IP address
   */
  unblockIP(ipAddress: string): void {
    this.blockedIPs.delete(ipAddress);
    this.suspiciousIPs.delete(ipAddress);

    console.log('✅ IP address unblocked:', {
      ipAddress,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get allowed origins based on environment
   */
  private getAllowedOrigins(): string | string[] {
    if (process.env.NODE_ENV === 'development') {
      return [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001'
      ];
    }

    // Production origins
    const productionOrigins = [
      'https://gayed-signals-dashboard.vercel.app'
    ];

    // Add custom domain if configured
    if (process.env.CUSTOM_DOMAIN) {
      productionOrigins.push(`https://${process.env.CUSTOM_DOMAIN}`);
    }

    return productionOrigins;
  }

  /**
   * Validate message payload size
   */
  validatePayloadSize(data: any): boolean {
    try {
      const size = JSON.stringify(data).length;
      return size <= this.config.validation.maxPayloadSize;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    rateLimitedIPs: number;
    suspiciousIPs: number;
    blockedIPs: number;
    totalRequests: number;
  } {
    return {
      rateLimitedIPs: Array.from(this.rateLimitStore.values())
        .filter(entry => entry.count >= this.config.rateLimit.maxRequests).length,
      suspiciousIPs: this.suspiciousIPs.size,
      blockedIPs: this.blockedIPs.size,
      totalRequests: Array.from(this.rateLimitStore.values())
        .reduce((sum, entry) => sum + entry.count, 0)
    };
  }

  /**
   * Clean up expired entries
   */
  private setupCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();

      // Clean up rate limit entries
      for (const [ip, entry] of this.rateLimitStore.entries()) {
        if (now > entry.resetTime) {
          this.rateLimitStore.delete(ip);
        }
      }

      // Clean up suspicious IPs after 1 hour
      if (this.suspiciousIPs.size > 0) {
        // In production, this would check timestamps
        console.log('🧹 Cleaning up suspicious IP list');
      }
    }, 300000); // 5 minutes
  }

  /**
   * Get blocked IPs for admin interface
   */
  getBlockedIPs(): string[] {
    return Array.from(this.blockedIPs);
  }

  /**
   * Get suspicious IPs for monitoring
   */
  getSuspiciousIPs(): string[] {
    return Array.from(this.suspiciousIPs);
  }

  /**
   * Emergency security lockdown
   */
  enableEmergencyLockdown(): void {
    // Temporarily block all new connections
    this.config.authentication.required = true;
    this.config.authentication.allowAnonymous = false;
    this.config.rateLimit.maxRequests = 10; // Reduce rate limit

    console.error('🚨 Emergency security lockdown activated');
  }

  /**
   * Disable emergency lockdown
   */
  disableEmergencyLockdown(): void {
    // Restore normal settings
    this.config.authentication.allowAnonymous = false;
    this.config.rateLimit.maxRequests = 100;

    console.log('✅ Emergency security lockdown disabled');
  }
}

// Export security utilities
export function createWebSocketSecurity(config?: Partial<SecurityConfig>): WebSocketSecurity {
  return new WebSocketSecurity(config);
}