/**
 * ConversationExport Component Tests
 *
 * Tests for the conversation export component that provides
 * multi-format export capabilities for agent conversations.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ConversationExport from '@/components/agents/ConversationExport';
import type { AgentMessage } from '@/types/agents';

// Mock Clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock window.open
global.open = jest.fn();

describe('ConversationExport', () => {
  const mockConversation: AgentMessage[] = [
    {
      id: 'msg1',
      agentName: 'Financial Analyst',
      agentType: 'FINANCIAL_ANALYST',
      message: 'Based on the analysis, I see strong market indicators.',
      role: 'analyst',
      timestamp: '2025-01-01T10:00:00Z',
      confidence: 0.85
    },
    {
      id: 'msg2',
      agentName: 'Market Context',
      agentType: 'MARKET_CONTEXT',
      message: 'Current market conditions support this analysis.',
      role: 'context',
      timestamp: '2025-01-01T10:01:00Z',
      confidence: 0.78
    },
    {
      id: 'msg3',
      agentName: 'Risk Challenger',
      agentType: 'RISK_CHALLENGER',
      message: 'Consider potential downside risks in this scenario.',
      role: 'challenger',
      timestamp: '2025-01-01T10:02:00Z',
      confidence: 0.92
    }
  ];

  const mockAnalysisResult = {
    success: true,
    data: {
      textId: 'test-text-123',
      relevanceScore: 0.85,
      financialCategories: [
        { category: 'Market Analysis', relevance: 0.9, keywords: ['market', 'analysis'] }
      ],
      autoGenConversation: {
        conversationId: 'conv-123',
        agentResponses: mockConversation,
        consensus: 'Moderately bullish outlook with risk management',
        confidenceScore: 0.85
      },
      processingMetrics: {
        validationTime: 100,
        conversationTime: 2000,
        totalProcessingTime: 2100
      }
    }
  };

  const mockProps = {
    analysisResult: mockAnalysisResult,
    agentConversation: mockConversation,
    contentType: 'text' as const,
    className: 'test-class'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders export options', () => {
      render(<ConversationExport {...mockProps} />);

      expect(screen.getByText('Export Analysis')).toBeInTheDocument();
      expect(screen.getByText('Export Format')).toBeInTheDocument();
      expect(screen.getByText('Markdown')).toBeInTheDocument();
      expect(screen.getByText('JSON')).toBeInTheDocument();
      expect(screen.getByText('PDF')).toBeInTheDocument();
      // Check that there are multiple format options (button grid)
      expect(screen.getAllByRole('button').length).toBeGreaterThan(3);
    });

    it('applies custom className', () => {
      const { container } = render(<ConversationExport {...mockProps} />);
      expect(container.firstChild).toHaveClass('test-class');
    });

    it('displays conversation summary', () => {
      render(<ConversationExport {...mockProps} />);

      expect(screen.getByText('3 messages')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument(); // relevance score
      expect(screen.getByText('3')).toBeInTheDocument(); // message count
    });
  });

  describe('Format Selection', () => {
    it('starts with Markdown format selected', () => {
      render(<ConversationExport {...mockProps} />);

      const markdownOption = screen.getByLabelText('Markdown');
      expect(markdownOption).toBeChecked();
    });

    it('allows format selection', async () => {
      const user = userEvent.setup();
      render(<ConversationExport {...mockProps} />);

      const jsonOption = screen.getByLabelText('JSON');
      await user.click(jsonOption);

      expect(jsonOption).toBeChecked();
      expect(screen.getByLabelText('Markdown')).not.toBeChecked();
    });

    it('updates preview when format changes', async () => {
      const user = userEvent.setup();
      render(<ConversationExport {...mockProps} />);

      // Initially shows Markdown preview
      expect(screen.getByText(/# Market Analysis Discussion/)).toBeInTheDocument();

      // Switch to JSON
      await user.click(screen.getByLabelText('JSON'));

      await waitFor(() => {
        expect(screen.getByText(/"contentTitle": "Market Analysis Discussion"/)).toBeInTheDocument();
      });
    });
  });

  describe('Export Actions', () => {
    it('exports to clipboard successfully', async () => {
      const user = userEvent.setup();
      render(<ConversationExport {...mockProps} />);

      const copyButton = screen.getByText('Copy to Clipboard');
      await user.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalled();

      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });

    it('downloads file successfully', async () => {
      const user = userEvent.setup();
      render(<ConversationExport {...mockProps} />);

      const downloadButton = screen.getByText('Download File');
      await user.click(downloadButton);

      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('shares content successfully', async () => {
      const user = userEvent.setup();
      render(<ConversationExport {...mockProps} />);

      const shareButton = screen.getByText('Share');
      await user.click(shareButton);

      // Should trigger sharing mechanism
      expect(global.open).toHaveBeenCalled();
    });
  });

  describe('Format Generation', () => {
    describe('Markdown Format', () => {
      it('generates proper Markdown structure', async () => {
        const user = userEvent.setup();
        render(<ConversationExport {...mockProps} />);

        await user.click(screen.getByLabelText('Markdown'));

        expect(screen.getByText(/# Market Analysis Discussion/)).toBeInTheDocument();
        expect(screen.getByText(/## Conversation Timeline/)).toBeInTheDocument();
        expect(screen.getByText(/## Final Consensus/)).toBeInTheDocument();
        expect(screen.getByText(/\*\*Financial Analyst\*\* \(85% confidence\)/)).toBeInTheDocument();
      });

      it('includes agent messages with proper formatting', async () => {
        const user = userEvent.setup();
        render(<ConversationExport {...mockProps} />);

        await user.click(screen.getByLabelText('Markdown'));

        expect(screen.getByText(/Based on the analysis, I see strong market indicators/)).toBeInTheDocument();
        expect(screen.getByText(/Current market conditions support this analysis/)).toBeInTheDocument();
      });
    });

    describe('JSON Format', () => {
      it('generates valid JSON structure', async () => {
        const user = userEvent.setup();
        render(<ConversationExport {...mockProps} />);

        await user.click(screen.getByLabelText('JSON'));

        await waitFor(() => {
          expect(screen.getByText(/"contentTitle": "Market Analysis Discussion"/)).toBeInTheDocument();
          expect(screen.getByText(/"consensusReached": true/)).toBeInTheDocument();
          expect(screen.getByText(/"confidenceScore": 0.85/)).toBeInTheDocument();
        });
      });

      it('includes all agent messages in JSON', async () => {
        const user = userEvent.setup();
        render(<ConversationExport {...mockProps} />);

        await user.click(screen.getByLabelText('JSON'));

        await waitFor(() => {
          expect(screen.getByText(/"agentName": "Financial Analyst"/)).toBeInTheDocument();
          expect(screen.getByText(/"agentName": "Market Context"/)).toBeInTheDocument();
          expect(screen.getByText(/"agentName": "Risk Challenger"/)).toBeInTheDocument();
        });
      });
    });

    describe('PDF Format', () => {
      it('shows PDF preview message', async () => {
        const user = userEvent.setup();
        render(<ConversationExport {...mockProps} />);

        await user.click(screen.getByLabelText('PDF'));

        expect(screen.getByText(/PDF format will be generated for download/)).toBeInTheDocument();
      });
    });

    describe('Text Format', () => {
      it('generates plain text format', async () => {
        const user = userEvent.setup();
        render(<ConversationExport {...mockProps} />);

        await user.click(screen.getByLabelText('Text'));

        expect(screen.getByText(/Market Analysis Discussion/)).toBeInTheDocument();
        expect(screen.getByText(/Financial Analyst:/)).toBeInTheDocument();
        expect(screen.getByText(/Based on the analysis, I see strong market indicators/)).toBeInTheDocument();
      });
    });
  });

  describe('Preview Functionality', () => {
    it('shows preview by default', () => {
      render(<ConversationExport {...mockProps} />);

      expect(screen.getByText('Preview')).toBeInTheDocument();
      expect(screen.getByTestId('export-preview')).toBeInTheDocument();
    });

    it('updates preview content when format changes', async () => {
      const user = userEvent.setup();
      render(<ConversationExport {...mockProps} />);

      // Start with Markdown
      expect(screen.getByText(/# Market Analysis Discussion/)).toBeInTheDocument();

      // Switch to Text format
      await user.click(screen.getByLabelText('Text'));

      await waitFor(() => {
        expect(screen.queryByText(/# Market Analysis Discussion/)).not.toBeInTheDocument();
        expect(screen.getByText(/Financial Analyst:/)).toBeInTheDocument();
      });
    });

    it('handles long content with scrolling', () => {
      const longConversation = Array.from({ length: 20 }, (_, i) => ({
        ...mockConversation[0],
        id: `msg${i}`,
        message: `This is a long message number ${i} that should test scrolling behavior.`
      }));

      render(<ConversationExport {...mockProps} agentConversation={longConversation} />);

      const preview = screen.getByTestId('export-preview');
      expect(preview).toHaveClass('max-h-96', 'overflow-y-auto');
    });
  });

  describe('Error Handling', () => {
    it('handles clipboard copy failure gracefully', async () => {
      const user = userEvent.setup();
      (navigator.clipboard.writeText as jest.Mock).mockRejectedValueOnce(new Error('Clipboard error'));

      render(<ConversationExport {...mockProps} />);

      const copyButton = screen.getByText('Copy to Clipboard');
      await user.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText('Copy failed')).toBeInTheDocument();
      });
    });

    it('handles empty conversation gracefully', () => {
      render(<ConversationExport {...mockProps} agentConversation={[]} />);

      expect(screen.getByText('0 messages')).toBeInTheDocument();
    });

    it('handles missing conversation data', () => {
      const emptyAnalysisResult = {
        ...mockProps.analysisResult,
        data: {
          ...mockProps.analysisResult.data,
          autoGenConversation: {
            ...mockProps.analysisResult.data.autoGenConversation,
            consensus: '',
            agentResponses: []
          }
        }
      };

      render(
        <ConversationExport
          {...mockProps}
          analysisResult={emptyAnalysisResult}
          agentConversation={[]}
        />
      );

      expect(screen.getByText('0 messages')).toBeInTheDocument();
    });
  });

  describe('File Naming', () => {
    it('generates appropriate filename for Markdown', async () => {
      const user = userEvent.setup();
      render(<ConversationExport {...mockProps} />);

      await user.click(screen.getByText('Download File'));

      // Check that a blob was created (indicating file download)
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'text/markdown'
        })
      );
    });

    it('generates appropriate filename for JSON', async () => {
      const user = userEvent.setup();
      render(<ConversationExport {...mockProps} />);

      await user.click(screen.getByLabelText('JSON'));
      await user.click(screen.getByText('Download File'));

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'application/json'
        })
      );
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for radio buttons', () => {
      render(<ConversationExport {...mockProps} />);

      expect(screen.getByLabelText('Markdown')).toBeInTheDocument();
      expect(screen.getByLabelText('JSON')).toBeInTheDocument();
      expect(screen.getByLabelText('PDF')).toBeInTheDocument();
      expect(screen.getByLabelText('Text')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ConversationExport {...mockProps} />);

      // Tab to first radio button
      await user.tab();
      expect(screen.getByLabelText('Markdown')).toHaveFocus();

      // Arrow keys should navigate between radio buttons
      await user.keyboard('{ArrowDown}');
      expect(screen.getByLabelText('JSON')).toHaveFocus();
    });

    it('has descriptive button labels', () => {
      render(<ConversationExport {...mockProps} />);

      expect(screen.getByRole('button', { name: 'Copy to Clipboard' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Download File' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('adjusts layout for different screen sizes', () => {
      render(<ConversationExport {...mockProps} />);

      const container = screen.getByTestId('export-container');
      expect(container).toHaveClass('flex-col', 'lg:flex-row');
    });

    it('maintains usability on mobile devices', () => {
      render(<ConversationExport {...mockProps} />);

      const exportActions = screen.getByTestId('export-actions');
      expect(exportActions).toHaveClass('flex-col', 'sm:flex-row');
    });
  });
});