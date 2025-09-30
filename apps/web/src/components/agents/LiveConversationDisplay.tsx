'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AgentMessage, ConversationStatus, ConversationResult, LiveConversationMessage, WebSocketMessage } from '@/types/agents';
import { StatusBadge } from '@/components/SharedUIComponents';
import UnifiedLoader from '@/components/ui/UnifiedLoader';
import useWebSocket from '@/hooks/useWebSocket';
import { AGENT_CONFIG, DEFAULT_AGENT_CONFIG, CONVERSATION_TIMING } from '@/constants/agentConfig';

interface LiveConversationDisplayProps {
  sessionId: string;
  onConversationComplete?: (result: ConversationResult) => void;
  className?: string;
  enableWebSocket?: boolean;
  mockMode?: boolean;
}

export function LiveConversationDisplay({
  sessionId,
  onConversationComplete,
  className = '',
  enableWebSocket = false,
  mockMode = true
}: LiveConversationDisplayProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [status, setStatus] = useState<ConversationStatus>('initializing');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // WebSocket connection for real-time communication
  const wsUrl = enableWebSocket && !mockMode ? `/api/conversations/${sessionId}/stream` : null;
  const { isConnected, connectionState, lastMessage, sendMessage } = useWebSocket(wsUrl, {
    onMessage: (data: WebSocketMessage) => {
      switch (data.type) {
        case 'agent-message':
          if (data.data && data.data.agentType && data.data.message) {
            setMessages(prev => [...prev, data.data]);
          }
          break;
        case 'conversation-status':
          if (data.data?.status) {
            setStatus(data.data.status);
          }
          break;
        case 'conversation-complete':
          setStatus('completed');
          if (data.data && onConversationComplete) {
            onConversationComplete(data.data);
          }
          break;
        case 'error':
          setStatus('error');
          setErrorMessage(data.data?.message || 'An error occurred');
          break;
      }
    },
    onError: (error) => {
      setStatus('error');
      setErrorMessage('Connection failed');
    }
  });

  // Mock conversation for demonstration when not using WebSocket
  useEffect(() => {
    if (!mockMode || !sessionId) return;

    setStatus('active');

    // Simulate real-time agent conversation
    const mockConversation = [
      {
        id: '1',
        agentName: 'Financial Analyst',
        agentType: 'FINANCIAL_ANALYST' as const,
        role: 'analyst',
        message: 'Analyzing provided content using current market signals. Our Utilities/SPY ratio is currently at 0.91, suggesting defensive positioning. VIX defensive signal at 3.2 confirms risk-off sentiment.',
        timestamp: new Date().toISOString(),
        confidence: 0.85
      },
      {
        id: '2',
        agentName: 'Market Context',
        agentType: 'MARKET_CONTEXT' as const,
        role: 'context',
        message: 'Real-time market intelligence shows Fed maintaining hawkish stance. Employment at 3.7% remains historically low. Latest CPI at 3.2% still above Fed target. Market pricing 75bps cuts but Fed signaling caution on inflation persistence.',
        timestamp: new Date(Date.now() + 3000).toISOString(),
        confidence: 0.78
      },
      {
        id: '3',
        agentName: 'Risk Challenger',
        agentType: 'RISK_CHALLENGER' as const,
        role: 'challenger',
        message: 'Critical concern: What if inflation resurges? Employment could deteriorate rapidly given current labor market tightness. Remember 2019 "insurance cuts" became crisis response. Markets rarely follow linear progressions.',
        timestamp: new Date(Date.now() + 6000).toISOString(),
        confidence: 0.92
      },
      {
        id: '4',
        agentName: 'Financial Analyst',
        agentType: 'FINANCIAL_ANALYST' as const,
        role: 'analyst',
        message: 'Valid risk concerns noted. Adjusting signal confidence to 65% given Fed uncertainty and strong employment. Recommend 60% defensive positioning vs normal 80% allocation.',
        timestamp: new Date(Date.now() + 9000).toISOString(),
        confidence: 0.65
      }
    ];

    let messageIndex = 0;
    const interval = setInterval(() => {
      if (messageIndex < mockConversation.length) {
        setMessages(prev => [...prev, mockConversation[messageIndex]]);
        messageIndex++;
      } else {
        setStatus('completed');
        onConversationComplete?.({
          consensusReached: true,
          finalRecommendation: 'Mixed Signals (65% confidence) - Fed policy uncertainty requires flexible defensive positioning',
          confidenceLevel: 0.65,
          keyInsights: [
            'Utilities/SPY signal indicates risk-off positioning',
            'Fed policy uncertainty affects market outlook',
            'Employment strength may delay rate cuts',
            'Defensive allocation recommended with flexibility'
          ]
        });
        clearInterval(interval);
      }
    }, CONVERSATION_TIMING.MESSAGE_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [sessionId, onConversationComplete, mockMode]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      const scrollContainer = scrollRef.current;
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, autoScroll]);

  // Handle manual scrolling to disable auto-scroll
  const handleScroll = () => {
    if (!scrollRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 5;
    setAutoScroll(isAtBottom);
  };

  // Show loading state
  if (status === 'initializing' && messages.length === 0) {
    return (
      <div className={`bg-theme-card border border-theme-border rounded-xl h-[600px] max-h-[600px] md:h-[500px] md:max-h-[500px] flex flex-col shadow-theme-card ${className}`}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <UnifiedLoader size="lg" />
            <div className="space-y-1">
              <p className="text-theme-text font-medium">Initializing Agent Conversation</p>
              <p className="text-theme-text-muted text-sm">Setting up secure connection...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (status === 'error') {
    return (
      <div className={`bg-theme-card border border-theme-danger-border rounded-xl h-[600px] max-h-[600px] md:h-[500px] md:max-h-[500px] flex flex-col shadow-theme-card ${className}`}>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-16 h-16 mx-auto bg-theme-danger-bg rounded-full flex items-center justify-center">
              <span className="text-2xl text-theme-danger">⚠️</span>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-theme-text">Connection Failed</h3>
              <p className="text-theme-text-muted text-sm">
                {errorMessage || 'Unable to establish conversation connection. Please try again.'}
              </p>
            </div>
            <button
              onClick={() => {
                setStatus('initializing');
                setErrorMessage('');
                setMessages([]);
              }}
              className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors touch-manipulation"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-theme-card border border-theme-border rounded-xl h-[600px] max-h-[600px] sm:h-[500px] sm:max-h-[500px] md:h-[600px] md:max-h-[600px] flex flex-col shadow-theme-card ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 p-3 sm:p-4 border-b border-theme-border">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-theme-text truncate">Live Agent Conversation</h3>
          <ConversationStatusBadge status={status} isConnected={mockMode || isConnected} />
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto px-2 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4 scrollbar-hide mobile-chart-wrapper"
          style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
        >
          {messages.filter(message => message && message.agentType && message.message).map((message, index, filteredArray) => (
            <AgentMessageBubble
              key={`${message.agentType}-${index}`}
              message={message}
              isLatest={index === filteredArray.length - 1}
            />
          ))}

          {status === 'active' && <TypingIndicator />}

          {status === 'completed' && (
            <div className="text-center py-3 sm:py-4">
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-theme-success-bg border border-theme-success-border rounded-lg text-theme-success">
                <span className="text-base sm:text-lg">✓</span>
                <span className="text-xs sm:text-sm font-medium">Conversation Complete</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Auto-scroll indicator */}
      {!autoScroll && (
        <div className="flex-shrink-0 p-2 border-t border-theme-border safe-bottom">
          <button
            onClick={() => {
              setAutoScroll(true);
              if (scrollRef.current) {
                scrollRef.current.scrollTo({
                  top: scrollRef.current.scrollHeight,
                  behavior: 'smooth'
                });
              }
            }}
            className="w-full px-3 py-2 text-xs sm:text-sm bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors touch-manipulation"
          >
            ↓ Scroll to latest messages
          </button>
        </div>
      )}
    </div>
  );
}

// Agent message component with professional styling
function AgentMessageBubble({
  message,
  isLatest
}: {
  message: AgentMessage;
  isLatest: boolean;
}) {
  const config = AGENT_CONFIG[message.agentType] || {
    ...DEFAULT_AGENT_CONFIG,
    name: message.agentName
  };

  return (
    <div className={`border rounded-xl p-3 sm:p-4 transition-all duration-300 ${config.color} ${isLatest ? 'ring-2 ring-theme-primary ring-opacity-20 shadow-theme-card-hover' : 'shadow-theme-card'}`}>
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <span className="text-lg sm:text-2xl flex-shrink-0">{config.icon}</span>
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-xs sm:text-sm text-theme-text truncate">{config.name}</h4>
            <p className="text-xs text-theme-text-muted hidden sm:block">{config.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-2">
          {message.confidence && (
            <div className="px-1.5 sm:px-2 py-1 bg-theme-bg-secondary rounded text-center">
              <span className="text-xs font-medium text-theme-text-secondary whitespace-nowrap">
                {Math.round(message.confidence * 100)}%
              </span>
            </div>
          )}
          <div className="text-xs text-theme-text-muted whitespace-nowrap">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              ...(window.innerWidth > 640 && { second: '2-digit' })
            })}
          </div>
        </div>
      </div>

      <div className="text-xs sm:text-sm text-theme-text-secondary leading-relaxed whitespace-pre-wrap break-words">
        {message.message}
      </div>
    </div>
  );
}

// Connection and status indicators
function ConversationStatusBadge({
  status,
  isConnected
}: {
  status: 'initializing' | 'active' | 'completed' | 'error';
  isConnected: boolean;
}) {
  if (!isConnected) {
    return <StatusBadge status="error" label="Disconnected" size="sm" />;
  }

  const statusMap = {
    'initializing': { status: 'loading' as const, label: 'Initializing' },
    'active': { status: 'online' as const, label: 'Live Conversation' },
    'completed': { status: 'online' as const, label: 'Complete' },
    'error': { status: 'error' as const, label: 'Error' }
  };

  const config = statusMap[status];
  return <StatusBadge status={config.status} label={config.label} size="sm" />;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-theme-bg-secondary rounded-xl border-2 border-dashed border-theme-border">
      <div className="flex space-x-1">
        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-theme-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-theme-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-theme-primary rounded-full animate-bounce"></div>
      </div>
      <span className="text-xs sm:text-sm text-theme-text-muted font-medium">Agents are analyzing...</span>
    </div>
  );
}

export default LiveConversationDisplay;