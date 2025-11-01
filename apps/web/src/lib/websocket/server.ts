/**
 * WebSocket Server Implementation
 *
 * Socket.io server integrated with existing API infrastructure.
 * Follows existing authentication and error handling patterns.
 */

import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { auth } from '@clerk/nextjs';
import {
  AuthenticatedSocket,
  WebSocketServerConfig,
  WebSocketAuthContext,
  SubscriptionRequest,
  SubscriptionResponse,
  WebSocketEvent,
  RateLimitConfig
} from '@/types/websocket';

// Global server instance to ensure singleton pattern
let io: SocketIOServer | null = null;

// Rate limiting storage (in-memory for simplicity, could be Redis in production)
const rateLimitStorage = new Map<string, { count: number; resetTime: number }>();

// Default configuration following existing patterns
const defaultConfig: WebSocketServerConfig = {
  cors: {
    origin: process.env.NODE_ENV === 'development'
      ? ['http://localhost:3000', 'http://localhost:3001']
      : ['https://gayed-signals-dashboard.vercel.app'],
    credentials: true
  },
  rateLimit: {
    maxEventsPerMinute: 60,
    maxConcurrentConnections: 100,
    rateLimitWindow: 60000 // 1 minute
  },
  auth: {
    required: true,
    clerkEndpoint: process.env.CLERK_SECRET_KEY ? '/api/auth/clerk' : undefined
  },
  channels: {
    conversations: { requireAuth: true, maxSubscribers: 50 },
    signals: { requireAuth: true, maxSubscribers: 100 },
    monitoring: { requireAuth: true, maxSubscribers: 10 },
    system: { requireAuth: false, maxSubscribers: 1000 }
  }
};

/**
 * Create or return existing WebSocket server instance
 */
export async function createWebSocketServer(
  config: Partial<WebSocketServerConfig> = {}
): Promise<{ status: string; port?: number; connections: number }> {
  if (io) {
    return {
      status: 'running',
      connections: io.engine.clientsCount
    };
  }

  const finalConfig = { ...defaultConfig, ...config };

  try {
    // Create HTTP server for Socket.io in development
    if (process.env.NODE_ENV === 'development') {
      const httpServer = createServer();
      io = new SocketIOServer(httpServer, {
        cors: finalConfig.cors,
        transports: ['websocket', 'polling'],
        allowEIO3: true
      });

      // Start server on available port
      const port = process.env.WEBSOCKET_PORT ? parseInt(process.env.WEBSOCKET_PORT) : 3001;
      httpServer.listen(port);

      console.log(`WebSocket server running on port ${port}`);

      // Setup connection handling
      setupConnectionHandling(io, finalConfig);

      return {
        status: 'initialized',
        port,
        connections: 0
      };
    } else {
      // In production, Socket.io will be handled by the existing server
      console.log('WebSocket server configured for production');
      return {
        status: 'configured',
        connections: 0
      };
    }
  } catch (error) {
    console.error('Failed to create WebSocket server:', error);
    throw new Error('WebSocket server initialization failed');
  }
}

/**
 * Setup Socket.io connection handling with authentication
 */
function setupConnectionHandling(
  server: SocketIOServer,
  config: WebSocketServerConfig
): void {
  server.use(async (socket: AuthenticatedSocket, next) => {
    try {
      // Rate limiting check
      if (!checkRateLimit(socket.handshake.address, config.rateLimit)) {
        return next(new Error('Rate limit exceeded'));
      }

      // Authentication check if required
      if (config.auth.required) {
        const authContext = await authenticateSocket(socket);
        if (!authContext.isAuthenticated) {
          return next(new Error('Authentication required'));
        }
        socket.authContext = authContext;
        socket.userId = authContext.userId;
        socket.sessionId = authContext.sessionId;
      }

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  server.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`Client connected: ${socket.id}`, {
      userId: socket.userId,
      address: socket.handshake.address
    });

    // Setup event handlers
    setupEventHandlers(socket, config);

    // Cleanup on disconnect
    socket.on('disconnect', (reason) => {
      console.log(`Client disconnected: ${socket.id}`, { reason });
      cleanupSocket(socket);
    });
  });
}

/**
 * Authenticate socket connection using Clerk
 */
