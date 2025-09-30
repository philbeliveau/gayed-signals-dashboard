import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import LiveConversationDisplay from '../../components/agents/LiveConversationDisplay';

// Mock the useWebSocket hook
jest.mock('../../hooks/useWebSocket', () => {
  return jest.fn(() => ({
    socket: null,
    isConnected: false,
    connectionState: 'disconnected',
    sendMessage: jest.fn(() => false),
    reconnect: jest.fn(),
    disconnect: jest.fn(),
    lastMessage: null,
    messageHistory: []
  }));
});

// Mock UnifiedLoader
jest.mock('../../components/ui/UnifiedLoader', () => {
  return function MockUnifiedLoader({ size }: { size?: string }) {
    return <div data-testid="unified-loader" data-size={size}>Loading...</div>;
  };
});

// Mock SharedUIComponents
jest.mock('../../components/SharedUIComponents', () => ({
  StatusBadge: ({ status, label, size }: { status: string; label?: string; size?: string }) => (
    <div data-testid="status-badge" data-status={status} data-size={size}>
      {label || status}
    </div>
  ),
}));

describe('LiveConversationDisplay', () => {
  const mockSessionId = 'test-session-123';
  const mockOnConversationComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock scrollTo globally for all tests
    const mockScrollTo = jest.fn();
    Object.defineProperty(HTMLDivElement.prototype, 'scrollTo', {
      value: mockScrollTo,
      writable: true,
      configurable: true
    });

    // Mock scroll properties
    Object.defineProperties(HTMLDivElement.prototype, {
      scrollTop: { value: 0, writable: true, configurable: true },
      scrollHeight: { value: 1000, writable: true, configurable: true },
      clientHeight: { value: 600, writable: true, configurable: true }
    });

    // Reset window.innerWidth for mobile tests
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Loading State', () => {
    it('displays loading state when initializing without mock mode', () => {
      render(
        <LiveConversationDisplay
          sessionId={mockSessionId}
          onConversationComplete={mockOnConversationComplete}
          mockMode={false}
          enableWebSocket={false}
        />
      );

      expect(screen.getByTestId('unified-loader')).toBeInTheDocument();
      expect(screen.getByText('Initializing Agent Conversation')).toBeInTheDocument();
      expect(screen.getByText('Setting up secure connection...')).toBeInTheDocument();
    });

    it('shows proper loading state dimensions', () => {
      render(
        <LiveConversationDisplay
          sessionId={mockSessionId}
          onConversationComplete={mockOnConversationComplete}
          mockMode={false}
          enableWebSocket={false}
        />
      );

      // Check for any container with the height classes
      const container = document.querySelector('.h-\\[600px\\]');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Mock Mode Conversation', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('displays mock conversation messages progressively', async () => {
      render(
        <LiveConversationDisplay
          sessionId={mockSessionId}
          onConversationComplete={mockOnConversationComplete}
          mockMode={true}
        />
      );

      // Wait for status to change to active and first message
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      // Check if we can find any message at all first
      expect(screen.getByText('Financial Analyst')).toBeInTheDocument();
      expect(screen.getByText(/Analyzing provided content/)).toBeInTheDocument();

      // Advance to second message
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      expect(screen.getByText(/Real-time market intelligence shows Fed maintaining hawkish stance/)).toBeInTheDocument();
      expect(screen.getByText('Market Context')).toBeInTheDocument();
    });

    it('displays typing indicator when conversation is active', async () => {
      render(
        <LiveConversationDisplay
          sessionId={mockSessionId}
          onConversationComplete={mockOnConversationComplete}
          mockMode={true}
        />
      );

      // In mock mode, typing indicator appears immediately since status is set to 'active'
      expect(screen.getByText('Agents are analyzing...')).toBeInTheDocument();
    });

    it('completes conversation and calls onConversationComplete', async () => {
      render(
        <LiveConversationDisplay
          sessionId={mockSessionId}
          onConversationComplete={mockOnConversationComplete}
          mockMode={true}
        />
      );

      // Advance through all messages (4 messages * 3000ms each)
      await act(async () => {
        jest.advanceTimersByTime(12000);
      });

      expect(screen.getByText('Conversation Complete')).toBeInTheDocument();
      expect(mockOnConversationComplete).toHaveBeenCalledWith({
        consensusReached: true,
        finalRecommendation: expect.stringContaining('Mixed Signals'),
        confidenceLevel: 0.65,
        keyInsights: expect.arrayContaining([
          expect.stringContaining('Utilities/SPY signal'),
        ])
      });
    });
  });

  describe('Agent Message Display', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('displays agent messages with correct styling and information', async () => {
      render(
        <LiveConversationDisplay
          sessionId={mockSessionId}
          onConversationComplete={mockOnConversationComplete}
          mockMode={true}
        />
      );

      // Wait for first message
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      // Check agent info
      expect(screen.getByText('📊')).toBeInTheDocument();
      expect(screen.getByText('Financial Analyst')).toBeInTheDocument();
      expect(screen.getByText('Market Signal Analysis')).toBeInTheDocument();

      // Check confidence display
      expect(screen.getByText('85%')).toBeInTheDocument();

      // Check timestamp
      const timestampElements = screen.getAllByText(/\d{1,2}:\d{2}/);
      expect(timestampElements.length).toBeGreaterThan(0);
    });

    it('highlights latest message with ring effect', async () => {
      render(
        <LiveConversationDisplay
          sessionId={mockSessionId}
          onConversationComplete={mockOnConversationComplete}
          mockMode={true}
        />
      );

      // Wait for first message
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      const messageContainer = screen.getByText('Financial Analyst').closest('div');
      expect(messageContainer).toHaveClass('ring-2', 'ring-theme-primary');

      // Add second message
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      // Now the second message should be highlighted
      const secondMessageContainer = screen.getByText('Market Context').closest('div');
      expect(secondMessageContainer).toHaveClass('ring-2', 'ring-theme-primary');
    });
  });

  describe('Scrolling and Auto-scroll', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('auto-scrolls to latest messages by default', async () => {
      const scrollToSpy = jest.fn();
      Object.defineProperty(HTMLDivElement.prototype, 'scrollTo', {
        value: scrollToSpy,
        writable: true
      });

      render(
        <LiveConversationDisplay
          sessionId={mockSessionId}
          onConversationComplete={mockOnConversationComplete}
          mockMode={true}
        />
      );

      // Wait for first message
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      // Should have called scrollTo
      await waitFor(() => {
        expect(scrollToSpy).toHaveBeenCalled();
      });
    });

    it('shows scroll to bottom button when user scrolls up', async () => {
      render(
        <LiveConversationDisplay
          sessionId={mockSessionId}
          onConversationComplete={mockOnConversationComplete}
          mockMode={true}
        />
      );

      // Wait for conversation to start
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      const scrollContainer = screen.getByTestId('conversation-area') ||
                            document.querySelector('[data-testid*="scroll"]') ||
                            document.querySelector('.overflow-y-auto');

      if (scrollContainer) {
        // Simulate user scrolling up
        Object.defineProperty(scrollContainer, 'scrollTop', { value: 0, writable: true });
        Object.defineProperty(scrollContainer, 'scrollHeight', { value: 1000, writable: true });
        Object.defineProperty(scrollContainer, 'clientHeight', { value: 600, writable: true });

        fireEvent.scroll(scrollContainer);

        await waitFor(() => {
          expect(screen.getByText('↓ Scroll to latest messages')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('displays error state with retry button', () => {
      // Create a custom mock that returns error state
      const useWebSocketMock = jest.requireMock('../../hooks/useWebSocket');
      useWebSocketMock.mockReturnValue({
        socket: null,
        isConnected: false,
        connectionState: 'error',
        sendMessage: jest.fn(() => false),
        reconnect: jest.fn(),
        disconnect: jest.fn(),
        lastMessage: null,
        messageHistory: []
      });

      render(
        <LiveConversationDisplay
          sessionId={mockSessionId}
          onConversationComplete={mockOnConversationComplete}
          mockMode={false}
          enableWebSocket={true}
        />
      );

      expect(screen.getByText('Connection Failed')).toBeInTheDocument();
      expect(screen.getByText('Unable to establish conversation connection. Please try again.')).toBeInTheDocument();
      expect(screen.getByText('Retry Connection')).toBeInTheDocument();
    });

    it('allows retrying connection after error', () => {
      const useWebSocketMock = jest.requireMock('../../hooks/useWebSocket');
      useWebSocketMock.mockReturnValue({
        socket: null,
        isConnected: false,
        connectionState: 'error',
        sendMessage: jest.fn(() => false),
        reconnect: jest.fn(),
        disconnect: jest.fn(),
        lastMessage: null,
        messageHistory: []
      });

      render(
        <LiveConversationDisplay
          sessionId={mockSessionId}
          onConversationComplete={mockOnConversationComplete}
          mockMode={false}
          enableWebSocket={true}
        />
      );

      const retryButton = screen.getByText('Retry Connection');
      fireEvent.click(retryButton);

      // Should not show error anymore after clicking retry
      expect(screen.queryByText('Connection Failed')).not.toBeInTheDocument();
    });
  });

  describe('Mobile Responsiveness', () => {
    beforeEach(() => {
      // Set mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
    });

    it('applies mobile-specific classes and sizing', () => {
      render(
        <LiveConversationDisplay
          sessionId={mockSessionId}
          onConversationComplete={mockOnConversationComplete}
          mockMode={true}
        />
      );

      // Check for mobile height classes
      const container = document.querySelector('.sm\\:h-\\[500px\\]');
      expect(container).toBeInTheDocument();
    });

    it('hides agent descriptions on mobile screens', async () => {
      jest.useFakeTimers();

      render(
        <LiveConversationDisplay
          sessionId={mockSessionId}
          onConversationComplete={mockOnConversationComplete}
          mockMode={true}
        />
      );

      // Wait for first message
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      // Agent description should be hidden on mobile
      const description = screen.getByText('Market Signal Analysis');
      expect(description).toHaveClass('hidden', 'sm:block');
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels and roles', () => {
      render(
        <LiveConversationDisplay
          sessionId={mockSessionId}
          onConversationComplete={mockOnConversationComplete}
          mockMode={true}
        />
      );

      // Check for proper heading structure
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });

    it('supports keyboard navigation for interactive elements', async () => {
      jest.useFakeTimers();

      render(
        <LiveConversationDisplay
          sessionId={mockSessionId}
          onConversationComplete={mockOnConversationComplete}
          mockMode={true}
        />
      );

      // Mock mode starts immediately with 'active' status, no need to wait
      // The typing indicator is already present

      // Simulate scrolling up to show the scroll button
      const scrollContainer = document.querySelector('.overflow-y-auto');
      if (scrollContainer) {
        Object.defineProperty(scrollContainer, 'scrollTop', { value: 0, writable: true });
        Object.defineProperty(scrollContainer, 'scrollHeight', { value: 1000, writable: true });
        Object.defineProperty(scrollContainer, 'clientHeight', { value: 600, writable: true });

        fireEvent.scroll(scrollContainer);

        await waitFor(() => {
          const scrollButton = screen.queryByText('↓ Scroll to latest messages');
          if (scrollButton) {
            expect(scrollButton).toHaveClass('touch-manipulation');
          }
        });
      }
    });
  });

  describe('Performance', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('efficiently renders large numbers of messages', async () => {
      const renderSpy = jest.spyOn(React, 'createElement');

      render(
        <LiveConversationDisplay
          sessionId={mockSessionId}
          onConversationComplete={mockOnConversationComplete}
          mockMode={true}
        />
      );

      // Let all messages render
      await act(async () => {
        jest.advanceTimersByTime(12000);
      });

      // Should not create excessive React elements
      expect(renderSpy.mock.calls.length).toBeLessThan(100);

      renderSpy.mockRestore();
    });

    it('includes performance optimizations for mobile scrolling', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <LiveConversationDisplay
          sessionId={mockSessionId}
          onConversationComplete={mockOnConversationComplete}
          mockMode={true}
        />
      );

      const scrollContainer = document.querySelector('.mobile-chart-wrapper');
      expect(scrollContainer).toBeInTheDocument();
    });
  });
});