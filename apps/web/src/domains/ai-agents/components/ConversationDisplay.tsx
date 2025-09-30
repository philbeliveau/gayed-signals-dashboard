/**
 * ConversationDisplay Component
 * Story 1.8: Multi-Agent Conversation UI Component
 *
 * Displays real-time AutoGen agent conversations with professional styling
 */

import React, { useEffect, useRef } from 'react';
import { Clock, Users, MessageSquare, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import type {
  ConversationSession,
  AgentMessage,
  ConversationConsensus,
  ConversationStatus
} from '../types/conversation';

interface ConversationDisplayProps {
  session: ConversationSession | null;
  messages: AgentMessage[];
  consensus: ConversationConsensus | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  onExport?: (format: 'json' | 'pdf' | 'markdown') => void;
  onStop?: () => void;
}

// Agent styling configuration
const AGENT_CONFIGS = {
  financial_analyst: {
    name: 'Financial Analyst',
    icon: '📊',
    color: 'bg-blue-50 border-blue-200 text-blue-900',
    headerColor: 'bg-blue-100 text-blue-800',
    role: 'Quantitative Analysis & Market Signals'
  },
  market_context: {
    name: 'Market Context',
    icon: '🌍',
    color: 'bg-green-50 border-green-200 text-green-900',
    headerColor: 'bg-green-100 text-green-800',
    role: 'Economic Environment & Context'
  },
  risk_challenger: {
    name: 'Risk Challenger',
    icon: '⚠️',
    color: 'bg-orange-50 border-orange-200 text-orange-900',
    headerColor: 'bg-orange-100 text-orange-800',
    role: 'Contrarian Analysis & Risk Assessment'
  }
};

const STATUS_CONFIGS: Record<ConversationStatus, { label: string; color: string; icon: React.ReactNode }> = {
  initializing: {
    label: 'Initializing',
    color: 'text-gray-600 bg-gray-100',
    icon: <Clock className="h-4 w-4" />
  },
  active: {
    label: 'Active Debate',
    color: 'text-blue-600 bg-blue-100',
    icon: <MessageSquare className="h-4 w-4" />
  },
  generating_consensus: {
    label: 'Generating Consensus',
    color: 'text-yellow-600 bg-yellow-100',
    icon: <TrendingUp className="h-4 w-4" />
  },
  completed: {
    label: 'Completed',
    color: 'text-green-600 bg-green-100',
    icon: <CheckCircle className="h-4 w-4" />
  },
  failed: {
    label: 'Failed',
    color: 'text-red-600 bg-red-100',
    icon: <AlertTriangle className="h-4 w-4" />
  },
  timeout: {
    label: 'Timeout',
    color: 'text-red-600 bg-red-100',
    icon: <AlertTriangle className="h-4 w-4" />
  }
};

export function ConversationDisplay({
  session,
  messages,
  consensus,
  isConnected,
  isLoading,
  error,
  onExport,
  onStop
}: ConversationDisplayProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 text-red-800 mb-2">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="font-semibold">Conversation Error</h3>
        </div>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (isLoading && !session) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Initializing AutoGen Agents</h3>
        <p className="text-gray-600">Setting up financial analyst, market context, and risk challenger agents...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Conversation</h3>
        <p className="text-gray-600">Start a conversation to see agent debates here.</p>
      </div>
    );
  }

  const status = session.status;
  const statusConfig = STATUS_CONFIGS[status];

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
              {statusConfig.icon}
              <span>{statusConfig.label}</span>
            </div>

            <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
              isConnected ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
            }`}>
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Metrics */}
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <MessageSquare className="h-4 w-4" />
                <span>{messages.length}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>{session.agents.length}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{Math.round((Date.now() - session.metrics.startTime) / 1000)}s</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              {onExport && (
                <button
                  onClick={() => onExport('json')}
                  className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Export
                </button>
              )}
              {onStop && status === 'active' && (
                <button
                  onClick={onStop}
                  className="px-3 py-1 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100"
                >
                  Stop
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Source */}
        <div className="mt-3 p-3 bg-white border border-gray-200 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Analyzing Content</h4>
          <p className="text-sm text-gray-700 font-medium">{session.contentSource.title}</p>
          {session.contentSource.url && (
            <a
              href={session.contentSource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block"
            >
              {session.contentSource.url}
            </a>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="h-96 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Waiting for agents to start the debate...</p>
          </div>
        ) : (
          messages.map((message) => (
            <AgentMessageCard key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Consensus */}
      {consensus && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <ConsensusSummary consensus={consensus} />
        </div>
      )}
    </div>
  );
}

function AgentMessageCard({ message }: { message: AgentMessage }) {
  const agentConfig = AGENT_CONFIGS[message.agentId as keyof typeof AGENT_CONFIGS];

  if (!agentConfig) {
    return null;
  }

  return (
    <div className={`border rounded-lg p-4 ${agentConfig.color}`}>
      {/* Agent Header */}
      <div className={`flex items-center justify-between mb-3 px-3 py-2 rounded-lg ${agentConfig.headerColor}`}>
        <div className="flex items-center space-x-2">
          <span className="text-lg">{agentConfig.icon}</span>
          <div>
            <h4 className="font-semibold text-sm">{agentConfig.name}</h4>
            <p className="text-xs opacity-75">{agentConfig.role}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <span className="font-medium">{message.confidence}% confidence</span>
          <span className="opacity-75">{message.timestamp.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Message Content */}
      <div className="prose prose-sm max-w-none">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
      </div>

      {/* Message Type Badge */}
      <div className="mt-2 flex justify-end">
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white bg-opacity-50">
          {message.messageType}
        </span>
      </div>
    </div>
  );
}

function ConsensusSummary({ consensus }: { consensus: ConversationConsensus }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-3">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <h3 className="font-semibold text-gray-900">Conversation Consensus</h3>
        <span className="text-sm text-gray-500">({consensus.confidence}% confidence)</span>
      </div>

      <div className="space-y-3">
        {/* Decision */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-1">Decision</h4>
          <p className="text-sm text-gray-900 font-medium bg-gray-50 px-3 py-2 rounded">
            {consensus.decision}
          </p>
        </div>

        {/* Reasoning */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-1">Reasoning</h4>
          <p className="text-sm text-gray-900 leading-relaxed">{consensus.reasoning}</p>
        </div>

        {/* Key Points */}
        {consensus.keyPoints.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Key Points</h4>
            <ul className="space-y-1">
              {consensus.keyPoints.map((point, index) => (
                <li key={index} className="text-sm text-gray-900 flex items-start space-x-2">
                  <span className="text-gray-400 mt-1">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Timestamp */}
        <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
          Consensus reached at {consensus.timestamp.toLocaleString()}
        </div>
      </div>
    </div>
  );
}