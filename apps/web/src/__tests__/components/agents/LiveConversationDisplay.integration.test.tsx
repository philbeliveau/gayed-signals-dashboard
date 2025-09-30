/**
 * LiveConversationDisplay Integration Tests
 * Story 2.8: AutoGen-WebSocket Integration Bridge
 *
 * Tests the updated LiveConversationDisplay component with AutoGen integration.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import LiveConversationDisplay from '@/components/agents/LiveConversationDisplay';

// Mock Clerk authentication
jest.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    userId: 'test-user-123',
    getToken: jest.fn().mockResolvedValue('mock-token'),
    isLoaded: true,
    isSignedIn: true
  })
}));

// Mock the AutoGen conversation hook
const mockStartConversation = jest.fn();
const mockRetryConnection = jest.fn();
const mockClearMessages = jest.fn();

jest.mock('@/hooks/useAutoGenConversation', () => ({
  useAutoGenConversation: jest.fn(() => ({
    messages: [],
    status: 'initializing',
    isConnected: false,
    isUsingDemo: false,
    error: null,
    startConversation: mockStartConversation,
    retryConnection: mockRetryConnection,
    clearMessages: mockClearMessages
  }))
}));

// Mock agent config
jest.mock('@/constants/agentConfig', () => ({
  AGENT_CONFIG: {
    FINANCIAL_ANALYST: {
      name: 'Financial Analyst',
      icon: '📊',
      color: 'border-blue-200 bg-blue-50',
      description: 'Market analysis specialist'
    },
    MARKET_CONTEXT: {
      name: 'Market Context',
      icon: '🌍',
      color: 'border-green-200 bg-green-50',
      description: 'Economic context provider'
    },
    RISK_CHALLENGER: {
      name: 'Risk Challenger',
      icon: '⚠️',
      color: 'border-red-200 bg-red-50',
      description: 'Risk assessment specialist'
    }
  },
  DEFAULT_AGENT_CONFIG: {
    name: 'Agent',
    icon: '🤖',
    color: 'border-gray-200 bg-gray-50',
    description: 'AI Agent'
  }
}));

describe('LiveConversationDisplay with AutoGen Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('displays start button when autoStart is false', () => {
    render(
      <LiveConversationDisplay
        sessionId="test-session"
        content="Test market analysis content"
        contentType="text"
        enableAutoGen={true}
        autoStart={false}
      />
    );

    expect(screen.getByText('Ready to Start Agent Conversation')).toBeInTheDocument();
    expect(screen.getByText('Start AutoGen Conversation')).toBeInTheDocument();
  });

  test('shows AutoGen indicator when AutoGen is enabled', () => {
    const { rerender } = render(
      <LiveConversationDisplay
        sessionId="test-session"
        content="Test content"
        enableAutoGen={true}
        autoStart={false}
      />
    );

    // Simulate active conversation
    const { useAutoGenConversation } = require('@/hooks/useAutoGenConversation');
    useAutoGenConversation.mockReturnValue({
      messages: [],
      status: 'active',
      isConnected: true,
      isUsingDemo: false,
      error: null,
      startConversation: mockStartConversation,
      retryConnection: mockRetryConnection,
      clearMessages: mockClearMessages
    });

    rerender(
      <LiveConversationDisplay
        sessionId="test-session"
        content="Test content"
        enableAutoGen={true}
        autoStart={false}
      />
    );

    expect(screen.getByText('Agent Conversation')).toBeInTheDocument();
  });

  test('shows demo mode indicator when using demo', () => {
    const { useAutoGenConversation } = require('@/hooks/useAutoGenConversation');
    useAutoGenConversation.mockReturnValue({
      messages: [],
      status: 'active',
      isConnected: true,
      isUsingDemo: true,
      error: null,
      startConversation: mockStartConversation,
      retryConnection: mockRetryConnection,
      clearMessages: mockClearMessages
    });

    render(
      <LiveConversationDisplay
        sessionId="test-session"
        content="Test content"
        enableAutoGen={true}
      />
    );

    expect(screen.getByText('Demo: Agent Conversation')).toBeInTheDocument();
  });

  test('handles start conversation button click', async () => {
    render(
      <LiveConversationDisplay
        sessionId="test-session"
        content="Test market analysis"
        enableAutoGen={true}
        autoStart={false}
      />
    );

    const startButton = screen.getByText('Start AutoGen Conversation');
    fireEvent.click(startButton);

    expect(mockStartConversation).toHaveBeenCalledTimes(1);
  });

  test('displays agent messages correctly', () => {
    const mockMessages = [
      {
        id: '1',
        agentName: 'Financial Analyst',
        agentType: 'FINANCIAL_ANALYST' as const,
        role: 'analyst',
        message: 'Market shows bullish signals',
        timestamp: '2025-01-30T12:00:00Z',
        confidence: 0.85
      },
      {
        id: '2',
        agentName: 'Market Context',
        agentType: 'MARKET_CONTEXT' as const,
        role: 'context',
        message: 'Fed policy remains hawkish',
        timestamp: '2025-01-30T12:01:00Z',
        confidence: 0.78
      }
    ];

    const { useAutoGenConversation } = require('@/hooks/useAutoGenConversation');
    useAutoGenConversation.mockReturnValue({
      messages: mockMessages,
      status: 'active',
      isConnected: true,
      isUsingDemo: false,
      error: null,
      startConversation: mockStartConversation,
      retryConnection: mockRetryConnection,
      clearMessages: mockClearMessages
    });

    render(
      <LiveConversationDisplay
        sessionId="test-session"
        content="Test content"
        enableAutoGen={true}
      />
    );

    expect(screen.getByText('Market shows bullish signals')).toBeInTheDocument();
    expect(screen.getByText('Fed policy remains hawkish')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument();
  });

  test('shows error state with retry options', () => {
    const { useAutoGenConversation } = require('@/hooks/useAutoGenConversation');
    useAutoGenConversation.mockReturnValue({
      messages: [],
      status: 'error',
      isConnected: false,
      isUsingDemo: false,
      error: 'Connection failed to AutoGen backend',
      startConversation: mockStartConversation,
      retryConnection: mockRetryConnection,
      clearMessages: mockClearMessages
    });

    render(
      <LiveConversationDisplay
        sessionId="test-session"
        content="Test content"
        enableAutoGen={true}
      />
    );

    expect(screen.getByText('AutoGen Connection Failed')).toBeInTheDocument();
    expect(screen.getByText('Connection failed to AutoGen backend')).toBeInTheDocument();
    expect(screen.getByText('Retry AutoGen')).toBeInTheDocument();
    expect(screen.getByText('Use Demo Mode')).toBeInTheDocument();
  });

  test('handles retry button click', () => {
    const { useAutoGenConversation } = require('@/hooks/useAutoGenConversation');
    useAutoGenConversation.mockReturnValue({
      messages: [],
      status: 'error',
      isConnected: false,
      isUsingDemo: false,
      error: 'Connection failed',
      startConversation: mockStartConversation,
      retryConnection: mockRetryConnection,
      clearMessages: mockClearMessages
    });

    render(
      <LiveConversationDisplay
        sessionId="test-session"
        content="Test content"
        enableAutoGen={true}
      />
    );

    const retryButton = screen.getByText('Retry AutoGen');
    fireEvent.click(retryButton);

    expect(mockRetryConnection).toHaveBeenCalledTimes(1);
  });

  test('shows completion state correctly', () => {
    const { useAutoGenConversation } = require('@/hooks/useAutoGenConversation');
    useAutoGenConversation.mockReturnValue({
      messages: [
        {
          id: '1',
          agentName: 'Financial Analyst',
          agentType: 'FINANCIAL_ANALYST' as const,
          role: 'analyst',
          message: 'Analysis complete',
          timestamp: '2025-01-30T12:00:00Z',
          confidence: 0.75
        }
      ],
      status: 'completed',
      isConnected: true,
      isUsingDemo: false,
      error: null,
      startConversation: mockStartConversation,
      retryConnection: mockRetryConnection,
      clearMessages: mockClearMessages
    });

    render(
      <LiveConversationDisplay
        sessionId="test-session"
        content="Test content"
        enableAutoGen={true}
      />
    );

    expect(screen.getByText('Analysis complete')).toBeInTheDocument();
    expect(screen.getByText('Conversation Complete')).toBeInTheDocument();
  });

  test('auto-starts conversation when autoStart is true', () => {
    render(
      <LiveConversationDisplay
        sessionId="test-session"
        content="Test content for auto-start"
        enableAutoGen={true}
        autoStart={true}
      />
    );

    // Should call startConversation automatically
    expect(mockStartConversation).toHaveBeenCalledTimes(1);
  });

  test('shows loading state during initialization', () => {
    const { useAutoGenConversation } = require('@/hooks/useAutoGenConversation');
    useAutoGenConversation.mockReturnValue({
      messages: [],
      status: 'initializing',
      isConnected: false,
      isUsingDemo: false,
      error: null,
      startConversation: mockStartConversation,
      retryConnection: mockRetryConnection,
      clearMessages: mockClearMessages
    });

    render(
      <LiveConversationDisplay
        sessionId="test-session"
        content="Test content"
        enableAutoGen={true}
        autoStart={true}
      />
    );

    expect(screen.getByText('Connecting to AutoGen...')).toBeInTheDocument();
    expect(screen.getByText('Setting up agent conversation...')).toBeInTheDocument();
  });

  test('displays typing indicator during active conversation', () => {
    const { useAutoGenConversation } = require('@/hooks/useAutoGenConversation');
    useAutoGenConversation.mockReturnValue({
      messages: [
        {
          id: '1',
          agentName: 'Financial Analyst',
          agentType: 'FINANCIAL_ANALYST' as const,
          role: 'analyst',
          message: 'Starting analysis...',
          timestamp: '2025-01-30T12:00:00Z',
          confidence: 0.8
        }
      ],
      status: 'active',
      isConnected: true,
      isUsingDemo: false,
      error: null,
      startConversation: mockStartConversation,
      retryConnection: mockRetryConnection,
      clearMessages: mockClearMessages
    });

    render(
      <LiveConversationDisplay
        sessionId="test-session"
        content="Test content"
        enableAutoGen={true}
      />
    );

    expect(screen.getByText('Agents are analyzing...')).toBeInTheDocument();
  });

  test('handles conversation completion callback', async () => {
    const mockOnComplete = jest.fn();

    render(
      <LiveConversationDisplay
        sessionId="test-session"
        content="Test content"
        enableAutoGen={true}
        onConversationComplete={mockOnComplete}
      />
    );

    // The hook should be called with the onComplete callback
    const { useAutoGenConversation } = require('@/hooks/useAutoGenConversation');
    expect(useAutoGenConversation).toHaveBeenCalledWith(
      'test-session',
      expect.objectContaining({
        content: 'Test content',
        enableAutoGen: true,
        onComplete: mockOnComplete
      })
    );
  });
});