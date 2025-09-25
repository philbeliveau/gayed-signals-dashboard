/**
 * Production-grade logging utility for Enhanced Market Client
 * Provides structured logging with different levels and contexts
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogContext {
  symbol?: string;
  dataSource?: string;
  operation?: string;
  duration?: number;
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Production Logger for Enhanced Market Client
 */
export class ProductionLogger {
  private static instance: ProductionLogger;
  private logLevel: LogLevel;
  private enableConsoleOutput: boolean;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize: number = 1000;

  private constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
    this.enableConsoleOutput = process.env.NODE_ENV !== 'production' || process.env.ENABLE_CONSOLE_LOGS === 'true';
  }

  public static getInstance(): ProductionLogger {
    if (!ProductionLogger.instance) {
      ProductionLogger.instance = new ProductionLogger();
    }
    return ProductionLogger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      critical: 4,
    };

    return levels[level] >= levels[this.logLevel];
  }

  private createLogEntry(level: LogLevel, message: string, context?: LogContext, error?: Error): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return entry;
  }

  private writeLog(entry: LogEntry): void {
    // Add to buffer
    this.logBuffer.push(entry);
    
    // Trim buffer if too large
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer = this.logBuffer.slice(-this.maxBufferSize);
    }

    // Console output for development/debugging
    if (this.enableConsoleOutput) {
      const contextStr = entry.context ? ` [${JSON.stringify(entry.context)}]` : '';
      const errorStr = entry.error ? ` Error: ${entry.error.message}` : '';
      
      switch (entry.level) {
        case 'debug':
          console.debug(`🐛 ${entry.message}${contextStr}${errorStr}`);
          break;
        case 'info':
          console.info(`ℹ️ ${entry.message}${contextStr}${errorStr}`);
          break;
        case 'warn':
          console.warn(`⚠️ ${entry.message}${contextStr}${errorStr}`);
          break;
        case 'error':
          console.error(`❌ ${entry.message}${contextStr}${errorStr}`);
          if (entry.error?.stack) {
            console.error(entry.error.stack);
          }
          break;
        case 'critical':
          console.error(`🚨 CRITICAL: ${entry.message}${contextStr}${errorStr}`);
          if (entry.error?.stack) {
            console.error(entry.error.stack);
          }
          break;
      }
    }

    // In production, you might want to send to external logging service
    // This is where you'd integrate with services like DataDog, NewRelic, etc.
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalLoggingService(entry);
    }
  }

  private sendToExternalLoggingService(entry: LogEntry): void {
    // Placeholder for external logging integration
    // Example integrations:
    // - DataDog: https://docs.datadoghq.com/logs/log_collection/javascript/
    // - New Relic: https://docs.newrelic.com/docs/logs/logs-context/configure-logs-context-nodejs/
    // - Sentry: https://docs.sentry.io/platforms/javascript/guides/nextjs/
    
    if (process.env.DATADOG_API_KEY || process.env.NEW_RELIC_LICENSE_KEY || process.env.SENTRY_DSN) {
      // TODO: Implement external logging service integration
      console.debug('External logging service integration not implemented yet:', entry);
    }
  }

  public debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      this.writeLog(this.createLogEntry('debug', message, context));
    }
  }

  public info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      this.writeLog(this.createLogEntry('info', message, context));
    }
  }

  public warn(message: string, context?: LogContext, error?: Error): void {
    if (this.shouldLog('warn')) {
      this.writeLog(this.createLogEntry('warn', message, context, error));
    }
  }

  public error(message: string, context?: LogContext, error?: Error): void {
    if (this.shouldLog('error')) {
      this.writeLog(this.createLogEntry('error', message, context, error));
    }
  }

  public critical(message: string, context?: LogContext, error?: Error): void {
    if (this.shouldLog('critical')) {
      this.writeLog(this.createLogEntry('critical', message, context, error));
    }
  }

  /**
   * Log market data fetch operation
   */
  public logDataFetch(
    symbol: string,
    dataSource: string,
    success: boolean,
    duration: number,
    dataPoints?: number,
    error?: Error
  ): void {
    const context: LogContext = {
      symbol,
      dataSource,
      operation: 'data_fetch',
      duration,
      dataPoints,
    };

    if (success) {
      this.info(`Data fetch successful for ${symbol}`, context);
    } else {
      this.error(`Data fetch failed for ${symbol}`, context, error);
    }
  }

  /**
   * Log rate limiting events
   */
  public logRateLimit(dataSource: string, symbol: string, retryAfter?: number): void {
    const context: LogContext = {
      symbol,
      dataSource,
      operation: 'rate_limit',
      retryAfter,
    };

    this.warn(`Rate limit hit for ${dataSource}`, context);
  }

  /**
   * Log failover events
   */
  public logFailover(symbol: string, fromSource: string, toSource: string, reason: string): void {
    const context: LogContext = {
      symbol,
      operation: 'failover',
      fromSource,
      toSource,
      reason,
    };

    this.warn(`Failover from ${fromSource} to ${toSource} for ${symbol}`, context);
  }

  /**
   * Log cache operations
   */
  public logCacheOperation(operation: 'hit' | 'miss' | 'set' | 'clear', symbol?: string, source?: string): void {
    const context: LogContext = {
      symbol,
      dataSource: source,
      operation: `cache_${operation}`,
    };

    this.debug(`Cache ${operation}${symbol ? ` for ${symbol}` : ''}`, context);
  }

  /**
   * Log data validation results
   */
  public logDataValidation(symbol: string, isValid: boolean, warnings: string[] = []): void {
    const context: LogContext = {
      symbol,
      operation: 'data_validation',
      isValid,
      warningCount: warnings.length,
    };

    if (isValid) {
      this.info(`Data validation passed for ${symbol}`, context);
    } else {
      this.warn(`Data validation failed for ${symbol}: ${warnings.join(', ')}`, context);
    }
  }

  /**
   * Get recent log entries (for debugging/monitoring)
   */
  public getRecentLogs(count: number = 100): LogEntry[] {
    return this.logBuffer.slice(-count);
  }

  /**
   * Get log statistics
   */
  public getLogStats(): { total: number; byLevel: Record<LogLevel, number> } {
    const stats = {
      total: this.logBuffer.length,
      byLevel: {
        debug: 0,
        info: 0,
        warn: 0,
        error: 0,
        critical: 0,
      } as Record<LogLevel, number>,
    };

    for (const entry of this.logBuffer) {
      stats.byLevel[entry.level]++;
    }

    return stats;
  }

  /**
   * Clear log buffer (useful for testing)
   */
  public clearLogs(): void {
    this.logBuffer = [];
  }

  /**
   * Export logs to JSON format
   */
  public exportLogs(): string {
    return JSON.stringify(this.logBuffer, null, 2);
  }
}

// Export singleton instance
export const logger = ProductionLogger.getInstance();

// Convenience functions for common logging patterns
export const logMarketDataFetch = (
  symbol: string,
  dataSource: string,
  success: boolean,
  duration: number,
  dataPoints?: number,
  error?: Error
) => logger.logDataFetch(symbol, dataSource, success, duration, dataPoints, error);

export const logRateLimit = (dataSource: string, symbol: string, retryAfter?: number) =>
  logger.logRateLimit(dataSource, symbol, retryAfter);

export const logFailover = (symbol: string, fromSource: string, toSource: string, reason: string) =>
  logger.logFailover(symbol, fromSource, toSource, reason);

export const logCacheOperation = (operation: 'hit' | 'miss' | 'set' | 'clear', symbol?: string, source?: string) =>
  logger.logCacheOperation(operation, symbol, source);

export const logDataValidation = (symbol: string, isValid: boolean, warnings: string[] = []) =>
  logger.logDataValidation(symbol, isValid, warnings);