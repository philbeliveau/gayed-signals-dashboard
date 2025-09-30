/**
 * Unit tests for DirectTextInput component
 * Addresses TEST-001: DirectTextInput component has no unit test coverage
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { DirectTextInput } from '../../../components/agents/DirectTextInput';

// Mock ContentCard component
jest.mock('../../../components/layout/ProfessionalLayout', () => ({
  ContentCard: ({ title, subtitle, children, className }: { title?: string; subtitle?: string; children?: React.ReactNode; className?: string }) => (
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

    it('shows success message for valid financial content', async () => {
      const user = userEvent.setup();
      render(<DirectTextInput {...defaultProps} />);

      const validContent = 'The stock market showed strong performance today with increased trading volume. The portfolio allocation strategy focuses on risk management and returns optimization for better investment outcomes.';
      const textarea = screen.getByLabelText('Financial Content');
      await user.type(textarea, validContent);

      expect(screen.getByText('Content ready for AutoGen agent analysis')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Start Analysis' })).toBeEnabled();
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
  });
});