async function authenticateSocket(
  socket: AuthenticatedSocket
): Promise<WebSocketAuthContext> {
  try {
    // Extract authentication token from handshake
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;

    if (!token) {
      return {
        userId: '',
        sessionId: socket.id,
        isAuthenticated: false,
        permissions: []
      };
    }

    // Verify token with Clerk (simplified for now)
    // In production, this would verify the JWT token properly
    const isValid = token.startsWith('sk_') || token.startsWith('pk_');

    if (isValid) {
      // Extract user ID from token or session
      const userId = extractUserIdFromToken(token);

      return {
        userId,
        sessionId: socket.id,
        isAuthenticated: true,
        permissions: ['read', 'subscribe'] // Basic permissions
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
 * Extract user ID from authentication token
 */
function extractUserIdFromToken(token: string): string {
  // Simplified extraction - in production, decode JWT properly
  return `user_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Setup event handlers for socket connection
 */
function setupEventHandlers(
  socket: AuthenticatedSocket,
  config: WebSocketServerConfig
): void {
  // Channel subscription
  socket.on('subscribe', (request: SubscriptionRequest, callback) => {
    try {
      const subscriptions = handleChannelSubscription(socket, request, config);
      callback({ success: true, subscriptions });
    } catch (error) {
      console.error('Subscription error:', error);
      callback({ success: false, error: 'Subscription failed' });
    }
  });

  // Channel unsubscription
  socket.on('unsubscribe', (channels: string[], callback) => {
    try {
      channels.forEach(channel => {
        socket.leave(channel);
      });
      callback({ success: true });
    } catch (error) {
      console.error('Unsubscription error:', error);
      callback({ success: false, error: 'Unsubscription failed' });
    }
  });

  // Generic event publishing (for authorized users)
  socket.on('publish', (event: WebSocketEvent, callback) => {
    try {
      if (socket.authContext?.permissions.includes('publish')) {
        publishEvent(socket, event);
        callback({ success: true });
      } else {
        callback({ success: false, error: 'Insufficient permissions' });
      }
    } catch (error) {
      console.error('Publish error:', error);
      callback({ success: false, error: 'Publish failed' });
    }
  });

  // Heartbeat for connection monitoring
  socket.on('ping', (callback) => {
    callback({ pong: Date.now() });
  });
}

/**
 * Handle channel subscription requests
 */
function handleChannelSubscription(
  socket: AuthenticatedSocket,
  request: SubscriptionRequest,
  config: WebSocketServerConfig
): SubscriptionResponse[] {
  const subscriptions: SubscriptionResponse[] = [];

  request.channels.forEach(channel => {
    const channelConfig = config.channels[channel];

    // Check if authentication is required for this channel
    if (channelConfig?.requireAuth && !socket.authContext?.isAuthenticated) {
      subscriptions.push({
        subscriptionId: `${socket.id}-${channel}`,
        channels: [channel],
        status: 'error'
      });
      return;
    }

    // Join the channel
    socket.join(channel);

    subscriptions.push({
      subscriptionId: `${socket.id}-${channel}`,
      channels: [channel],
      status: 'active'
    });

    console.log(`Socket ${socket.id} subscribed to channel: ${channel}`);
  });

  return subscriptions;
}

/**
 * Publish event to appropriate channels
 */
function publishEvent(socket: AuthenticatedSocket, event: WebSocketEvent): void {
  if (!io) return;

  // Add metadata to event
  const enhancedEvent = {
    ...event,
    eventId: event.eventId || generateEventId(),
    timestamp: Date.now(),
    userId: socket.userId
  };

  // Publish to the specific channel
  io.to(event.channel).emit('event', enhancedEvent);

  console.log(`Event published to channel ${event.channel}:`, {
    eventId: enhancedEvent.eventId,
    userId: socket.userId
  });
}

/**
 * Rate limiting check
 */
function checkRateLimit(clientId: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  const client = rateLimitStorage.get(clientId);

  if (!client || now > client.resetTime) {
    rateLimitStorage.set(clientId, {
      count: 1,
      resetTime: now + config.rateLimitWindow
    });
    return true;
  }

  if (client.count >= config.maxEventsPerMinute) {
    return false;
  }

  client.count++;
  return true;
}

/**
 * Cleanup socket resources
 */
function cleanupSocket(socket: AuthenticatedSocket): void {
  // Remove from rate limiting storage after some time
  setTimeout(() => {
    rateLimitStorage.delete(socket.handshake.address);
  }, 60000);
}

/**
 * Generate unique event ID
 */
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get current server status
 */
export function getServerStatus(): { isRunning: boolean; connections: number } {
  return {
    isRunning: io !== null,
    connections: io?.engine.clientsCount || 0
  };
}

/**
 * Shutdown WebSocket server gracefully
 */
export async function shutdownWebSocketServer(): Promise<void> {
  if (io) {
    await new Promise<void>((resolve) => {
      io!.close(() => {
        io = null;
        resolve();
      });
    });
  }
}