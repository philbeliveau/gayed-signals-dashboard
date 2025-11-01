/**
 * WebSocket Infrastructure Main Export
 *
 * Centralized WebSocket infrastructure that integrates all components
 * and provides a unified interface for the application.
 */

import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import {
  createWebSocketServer,
  getServerStatus,
  shutdownWebSocketServer
} from './server';
import { WebSocketClient, getWebSocketClient, useWebSocket } from './client';
import { ConnectionManager } from './connection-manager';
import { WebSocketErrorHandler } from './error-handler';
import { webSocketPersistence } from './persistence';
import { createWebSocketMonitor, WebSocketMonitor } from './monitoring';
import { createWebSocketSecurity, WebSocketSecurity } from './security';
import {
  WebSocketEvent,
  WebSocketServerConfig,
  SubscriptionRequest,
  SubscriptionResponse,
  ConnectionState,
  AuthenticatedSocket
} from '@/types/websocket';

// Global instances
let globalMonitor: WebSocketMonitor | null = null;
let globalSecurity: WebSocketSecurity | null = null;
let globalConnectionManager: ConnectionManager | null = null;
let globalErrorHandler: WebSocketErrorHandler | null = null;

/**
 * Initialize complete WebSocket infrastructure
 */
export async function initializeWebSocketInfrastructure(
  config?: Partial<WebSocketServerConfig>
): Promise<{
  server: any;
  monitor: WebSocketMonitor;
  security: WebSocketSecurity;
  connectionManager: ConnectionManager;
  errorHandler: WebSocketErrorHandler;
}> {
  try {
    console.log('🚀 Initializing WebSocket infrastructure...');

    // Create security manager
    globalSecurity = createWebSocketSecurity({
      cors: config?.cors,
      authentication: config?.auth
    });

    // Create connection manager
    globalConnectionManager = new ConnectionManager(
      null as any, // Will be set after server creation
      {
        maxConnections: 100,
        maxConnectionsPerUser: 5,
        maxConnectionsPerIP: 10,
        rateLimit: {
          maxEventsPerMinute: 60,
          maxConcurrentConnections: 100,
          rateLimitWindow: 60000
        },
        inactivityTimeout: 3600000 // 1 hour
      }
    );

    // Create error handler
    globalErrorHandler = new WebSocketErrorHandler();

    // Initialize WebSocket server
    const serverResult = await createWebSocketServer({
      ...config,
      cors: globalSecurity.getCorsConfig()
    });

    // Create monitoring
    globalMonitor = createWebSocketMonitor(
      null, // Will be updated when server is available
      globalConnectionManager,
      globalErrorHandler
    );

    console.log('✅ WebSocket infrastructure initialized successfully');

    return {
      server: serverResult,
      monitor: globalMonitor,
      security: globalSecurity,
      connectionManager: globalConnectionManager,
      errorHandler: globalErrorHandler
    };

  } catch (error) {
    console.error('❌ Failed to initialize WebSocket infrastructure:', error);
    throw error;
  }
}

/**
 * Get WebSocket infrastructure status
 */
export function getWebSocketInfrastructureStatus(): {
  server: { isRunning: boolean; connections: number };
  monitor: any;
  security: any;
  persistence: any;
} {
  const serverStatus = getServerStatus();
  const monitorData = globalMonitor?.getMetrics();
  const securityStats = globalSecurity?.getSecurityStats();
  const persistenceStats = webSocketPersistence.getCacheStats();

  return {
    server: serverStatus,
    monitor: monitorData || null,
    security: securityStats || null,
    persistence: persistenceStats
  };
}

/**
 * Perform comprehensive health check
 */
