import { renderHook, act } from '@testing-library/react';
import { useConversationErrorHandling, ConversationErrorBoundary } from '@/lib/error/conversationErrorHandling';

// Mock conversation store
const mockUpdateStatus = jest.fn();
const mockClearActiveConversation = jest.fn();
const mockActiveConversation = {
  sessionId: 'session-123',
  status: 'active' as const,
  messages: [],
  participants: [],
  startedAt: new Date(),
  completedAt: null,
};

jest.mock('@/domains/ai-agents/stores/conversationStore', () => ({
  useConversationStore: jest.fn(() => ({
    activeConversation: mockActiveConversation,
    updateStatus: mockUpdateStatus,
    clearActiveConversation: mockClearActiveConversation,
  })),
}));

// Mock session manager
const mockSaveConversation = jest.fn();
const mockCleanupOldSessions = jest.fn();
const mockExportConversations = jest.fn().mockReturnValue('{"conversations":[]}');

jest.mock('@/lib/session/conversationSession', () => ({
  conversationSessionManager: {
    saveConversation: mockSaveConversation,
    cleanupOldSessions: mockCleanupOldSessions,
    exportConversations: mockExportConversations,
    getConversationById: jest.fn(),
  },
}));

// Mock DOM methods
Object.defineProperty(document, 'createElement', {
  value: jest.fn(() => ({
    href: '',
    download: '',
    click: jest.fn(),
  })),
});

Object.defineProperty(document.body, 'appendChild', {
  value: jest.fn(),
});

Object.defineProperty(document.body, 'removeChild', {
  value: jest.fn(),
});

Object.defineProperty(URL, 'createObjectURL', {
  value: jest.fn(() => 'blob:url'),
});

Object.defineProperty(URL, 'revokeObjectURL', {
  value: jest.fn(),
});

