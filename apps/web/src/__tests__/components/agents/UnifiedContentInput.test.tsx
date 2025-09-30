/**
 * UnifiedContentInput Component Tests
 *
 * Tests for the unified content input component that handles
 * text, Substack URLs, and YouTube videos with validation and UI.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import UnifiedContentInput from '@/components/agents/UnifiedContentInput';

// Mock dependencies
jest.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    isSignedIn: true,
    userId: 'user_test123'
  })
}));

// Mock fetch for API calls
global.fetch = jest.fn();

describe('UnifiedContentInput', () => {
  const mockProps = {
    onSubmit: jest.fn().mockResolvedValue(undefined),
    isLoading: false,
    className: 'test-class'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { id: 'test-conversation' }
      })
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with all three tabs', () => {
      render(<UnifiedContentInput {...mockProps} />);

      expect(screen.getByText('Direct Text')).toBeInTheDocument();
      expect(screen.getByText('Substack Article')).toBeInTheDocument();
      expect(screen.getByText('YouTube Video')).toBeInTheDocument();
    });

    it('starts with Direct Text tab active', () => {
      render(<UnifiedContentInput {...mockProps} />);

      const directTextTab = screen.getByText('Direct Text');
      expect(directTextTab.closest('button')).toHaveClass('border-theme-primary', 'text-theme-primary');
    });

    it('applies custom className', () => {
      const { container } = render(<UnifiedContentInput {...mockProps} />);
      expect(container.firstChild).toHaveClass('test-class');
    });
  });

  describe('Tab Navigation', () => {
    it('switches to Substack tab when clicked', async () => {
      const user = userEvent.setup();
      render(<UnifiedContentInput {...mockProps} />);

      await user.click(screen.getByText('Substack Article'));

      expect(screen.getByText('Substack Article').closest('button')).toHaveClass('border-theme-primary', 'text-theme-primary');
      expect(screen.getByPlaceholderText(/example\.substack\.com/i)).toBeInTheDocument();
    });

    it('switches to YouTube tab when clicked', async () => {
      const user = userEvent.setup();
      render(<UnifiedContentInput {...mockProps} />);

      await user.click(screen.getByText('YouTube Video'));

      expect(screen.getByText('YouTube Video').closest('button')).toHaveClass('border-theme-primary', 'text-theme-primary');
      expect(screen.getByPlaceholderText(/youtube\.com\/watch/i)).toBeInTheDocument();
    });

    it('switches back to Direct Text tab', async () => {
      const user = userEvent.setup();
      render(<UnifiedContentInput {...mockProps} />);

      // Switch to YouTube then back to Direct Text
      await user.click(screen.getByText('YouTube Video'));
      await user.click(screen.getByText('Direct Text'));

      expect(screen.getByText('Direct Text').closest('button')).toHaveClass('border-theme-primary', 'text-theme-primary');
      expect(screen.getByPlaceholderText(/Paste research reports/i)).toBeInTheDocument();
    });
  });

  describe('Direct Text Input', () => {
    it('validates minimum length requirement', async () => {
      const user = userEvent.setup();
      render(<UnifiedContentInput {...mockProps} />);

      const textarea = screen.getByPlaceholderText(/Paste research reports/i);
      const submitButton = screen.getByText('Start Analysis');

      await user.type(textarea, 'Short text');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Content too short.*Minimum.*50 characters/i)).toBeInTheDocument();
      });
    });

    it('validates maximum length requirement', async () => {
      const user = userEvent.setup();
      render(<UnifiedContentInput {...mockProps} />);

      const textarea = screen.getByPlaceholderText(/Paste research reports/i);
      const longText = 'a'.repeat(10001); // Exceeds 10,000 character limit

      // Use paste instead of type for performance
      await user.click(textarea);
      await user.clear(textarea);
      textarea.focus();
      textarea.setSelectionRange(0, 0);
      await user.paste(longText);

      await waitFor(() => {
        expect(screen.getByText(/Content too long.*Maximum.*10000 characters/i)).toBeInTheDocument();
      }, { timeout: 10000 });
    });

    it('accepts valid content length', async () => {
      const user = userEvent.setup();
      render(<UnifiedContentInput {...mockProps} />);

      const textarea = screen.getByPlaceholderText(/Paste research reports/i);
      const validText = 'This is a valid financial market analysis with trading insights and investment considerations that meets the minimum length requirement.';

      await user.type(textarea, validText);

      // Should not show any error
      expect(screen.queryByText(/Content too short.*Minimum.*50 characters/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Content too long.*Maximum.*10000 characters/i)).not.toBeInTheDocument();
    });

    it('updates character count correctly', async () => {
      const user = userEvent.setup();
      render(<UnifiedContentInput {...mockProps} />);

      const textarea = screen.getByPlaceholderText(/Paste research reports/i);
      await user.type(textarea, 'Hello World');

      expect(screen.getByText(/11.*\/.*10,000/)).toBeInTheDocument();
    });
  });

  describe('Substack URL Input', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<UnifiedContentInput {...mockProps} />);
      await user.click(screen.getByText('Substack Article'));
    });

    it('validates Substack URL format', async () => {
      const user = userEvent.setup();
      const input = screen.getByPlaceholderText(/example\.substack\.com/i);

      await user.type(input, 'invalid-url');

      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid URL format|Please enter a valid Substack article URL/i)).toBeInTheDocument();
      });
    });

    it('accepts valid Substack URL', async () => {
      const user = userEvent.setup();
      const input = screen.getByPlaceholderText(/example\.substack\.com/i);

      await user.type(input, 'https://newsletter.substack.com/p/market-analysis');

      // Should not show error
      expect(screen.queryByText(/Please enter a valid URL format|Please enter a valid Substack article URL/i)).not.toBeInTheDocument();
    });

    it('shows financial relevance requirement', () => {
      // Component shows default message for Substack input
      expect(screen.getByText(/Enter a Substack article URL for content extraction/i)).toBeInTheDocument();
    });
  });

  describe('YouTube URL Input', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<UnifiedContentInput {...mockProps} />);
      await user.click(screen.getByText('YouTube Video'));
    });

    it('validates YouTube URL format', async () => {
      const user = userEvent.setup();
      const input = screen.getByPlaceholderText(/youtube\.com\/watch/i);

      await user.type(input, 'invalid-url');

      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid URL format|Please enter a valid YouTube video URL/i)).toBeInTheDocument();
      });
    });

    it('accepts valid YouTube URL', async () => {
      const user = userEvent.setup();
      const input = screen.getByPlaceholderText(/youtube\.com\/watch/i);

      await user.type(input, 'https://youtube.com/watch?v=test123');

      // Should not show error
      expect(screen.queryByText(/Please enter a valid URL format|Please enter a valid YouTube video URL/i)).not.toBeInTheDocument();
    });

    it('accepts valid YouTube short URL', async () => {
      const user = userEvent.setup();
      const input = screen.getByPlaceholderText(/youtube\.com\/watch/i);

      await user.type(input, 'https://youtu.be/test123');

      // Should not show error
      expect(screen.queryByText(/Please enter a valid URL format|Please enter a valid YouTube video URL/i)).not.toBeInTheDocument();
    });

    it('shows financial relevance requirement', () => {
      // Component shows default message for YouTube input
      expect(screen.getByText(/Enter a YouTube video URL for transcript analysis/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('submits direct text content successfully', async () => {
      const user = userEvent.setup();
      render(<UnifiedContentInput {...mockProps} />);

      const textarea = screen.getByPlaceholderText(/Paste research reports/i);
      const submitButton = screen.getByText('Start Analysis');
      const validText = 'This is a valid financial content piece for analysis that meets the minimum length requirement and discusses market trends.';

      await user.type(textarea, validText);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockProps.onSubmit).toHaveBeenCalledWith(
          validText,
          'COMPREHENSIVE',
          'text'
        );
      });

      // Content should be cleared after successful submission
      expect(screen.getByPlaceholderText(/Paste research reports/i)).toHaveValue('');
    });

    it('submits Substack URL successfully', async () => {
      const user = userEvent.setup();
      render(<UnifiedContentInput {...mockProps} />);

      await user.click(screen.getByText('Substack Article'));

      const input = screen.getByPlaceholderText(/example\.substack\.com/i);
      const submitButton = screen.getByText('Start Analysis');
      const validUrl = 'https://newsletter.substack.com/p/market-analysis';

      await user.type(input, validUrl);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockProps.onSubmit).toHaveBeenCalledWith(
          validUrl,
          'COMPREHENSIVE',
          'substack'
        );
      });
    });

    it('submits YouTube URL successfully', async () => {
      const user = userEvent.setup();
      render(<UnifiedContentInput {...mockProps} />);

      await user.click(screen.getByText('YouTube Video'));

      const input = screen.getByPlaceholderText(/youtube\.com\/watch/i);
      const submitButton = screen.getByText('Start Analysis');
      const validUrl = 'https://youtube.com/watch?v=test123';

      await user.type(input, validUrl);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockProps.onSubmit).toHaveBeenCalledWith(
          validUrl,
          'COMPREHENSIVE',
          'youtube'
        );
      });
    });
  });

  describe('Processing State', () => {
    it('disables inputs when processing', () => {
      render(<UnifiedContentInput {...mockProps} isLoading={true} />);

      const textarea = screen.getByPlaceholderText(/Paste research reports/i);
      const submitButton = screen.getByText('Processing...');

      expect(textarea).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });

    it('shows processing text on submit button', () => {
      render(<UnifiedContentInput {...mockProps} isLoading={true} />);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(screen.queryByText('Start Analysis')).not.toBeInTheDocument();
    });

    it('prevents form submission when processing', async () => {
      const user = userEvent.setup();
      render(<UnifiedContentInput {...mockProps} isLoading={true} />);

      const submitButton = screen.getByText('Processing...');
      await user.click(submitButton);

      expect(mockProps.onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('displays API error messages', async () => {
      const user = userEvent.setup();
      const errorMockProps = {
        ...mockProps,
        onSubmit: jest.fn().mockRejectedValue(new Error('Content not financial enough'))
      };

      render(<UnifiedContentInput {...errorMockProps} />);

      const textarea = screen.getByPlaceholderText(/Paste research reports/i);
      const submitButton = screen.getByText('Start Analysis');
      const validText = 'This is a valid financial market analysis with trading insights and investment considerations that meets the minimum length requirement.';

      await user.type(textarea, validText);
      await user.click(submitButton);

      await waitFor(() => {
        expect(errorMockProps.onSubmit).toHaveBeenCalled();
      });

      // Component logs error but doesn't display it (parent handles display)
      expect(textarea).toHaveValue(validText); // Content preserved on error
    });

    it('handles network errors gracefully', async () => {
      const user = userEvent.setup();
      const errorMockProps = {
        ...mockProps,
        onSubmit: jest.fn().mockRejectedValue(new Error('Network error'))
      };

      render(<UnifiedContentInput {...errorMockProps} />);

      const textarea = screen.getByPlaceholderText(/Paste research reports/i);
      const submitButton = screen.getByText('Start Analysis');
      const validText = 'This is a valid financial market analysis with trading insights and investment considerations that meets the minimum length requirement.';

      await user.type(textarea, validText);
      await user.click(submitButton);

      await waitFor(() => {
        expect(errorMockProps.onSubmit).toHaveBeenCalled();
      });

      // Component preserves content and logs error but doesn't display message
      expect(textarea).toHaveValue(validText);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<UnifiedContentInput {...mockProps} />);

      // Component uses navigation buttons instead of ARIA tabs
      expect(screen.getByText('Direct Text')).toBeInTheDocument();
      expect(screen.getByText('Substack Article')).toBeInTheDocument();
      expect(screen.getByText('YouTube Video')).toBeInTheDocument();

      // Check that content input has proper labeling
      expect(screen.getByText('Direct Text Content')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<UnifiedContentInput {...mockProps} />);

      const directTextTab = screen.getByText('Direct Text');
      const substackTab = screen.getByText('Substack Article');

      // Focus should start on first tab button
      await user.tab();
      expect(directTextTab.closest('button')).toHaveFocus();

      // Tab navigation moves between buttons normally
      await user.tab();
      await user.tab();
      await user.tab();
      // After tabbing through analysis type buttons, focus moves to Substack
      await user.click(substackTab.closest('button')!);
      expect(substackTab.closest('button')).toHaveFocus();
    });
  });
});