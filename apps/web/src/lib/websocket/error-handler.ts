/**
 * WebSocket Error Handler
 *
 * Integrates WebSocket error handling with existing risk management
 * and enhanced API error handling patterns.
 */

import { AuthenticatedSocket, WebSocketError, WebSocketEvent } from '@/types/websocket';

interface WebSocketErrorContext {
  socketId: string;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  event?: string;
  data?: any;
  timestamp: number;
}

export class WebSocketErrorHandler {
  private errorCounts = new Map<string, number>();
  private errorRateWindow = 60000; // 1 minute
  private maxErrorsPerWindow = 10;

  constructor() {
    this.setupErrorTracking();
  }

  /**
   * Handle WebSocket errors with existing error handling patterns
   */
  handleError(
    socket: AuthenticatedSocket,
    error: Error | WebSocketError,
    context: Partial<WebSocketErrorContext> = {}
  ): void {
    const errorContext: WebSocketErrorContext = {
      socketId: socket.id,
      userId: socket.userId,
      ipAddress: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'] as string || 'unknown',
      timestamp: Date.now(),
      ...context
    };

    // Create standardized WebSocket error
    const wsError = this.standardizeError(error);

    // Log error using existing patterns
    this.logError(wsError, errorContext);

    // Track error frequency
    this.trackErrorFrequency(errorContext);

    // Handle error response
    this.sendErrorResponse(socket, wsError, errorContext);

    // Check if socket should be disconnected
    if (this.shouldDisconnectSocket(errorContext)) {
      this.disconnectSocket(socket, wsError);
    }

    // Emit system alert if critical
    if (this.isCriticalError(wsError)) {
      this.emitSystemAlert(wsError, errorContext);
    }
  }

  /**
   * Handle connection errors
   */
  handleConnectionError(
    socket: AuthenticatedSocket,
    error: Error,
    phase: 'authentication' | 'rate-limit' | 'connection'
  ): void {
    const context: Partial<WebSocketErrorContext> = {
      event: `connection_${phase}`,
      data: { phase, message: error.message }
    };

    this.handleError(socket, error, context);
  }

  /**
   * Handle subscription errors
   */
  handleSubscriptionError(
    socket: AuthenticatedSocket,
    error: Error,
    channels: string[]
  ): void {
    const context: Partial<WebSocketErrorContext> = {
      event: 'subscription_error',
      data: { channels, message: error.message }
    };

    this.handleError(socket, error, context);
  }

  /**
   * Handle message processing errors
   */
  handleMessageError(
    socket: AuthenticatedSocket,
    error: Error,
    eventName: string,
    eventData: any
  ): void {
    const context: Partial<WebSocketErrorContext> = {
      event: eventName,
      data: eventData
    };

    this.handleError(socket, error, context);
  }

  /**
   * Standardize error format following existing patterns
   */
  private standardizeError(error: Error | WebSocketError): WebSocketError {
    if ('code' in error && 'retryable' in error) {
      return error as WebSocketError;
    }

    // Convert standard Error to WebSocketError
    const errorCode = this.categorizeError(error);

    return {
      code: errorCode,
      message: error.message,
      details: {
        name: error.name,
        stack: error.stack
      },
      retryable: this.isRetryableError(errorCode)
    };
  }