describe('useConversationErrorHandling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Reporting', () => {
    test('reports error with correct structure', () => {
      const { result } = renderHook(() => useConversationErrorHandling());

      let reportedError;
      act(() => {
        reportedError = result.current.reportError(
          'websocket_connection_failed',
          'Connection failed',
          { code: 1006 },
          'session-123'
        );
      });

      expect(reportedError).toMatchObject({
        type: 'websocket_connection_failed',
        message: 'Connection failed',
        details: { code: 1006 },
        sessionId: 'session-123',
        recoverable: true,
        retryable: true,
      });

      expect(result.current.errors).toHaveLength(1);
      expect(result.current.hasErrors).toBe(true);
      expect(result.current.latestError).toEqual(reportedError);
    });

    test('updates conversation status when error is for active session', () => {
      const { result } = renderHook(() => useConversationErrorHandling());

      act(() => {
        result.current.reportError('session_load_failed', 'Load failed', {}, 'session-123');
      });

      expect(mockUpdateStatus).toHaveBeenCalledWith('error');
    });

    test('limits error history to 10 items', () => {
      const { result } = renderHook(() => useConversationErrorHandling());

      act(() => {
        // Report 12 errors
        for (let i = 0; i < 12; i++) {
          result.current.reportError('network_error', `Error ${i}`);
        }
      });

      expect(result.current.errors).toHaveLength(10);
    });
  });

  describe('Error Clearing', () => {
    test('clears all errors', () => {
      const { result } = renderHook(() => useConversationErrorHandling());

      act(() => {
        result.current.reportError('network_error', 'Error 1');
        result.current.reportError('validation_error', 'Error 2');
      });

      expect(result.current.errors).toHaveLength(2);

      act(() => {
        result.current.clearErrors();
      });

      expect(result.current.errors).toHaveLength(0);
      expect(result.current.hasErrors).toBe(false);
      expect(result.current.latestError).toBeNull();
    });

    test('clears specific error by timestamp', () => {
      const { result } = renderHook(() => useConversationErrorHandling());

      let firstError, secondError;
      act(() => {
        firstError = result.current.reportError('network_error', 'Error 1');
        secondError = result.current.reportError('validation_error', 'Error 2');
      });

      act(() => {
        result.current.clearError(firstError.timestamp);
      });

      expect(result.current.errors).toHaveLength(1);
      expect(result.current.errors[0]).toEqual(secondError);
    });
  });

  describe('Recovery Actions', () => {
    test('provides recovery actions for websocket connection failed', () => {
      const { result } = renderHook(() => useConversationErrorHandling());

      let error;
      act(() => {
        error = result.current.reportError('websocket_connection_failed', 'Connection failed');
      });

      const actions = result.current.getRecoveryActions(error);

      expect(actions).toHaveLength(1);
      expect(actions[0].label).toBe('Retry Connection');
    });

    test('provides recovery actions for session load failed', () => {
      const { result } = renderHook(() => useConversationErrorHandling());

      let error;
      act(() => {
        error = result.current.reportError('session_load_failed', 'Load failed', {}, 'session-123');
      });

      const actions = result.current.getRecoveryActions(error);

      expect(actions).toHaveLength(2);
      expect(actions[0].label).toBe('Reload Session');
      expect(actions[1].label).toBe('Start New Session');
      expect(actions[1].destructive).toBe(true);
    });

    test('provides recovery actions for storage quota exceeded', () => {
      const { result } = renderHook(() => useConversationErrorHandling());

      let error;
      act(() => {
        error = result.current.reportError('storage_quota_exceeded', 'Quota exceeded');
      });

      const actions = result.current.getRecoveryActions(error);

      expect(actions).toHaveLength(2);
      expect(actions[0].label).toBe('Clean Old Sessions');
      expect(actions[1].label).toBe('Export & Clear History');
      expect(actions[1].destructive).toBe(true);
    });

    test('provides default recovery action for unknown errors', () => {
      const { result } = renderHook(() => useConversationErrorHandling());

      let error;
      act(() => {
        error = result.current.reportError('unknown_error', 'Unknown error');
      });

      const actions = result.current.getRecoveryActions(error);

      expect(actions).toHaveLength(1);
      expect(actions[0].label).toBe('Reset Session');
      expect(actions[0].destructive).toBe(true);
    });
  });

  describe('Recovery Execution', () => {
    test('executes recovery action successfully', async () => {
      const { result } = renderHook(() => useConversationErrorHandling());

      let error;
      act(() => {
        error = result.current.reportError('storage_quota_exceeded', 'Quota exceeded');
      });

      mockCleanupOldSessions.mockResolvedValue(undefined);

      let success;
      await act(async () => {
        success = await result.current.executeRecovery(error, 0);
      });

      expect(success).toBe(true);
      expect(mockCleanupOldSessions).toHaveBeenCalled();
      expect(result.current.errors).toHaveLength(0); // Error should be cleared
    });

    test('handles recovery action failure', async () => {
      const { result } = renderHook(() => useConversationErrorHandling());

      let error;
      act(() => {
        error = result.current.reportError('storage_quota_exceeded', 'Quota exceeded');
      });

      mockCleanupOldSessions.mockRejectedValue(new Error('Cleanup failed'));

      let success;
      await act(async () => {
        success = await result.current.executeRecovery(error, 0);
      });

      expect(success).toBe(false);
      expect(result.current.errors).toHaveLength(1); // Error should not be cleared
    });

    test('handles invalid action index', async () => {
      const { result } = renderHook(() => useConversationErrorHandling());

      let error;
      act(() => {
        error = result.current.reportError('network_error', 'Network error');
      });

      let success;
      await act(async () => {
        success = await result.current.executeRecovery(error, 999);
      });

      expect(success).toBe(false);
    });

    test('sets recovery state during execution', async () => {
      const { result } = renderHook(() => useConversationErrorHandling());

      let error;
      act(() => {
        error = result.current.reportError('storage_quota_exceeded', 'Quota exceeded');
      });

      // Mock a slow cleanup operation
      mockCleanupOldSessions.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 100))
      );

      const recoveryPromise = act(async () => {
        return result.current.executeRecovery(error, 0);
      });

      // Check that recovery state is set during execution
      expect(result.current.isRecovering).toBe(true);

      await recoveryPromise;

      expect(result.current.isRecovering).toBe(false);
    });
  });

  describe('Session Save Recovery', () => {
    test('executes session save recovery action', async () => {
      const { result } = renderHook(() => useConversationErrorHandling());

      let error;
      act(() => {
        error = result.current.reportError('session_save_failed', 'Save failed');
      });

      mockSaveConversation.mockResolvedValue(undefined);

      const actions = result.current.getRecoveryActions(error);
      expect(actions[0].label).toBe('Retry Save');

      let success;
      await act(async () => {
        success = await actions[0].action();
      });

      expect(success).toBe(true);
      expect(mockSaveConversation).toHaveBeenCalled();
    });

    test('handles session save failure when no active conversation', async () => {
      // Mock no active conversation
      mockActiveConversation.sessionId = null;

      const { result } = renderHook(() => useConversationErrorHandling());

      let error;
      act(() => {
        error = result.current.reportError('session_save_failed', 'Save failed');
      });

      const actions = result.current.getRecoveryActions(error);

      let success;
      await act(async () => {
        success = await actions[0].action();
      });

      expect(success).toBe(false);
      expect(mockSaveConversation).not.toHaveBeenCalled();
    });
  });

  describe('Export and Clear Recovery', () => {
    test('executes export and clear recovery action', async () => {
      const { result } = renderHook(() => useConversationErrorHandling());

      let error;
      act(() => {
        error = result.current.reportError('storage_quota_exceeded', 'Quota exceeded');
      });

      const actions = result.current.getRecoveryActions(error);
      const exportAction = actions.find(action => action.label === 'Export & Clear History');

      let success;
      await act(async () => {
        success = await exportAction.action();
      });

      expect(success).toBe(true);
      expect(mockExportConversations).toHaveBeenCalled();
    });
  });
});

