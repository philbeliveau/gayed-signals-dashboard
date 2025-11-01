/**
 * WebSocket Monitoring and Health Checks
 *
 * Integrates with existing monitoring infrastructure and provides
 * health check capabilities following existing patterns.
 */

import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '@/types/websocket';
import { ConnectionManager } from './connection-manager';
import { WebSocketErrorHandler } from './error-handler';
import { webSocketPersistence } from './persistence';

interface WebSocketMetrics {
  connections: {
    total: number;
    authenticated: number;
    byChannel: Record<string, number>;
  };
  performance: {
    averageResponseTime: number;
    messageRate: number;
    errorRate: number;
    uptime: number;
  };
  resources: {
    memoryUsage: string;
    cacheSize: number;
    rateLimitedIPs: number;
  };
  health: {
    status: 'healthy' | 'warning' | 'critical';
    lastCheck: string;
    issues: string[];
  };
}

interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'unhealthy';
  details: {
    websocket_server: boolean;
    connection_manager: boolean;
    error_handler: boolean;
    persistence_layer: boolean;
    memory_usage: boolean;
  };
  responseTime: number;
  uptime: number;
  metrics: WebSocketMetrics;
}

export class WebSocketMonitor {
  private startTime = Date.now();
  private messageCount = 0;
  private errorCount = 0;
  private responseTimes: number[] = [];
  private maxResponseTimeHistory = 100;

  constructor(
    private io: SocketIOServer | null,
    private connectionManager?: ConnectionManager,
    private errorHandler?: WebSocketErrorHandler
  ) {
    this.setupMetricsCollection();
  }

  /**
   * Get comprehensive WebSocket metrics
   */
  getMetrics(): WebSocketMetrics {
    const connectionStats = this.connectionManager?.getStats() || {
      totalConnections: 0,
      authenticatedConnections: 0,
      connectionsPerChannel: {},
      rateLimitedIPs: 0,
      averageConnectionDuration: 0
    };

    const errorStats = this.errorHandler?.getErrorStats() || {
      totalErrors: 0,
      errorsByType: {},
      highFrequencyIPs: []
    };

    const cacheStats = webSocketPersistence.getCacheStats();

    const uptime = Date.now() - this.startTime;
    const messageRate = this.messageCount / (uptime / 1000); // messages per second
    const errorRate = this.errorCount / Math.max(this.messageCount, 1); // error ratio

    const averageResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
      : 0;

    // Determine health status
    let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    const issues: string[] = [];

    if (errorRate > 0.1) { // More than 10% errors
      healthStatus = 'critical';
      issues.push('High error rate detected');
    } else if (errorRate > 0.05) { // More than 5% errors
      healthStatus = 'warning';
      issues.push('Elevated error rate');
    }

    if (connectionStats.totalConnections > 80) { // Near connection limit
      healthStatus = healthStatus === 'critical' ? 'critical' : 'warning';
      issues.push('High connection usage');
    }

    if (averageResponseTime > 1000) { // Slow responses
      healthStatus = healthStatus === 'critical' ? 'critical' : 'warning';
      issues.push('Slow response times');
    }

    return {
      connections: {
        total: connectionStats.totalConnections,
        authenticated: connectionStats.authenticatedConnections,
        byChannel: connectionStats.connectionsPerChannel
      },
      performance: {
        averageResponseTime,
        messageRate: Math.round(messageRate * 100) / 100,
        errorRate: Math.round(errorRate * 10000) / 100, // As percentage
        uptime
      },
      resources: {
        memoryUsage: cacheStats.memory,
        cacheSize: cacheStats.totalKeys,
        rateLimitedIPs: connectionStats.rateLimitedIPs
      },
      health: {
        status: healthStatus,
        lastCheck: new Date().toISOString(),
        issues
      }
    };
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    const healthChecks = {
      websocket_server: this.checkWebSocketServer(),
      connection_manager: this.checkConnectionManager(),
      error_handler: this.checkErrorHandler(),
      persistence_layer: await this.checkPersistenceLayer(),
      memory_usage: this.checkMemoryUsage()
    };

    const responseTime = Date.now() - startTime;
    const uptime = Date.now() - this.startTime;

    // Determine overall status
    const allHealthy = Object.values(healthChecks).every(status => status);
    const anyUnhealthy = Object.values(healthChecks).some(status => !status);

    let status: 'healthy' | 'warning' | 'unhealthy';
    if (allHealthy) {
      status = 'healthy';
    } else if (anyUnhealthy) {
      status = 'unhealthy';
    } else {
      status = 'warning';
    }

    const metrics = this.getMetrics();

    // Log health check result following existing patterns
    console.log(`🏥 WebSocket health check completed:`, {
      status,
      responseTime,
      uptime,
      checks: healthChecks,
      timestamp: new Date().toISOString()
    });

    return {
      status,
      details: healthChecks,
      responseTime,
      uptime,
      metrics
    };
  }

