'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AgentMessage, ConversationStatus, ConversationResult } from '@/types/agents';
import { StatusBadge } from '@/components/SharedUIComponents';
import UnifiedLoader from '@/components/ui/UnifiedLoader';
import { useAutoGenConversation } from '@/hooks/useAutoGenConversation';
import { AGENT_CONFIG, DEFAULT_AGENT_CONFIG } from '@/constants/agentConfig';

interface LiveConversationDisplayProps {
  sessionId: string;
  content?: string;
  contentType?: string;
  onConversationComplete?: (result: ConversationResult) => void;
  className?: string;
  enableAutoGen?: boolean;
  autoStart?: boolean;
}

export function LiveConversationDisplay({
  sessionId,
  content = '',
  contentType = 'text',
  onConversationComplete,
  className = '',
  enableAutoGen = true,
  autoStart = false
}: LiveConversationDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const hasStarted = useRef(false);

  // Use the new AutoGen conversation hook
  const {
    messages,
    status,
    isConnected,
    isUsingDemo,
    error,
    startConversation,
    retryConnection,
    clearMessages
  } = useAutoGenConversation(sessionId, {
    content,
    contentType,
    enableAutoGen,
    onComplete: onConversationComplete,
    onFallbackMode: (reason) => {
      console.warn(`Conversation fell back to demo mode: ${reason}`);
    }
  });

  // Auto-start conversation if content is provided and autoStart is enabled
  useEffect(() => {
    if (autoStart && content.trim() && !hasStarted.current) {
      hasStarted.current = true;
      startConversation();
    }
  }, [autoStart, content, startConversation]);

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

  // Show loading state or start button
  if (status === 'initializing' && messages.length === 0) {
    if (!autoStart && !hasStarted.current && content.trim()) {
      // Show start button when not auto-starting
      return (
        <div className={`bg-theme-card border border-theme-border rounded-xl h-[600px] max-h-[600px] md:h-[500px] md:max-h-[500px] flex flex-col shadow-theme-card ${className}`}>
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center space-y-4 max-w-sm">
              <div className="w-16 h-16 mx-auto bg-theme-primary-bg rounded-full flex items-center justify-center">
                <span className="text-2xl text-theme-primary">🤖</span>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-theme-text">Ready to Start Agent Conversation</h3>
                <p className="text-theme-text-muted text-sm">
                  Click below to start a {enableAutoGen ? 'live AutoGen' : 'demo'} conversation analyzing your content.
                </p>
              </div>
              <button
                onClick={() => {
                  hasStarted.current = true;
                  startConversation();
                }}
                className="px-6 py-3 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors touch-manipulation font-medium"
              >
                Start {enableAutoGen ? 'AutoGen' : 'Demo'} Conversation
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Show loading state when initializing
    return (
      <div className={`bg-theme-card border border-theme-border rounded-xl h-[600px] max-h-[600px] md:h-[500px] md:max-h-[500px] flex flex-col shadow-theme-card ${className}`}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <UnifiedLoader size="lg" />
            <div className="space-y-1">
              <p className="text-theme-text font-medium">
                {enableAutoGen ? 'Connecting to AutoGen...' : 'Initializing Demo...'}
              </p>
              <p className="text-theme-text-muted text-sm">Setting up agent conversation...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (status === 'error' && !isUsingDemo) {
    return (
      <div className={`bg-theme-card border border-theme-danger-border rounded-xl h-[600px] max-h-[600px] md:h-[500px] md:max-h-[500px] flex flex-col shadow-theme-card ${className}`}>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-16 h-16 mx-auto bg-theme-danger-bg rounded-full flex items-center justify-center">
              <span className="text-2xl text-theme-danger">⚠️</span>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-theme-text">AutoGen Connection Failed</h3>
              <p className="text-theme-text-muted text-sm">
                {error || 'Unable to connect to AutoGen backend. You can try again or continue in demo mode.'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={retryConnection}
                className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors touch-manipulation"
              >
                Retry AutoGen
              </button>
              <button
                onClick={() => {
                  clearMessages();
                  hasStarted.current = true;
                  // Force demo mode by disabling AutoGen
                  enableAutoGen = false;
                  startConversation();
                }}
                className="px-4 py-2 bg-theme-secondary text-theme-text rounded-lg hover:bg-theme-secondary-hover transition-colors touch-manipulation"
              >
                Use Demo Mode
              </button>
            </div>
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
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-semibold text-theme-text truncate">
              {isUsingDemo ? 'Demo: ' : ''}Agent Conversation
            </h3>
            {enableAutoGen && !isUsingDemo && (
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-theme-success-bg border border-theme-success-border rounded text-xs text-theme-success">
                <span className="w-1.5 h-1.5 bg-theme-success rounded-full"></span>
                AutoGen
              </div>
            )}
          </div>
          <ConversationStatusBadge
            status={status}
            isConnected={isConnected}
            isUsingDemo={isUsingDemo}
            enableAutoGen={enableAutoGen}
          />
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
  isConnected,
  isUsingDemo,
  enableAutoGen
}: {
  status: 'initializing' | 'active' | 'completed' | 'error';
  isConnected: boolean;
  isUsingDemo?: boolean;
  enableAutoGen?: boolean;
}) {
  if (!isConnected && !isUsingDemo) {
    return <StatusBadge status="error" label="Disconnected" size="sm" />;
  }

  let statusConfig;

  if (isUsingDemo) {
    statusConfig = {
      'initializing': { status: 'loading' as const, label: 'Demo Starting' },
      'active': { status: 'neutral' as const, label: 'Demo Mode' },
      'completed': { status: 'online' as const, label: 'Demo Complete' },
      'error': { status: 'error' as const, label: 'Demo Error' }
    };
  } else if (enableAutoGen) {
    statusConfig = {
      'initializing': { status: 'loading' as const, label: 'AutoGen Starting' },
      'active': { status: 'online' as const, label: 'AutoGen Live' },
      'completed': { status: 'online' as const, label: 'AutoGen Complete' },
      'error': { status: 'error' as const, label: 'AutoGen Error' }
    };
  } else {
    statusConfig = {
      'initializing': { status: 'loading' as const, label: 'Initializing' },
      'active': { status: 'online' as const, label: 'Live Conversation' },
      'completed': { status: 'online' as const, label: 'Complete' },
      'error': { status: 'error' as const, label: 'Error' }
    };
  }

  const config = statusConfig[status];
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