describe('ConversationErrorBoundary', () => {
  test('singleton pattern works correctly', () => {
    const instance1 = ConversationErrorBoundary.getInstance();
    const instance2 = ConversationErrorBoundary.getInstance();

    expect(instance1).toBe(instance2);
  });

  test('adds and removes error handlers', () => {
    const boundary = ConversationErrorBoundary.getInstance();
    const handler = jest.fn();

    const removeHandler = boundary.addErrorHandler(handler);

    boundary.reportGlobalError('network_error', 'Test error');

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'network_error',
        message: 'Test error',
      })
    );

    removeHandler();

    boundary.reportGlobalError('network_error', 'Another error');

    // Handler should not be called after removal
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('handles handler errors gracefully', () => {
    const boundary = ConversationErrorBoundary.getInstance();
    const failingHandler = jest.fn(() => {
      throw new Error('Handler error');
    });
    const workingHandler = jest.fn();

    boundary.addErrorHandler(failingHandler);
    boundary.addErrorHandler(workingHandler);

    // Should not throw despite failing handler
    expect(() => {
      boundary.reportGlobalError('network_error', 'Test error');
    }).not.toThrow();

    expect(failingHandler).toHaveBeenCalled();
    expect(workingHandler).toHaveBeenCalled();
  });

  test('creates error with correct structure', () => {
    const boundary = ConversationErrorBoundary.getInstance();
    const handler = jest.fn();

    boundary.addErrorHandler(handler);
    boundary.reportGlobalError(
      'session_load_failed',
      'Load failed',
      { code: 500 },
      'session-123'
    );

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'session_load_failed',
        message: 'Load failed',
        details: { code: 500 },
        sessionId: 'session-123',
        recoverable: true,
        retryable: false,
        timestamp: expect.any(Number),
      })
    );
  });
});