  /**
   * Categorize error types
   */
  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('authentication') || message.includes('unauthorized')) {
      return 'AUTH_ERROR';
    }
    if (message.includes('rate limit') || message.includes('too many')) {
      return 'RATE_LIMIT_ERROR';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'VALIDATION_ERROR';
    }
    if (message.includes('timeout') || message.includes('connection')) {
      return 'CONNECTION_ERROR';
    }
    if (message.includes('permission') || message.includes('forbidden')) {
      return 'PERMISSION_ERROR';
    }

    return 'INTERNAL_ERROR';
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(errorCode: string): boolean {
    const retryableCodes = [
      'CONNECTION_ERROR',
      'RATE_LIMIT_ERROR',
      'INTERNAL_ERROR'
    ];

    return retryableCodes.includes(errorCode);
  }

  /**
   * Log error using existing enhanced API patterns
   */
  private logError(error: WebSocketError, context: WebSocketErrorContext): void {
    const requestId = `ws_${context.socketId}_${Date.now()}`;

    // Follow existing logging format from enhanced-api-route.ts
    console.error(`❌ [${requestId}] WebSocket error:`, {
      code: error.code,
      message: error.message,
      socketId: context.socketId,
      userId: context.userId,
      ipAddress: context.ipAddress,
      event: context.event,
      timestamp: new Date(context.timestamp).toISOString(),
      retryable: error.retryable,
      details: error.details
    });

    // Additional structured logging for monitoring
    console.log(`🔍 [${requestId}] WebSocket error context:`, {
      userAgent: context.userAgent,
      dataPayload: context.data ? JSON.stringify(context.data).substring(0, 500) : 'none',
      errorCount: this.getErrorCount(context.ipAddress),
      sessionDuration: this.getSessionDuration(context.socketId)
    });
  }

  /**
   * Track error frequency for abuse detection
   */
  private trackErrorFrequency(context: WebSocketErrorContext): void {
    const key = `${context.ipAddress}_${context.userId || 'anonymous'}`;
    const current = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, current + 1);

    // Log high error frequency
    if (current > this.maxErrorsPerWindow / 2) {
      console.warn(`⚠️ High error frequency detected:`, {
        key,
        errorCount: current,
        threshold: this.maxErrorsPerWindow,
        timeWindow: this.errorRateWindow / 1000
      });
    }
  }

  /**
   * Send error response to client
   */
  private sendErrorResponse(
    socket: AuthenticatedSocket,
    error: WebSocketError,
    context: WebSocketErrorContext
  ): void {
    const errorEvent: WebSocketEvent = {
      eventId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      userId: context.userId,
      channel: 'system',
      data: {
        type: 'error',
        message: error.message,
        level: 'error'
      }
    };

    // Include retry information if error is retryable
    if (error.retryable) {
      errorEvent.data.metadata = {
        retryable: true,
        retryAfter: this.calculateRetryDelay(error.code),
        errorCode: error.code
      };
    }

    socket.emit('error', errorEvent);
  }

  /**
   * Check if socket should be disconnected
   */
  private shouldDisconnectSocket(context: WebSocketErrorContext): boolean {
    const key = `${context.ipAddress}_${context.userId || 'anonymous'}`;
    const errorCount = this.errorCounts.get(key) || 0;

    // Disconnect if too many errors in time window
    if (errorCount >= this.maxErrorsPerWindow) {
      return true;
    }

    // Disconnect for specific error types
    const disconnectCodes = ['AUTH_ERROR', 'PERMISSION_ERROR'];
    const event = context.event || '';

    return disconnectCodes.some(code => event.includes(code.toLowerCase()));
  }

  /**
   * Disconnect socket with error context
   */
  private disconnectSocket(
    socket: AuthenticatedSocket,
    error: WebSocketError
  ): void {
    console.log(`🔌 Disconnecting socket due to error:`, {
      socketId: socket.id,
      userId: socket.userId,
      errorCode: error.code,
      reason: error.message
    });

    socket.disconnect(true);
  }

  /**
   * Check if error is critical
   */
  private isCriticalError(error: WebSocketError): boolean {
    const criticalCodes = [
      'INTERNAL_ERROR',
      'SECURITY_VIOLATION',
      'SYSTEM_OVERLOAD'
    ];

    return criticalCodes.includes(error.code);
  }

  /**
   * Emit system alert for critical errors
   */
  private emitSystemAlert(error: WebSocketError, context: WebSocketErrorContext): void {
    // Follow existing alert pattern from enhanced-api-route.ts
    const alertId = `ws_alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.error(`🚨 [${alertId}] Critical WebSocket error alert:`, {
      level: 'CRITICAL',
      message: `WebSocket critical error: ${error.message}`,
      errorCode: error.code,
      socketId: context.socketId,
      userId: context.userId,
      ipAddress: context.ipAddress,
      timestamp: new Date(context.timestamp).toISOString(),
      metadata: {
        requestId: alertId,
        event: context.event,
        retryable: error.retryable,
        details: error.details
      }
    });

    // In production, this would integrate with existing alert systems
    // such as riskManager.emit('alert', ...)
  }

  /**
   * Get current error count for IP/user
   */
  private getErrorCount(ipAddress: string): number {
    return this.errorCounts.get(ipAddress) || 0;
  }

  /**
   * Calculate session duration (placeholder)
   */
  private getSessionDuration(socketId: string): number {
    // This would integrate with connection manager
    return 0;
  }

  /**
   * Calculate retry delay based on error type
   */
  private calculateRetryDelay(errorCode: string): number {
    const delays: Record<string, number> = {
      'RATE_LIMIT_ERROR': 60000, // 1 minute
      'CONNECTION_ERROR': 5000,  // 5 seconds
      'INTERNAL_ERROR': 30000    // 30 seconds
    };

    return delays[errorCode] || 10000; // Default 10 seconds
  }

  /**
   * Setup error tracking cleanup
   */
  private setupErrorTracking(): void {
    // Clean up error counts periodically
    setInterval(() => {
      this.errorCounts.clear();
    }, this.errorRateWindow);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    highFrequencyIPs: string[];
  } {
    const totalErrors = Array.from(this.errorCounts.values())
      .reduce((sum, count) => sum + count, 0);

    const highFrequencyIPs = Array.from(this.errorCounts.entries())
      .filter(([, count]) => count > this.maxErrorsPerWindow / 2)
      .map(([key]) => key.split('_')[0]);

    return {
      totalErrors,
      errorsByType: {}, // Would be populated from error tracking
      highFrequencyIPs
    };
  }

  /**
   * Clear error count for IP/user (admin function)
   */
  clearErrorCount(key: string): void {
    this.errorCounts.delete(key);
  }
}