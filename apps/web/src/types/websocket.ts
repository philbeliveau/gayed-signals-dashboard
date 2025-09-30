/**
 * WebSocket Infrastructure Types
 *
 * Generic event system for real-time communication across the platform.
 * Designed to be independent of specific service implementations.
 */

import { Socket as ClientSocket } from 'socket.io-client';
import { Socket as ServerSocket } from 'socket.io';

// Base event structure for all WebSocket communications
export interface BaseWebSocketEvent {
  eventId: string;
  timestamp: number;
  userId?: string;
  channel: string;
}

// Generic event channels available in the system
export type EventChannel =
  | 'conversations'  // Agent conversations
  | 'signals'        // Trading signals updates
  | 'monitoring'     // System monitoring
  | 'user-sessions'  // User session management
  | 'system'         // System-wide notifications
  | string;          // Allow custom channels for extensibility

// Event types for different channels
export interface ConversationEvent extends BaseWebSocketEvent {
  channel: 'conversations';
  conversationId: string;
  data: {
    type: 'message' | 'status' | 'completed' | 'error';
    content?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  };
}

export interface SignalEvent extends BaseWebSocketEvent {
  channel: 'signals';
  signalType: string;
  data: {
    type: 'update' | 'alert' | 'calculation';
    value?: number;
    metadata?: Record<string, unknown>;
  };
}

export interface MonitoringEvent extends BaseWebSocketEvent {
  channel: 'monitoring';
  data: {
    type: 'health' | 'performance' | 'error';
    status?: string;
    metrics?: Record<string, unknown>;
  };
}

export interface SystemEvent extends BaseWebSocketEvent {
  channel: 'system';
  data: {
    type: 'notification' | 'maintenance' | 'update';
    message: string;
    level: 'info' | 'warning' | 'error';
  };
}

// Union type for all possible events
export type WebSocketEvent =
  | ConversationEvent
  | SignalEvent
  | MonitoringEvent
  | SystemEvent;

// Subscription management
export interface SubscriptionRequest {
  channels: EventChannel[];
  filters?: Record<string, unknown>;
}

export interface SubscriptionResponse {
  subscriptionId: string;
  channels: EventChannel[];
  status: 'active' | 'inactive' | 'error';
}

// Authentication context for WebSocket connections
export interface WebSocketAuthContext {
  userId: string;
  sessionId: string;
  isAuthenticated: boolean;
  permissions: string[];
}

// Connection state management
export interface ConnectionState {
  isConnected: boolean;
  connectionId: string;
  lastHeartbeat: number;
  reconnectAttempts: number;
  subscriptions: SubscriptionResponse[];
}

// Rate limiting configuration
export interface RateLimitConfig {
  maxEventsPerMinute: number;
  maxConcurrentConnections: number;
  rateLimitWindow: number;
}

// Error types for WebSocket operations
export interface WebSocketError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
}

// Server-side socket interface extensions
export interface AuthenticatedSocket extends ServerSocket {
  userId?: string;
  sessionId?: string;
  authContext?: WebSocketAuthContext;
}

// Client-side socket interface extensions
export interface TypedClientSocket extends ClientSocket {
  emit<T extends WebSocketEvent>(event: string, data: T): boolean;
  on<T extends WebSocketEvent>(event: string, callback: (data: T) => void): this;
}

// WebSocket server configuration
export interface WebSocketServerConfig {
  port?: number;
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  rateLimit: RateLimitConfig;
  auth: {
    required: boolean;
    clerkEndpoint?: string;
  };
  channels: {
    [key: string]: {
      requireAuth: boolean;
      maxSubscribers?: number;
    };
  };
}

// Explicit exports for build system
export type {
  BaseWebSocketEvent,
  EventChannel,
  ConversationEvent,
  SignalEvent,
  MonitoringEvent,
  SystemEvent,
  WebSocketEvent,
  SubscriptionRequest,
  SubscriptionResponse,
  WebSocketAuthContext,
  ConnectionState,
  RateLimitConfig,
  WebSocketError,
  AuthenticatedSocket,
  TypedClientSocket,
  WebSocketServerConfig
};