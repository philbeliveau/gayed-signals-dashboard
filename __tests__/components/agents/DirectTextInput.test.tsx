/**
 * Unit tests for DirectTextInput component
 * Addresses TEST-001: DirectTextInput component has no unit test coverage
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { DirectTextInput } from '../../../apps/web/src/components/agents/DirectTextInput';

// Mock ContentCard component
jest.mock('../../../apps/web/src/components/layout/ProfessionalLayout', () => ({
  ContentCard: ({ title, subtitle, children, className }: any) => (
    <div data-testid="content-card" className={className}>
      <h2>{title}</h2>
      <p>{subtitle}</p>
      {children}
    </div>
  )
}));

describe('DirectTextInput Component', () => {
  const mockOnSubmit = jest.fn();
  const defaultProps = {
    onSubmit: mockOnSubmit,
    isLoading: false,
    className: ''
  };

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<DirectTextInput {...defaultProps} />);

      expect(screen.getByText('Direct Text Analysis')).toBeInTheDocument();
      expect(screen.getByText('Paste financial content for AutoGen agent debate and analysis')).toBeInTheDocument();
      expect(screen.getByLabelText('Analysis Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Financial Content')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Start Analysis' })).toBeInTheDocument();
    });

    it('displays correct analysis type options', () => {
      render(<DirectTextInput {...defaultProps} />);

      const select = screen.getByLabelText('Analysis Type');
      expect(select).toHaveValue('COMPREHENSIVE');

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3);
      expect(options[0]).toHaveTextContent('Quick Analysis (30 seconds)');
      expect(options[1]).toHaveTextContent('Comprehensive Analysis (2-3 minutes)');
      expect(options[2]).toHaveTextContent('Gayed Signal Focused (Enhanced with signal context)');
    });

    it('applies custom className', () => {
      render(<DirectTextInput {...defaultProps} className="test-class" />);

      expect(screen.getByTestId('content-card')).toHaveClass('test-class');
    });
  });

  describe('Content Validation', () => {
    it('shows warning message for empty content', () => {
      render(<DirectTextInput {...defaultProps} />);

      expect(screen.getByText('Enter financial content to begin analysis')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Start Analysis' })).toBeDisabled();
    });

    it('shows error for content too short', async () => {
      const user = userEvent.setup();
      render(<DirectTextInput {...defaultProps} />);

      const textarea = screen.getByLabelText('Financial Content');
      await user.type(textarea, 'Too short');

      expect(screen.getByText('Content too short. Minimum 50 characters required for meaningful analysis.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Start Analysis' })).toBeDisabled();
    });

    it('shows error for content too long', async () => {
      const user = userEvent.setup();
      render(<DirectTextInput {...defaultProps} />);

      const longContent = 'a'.repeat(10001); // Exceeds 10,000 character limit
      const textarea = screen.getByLabelText('Financial Content');
      await user.type(textarea, longContent);

      expect(screen.getByText('Content too long. Maximum 10,000 characters allowed.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Start Analysis' })).toBeDisabled();
    });

    it('shows warning for non-financial content', async () => {
      const user = userEvent.setup();
      render(<DirectTextInput {...defaultProps} />);

      const nonFinancialContent = 'This is a long text about cooking recipes and food preparation techniques that does not contain any financial keywords or market-related content at all.';
      const textarea = screen.getByLabelText('Financial Content');
      await user.type(textarea, nonFinancialContent);

      expect(screen.getByText('Content should be financial or market-related for optimal analysis.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Start Analysis' })).toBeDisabled();
    });

    it('shows success message for valid financial content', async () => {
      const user = userEvent.setup();
      render(<DirectTextInput {...defaultProps} />);

      const validContent = 'The stock market showed strong performance today with increased trading volume. The portfolio allocation strategy focuses on risk management and returns optimization for better investment outcomes.';
      const textarea = screen.getByLabelText('Financial Content');
      await user.type(textarea, validContent);

      expect(screen.getByText('Content ready for AutoGen agent analysis')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Start Analysis' })).toBeEnabled();
    });

    it('detects financial keywords correctly', async () => {
      const user = userEvent.setup();
      render(<DirectTextInput {...defaultProps} />);

      const textarea = screen.getByLabelText('Financial Content');

      // Test various financial keywords
      const financialKeywords = [
        'market', 'stock', 'bond', 'investment', 'trading', 'price', 'return',
        'portfolio', 'risk', 'financial', 'economic', 'fed', 'interest', 'rate'
      ];

      for (const keyword of financialKeywords.slice(0, 3)) { // Test a few keywords
        const content = `This is a test content about ${keyword} ` + 'x'.repeat(40); // Make it long enough
        await user.clear(textarea);
        await user.type(textarea, content);

        await waitFor(() => {
          expect(screen.getByText('Content ready for AutoGen agent analysis')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Character Count Display', () => {
    it('displays character count correctly', async () => {
      const user = userEvent.setup();
      render(<DirectTextInput {...defaultProps} />);

      const textarea = screen.getByLabelText('Financial Content');
      await user.type(textarea, 'Test content');

      expect(screen.getByText('12 / 10,000')).toBeInTheDocument();
    });

    it('updates character count dynamically', async () => {
      const user = userEvent.setup();
      render(<DirectTextInput {...defaultProps} />);

      const textarea = screen.getByLabelText('Financial Content');
      await user.type(textarea, 'Short');
      expect(screen.getByText('5 / 10,000')).toBeInTheDocument();

      await user.type(textarea, ' text');
      expect(screen.getByText('10 / 10,000')).toBeInTheDocument();
    });
  });

  describe('Analysis Type Selection', () => {
    it('changes analysis type correctly', async () => {
      const user = userEvent.setup();
      render(<DirectTextInput {...defaultProps} />);

      const select = screen.getByLabelText('Analysis Type');
      await user.selectOptions(select, 'QUICK');

      expect(select).toHaveValue('QUICK');
    });

    it('maintains analysis type when switching options', async () => {
      const user = userEvent.setup();
      render(<DirectTextInput {...defaultProps} />);

      const select = screen.getByLabelText('Analysis Type');
      await user.selectOptions(select, 'GAYED_FOCUSED');

      expect(select).toHaveValue('GAYED_FOCUSED');
    });
  });

  describe('Form Submission', () => {
    it('calls onSubmit with correct parameters for valid content', async () => {
      const user = userEvent.setup();
      render(<DirectTextInput {...defaultProps} />);

      const validContent = 'This is financial market analysis content with investment strategies and risk management approaches for portfolio optimization.';
      const textarea = screen.getByLabelText('Financial Content');
      const button = screen.getByRole('button', { name: 'Start Analysis' });

      await user.type(textarea, validContent);
      await user.click(button);

      expect(mockOnSubmit).toHaveBeenCalledWith(validContent, 'COMPREHENSIVE');
    });

    it('calls onSubmit with selected analysis type', async () => {
      const user = userEvent.setup();
      render(<DirectTextInput {...defaultProps} />);

      const validContent = 'Financial market analysis with trading strategies and investment portfolio management for better returns and risk control.';
      const textarea = screen.getByLabelText('Financial Content');
      const select = screen.getByLabelText('Analysis Type');
      const button = screen.getByRole('button', { name: 'Start Analysis' });

      await user.type(textarea, validContent);
      await user.selectOptions(select, 'QUICK');
      await user.click(button);

      expect(mockOnSubmit).toHaveBeenCalledWith(validContent, 'QUICK');
    });

    it('clears content after successful submission', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);
      render(<DirectTextInput {...defaultProps} />);

      const validContent = 'Stock market investment analysis with portfolio diversification and risk assessment for optimal financial returns.';
      const textarea = screen.getByLabelText('Financial Content');
      const button = screen.getByRole('button', { name: 'Start Analysis' });

      await user.type(textarea, validContent);
      await user.click(button);

      await waitFor(() => {
        expect(textarea).toHaveValue('');
        expect(screen.getByText('Enter financial content to begin analysis')).toBeInTheDocument();
      });
    });

    it('does not submit when content is invalid', async () => {
      const user = userEvent.setup();
      render(<DirectTextInput {...defaultProps} />);

      const button = screen.getByRole('button', { name: 'Start Analysis' });
      await user.click(button);

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('handles submission errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockOnSubmit.mockRejectedValue(new Error('Test error'));

      render(<DirectTextInput {...defaultProps} />);

      const validContent = 'Market analysis with investment portfolio strategies and financial risk management for enhanced returns and stability.';
      const textarea = screen.getByLabelText('Financial Content');
      const button = screen.getByRole('button', { name: 'Start Analysis' });

      await user.type(textarea, validContent);
      await user.click(button);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to submit content:', expect.any(Error));
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Loading State', () => {
    it('shows loading state when isLoading is true', () => {
      render(<DirectTextInput {...defaultProps} isLoading={true} />);

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Analyzing...');
      expect(button).toBeDisabled();
      expect(screen.getByLabelText('Financial Content')).toBeDisabled();
      expect(screen.getByLabelText('Analysis Type')).toBeDisabled();
    });

    it('shows loading spinner when analyzing', () => {
      render(<DirectTextInput {...defaultProps} isLoading={true} />);

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('prevents submission when loading', async () => {
      const user = userEvent.setup();
      render(<DirectTextInput {...defaultProps} isLoading={true} />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Validation Icons', () => {
    it('shows warning icon for empty content', () => {
      render(<DirectTextInput {...defaultProps} />);

      expect(screen.getByText('Enter financial content to begin analysis')).toBeInTheDocument();
      // Check for warning color class
      expect(screen.getByText('Enter financial content to begin analysis')).toHaveClass('text-theme-warning');
    });

    it('shows error icon for invalid content', async () => {
      const user = userEvent.setup();
      render(<DirectTextInput {...defaultProps} />);

      const textarea = screen.getByLabelText('Financial Content');
      await user.type(textarea, 'Short');

      expect(screen.getByText('Content too short. Minimum 50 characters required for meaningful analysis.')).toHaveClass('text-theme-danger');
    });

    it('shows success icon for valid content', async () => {
      const user = userEvent.setup();
      render(<DirectTextInput {...defaultProps} />);

      const validContent = 'Financial market trends show strong investment opportunities with portfolio diversification strategies for risk management.';
      const textarea = screen.getByLabelText('Financial Content');
      await user.type(textarea, validContent);

      await waitFor(() => {
        expect(screen.getByText('Content ready for AutoGen agent analysis')).toHaveClass('text-theme-success');
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for form elements', () => {
      render(<DirectTextInput {...defaultProps} />);

      expect(screen.getByLabelText('Analysis Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Financial Content')).toBeInTheDocument();
    });

    it('has proper placeholder text', () => {
      render(<DirectTextInput {...defaultProps} />);

      const textarea = screen.getByLabelText('Financial Content');
      expect(textarea).toHaveAttribute('placeholder', 'Paste research reports, market commentary, earnings analysis, or any financial content here for AutoGen agent analysis...');
    });

    it('maintains focus management during user interaction', async () => {
      const user = userEvent.setup();
      render(<DirectTextInput {...defaultProps} />);

      const textarea = screen.getByLabelText('Financial Content');
      await user.click(textarea);

      expect(textarea).toHaveFocus();
    });
  });
});