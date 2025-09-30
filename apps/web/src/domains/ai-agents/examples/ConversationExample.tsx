/**
 * ConversationExample Component
 * Story 1.8: Multi-Agent Conversation Integration Example
 *
 * Example showing how to use the conversation system
 */

import React from 'react';
import { ConversationStarter } from '../components/ConversationStarter';
import { ConversationDisplay } from '../components/ConversationDisplay';
import { useConversation } from '../hooks/useConversation';
import type { ContentSource } from '../types/conversation';
import type { ConsensusSignal } from '../../trading-signals/types/index';

interface ConversationExampleProps {
  signalContext?: ConsensusSignal;
}

export function ConversationExample({ signalContext }: ConversationExampleProps) {
  const {
    // State
    session,
    isLoading,
    isConnected,
    error,
    messages,
    consensus,

    // Actions
    startConversation,
    stopConversation,
    clearError,
    exportConversation
  } = useConversation({
    onMessage: (message) => {
      console.log('New agent message:', message);
    },
    onStatusChange: (status) => {
      console.log('Conversation status changed:', status);
    },
    onConsensus: (consensus) => {
      console.log('Consensus reached:', consensus);
    },
    onError: (error) => {
      console.error('Conversation error:', error);
    }
  });

  const handleStartConversation = (content: ContentSource, signalContext?: ConsensusSignal) => {
    startConversation(content, signalContext);
  };

  const handleExport = (format: 'json' | 'pdf' | 'markdown') => {
    exportConversation(format).catch(error => {
      console.error('Export failed:', error);
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">AutoGen Multi-Agent Conversation</h1>
        <p className="text-gray-600">
          Enter financial content below to trigger a structured debate between three specialized AI agents:
          Financial Analyst, Market Context, and Risk Challenger.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-medium text-red-800">Conversation Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Conversation Starter */}
      {!session && (
        <ConversationStarter
          onStartConversation={handleStartConversation}
          isLoading={isLoading}
          signalContext={signalContext}
        />
      )}

      {/* Conversation Display */}
      {(session || isLoading) && (
        <ConversationDisplay
          session={session}
          messages={messages}
          consensus={consensus}
          isConnected={isConnected}
          isLoading={isLoading}
          error={error}
          onExport={handleExport}
          onStop={stopConversation}
        />
      )}

      {/* Debug Information (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Debug Information</h3>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Session ID: {session?.id || 'None'}</div>
            <div>Status: {session?.status || 'No session'}</div>
            <div>Messages: {messages.length}</div>
            <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
            <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
            <div>Consensus: {consensus ? 'Reached' : 'Not yet'}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Usage example with signal context
export function ConversationWithSignalExample() {
  // Example signal context (would come from SignalOrchestrator)
  const mockSignalContext: ConsensusSignal = {
    consensus: 'Risk-Off',
    confidence: 0.78,
    riskOnCount: 1,
    riskOffCount: 3,
    neutralCount: 1,
    signals: [
      {
        type: 'utilities_spy',
        signal: 'Risk-Off',
        value: 0.85,
        confidence: 0.82,
        timestamp: new Date().toISOString(),
        metadata: { ratio: 0.85, trend: 'defensive' }
      },
      {
        type: 'lumber_gold',
        signal: 'Risk-Off',
        value: 1.15,
        confidence: 0.75,
        timestamp: new Date().toISOString(),
        metadata: { ratio: 1.15, trend: 'commodity_defensive' }
      }
    ],
    timestamp: new Date().toISOString()
  };

  return <ConversationExample signalContext={mockSignalContext} />;
}

export default ConversationExample;