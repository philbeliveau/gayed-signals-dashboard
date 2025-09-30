'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useWebSocket } from './useWebSocket';
import { AgentMessage, ConversationStatus, ConversationResult } from '@/types/agents';

export interface AutoGenConversationOptions {
  content: string;
  contentType?: string;
  enableAutoGen?: boolean;
  onMessage?: (message: AgentMessage) => void;
  onStatusChange?: (status: ConversationStatus) => void;
  onComplete?: (result: ConversationResult) => void;
  onError?: (error: string) => void;
  onFallbackMode?: (reason: string) => void;
}

export interface AutoGenConversationHook {
  messages: AgentMessage[];
  status: ConversationStatus;
  isConnected: boolean;
  isUsingDemo: boolean;
  error: string | null;
  startConversation: () => Promise<void>;
  retryConnection: () => void;
  clearMessages: () => void;
}

export function useAutoGenConversation(
  sessionId: string,
  options: AutoGenConversationOptions
): AutoGenConversationHook {
  const { getToken, userId } = useAuth();

  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [status, setStatus] = useState<ConversationStatus>('initializing');
  const [isUsingDemo, setIsUsingDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webSocketUrl, setWebSocketUrl] = useState<string | null>(null);
  const [startData, setStartData] = useState<any>(null);

  const conversationStarted = useRef(false);

  // WebSocket connection
  const {
    isConnected,
    sendMessage,
    reconnect,
    connectionState
  } = useWebSocket(webSocketUrl, {
    reconnectAttempts: 3,
    reconnectInterval: 2000,
    onConnect: () => {
      setError(null);
      if (startData && !conversationStarted.current) {
        // Send start message once connected
        sendMessage(startData);
        conversationStarted.current = true;
      }
    },
    onDisconnect: () => {
      setStatus('error');
      setError('Connection lost');
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
      setStatus('error');
      setError('WebSocket connection failed');
    },
    onMessage: handleWebSocketMessage
  });

  function handleWebSocketMessage(data: any) {
    try {
      switch (data.type) {
        case 'agent_message':
          if (data.data) {
            const agentMessage: AgentMessage = {
              id: data.data.id,
              agentName: data.data.agentName,
              agentType: data.data.agentType,
              role: data.data.role,
              message: data.data.message,
              timestamp: data.data.timestamp,
              confidence: data.data.confidence
            };

            setMessages(prev => [...prev, agentMessage]);
            options.onMessage?.(agentMessage);
          }
          break;

        case 'conversation_status':
          if (data.data?.status) {
            const newStatus = data.data.status as ConversationStatus;
            setStatus(newStatus);
            options.onStatusChange?.(newStatus);
          }
          break;

        case 'conversation_complete':
          setStatus('completed');
          if (data.data && options.onComplete) {
            const result: ConversationResult = {
              consensusReached: data.data.consensusReached ?? true,
              finalRecommendation: data.data.finalRecommendation || 'Analysis complete',
              confidenceLevel: data.data.confidenceLevel ?? 0.7,
              keyInsights: data.data.keyInsights || []
            };
            options.onComplete(result);
          }
          break;

        case 'fallback_mode':
          setIsUsingDemo(true);
          setStatus('active');
          options.onFallbackMode?.(data.data?.reason || 'AutoGen unavailable');
          break;

        case 'error':
          setStatus('error');
          const errorMessage = data.data?.message || 'Unknown error occurred';
          setError(errorMessage);
          options.onError?.(errorMessage);
          break;

        case 'pong':
          // Heartbeat response - no action needed
          break;

        default:
          console.log('Unknown WebSocket message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  }

  const startConversation = useCallback(async () => {
    if (!options.content.trim()) {
      setError('Content is required');
      return;
    }

    try {
      setStatus('initializing');
      setError(null);
      setMessages([]);
      setIsUsingDemo(false);
      conversationStarted.current = false;

      // Get auth token if available
      let authToken: string | null = null;
      try {
        authToken = await getToken();
      } catch (error) {
        console.warn('Failed to get auth token:', error);
      }

      // First, prepare the conversation via HTTP
      const response = await fetch(`/api/conversations/${sessionId}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: options.content,
          contentType: options.contentType || 'text'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to prepare conversation');
      }

      // Check if AutoGen is enabled and available
      if (!options.enableAutoGen) {
        // Start in demo mode immediately
        setIsUsingDemo(true);
        startDemoConversation();
        return;
      }

      // Set up WebSocket connection data
      const wsUrl = data.webSocketUrl;
      if (!wsUrl) {
        throw new Error('No WebSocket URL provided by backend');
      }

      // Prepare start data for WebSocket
      const conversationStartData = data.startData || {
        type: 'start_conversation',
        data: {
          content: options.content,
          contentType: options.contentType || 'text',
          userId: userId,
          authToken: authToken
        }
      };

      setStartData(conversationStartData);
      setWebSocketUrl(wsUrl);

    } catch (error) {
      console.error('Failed to start conversation:', error);
      setStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      options.onError?.(errorMessage);

      // Fallback to demo mode if enabled
      if (options.enableAutoGen) {
        console.log('Falling back to demo mode due to error');
        setIsUsingDemo(true);
        startDemoConversation();
      }
    }
  }, [sessionId, options.content, options.contentType, options.enableAutoGen, userId, getToken]);

  const startDemoConversation = useCallback(() => {
    setStatus('active');
    setIsUsingDemo(true);

    // REAL DATA ONLY: Demo messages comply with financial-grade data integrity
    const demoMessages: AgentMessage[] = [
      {
        id: '1',
        agentName: 'Financial Analyst',
        agentType: 'FINANCIAL_ANALYST',
        role: 'analyst',
        message: '⚠️ AutoGen backend unavailable - real-time analysis not accessible. Demo mode active with no synthetic market data generated. Please retry for live AutoGen analysis.',
        timestamp: new Date().toISOString(),
        confidence: 0.0  // Zero confidence for demo mode
      },
      {
        id: '2',
        agentName: 'Market Context',
        agentType: 'MARKET_CONTEXT',
        role: 'context',
        message: '⚠️ Real-time market intelligence unavailable - Perplexity API not accessible in demo mode. No synthetic market data provided. Connect to live AutoGen for current market analysis.',
        timestamp: new Date(Date.now() + 3000).toISOString(),
        confidence: 0.0  // Zero confidence for demo mode
      },
      {
        id: '3',
        agentName: 'Risk Challenger',
        agentType: 'RISK_CHALLENGER',
        role: 'challenger',
        message: '⚠️ Risk analysis requires real AutoGen backend connection. Demo mode cannot provide genuine risk assessment. No fallback data generated. Please use live system for actual risk evaluation.',
        timestamp: new Date(Date.now() + 6000).toISOString(),
        confidence: 0.0  // Zero confidence for demo mode
      },
      {
        id: '4',
        agentName: 'Financial Analyst',
        agentType: 'FINANCIAL_ANALYST',
        role: 'analyst',
        message: '🔄 Demo mode complete. No financial recommendations provided due to real data unavailability. Please retry AutoGen connection for actual market analysis with live data sources.',
        timestamp: new Date(Date.now() + 9000).toISOString(),
        confidence: 0.0  // Zero confidence for demo mode
      }
    ];

    // Simulate real-time message delivery
    let messageIndex = 0;
    const interval = setInterval(() => {
      if (messageIndex < demoMessages.length) {
        const message = demoMessages[messageIndex];
        setMessages(prev => [...prev, message]);
        options.onMessage?.(message);
        messageIndex++;
      } else {
        setStatus('completed');
        const result: ConversationResult = {
          consensusReached: false,  // No consensus possible without real data
          finalRecommendation: '⚠️ Demo mode complete - No financial recommendations provided. AutoGen backend unavailable, no synthetic market analysis generated. Please retry for live analysis with real data sources.',
          confidenceLevel: 0.0,  // Zero confidence in demo mode
          keyInsights: [
            'AutoGen backend connection failed',
            'Real-time data sources unavailable',
            'No synthetic market data generated',
            'Live system required for actual analysis'
          ]
        };
        options.onComplete?.(result);
        clearInterval(interval);
      }
    }, 3000); // 3 second intervals

    // Cleanup interval on unmount or status change
    return () => clearInterval(interval);
  }, [options.onMessage, options.onComplete]);

  const retryConnection = useCallback(() => {
    setError(null);
    if (isUsingDemo) {
      setIsUsingDemo(false);
    }
    conversationStarted.current = false;
    if (webSocketUrl) {
      reconnect();
    } else {
      startConversation();
    }
  }, [isUsingDemo, webSocketUrl, reconnect, startConversation]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStatus('initializing');
    setError(null);
    setIsUsingDemo(false);
    conversationStarted.current = false;
  }, []);

  return {
    messages,
    status,
    isConnected: isUsingDemo || isConnected,
    isUsingDemo,
    error,
    startConversation,
    retryConnection,
    clearMessages
  };
}