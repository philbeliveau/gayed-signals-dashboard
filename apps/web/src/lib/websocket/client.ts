/**
 * WebSocket Client Service
 *
 * Client-side WebSocket connection management with Clerk authentication.
 * Integrates with existing authentication and state management patterns.
 */

import React from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@clerk/nextjs';
import {
  TypedClientSocket,
  WebSocketEvent,
  SubscriptionRequest,
  SubscriptionResponse,
  ConnectionState,
  WebSocketError
} from '@/types/websocket';

export class WebSocketClient {
  private socket: Socket | null = null;
  private connectionState: ConnectionState = {
    isConnected: false,
    connectionId: '',
    lastHeartbeat: 0,
    reconnectAttempts: 0,
    subscriptions: []
  };
  private eventListeners = new Map<string, Set<(event: WebSocketEvent) => void>>();
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(private authToken?: string) {}

  /**
   * Connect to WebSocket server with authentication
   */
  async connect(): Promise<void> {
    if (this.socket?.connected) {
      return;
    }

    const serverUrl = process.env.NODE_ENV === 'development'
      ? 'http://localhost:3001'
      : window.location.origin;

    try {
      this.socket = io(serverUrl, {
        auth: {
          token: this.authToken
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        retries: 3
      });

      this.setupEventHandlers();

      return new Promise((resolve, reject) => {
        this.socket!.on('connect', () => {
          console.log('WebSocket connected:', this.socket!.id);
          this.connectionState = {
            ...this.connectionState,
            isConnected: true,
            connectionId: this.socket!.id,
            reconnectAttempts: 0
          };
          this.startHeartbeat();
          resolve();
        });

        this.socket!.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          reject(new Error(`Connection failed: ${error.message}`));
        });

        setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);
      });
    } catch (error) {
      console.error('Failed to initialize WebSocket connection:', error);
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionState.isConnected = false;
      this.stopHeartbeat();
    }
  }

  /**
   * Subscribe to event channels
   */
  async subscribe(request: SubscriptionRequest): Promise<SubscriptionResponse[]> {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      this.socket!.emit('subscribe', request, (response: any) => {
        if (response.success) {
          this.connectionState.subscriptions.push(...response.subscriptions);
          resolve(response.subscriptions);
        } else {
          reject(new Error(response.error || 'Subscription failed'));
        }
      });
    });
  }

  /**
   * Unsubscribe from event channels
   */
  async unsubscribe(channels: string[]): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      this.socket!.emit('unsubscribe', channels, (response: any) => {
        if (response.success) {
          // Remove from local subscriptions
          this.connectionState.subscriptions = this.connectionState.subscriptions
            .filter(sub => !channels.includes(sub.channels[0]));
          resolve();
        } else {
          reject(new Error(response.error || 'Unsubscription failed'));
        }
      });
    });
  }

  /**
   * Publish event to server
   */
  async publish(event: WebSocketEvent): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      this.socket!.emit('publish', event, (response: any) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error || 'Publish failed'));
        }
      });
    });
  }

  /**
   * Add event listener for specific event types
   */
  addEventListener(eventType: string, listener: (event: WebSocketEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(eventType: string, listener: (event: WebSocketEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventListeners.delete(eventType);
      }
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Setup Socket.io event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Handle incoming events
    this.socket.on('event', (event: WebSocketEvent) => {
      this.handleIncomingEvent(event);
    });

    // Handle disconnection
    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.connectionState.isConnected = false;
      this.stopHeartbeat();

      // Attempt reconnection for certain disconnect reasons
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect automatically
        return;
      }

      this.attemptReconnection();
    });

    // Handle reconnection
    this.socket.on('reconnect', () => {
      console.log('WebSocket reconnected');
      this.connectionState = {
        ...this.connectionState,
        isConnected: true,
        reconnectAttempts: 0
      };
      this.startHeartbeat();
      this.resubscribeToChannels();
    });

    // Handle errors
    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.notifyListeners('error', {
        eventId: `error_${Date.now()}`,
        timestamp: Date.now(),
        channel: 'system',
        data: {
          type: 'error',
          message: error.message || 'Unknown WebSocket error',
          level: 'error'
        }
      });
    });
  }

  /**
   * Handle incoming WebSocket events
   */
  private handleIncomingEvent(event: WebSocketEvent): void {
    // Update last heartbeat if this is a heartbeat event
    if (event.channel === 'system' && event.data.type === 'heartbeat') {
      this.connectionState.lastHeartbeat = Date.now();
      return;
    }

    // Notify listeners based on event channel and type
    this.notifyListeners(event.channel, event);
    this.notifyListeners('all', event);

    // Log event for debugging
    console.log('WebSocket event received:', {
      channel: event.channel,
      type: event.data.type,
      eventId: event.eventId
    });
  }

  /**
   * Notify event listeners
   */
  private notifyListeners(eventType: string, event: WebSocketEvent): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Event listener error:', error);
        }
      });
    }
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping', (response: any) => {
          this.connectionState.lastHeartbeat = response.pong;
        });
      }
    }, 30000); // 30 seconds
  }

  private heartbeatInterval?: NodeJS.Timeout;

  /**
   * Stop heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  private attemptReconnection(): void {
    if (this.connectionState.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.connectionState.reconnectAttempts);
    this.connectionState.reconnectAttempts++;

    console.log(`Attempting reconnection in ${delay}ms (attempt ${this.connectionState.reconnectAttempts})`);

    setTimeout(() => {
      if (!this.socket?.connected) {
        this.socket?.connect();
      }
    }, delay);
  }

  /**
   * Resubscribe to channels after reconnection
   */
  private async resubscribeToChannels(): Promise<void> {
    if (this.connectionState.subscriptions.length === 0) return;

    try {
      const channels = this.connectionState.subscriptions
        .flatMap(sub => sub.channels);

      await this.subscribe({ channels });
      console.log('Resubscribed to channels:', channels);
    } catch (error) {
      console.error('Failed to resubscribe to channels:', error);
    }
  }
}

// Global WebSocket client instance
let globalWebSocketClient: WebSocketClient | null = null;

/**
 * Get or create global WebSocket client instance
 */
export function getWebSocketClient(authToken?: string): WebSocketClient {
  if (!globalWebSocketClient) {
    globalWebSocketClient = new WebSocketClient(authToken);
  }
  return globalWebSocketClient;
}

/**
 * React hook for WebSocket connection with Clerk authentication
 */
export function useWebSocket() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [client, setClient] = React.useState<WebSocketClient | null>(null);
  const [connectionState, setConnectionState] = React.useState<ConnectionState>({
    isConnected: false,
    connectionId: '',
    lastHeartbeat: 0,
    reconnectAttempts: 0,
    subscriptions: []
  });

  React.useEffect(() => {
    if (!isLoaded) return;

    const initializeWebSocket = async () => {
      try {
        let authToken: string | undefined;

        if (isSignedIn) {
          authToken = await getToken();
        }

        const wsClient = getWebSocketClient(authToken);
        setClient(wsClient);

        // Update connection state when it changes
        const updateConnectionState = () => {
          setConnectionState(wsClient.getConnectionState());
        };

        // Listen for connection state changes
        wsClient.addEventListener('system', updateConnectionState);

        // Connect if not already connected
        if (!wsClient.isConnected()) {
          await wsClient.connect();
        }

        updateConnectionState();

        return () => {
          wsClient.removeEventListener('system', updateConnectionState);
        };
      } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
      }
    };

    initializeWebSocket();
  }, [isLoaded, isSignedIn, getToken]);

  return {
    client,
    connectionState,
    isConnected: connectionState.isConnected
  };
}

