'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

export interface WebSocketHookOptions {
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (data: any) => void;
}

export interface WebSocketHookReturn {
  socket: WebSocket | null;
  isConnected: boolean;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  sendMessage: (data: any) => boolean;
  reconnect: () => void;
  disconnect: () => void;
  lastMessage: any;
  messageHistory: any[];
}

export function useWebSocket(
  url: string | null,
  options: WebSocketHookOptions = {}
): WebSocketHookReturn {
  const {
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    heartbeatInterval = 30000,
    onConnect,
    onDisconnect,
    onError,
    onMessage
  } = options;

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [messageHistory, setMessageHistory] = useState<any[]>([]);

  const reconnectCount = useRef(0);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimer = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnect = useRef(true);

  const clearTimers = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    if (heartbeatInterval > 0) {
      heartbeatTimer.current = setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
        }
      }, heartbeatInterval);
    }
  }, [socket, heartbeatInterval]);

  const connect = useCallback(() => {
    if (!url || socket?.readyState === WebSocket.CONNECTING) {
      return;
    }

    try {
      setConnectionState('connecting');
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionState('connected');
        reconnectCount.current = 0;
        clearTimers();
        startHeartbeat();
        onConnect?.();
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        setSocket(null);
        clearTimers();

        if (shouldReconnect.current && reconnectCount.current < reconnectAttempts) {
          setConnectionState('connecting');
          reconnectCount.current++;
          reconnectTimer.current = setTimeout(connect, reconnectInterval);
        } else {
          setConnectionState('disconnected');
          onDisconnect?.();
        }
      };

      ws.onerror = (error) => {
        setConnectionState('error');
        onError?.(error);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Skip heartbeat responses
          if (data.type === 'heartbeat') {
            return;
          }

          setLastMessage(data);
          setMessageHistory(prev => {
            const newHistory = [...prev, data];
            // Keep only last 100 messages for memory management
            return newHistory.slice(-100);
          });
          onMessage?.(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      setSocket(ws);
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionState('error');
      onError?.(error as Event);
    }
  }, [url, socket, reconnectAttempts, reconnectInterval, onConnect, onDisconnect, onError, onMessage, clearTimers, startHeartbeat]);

  const sendMessage = useCallback((data: any): boolean => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        return false;
      }
    }
    return false;
  }, [socket]);

  const reconnect = useCallback(() => {
    reconnectCount.current = 0;
    shouldReconnect.current = true;
    if (socket) {
      socket.close();
    }
    connect();
  }, [socket, connect]);

  const disconnect = useCallback(() => {
    shouldReconnect.current = false;
    clearTimers();
    if (socket) {
      socket.close();
    }
    setSocket(null);
    setIsConnected(false);
    setConnectionState('disconnected');
  }, [socket, clearTimers]);

  // Initialize connection when URL is provided
  useEffect(() => {
    if (url) {
      shouldReconnect.current = true;
      connect();
    }

    return () => {
      disconnect();
    };
  }, [url]); // Only depend on URL to avoid unnecessary reconnections

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldReconnect.current = false;
      clearTimers();
      if (socket) {
        socket.close();
      }
    };
  }, []);

  return {
    socket,
    isConnected,
    connectionState,
    sendMessage,
    reconnect,
    disconnect,
    lastMessage,
    messageHistory
  };
}

export default useWebSocket;