export async function performWebSocketHealthCheck(): Promise<{
  status: 'healthy' | 'warning' | 'unhealthy';
  components: Record<string, boolean>;
  details: any;
}> {
  try {
    const healthResult = await globalMonitor?.performHealthCheck();

    if (!healthResult) {
      return {
        status: 'unhealthy',
        components: {
          server: false,
          monitor: false,
          security: false,
          persistence: false
        },
        details: { error: 'Monitor not initialized' }
      };
    }

    return {
      status: healthResult.status,
      components: healthResult.details,
      details: {
        responseTime: healthResult.responseTime,
        uptime: healthResult.uptime,
        metrics: healthResult.metrics
      }
    };

  } catch (error) {
    console.error('Health check failed:', error);
    return {
      status: 'unhealthy',
      components: {
        server: false,
        monitor: false,
        security: false,
        persistence: false
      },
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

/**
 * Gracefully shutdown WebSocket infrastructure
 */
export async function shutdownWebSocketInfrastructure(): Promise<void> {
  try {
    console.log('🔄 Shutting down WebSocket infrastructure...');

    // Close server
    await shutdownWebSocketServer();

    // Close persistence layer
    await webSocketPersistence.close();

    // Reset global instances
    globalMonitor = null;
    globalSecurity = null;
    globalConnectionManager = null;
    globalErrorHandler = null;

    console.log('✅ WebSocket infrastructure shutdown complete');

  } catch (error) {
    console.error('❌ Error during WebSocket infrastructure shutdown:', error);
    throw error;
  }
}

/**
 * Create WebSocket event publisher
 */
export function createEventPublisher() {
  return {
    publishToChannel: async (channel: string, event: Omit<WebSocketEvent, 'eventId' | 'timestamp'>) => {
      try {
        const fullEvent: WebSocketEvent = {
          ...event,
          eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now()
        };

        // Store event for persistence
        await webSocketPersistence.storeEvent(fullEvent, 'system');

        // In production, this would publish to the actual Socket.io server
        console.log('📤 Event published:', {
          eventId: fullEvent.eventId,
          channel: fullEvent.channel,
          type: fullEvent.data.type
        });

        return fullEvent.eventId;

      } catch (error) {
        console.error('Failed to publish event:', error);
        throw error;
      }
    },

    publishSystemNotification: async (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
      return await this.publishToChannel('system', {
        channel: 'system',
        data: {
          type: 'notification',
          message,
          level
        }
      });
    }
  };
}

/**
 * Get WebSocket metrics for monitoring endpoints
 */
export async function getWebSocketMetricsForAPI(): Promise<any> {
  try {
    if (!globalMonitor) {
      return {
        error: 'WebSocket monitor not initialized',
        status: 'unavailable'
      };
    }

    return await globalMonitor.getMonitoringData();

  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'error'
    };
  }
}

/**
 * Admin functions for WebSocket management
 */
export const WebSocketAdmin = {
  getConnectionStats: () => globalConnectionManager?.getStats(),

  getErrorStats: () => globalErrorHandler?.getErrorStats(),

  getSecurityStats: () => globalSecurity?.getSecurityStats(),

  blockIP: (ipAddress: string, reason: string) => {
    globalSecurity?.blockIP(ipAddress, reason);
  },

  unblockIP: (ipAddress: string) => {
    globalSecurity?.unblockIP(ipAddress);
  },

  disconnectUser: (userId: string, reason: string) => {
    globalConnectionManager?.disconnectUser(userId, reason);
  },

  enableEmergencyLockdown: () => {
    globalSecurity?.enableEmergencyLockdown();
  },

  disableEmergencyLockdown: () => {
    globalSecurity?.disableEmergencyLockdown();
  },

  getStatusReport: () => globalMonitor?.getStatusReport(),

  getPerformanceAlerts: () => globalMonitor?.getPerformanceAlerts()
};

// Re-export all types and main classes for external use
export {
  // Core classes
  WebSocketClient,
  getWebSocketClient,
  useWebSocket,

  // Types
  WebSocketEvent,
  WebSocketServerConfig,
  SubscriptionRequest,
  SubscriptionResponse,
  ConnectionState,
  AuthenticatedSocket,

  // Server functions
  createWebSocketServer,
  getServerStatus,
  shutdownWebSocketServer,

  // Persistence
  webSocketPersistence
};

// Default export for convenience
export default {
  initialize: initializeWebSocketInfrastructure,
  shutdown: shutdownWebSocketInfrastructure,
  getStatus: getWebSocketInfrastructureStatus,
  healthCheck: performWebSocketHealthCheck,
  createEventPublisher,
  getMetrics: getWebSocketMetricsForAPI,
  admin: WebSocketAdmin
};