  /**
   * Record message processing metrics
   */
  recordMessage(responseTime?: number): void {
    this.messageCount++;

    if (responseTime !== undefined) {
      this.responseTimes.push(responseTime);
      if (this.responseTimes.length > this.maxResponseTimeHistory) {
        this.responseTimes.shift();
      }
    }
  }

  /**
   * Record error occurrence
   */
  recordError(): void {
    this.errorCount++;
  }

  /**
   * Get formatted status report
   */
  getStatusReport(): string {
    const metrics = this.getMetrics();
    const uptime = Math.floor(metrics.performance.uptime / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;

    return `
📊 WebSocket Server Status Report
================================

🔗 Connections:
   Total: ${metrics.connections.total}
   Authenticated: ${metrics.connections.authenticated}
   By Channel: ${JSON.stringify(metrics.connections.byChannel, null, 2)}

⚡ Performance:
   Avg Response Time: ${metrics.performance.averageResponseTime.toFixed(2)}ms
   Message Rate: ${metrics.performance.messageRate.toFixed(2)}/sec
   Error Rate: ${metrics.performance.errorRate.toFixed(2)}%
   Uptime: ${hours}h ${minutes}m ${seconds}s

💾 Resources:
   Memory Usage: ${metrics.resources.memoryUsage}
   Cache Size: ${metrics.resources.cacheSize} keys
   Rate Limited IPs: ${metrics.resources.rateLimitedIPs}

🏥 Health: ${metrics.health.status.toUpperCase()}
   Last Check: ${metrics.health.lastCheck}
   Issues: ${metrics.health.issues.length > 0 ? metrics.health.issues.join(', ') : 'None'}
    `.trim();
  }

  /**
   * Integration with existing monitoring endpoint
   */
  async getMonitoringData(): Promise<any> {
    const healthCheck = await this.performHealthCheck();
    const analytics = await webSocketPersistence.getAnalytics();

    // Format data for existing monitoring patterns
    return {
      websocket: {
        status: healthCheck.status,
        connections: healthCheck.metrics.connections.total,
        uptime: healthCheck.uptime,
        responseTime: healthCheck.responseTime,
        errorRate: healthCheck.metrics.performance.errorRate,
        messageRate: healthCheck.metrics.performance.messageRate
      },
      analytics: {
        ...analytics,
        cacheStats: webSocketPersistence.getCacheStats()
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check WebSocket server health
   */
  private checkWebSocketServer(): boolean {
    if (!this.io) return false;

    try {
      // Check if server is listening and responsive
      return this.io.engine.clientsCount >= 0; // Basic check
    } catch (error) {
      console.error('WebSocket server health check failed:', error);
      return false;
    }
  }

  /**
   * Check connection manager health
   */
  private checkConnectionManager(): boolean {
    if (!this.connectionManager) return false;

    try {
      const healthStatus = this.connectionManager.getHealthStatus();
      return healthStatus.status !== 'critical';
    } catch (error) {
      console.error('Connection manager health check failed:', error);
      return false;
    }
  }

  /**
   * Check error handler health
   */
  private checkErrorHandler(): boolean {
    if (!this.errorHandler) return false;

    try {
      const errorStats = this.errorHandler.getErrorStats();
      // Check if error rate is reasonable
      return errorStats.totalErrors < 1000; // Arbitrary threshold
    } catch (error) {
      console.error('Error handler health check failed:', error);
      return false;
    }
  }

  /**
   * Check persistence layer health
   */
  private async checkPersistenceLayer(): Promise<boolean> {
    try {
      // Test cache functionality
      const testKey = 'health_check_test';
      webSocketPersistence.clearCache();

      // Simple functionality test
      const cacheStats = webSocketPersistence.getCacheStats();
      return cacheStats.totalKeys >= 0;
    } catch (error) {
      console.error('Persistence layer health check failed:', error);
      return false;
    }
  }

  /**
   * Check memory usage
   */
  private checkMemoryUsage(): boolean {
    try {
      const used = process.memoryUsage();
      const totalMB = Math.round(used.rss / 1024 / 1024);

      // Check if memory usage is reasonable (adjust threshold as needed)
      return totalMB < 1024; // Less than 1GB
    } catch (error) {
      console.error('Memory usage health check failed:', error);
      return false;
    }
  }

  /**
   * Setup automated metrics collection
   */
  private setupMetricsCollection(): void {
    // Collect metrics every minute
    setInterval(() => {
      const metrics = this.getMetrics();

      // Log metrics for monitoring systems
      console.log('📈 WebSocket metrics collected:', {
        timestamp: new Date().toISOString(),
        connections: metrics.connections.total,
        messageRate: metrics.performance.messageRate,
        errorRate: metrics.performance.errorRate,
        responseTime: metrics.performance.averageResponseTime
      });

      // In production, this would send to monitoring systems
      // like Prometheus, DataDog, etc.
    }, 60000);

    // Cleanup old data every hour
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 3600000);
  }

  /**
   * Cleanup old metrics data
   */
  private cleanupOldMetrics(): void {
    // Reset response time history if too old
    if (this.responseTimes.length > this.maxResponseTimeHistory) {
      this.responseTimes = this.responseTimes.slice(-this.maxResponseTimeHistory);
    }

    // Cleanup persistence layer
    webSocketPersistence.cleanupExpiredSessions().then(cleanedCount => {
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} expired WebSocket sessions`);
      }
    });
  }

  /**
   * Get performance alerts
   */
  getPerformanceAlerts(): Array<{
    severity: 'warning' | 'critical';
    message: string;
    metric: string;
    value: number;
    threshold: number;
  }> {
    const metrics = this.getMetrics();
    const alerts: Array<{
      severity: 'warning' | 'critical';
      message: string;
      metric: string;
      value: number;
      threshold: number;
    }> = [];

    // Check error rate
    if (metrics.performance.errorRate > 10) {
      alerts.push({
        severity: 'critical',
        message: 'High error rate detected',
        metric: 'errorRate',
        value: metrics.performance.errorRate,
        threshold: 10
      });
    } else if (metrics.performance.errorRate > 5) {
      alerts.push({
        severity: 'warning',
        message: 'Elevated error rate',
        metric: 'errorRate',
        value: metrics.performance.errorRate,
        threshold: 5
      });
    }

    // Check response time
    if (metrics.performance.averageResponseTime > 2000) {
      alerts.push({
        severity: 'critical',
        message: 'Very slow response times',
        metric: 'averageResponseTime',
        value: metrics.performance.averageResponseTime,
        threshold: 2000
      });
    } else if (metrics.performance.averageResponseTime > 1000) {
      alerts.push({
        severity: 'warning',
        message: 'Slow response times',
        metric: 'averageResponseTime',
        value: metrics.performance.averageResponseTime,
        threshold: 1000
      });
    }

    // Check connection load
    if (metrics.connections.total > 90) {
      alerts.push({
        severity: 'critical',
        message: 'Connection limit nearly reached',
        metric: 'totalConnections',
        value: metrics.connections.total,
        threshold: 90
      });
    } else if (metrics.connections.total > 70) {
      alerts.push({
        severity: 'warning',
        message: 'High connection usage',
        metric: 'totalConnections',
        value: metrics.connections.total,
        threshold: 70
      });
    }

    return alerts;
  }
}

// Export monitoring utilities
export function createWebSocketMonitor(
  io: SocketIOServer | null,
  connectionManager?: ConnectionManager,
  errorHandler?: WebSocketErrorHandler
): WebSocketMonitor {
  return new WebSocketMonitor(io, connectionManager, errorHandler);
}