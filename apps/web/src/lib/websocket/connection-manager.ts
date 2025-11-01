/**
 * WebSocket Connection Manager
 *
 * Handles rate limiting, concurrent user management, and connection lifecycle.
 * Integrates with existing monitoring and error handling patterns.
 */

import { Server as SocketIOServer } from 'socket.io';
import {
  AuthenticatedSocket,
  RateLimitConfig,
  WebSocketAuthContext
} from '@/types/websocket';

interface ConnectionInfo {
  socketId: string;
  userId?: string;
  connectTime: number;
  lastActivity: number;
  messageCount: number;
  subscriptions: Set<string>;
  ipAddress: string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

export class ConnectionManager {
  private connections = new Map<string, ConnectionInfo>();
  private rateLimits = new Map<string, RateLimitEntry>();
  private userConnections = new Map<string, Set<string>>();
  private ipConnections = new Map<string, Set<string>>();

  constructor(
    private io: SocketIOServer,
    private config: {
      maxConnections: number;
      maxConnectionsPerUser: number;
      maxConnectionsPerIP: number;
      rateLimit: RateLimitConfig;
      inactivityTimeout: number;
    }
  ) {
    this.setupCleanupInterval();
  }

  /**
   * Register a new connection
   */
  registerConnection(socket: AuthenticatedSocket): boolean {
    const socketId = socket.id;
    const userId = socket.userId;
    const ipAddress = socket.handshake.address;

    // Check global connection limit
    if (this.connections.size >= this.config.maxConnections) {
      console.warn('Global connection limit reached', {
        current: this.connections.size,
        limit: this.config.maxConnections
      });
      return false;
    }

    // Check per-user connection limit
    if (userId && this.getUserConnectionCount(userId) >= this.config.maxConnectionsPerUser) {
      console.warn('User connection limit reached', {
        userId,
        current: this.getUserConnectionCount(userId),
        limit: this.config.maxConnectionsPerUser
      });
      return false;
    }

    // Check per-IP connection limit
    if (this.getIPConnectionCount(ipAddress) >= this.config.maxConnectionsPerIP) {
      console.warn('IP connection limit reached', {
        ipAddress,
        current: this.getIPConnectionCount(ipAddress),
        limit: this.config.maxConnectionsPerIP
      });
      return false;
    }

    // Check rate limiting
    if (!this.checkRateLimit(ipAddress)) {
      console.warn('Rate limit exceeded', { ipAddress });
      return false;
    }

    // Register the connection
    const connectionInfo: ConnectionInfo = {
      socketId,
      userId,
      connectTime: Date.now(),
      lastActivity: Date.now(),
      messageCount: 0,
      subscriptions: new Set(),
      ipAddress
    };

    this.connections.set(socketId, connectionInfo);

    // Track by user
    if (userId) {
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId)!.add(socketId);
    }

    // Track by IP
    if (!this.ipConnections.has(ipAddress)) {
      this.ipConnections.set(ipAddress, new Set());
    }
    this.ipConnections.get(ipAddress)!.add(socketId);

    console.log('Connection registered', {
      socketId,
      userId,
      ipAddress,
      totalConnections: this.connections.size
    });

    return true;
  }

  /**
   * Unregister a connection
   */
  unregisterConnection(socketId: string): void {
    const connection = this.connections.get(socketId);
    if (!connection) return;

    // Remove from tracking maps
    if (connection.userId) {
      const userConnections = this.userConnections.get(connection.userId);
      if (userConnections) {
        userConnections.delete(socketId);
        if (userConnections.size === 0) {
          this.userConnections.delete(connection.userId);
        }
      }
    }

    const ipConnections = this.ipConnections.get(connection.ipAddress);
    if (ipConnections) {
      ipConnections.delete(socketId);
      if (ipConnections.size === 0) {
        this.ipConnections.delete(connection.ipAddress);
      }
    }

    this.connections.delete(socketId);

    console.log('Connection unregistered', {
      socketId,
      userId: connection.userId,
      duration: Date.now() - connection.connectTime,
      totalConnections: this.connections.size
    });
  }

