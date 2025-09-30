/**
 * ProcessingStatusDisplay Component Tests
 *
 * Tests for the processing status display component that shows
 * real-time progress of content analysis and agent conversations.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProcessingStatusDisplay from '@/components/agents/ProcessingStatusDisplay';

// Mock performance.now for timing tests
Object.defineProperty(global.performance, 'now', {
  writable: true,
  value: jest.fn(() => Date.now()),
});

describe('ProcessingStatusDisplay', () => {
  const mockProps = {
    isProcessing: true,
    contentType: 'text' as const,
    stage: 'extracting' as const,
    progress: 45,
    currentAgent: 'Financial Analyst',
    className: 'test-class'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders processing status when active', () => {
      render(<ProcessingStatusDisplay {...mockProps} />);

      expect(screen.getByText('Processing Content')).toBeInTheDocument();
      expect(screen.getByText('Extracting and validating content...')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<ProcessingStatusDisplay {...mockProps} />);
      expect(container.firstChild).toHaveClass('test-class');
    });

    it('does not render when not processing', () => {
      const { container } = render(
        <ProcessingStatusDisplay {...mockProps} isProcessing={false} />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Content Type Display', () => {
    it('shows correct label for text content', () => {
      render(<ProcessingStatusDisplay {...mockProps} contentType="text" />);
      expect(screen.getByText('Direct Text Analysis')).toBeInTheDocument();
    });

    it('shows correct label for Substack content', () => {
      render(<ProcessingStatusDisplay {...mockProps} contentType="substack" />);
      expect(screen.getByText('Substack Article Analysis')).toBeInTheDocument();
    });

    it('shows correct label for YouTube content', () => {
      render(<ProcessingStatusDisplay {...mockProps} contentType="youtube" />);
      expect(screen.getByText('YouTube Video Analysis')).toBeInTheDocument();
    });
  });

  describe('Processing Stages', () => {
    it('displays extracting stage correctly', () => {
      render(<ProcessingStatusDisplay {...mockProps} stage="extracting" />);
      expect(screen.getByText('Extracting and validating content...')).toBeInTheDocument();
    });

    it('displays analyzing stage correctly', () => {
      render(<ProcessingStatusDisplay {...mockProps} stage="analyzing" />);
      expect(screen.getByText('Running financial analysis...')).toBeInTheDocument();
    });

    it('displays conversation stage correctly', () => {
      render(<ProcessingStatusDisplay {...mockProps} stage="conversation" />);
      expect(screen.getByText('AutoGen agents in conversation...')).toBeInTheDocument();
    });

    it('displays completion stage correctly', () => {
      render(<ProcessingStatusDisplay {...mockProps} stage="completion" />);
      expect(screen.getByText('Finalizing results and consensus...')).toBeInTheDocument();
    });
  });

  describe('Progress Indicators', () => {
    it('displays progress percentage', () => {
      render(<ProcessingStatusDisplay {...mockProps} progress={65} />);
      expect(screen.getByText('65%')).toBeInTheDocument();
    });

    it('shows progress bar with correct width', () => {
      render(<ProcessingStatusDisplay {...mockProps} progress={75} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    });

    it('handles 0% progress', () => {
      render(<ProcessingStatusDisplay {...mockProps} progress={0} />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('handles 100% progress', () => {
      render(<ProcessingStatusDisplay {...mockProps} progress={100} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('Agent Activity', () => {
    it('displays current agent when provided', () => {
      render(<ProcessingStatusDisplay {...mockProps} currentAgent="Market Context" />);
      expect(screen.getByText('Active: Market Context')).toBeInTheDocument();
    });

    it('shows generic message when no current agent', () => {
      render(<ProcessingStatusDisplay {...mockProps} currentAgent={undefined} />);
      expect(screen.getByText('Preparing agents...')).toBeInTheDocument();
    });

    it('shows agent activity with animated indicator', () => {
      render(<ProcessingStatusDisplay {...mockProps} currentAgent="Risk Challenger" />);
      const agentIndicator = screen.getByTestId('agent-activity-indicator');
      expect(agentIndicator).toHaveClass('animate-pulse');
    });
  });

  describe('Elapsed Time', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('shows elapsed time counter', () => {
      render(<ProcessingStatusDisplay {...mockProps} />);

      // Initial render should show 0 seconds
      expect(screen.getByText('0s')).toBeInTheDocument();
    });

    it('updates elapsed time every second', () => {
      render(<ProcessingStatusDisplay {...mockProps} />);

      // Fast-forward 3 seconds
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(screen.getByText('3s')).toBeInTheDocument();
    });

    it('formats time correctly for minutes', () => {
      render(<ProcessingStatusDisplay {...mockProps} />);

      // Fast-forward 75 seconds (1 minute, 15 seconds)
      act(() => {
        jest.advanceTimersByTime(75000);
      });

      expect(screen.getByText('1:15')).toBeInTheDocument();
    });

    it('stops timer when processing ends', () => {
      const { rerender } = render(<ProcessingStatusDisplay {...mockProps} />);

      // Fast-forward 2 seconds
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(screen.getByText('2s')).toBeInTheDocument();

      // Stop processing
      rerender(<ProcessingStatusDisplay {...mockProps} isProcessing={false} />);

      // Fast-forward more time - should not update
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Component should not be rendered when not processing
      expect(screen.queryByText('7s')).not.toBeInTheDocument();
    });
  });

  describe('Animation States', () => {
    it('shows pulsing animation during processing', () => {
      render(<ProcessingStatusDisplay {...mockProps} />);
      const progressContainer = screen.getByTestId('progress-container');
      expect(progressContainer).toHaveClass('animate-pulse');
    });

    it('shows spinning loading indicator', () => {
      render(<ProcessingStatusDisplay {...mockProps} />);
      const loadingSpinner = screen.getByTestId('loading-spinner');
      expect(loadingSpinner).toHaveClass('animate-spin');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes for progress bar', () => {
      render(<ProcessingStatusDisplay {...mockProps} progress={50} />);
      const progressBar = screen.getByRole('progressbar');

      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('has descriptive aria-label for processing status', () => {
      render(<ProcessingStatusDisplay {...mockProps} />);
      const statusContainer = screen.getByLabelText(/processing content/i);
      expect(statusContainer).toBeInTheDocument();
    });

    it('provides live region for status updates', () => {
      render(<ProcessingStatusDisplay {...mockProps} />);
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Visual Indicators', () => {
    it('shows different colors for different stages', () => {
      const { rerender } = render(
        <ProcessingStatusDisplay {...mockProps} stage="extracting" />
      );

      let progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveClass('bg-blue-500');

      rerender(<ProcessingStatusDisplay {...mockProps} stage="analyzing" />);
      progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveClass('bg-yellow-500');

      rerender(<ProcessingStatusDisplay {...mockProps} stage="conversation" />);
      progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveClass('bg-green-500');
    });

    it('shows stage-specific icons', () => {
      render(<ProcessingStatusDisplay {...mockProps} stage="conversation" />);
      const conversationIcon = screen.getByTestId('conversation-icon');
      expect(conversationIcon).toBeInTheDocument();
    });
  });

  describe('Stage Transitions', () => {
    it('handles stage progression smoothly', () => {
      const { rerender } = render(
        <ProcessingStatusDisplay {...mockProps} stage="extracting" progress={25} />
      );

      expect(screen.getByText('Extracting and validating content...')).toBeInTheDocument();

      rerender(
        <ProcessingStatusDisplay {...mockProps} stage="analyzing" progress={50} />
      );

      expect(screen.getByText('Running financial analysis...')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('maintains progress continuity across stage changes', () => {
      const { rerender } = render(
        <ProcessingStatusDisplay {...mockProps} stage="analyzing" progress={75} />
      );

      rerender(
        <ProcessingStatusDisplay {...mockProps} stage="conversation" progress={85} />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '85');
    });
  });

  describe('Error States', () => {
    it('handles missing or invalid props gracefully', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ProcessingStatusDisplay
          isProcessing={true}
          contentType={undefined as any}
          stage={undefined as any}
          progress={undefined as any}
        />
      );

      // Should still render without crashing
      expect(screen.getByText('Processing Content')).toBeInTheDocument();

      consoleError.mockRestore();
    });

    it('handles out-of-range progress values', () => {
      render(<ProcessingStatusDisplay {...mockProps} progress={150} />);

      // Should clamp to 100%
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });
  });
});