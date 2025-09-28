/**
 * WebSocket Infrastructure Tests
 *
 * Comprehensive tests for WebSocket components following existing test patterns.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WebSocketClient } from '@/lib/websocket/client';
import { ConnectionManager } from '@/lib/websocket/connection-manager';
import { WebSocketErrorHandler } from '@/lib/websocket/error-handler';
import { webSocketPersistence } from '@/lib/websocket/persistence';
import { createWebSocketSecurity } from '@/lib/websocket/security';
import { getDeploymentConfig, validateDeploymentConfig } from '@/lib/websocket/deployment';
import { AuthenticatedSocket, WebSocketEvent } from '@/types/websocket';

// Mock Socket.io
jest.mock('socket.io-client');
jest.mock('socket.io');

describe('WebSocket Infrastructure', () => {
  beforeEach(() => {
    // Clear any global state
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup
    webSocketPersistence.clearCache();
  });

  describe('WebSocketClient', () => {
    let client: WebSocketClient;

    beforeEach(() => {
      client = new WebSocketClient('test-token');
    });

    it('should initialize with authentication token', () => {
      expect(client).toBeDefined();
      expect(client.isConnected()).toBe(false);
    });

    it('should handle connection state', () => {
      const state = client.getConnectionState();
      expect(state.isConnected).toBe(false);
      expect(state.connectionId).toBe('');
      expect(state.reconnectAttempts).toBe(0);
    });

    it('should manage event listeners', () => {
      const mockListener = jest.fn();

      client.addEventListener('test-event', mockListener);
      client.removeEventListener('test-event', mockListener);

      // No errors should occur
      expect(true).toBe(true);
    });
  });

  describe('ConnectionManager', () => {
    let connectionManager: ConnectionManager;
    let mockIO: any;

    beforeEach(() => {
      mockIO = {
        sockets: {
          sockets: new Map()
        }
      };

      connectionManager = new ConnectionManager(mockIO, {
        maxConnections: 10,
        maxConnectionsPerUser: 2,
        maxConnectionsPerIP: 3,
        rateLimit: {
          maxEventsPerMinute: 60,
          maxConcurrentConnections: 10,
          rateLimitWindow: 60000
        },
        inactivityTimeout: 300000
      });
    });

    it('should register connections within limits', () => {
      const mockSocket = createMockSocket('socket1', 'user1', '127.0.0.1');

      const result = connectionManager.registerConnection(mockSocket);
      expect(result).toBe(true);
    });

    it('should reject connections when limits exceeded', () => {
      // Register maximum connections
      for (let i = 0; i < 10; i++) {
        const mockSocket = createMockSocket(`socket${i}`, `user${i}`, '127.0.0.1');
        connectionManager.registerConnection(mockSocket);
      }

      // 11th connection should be rejected
      const mockSocket = createMockSocket('socket11', 'user11', '127.0.0.1');
      const result = connectionManager.registerConnection(mockSocket);
      expect(result).toBe(false);
    });

    it('should enforce per-user connection limits', () => {
      const mockSocket1 = createMockSocket('socket1', 'user1', '127.0.0.1');
      const mockSocket2 = createMockSocket('socket2', 'user1', '127.0.0.2');
      const mockSocket3 = createMockSocket('socket3', 'user1', '127.0.0.3');

      expect(connectionManager.registerConnection(mockSocket1)).toBe(true);
      expect(connectionManager.registerConnection(mockSocket2)).toBe(true);
      expect(connectionManager.registerConnection(mockSocket3)).toBe(false); // Exceeds per-user limit
    });

    it('should provide connection statistics', () => {
      const mockSocket = createMockSocket('socket1', 'user1', '127.0.0.1');
      connectionManager.registerConnection(mockSocket);

      const stats = connectionManager.getStats();
      expect(stats.totalConnections).toBe(1);
      expect(stats.authenticatedConnections).toBe(1);
    });

    it('should clean up unregistered connections', () => {
      const mockSocket = createMockSocket('socket1', 'user1', '127.0.0.1');
      connectionManager.registerConnection(mockSocket);
      connectionManager.unregisterConnection('socket1');

      const stats = connectionManager.getStats();
      expect(stats.totalConnections).toBe(0);
    });
  });

  describe('WebSocketErrorHandler', () => {
    let errorHandler: WebSocketErrorHandler;

    beforeEach(() => {
      errorHandler = new WebSocketErrorHandler();
    });

    it('should handle different error types', () => {
      const mockSocket = createMockSocket('socket1', 'user1', '127.0.0.1');
      const error = new Error('Test error');

      // Should not throw
      expect(() => {
        errorHandler.handleError(mockSocket, error);
      }).not.toThrow();
    });

    it('should track error statistics', () => {
      const mockSocket = createMockSocket('socket1', 'user1', '127.0.0.1');
      const error = new Error('Test error');

      errorHandler.handleError(mockSocket, error);

      const stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBeGreaterThan(0);
    });

    it('should handle connection errors', () => {
      const mockSocket = createMockSocket('socket1', 'user1', '127.0.0.1');
      const error = new Error('Connection failed');

      expect(() => {
        errorHandler.handleConnectionError(mockSocket, error, 'connection');
      }).not.toThrow();
    });
  });

  describe('WebSocketPersistence', () => {
    it('should store and retrieve session data', async () => {
      const mockSocket = createMockSocket('socket1', 'user1', '127.0.0.1');

      await webSocketPersistence.storeSession(mockSocket);
      const session = await webSocketPersistence.getSession('socket1');

      expect(session).toBeDefined();
      expect(session?.sessionId).toBe('socket1');
      expect(session?.userId).toBe('user1');
    });

    it('should update session activity', async () => {
      const mockSocket = createMockSocket('socket1', 'user1', '127.0.0.1');

      await webSocketPersistence.storeSession(mockSocket);
      await webSocketPersistence.updateSessionActivity('socket1', ['test-channel']);

      const session = await webSocketPersistence.getSession('socket1');
      expect(session?.subscriptions).toContain('test-channel');
    });

    it('should store and retrieve events', async () => {
      const testEvent: WebSocketEvent = {
        eventId: 'test-event-1',
        timestamp: Date.now(),
        userId: 'user1',
        channel: 'test-channel',
        data: {
          type: 'test',
          message: 'Test message',
          level: 'info'
        }
      };

      await webSocketPersistence.storeEvent(testEvent, 'socket1');
      const events = await webSocketPersistence.getRecentEvents('test-channel');

      expect(events).toHaveLength(1);
      expect(events[0].eventId).toBe('test-event-1');
    });

    it('should provide analytics data', async () => {
      const mockSocket = createMockSocket('socket1', 'user1', '127.0.0.1');
      await webSocketPersistence.storeSession(mockSocket);

      const analytics = await webSocketPersistence.getAnalytics();
      expect(analytics.activeSessions).toBe(1);
      expect(analytics.totalEvents).toBeGreaterThanOrEqual(0);
    });

    it('should cleanup expired sessions', async () => {
      const cleanedCount = await webSocketPersistence.cleanupExpiredSessions(0);
      expect(cleanedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('WebSocketSecurity', () => {
    let security: ReturnType<typeof createWebSocketSecurity>;

    beforeEach(() => {
      security = createWebSocketSecurity();
    });

    it('should provide CORS configuration', () => {
      const corsConfig = security.getCorsConfig();
      expect(corsConfig).toHaveProperty('origin');
      expect(corsConfig).toHaveProperty('credentials');
    });

    it('should create authentication middleware', () => {
      const middleware = security.createAuthenticationMiddleware();
      expect(typeof middleware).toBe('function');
    });

    it('should validate payload size', () => {
      const smallPayload = { message: 'test' };
      const largePayload = { message: 'x'.repeat(2000000) }; // 2MB

      expect(security.validatePayloadSize(smallPayload)).toBe(true);
      expect(security.validatePayloadSize(largePayload)).toBe(false);
    });

    it('should provide security statistics', () => {
      const stats = security.getSecurityStats();
      expect(stats).toHaveProperty('rateLimitedIPs');
      expect(stats).toHaveProperty('suspiciousIPs');
      expect(stats).toHaveProperty('blockedIPs');
    });

    it('should block and unblock IPs', () => {
      const testIP = '192.168.1.100';

      security.blockIP(testIP, 'Test block');
      expect(security.getBlockedIPs()).toContain(testIP);

      security.unblockIP(testIP);
      expect(security.getBlockedIPs()).not.toContain(testIP);
    });
  });

  describe('Deployment Configuration', () => {
    beforeEach(() => {
      // Set test environment
      process.env.NODE_ENV = 'test';
    });

    it('should get deployment configuration', () => {
      const config = getDeploymentConfig();
      expect(config.environment).toBe('test');
      expect(config.websocketConfig).toBeDefined();
    });

    it('should validate deployment configuration', () => {
      const validation = validateDeploymentConfig();
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('errors');
      expect(validation).toHaveProperty('warnings');
    });

    it('should handle different environments', () => {
      process.env.NODE_ENV = 'development';
      const devConfig = getDeploymentConfig();
      expect(devConfig.environment).toBe('development');

      process.env.NODE_ENV = 'production';
      const prodConfig = getDeploymentConfig();
      expect(prodConfig.environment).toBe('production');
    });
  });
});

// Helper function to create mock socket
function createMockSocket(id: string, userId: string, ipAddress: string): AuthenticatedSocket {
  return {
    id,
    userId,
    handshake: {
      address: ipAddress,
      headers: {
        'user-agent': 'test-agent'
      },
      auth: {},
      query: {},
      issued: Date.now(),
      secure: false,
      time: new Date().toISOString(),
      url: '/socket.io/',
      xdomain: false
    },
    authContext: {
      userId,
      sessionId: id,
      isAuthenticated: true,
      permissions: ['read', 'subscribe']
    },
    disconnect: jest.fn(),
    emit: jest.fn(),
    on: jest.fn(),
    join: jest.fn(),
    leave: jest.fn()
  } as any;
}