  /**
   * Update connection activity
   */
  updateActivity(socketId: string): void {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.lastActivity = Date.now();
      connection.messageCount++;
    }
  }

  /**
   * Add subscription to connection
   */
  addSubscription(socketId: string, channel: string): void {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.subscriptions.add(channel);
    }
  }

  /**
   * Remove subscription from connection
   */
  removeSubscription(socketId: string, channel: string): void {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.subscriptions.delete(channel);
    }
  }

  /**
   * Check rate limit for IP address
   */
  checkRateLimit(ipAddress: string): boolean {
    const now = Date.now();
    const entry = this.rateLimits.get(ipAddress);

    if (!entry || now > entry.resetTime) {
      this.rateLimits.set(ipAddress, {
        count: 1,
        resetTime: now + this.config.rateLimit.rateLimitWindow,
        blocked: false
      });
      return true;
    }

    if (entry.blocked) {
      return false;
    }

    if (entry.count >= this.config.rateLimit.maxEventsPerMinute) {
      entry.blocked = true;
      console.warn('IP address rate limited', {
        ipAddress,
        count: entry.count,
        limit: this.config.rateLimit.maxEventsPerMinute
      });
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Check message rate limit for a specific socket
   */
  checkMessageRateLimit(socketId: string): boolean {
    const connection = this.connections.get(socketId);
    if (!connection) return false;

    // Simple rate limiting: max 1 message per second
    const now = Date.now();
    if (now - connection.lastActivity < 1000) {
      return false;
    }

    return this.checkRateLimit(connection.ipAddress);
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    authenticatedConnections: number;
    connectionsPerChannel: Record<string, number>;
    rateLimitedIPs: number;
    averageConnectionDuration: number;
  } {
    const now = Date.now();
    let authenticatedCount = 0;
    let totalDuration = 0;
    const channelCounts: Record<string, number> = {};

    this.connections.forEach(connection => {
      if (connection.userId) {
        authenticatedCount++;
      }
      totalDuration += now - connection.connectTime;

      connection.subscriptions.forEach(channel => {
        channelCounts[channel] = (channelCounts[channel] || 0) + 1;
      });
    });

    const rateLimitedIPs = Array.from(this.rateLimits.values())
      .filter(entry => entry.blocked).length;

    return {
      totalConnections: this.connections.size,
      authenticatedConnections: authenticatedCount,
      connectionsPerChannel: channelCounts,
      rateLimitedIPs,
      averageConnectionDuration: this.connections.size > 0
        ? totalDuration / this.connections.size
        : 0
    };
  }

  /**
   * Get connections for a specific user
   */
  getUserConnections(userId: string): ConnectionInfo[] {
    const socketIds = this.userConnections.get(userId) || new Set();
    return Array.from(socketIds)
      .map(socketId => this.connections.get(socketId))
      .filter(Boolean) as ConnectionInfo[];
  }

  /**
   * Get connection count for a user
   */
  private getUserConnectionCount(userId: string): number {
    return this.userConnections.get(userId)?.size || 0;
  }

  /**
   * Get connection count for an IP address
   */
  private getIPConnectionCount(ipAddress: string): number {
    return this.ipConnections.get(ipAddress)?.size || 0;
  }

  /**
   * Force disconnect user connections
   */
  disconnectUser(userId: string, reason: string = 'Admin disconnect'): void {
    const connections = this.getUserConnections(userId);
    connections.forEach(connection => {
      const socket = this.io.sockets.sockets.get(connection.socketId);
      if (socket) {
        socket.disconnect(true);
      }
    });

    console.log('User disconnected', {
      userId,
      reason,
      connectionCount: connections.length
    });
  }

  /**
   * Force disconnect IP address
   */
  disconnectIP(ipAddress: string, reason: string = 'Rate limit violation'): void {
    const socketIds = this.ipConnections.get(ipAddress) || new Set();
    socketIds.forEach(socketId => {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
    });

    console.log('IP address disconnected', {
      ipAddress,
      reason,
      connectionCount: socketIds.size
    });
  }

  /**
   * Cleanup inactive connections and expired rate limits
   */
  private setupCleanupInterval(): void {
    setInterval(() => {
      this.cleanupInactiveConnections();
      this.cleanupExpiredRateLimits();
    }, 60000); // Run every minute
  }

  /**
   * Remove inactive connections
   */
  private cleanupInactiveConnections(): void {
    const now = Date.now();
    const inactiveThreshold = this.config.inactivityTimeout;

    this.connections.forEach((connection, socketId) => {
      if (now - connection.lastActivity > inactiveThreshold) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
        } else {
          // Socket already disconnected, clean up tracking
          this.unregisterConnection(socketId);
        }

        console.log('Inactive connection cleaned up', {
          socketId,
          userId: connection.userId,
          inactiveTime: now - connection.lastActivity
        });
      }
    });
  }

  /**
   * Remove expired rate limit entries
   */
  private cleanupExpiredRateLimits(): void {
    const now = Date.now();

    this.rateLimits.forEach((entry, ipAddress) => {
      if (now > entry.resetTime) {
        this.rateLimits.delete(ipAddress);
      }
    });
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    details: Record<string, any>;
  } {
    const stats = this.getStats();
    const connectionUtilization = stats.totalConnections / this.config.maxConnections;

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (connectionUtilization > 0.9) {
      status = 'critical';
    } else if (connectionUtilization > 0.7 || stats.rateLimitedIPs > 10) {
      status = 'warning';
    }

    return {
      status,
      details: {
        ...stats,
        connectionUtilization,
        maxConnections: this.config.maxConnections,
        uptime: process.uptime() * 1000
      }
    };
  }
}