/**
 * WebSocket Persistence Layer
 *
 * Handles WebSocket event persistence and caching integration.
 * Follows existing database and caching patterns.
 */

import { PrismaClient } from '@/generated/prisma';
import {
  WebSocketEvent,
  AuthenticatedSocket,
  SubscriptionResponse,
  ConnectionState
} from '@/types/websocket';

// Initialize Prisma client (following existing patterns)
const prisma = new PrismaClient();

interface SessionPersistence {
  sessionId: string;
  userId?: string;
  connectionTime: Date;
  lastActivity: Date;
  subscriptions: string[];
  metadata: Record<string, any>;
}

interface EventPersistence {
  eventId: string;
  sessionId: string;
  userId?: string;
  channel: string;
  eventType: string;
  data: Record<string, any>;
  timestamp: Date;
}

export class WebSocketPersistence {
  private cache = new Map<string, any>(); // Simple in-memory cache
  private cacheTimeout = 300000; // 5 minutes

  /**
   * Store WebSocket session information
   */
  async storeSession(socket: AuthenticatedSocket): Promise<void> {
    try {
      const sessionData: SessionPersistence = {
        sessionId: socket.id,
        userId: socket.userId,
        connectionTime: new Date(),
        lastActivity: new Date(),
        subscriptions: [],
        metadata: {
          ipAddress: socket.handshake.address,
          userAgent: socket.handshake.headers['user-agent'] || 'unknown',
          authContext: socket.authContext || {}
        }
      };

      // Cache session data
      this.setCache(`session:${socket.id}`, sessionData);

      // Note: In a real implementation, this would use actual Prisma models
      // For now, we'll use console logging to demonstrate the pattern
      console.log('📝 Session stored:', {
        sessionId: sessionData.sessionId,
        userId: sessionData.userId,
        timestamp: sessionData.connectionTime.toISOString()
      });

    } catch (error) {
      console.error('Failed to store WebSocket session:', error);
      throw error;
    }
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(socketId: string, subscriptions?: string[]): Promise<void> {
    try {
      const cachedSession = this.getCache(`session:${socketId}`);

      if (cachedSession) {
        cachedSession.lastActivity = new Date();
        if (subscriptions) {
          cachedSession.subscriptions = subscriptions;
        }

        this.setCache(`session:${socketId}`, cachedSession);

        console.log('🔄 Session activity updated:', {
          sessionId: socketId,
          lastActivity: cachedSession.lastActivity.toISOString(),
          subscriptions: cachedSession.subscriptions
        });
      }

    } catch (error) {
      console.error('Failed to update session activity:', error);
    }
  }

  /**
   * Store WebSocket event for audit and replay
   */
  async storeEvent(event: WebSocketEvent, sessionId: string): Promise<void> {
    try {
      const eventData: EventPersistence = {
        eventId: event.eventId,
        sessionId,
        userId: event.userId,
        channel: event.channel,
        eventType: event.data.type,
        data: event.data,
        timestamp: new Date(event.timestamp)
      };

      // Cache recent events for quick access
      const recentEventsKey = `events:${event.channel}:recent`;
      const recentEvents = this.getCache(recentEventsKey) || [];
      recentEvents.push(eventData);

      // Keep only last 100 events per channel
      if (recentEvents.length > 100) {
        recentEvents.shift();
      }

      this.setCache(recentEventsKey, recentEvents);

      // Log event storage (in production, this would be database storage)
      console.log('💾 Event stored:', {
        eventId: event.eventId,
        channel: event.channel,
        type: event.data.type,
        timestamp: eventData.timestamp.toISOString()
      });

    } catch (error) {
      console.error('Failed to store WebSocket event:', error);
    }
  }

  /**
   * Retrieve session information
   */
  async getSession(sessionId: string): Promise<SessionPersistence | null> {
    try {
      // Try cache first
      const cached = this.getCache(`session:${sessionId}`);
      if (cached) {
        return cached;
      }

      // In production, this would query the database
      console.log('🔍 Session lookup:', { sessionId });
      return null;

    } catch (error) {
      console.error('Failed to retrieve session:', error);
      return null;
    }
  }

  /**
   * Get recent events for a channel
   */
  async getRecentEvents(channel: string, limit: number = 50): Promise<EventPersistence[]> {
    try {
      const recentEventsKey = `events:${channel}:recent`;
      const events = this.getCache(recentEventsKey) || [];

      return events.slice(-limit);

    } catch (error) {
      console.error('Failed to retrieve recent events:', error);
      return [];
    }
  }

  /**
   * Get active sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionPersistence[]> {
    try {
      // In production, this would query the database
      // For now, scan cache
      const sessions: SessionPersistence[] = [];

      for (const [key, value] of this.cache.entries()) {
        if (key.startsWith('session:') && value.userId === userId) {
          sessions.push(value);
        }
      }

      console.log('👤 User sessions lookup:', { userId, count: sessions.length });
      return sessions;

    } catch (error) {
      console.error('Failed to retrieve user sessions:', error);
      return [];
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(timeoutMs: number = 3600000): Promise<number> {
    try {
      const now = new Date();
      let cleanedCount = 0;

      // Clean cache
      for (const [key, value] of this.cache.entries()) {
        if (key.startsWith('session:')) {
          const sessionAge = now.getTime() - new Date(value.lastActivity).getTime();
          if (sessionAge > timeoutMs) {
            this.cache.delete(key);
            cleanedCount++;
          }
        }
      }

      console.log('🧹 Session cleanup completed:', { cleanedCount, timeoutMs });
      return cleanedCount;

    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error);
      return 0;
    }
  }

  /**
   * Store subscription information
   */
  async storeSubscription(
    sessionId: string,
    subscription: SubscriptionResponse
  ): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (session) {
        session.subscriptions = [
          ...session.subscriptions,
          ...subscription.channels
        ];
        session.lastActivity = new Date();

        this.setCache(`session:${sessionId}`, session);

        console.log('📋 Subscription stored:', {
          sessionId,
          subscriptionId: subscription.subscriptionId,
          channels: subscription.channels
        });
      }

    } catch (error) {
      console.error('Failed to store subscription:', error);
    }
  }

  /**
   * Remove subscription information
   */
  async removeSubscription(
    sessionId: string,
    channels: string[]
  ): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (session) {
        session.subscriptions = session.subscriptions.filter(
          channel => !channels.includes(channel)
        );
        session.lastActivity = new Date();

        this.setCache(`session:${sessionId}`, session);

        console.log('🗑️ Subscription removed:', {
          sessionId,
          removedChannels: channels,
          remainingSubscriptions: session.subscriptions
        });
      }

    } catch (error) {
      console.error('Failed to remove subscription:', error);
    }
  }

  /**
   * Get analytics data
   */
  async getAnalytics(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<{
    activeSessions: number;
    totalEvents: number;
    eventsByChannel: Record<string, number>;
    peakConnections: number;
  }> {
    try {
      // In production, this would query aggregated data from database
      const activeSessions = Array.from(this.cache.keys())
        .filter(key => key.startsWith('session:')).length;

      let totalEvents = 0;
      const eventsByChannel: Record<string, number> = {};

      for (const [key, value] of this.cache.entries()) {
        if (key.startsWith('events:') && key.endsWith(':recent')) {
          const events = value as EventPersistence[];
          totalEvents += events.length;

          const channel = key.split(':')[1];
          eventsByChannel[channel] = events.length;
        }
      }

      return {
        activeSessions,
        totalEvents,
        eventsByChannel,
        peakConnections: activeSessions // Simplified
      };

    } catch (error) {
      console.error('Failed to get analytics:', error);
      return {
        activeSessions: 0,
        totalEvents: 0,
        eventsByChannel: {},
        peakConnections: 0
      };
    }
  }

  /**
   * Simple cache implementation
   */
  private setCache(key: string, value: any): void {
    this.cache.set(key, {
      data: value,
      expiry: Date.now() + this.cacheTimeout
    });
  }

  private getCache(key: string): any {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ WebSocket cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalKeys: number;
    sessions: number;
    events: number;
    memory: string;
  } {
    let sessions = 0;
    let events = 0;

    for (const key of this.cache.keys()) {
      if (key.startsWith('session:')) sessions++;
      if (key.startsWith('events:')) events++;
    }

    return {
      totalKeys: this.cache.size,
      sessions,
      events,
      memory: `${Math.round(JSON.stringify([...this.cache.entries()]).length / 1024)}KB`
    };
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    try {
      await prisma.$disconnect();
      this.clearCache();
      console.log('📴 WebSocket persistence layer closed');
    } catch (error) {
      console.error('Error closing persistence layer:', error);
    }
  }
}

// Export singleton instance
export const webSocketPersistence = new WebSocketPersistence();