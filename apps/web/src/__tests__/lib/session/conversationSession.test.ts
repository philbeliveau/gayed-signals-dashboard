import { ConversationSessionManager } from '@/lib/session/conversationSession';
import { ConversationSession } from '@/types/agents';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch
global.fetch = jest.fn();

// Mock window events
Object.defineProperty(window, 'addEventListener', {
  value: jest.fn(),
});

Object.defineProperty(window, 'removeEventListener', {
  value: jest.fn(),
});

Object.defineProperty(window, 'dispatchEvent', {
  value: jest.fn(),
});

describe('ConversationSessionManager', () => {
  let sessionManager: ConversationSessionManager;
  let mockSession: ConversationSession;

  beforeEach(() => {
    sessionManager = new ConversationSessionManager();
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);

    mockSession = {
      id: 'session-123',
      userId: 'user-1',
      contentSource: 'text',
      status: 'completed',
      messages: [
        {
          id: 'msg-1',
          agentName: 'FinancialAnalyst',
          agentType: 'FINANCIAL_ANALYST',
          role: 'analyst',
          message: 'Test analysis',
          timestamp: new Date().toISOString(),
          confidence: 0.85,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        processingTime: 5000,
        result: {
          consensusReached: true,
          finalRecommendation: 'Test recommendation',
          confidenceLevel: 0.9,
          keyInsights: ['Insight 1'],
        },
      },
    };

    // Mock successful fetch by default
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  describe('Session Storage', () => {
    test('saves conversation to localStorage', async () => {
      await sessionManager.saveConversation(mockSession);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'gayed-conversation-sessions',
        expect.stringContaining(mockSession.id)
      );
    });

    test('saves conversation to database', async () => {
      await sessionManager.saveConversation(mockSession);

      expect(global.fetch).toHaveBeenCalledWith('/api/conversations/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockSession),
      });
    });

    test('handles localStorage quota exceeded', async () => {
      const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
      Object.defineProperty(quotaError, 'code', { value: 22, writable: true });
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw quotaError;
      });

      // Should not throw, but handle gracefully
      await expect(sessionManager.saveConversation(mockSession)).resolves.not.toThrow();

      // Should attempt to set item twice (first fails, second succeeds after cleanup)
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(2);
    });

    test('continues with localStorage when database save fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      // Should not throw despite database error
      await expect(sessionManager.saveConversation(mockSession)).resolves.not.toThrow();

      // Should still save to localStorage
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('Session Retrieval', () => {
    test('loads stored sessions from localStorage', () => {
      const storedSessions = [mockSession];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedSessions));

      const result = sessionManager.getStoredSessions();

      expect(result).toEqual(storedSessions);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('gayed-conversation-sessions');
    });

    test('returns empty array when no stored sessions', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = sessionManager.getStoredSessions();

      expect(result).toEqual([]);
    });

    test('handles corrupted localStorage data', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');

      const result = sessionManager.getStoredSessions();

      expect(result).toEqual([]);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('gayed-conversation-sessions');
    });

    test('validates session data structure', () => {
      const invalidSessions = [
        { id: 'invalid-1' }, // Missing required fields
        mockSession, // Valid session
        { invalid: 'data' }, // Invalid structure
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(invalidSessions));

      const result = sessionManager.getStoredSessions();

      // Should only return valid sessions
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockSession);
    });

    test('gets conversation by ID', () => {
      const sessions = [mockSession];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(sessions));

      const result = sessionManager.getConversationById('session-123');

      expect(result).toEqual(mockSession);
    });

    test('returns undefined for non-existent conversation ID', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify([]));

      const result = sessionManager.getConversationById('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('Database Integration', () => {
    test('loads conversations from database and merges with localStorage', async () => {
      const databaseSessions = [
        { ...mockSession, id: 'db-session-1', updatedAt: new Date().toISOString() },
      ];
      const localSessions = [
        { ...mockSession, id: 'local-session-1', updatedAt: new Date().toISOString() },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(databaseSessions),
      });
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localSessions));

      const result = await sessionManager.loadConversationsFromDatabase();

      expect(result).toHaveLength(2);
      expect(result.some(s => s.id === 'db-session-1')).toBe(true);
      expect(result.some(s => s.id === 'local-session-1')).toBe(true);
    });

    test('falls back to localStorage when database load fails', async () => {
      const localSessions = [mockSession];
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localSessions));

      const result = await sessionManager.loadConversationsFromDatabase();

      expect(result).toEqual(localSessions);
    });

    test('prefers database versions in merge conflicts', async () => {
      const olderTime = new Date(Date.now() - 60000).toISOString(); // 1 minute ago
      const newerTime = new Date().toISOString();

      const databaseSession = { ...mockSession, updatedAt: newerTime, metadata: { source: 'database' } };
      const localSession = { ...mockSession, updatedAt: olderTime, metadata: { source: 'local' } };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([databaseSession]),
      });
      localStorageMock.getItem.mockReturnValue(JSON.stringify([localSession]));

      const result = await sessionManager.loadConversationsFromDatabase();

      expect(result[0].metadata.source).toBe('database');
    });
  });

  describe('Session Deletion', () => {
    test('deletes conversation from localStorage', async () => {
      const sessions = [mockSession, { ...mockSession, id: 'session-456' }];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(sessions));

      await sessionManager.deleteConversation('session-123');

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'gayed-conversation-sessions',
        expect.not.stringContaining('session-123')
      );
    });

    test('sends delete request to database', async () => {
      await sessionManager.deleteConversation('session-123');

      expect(global.fetch).toHaveBeenCalledWith('/api/conversations/session-123', {
        method: 'DELETE',
      });
    });

    test('handles database delete failure gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      // Should not throw despite database error
      await expect(sessionManager.deleteConversation('session-123')).resolves.not.toThrow();
    });
  });

  describe('Cross-tab Synchronization', () => {
    test('sets up storage event listener', () => {
      const cleanup = sessionManager.setupCrossTabSync();

      expect(window.addEventListener).toHaveBeenCalledWith('storage', expect.any(Function));

      // Test cleanup
      cleanup();
      expect(window.removeEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
    });

    test('handles storage update events', () => {
      sessionManager.setupCrossTabSync();

      // Get the event handler that was registered
      const eventHandler = (window.addEventListener as jest.Mock).mock.calls[0][1];

      const storageEvent = {
        key: 'gayed-conversation-sessions',
        newValue: JSON.stringify([mockSession]),
      };

      eventHandler(storageEvent);

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'conversationStorageUpdate',
          detail: [mockSession],
        })
      );
    });

    test('ignores irrelevant storage events', () => {
      sessionManager.setupCrossTabSync();

      const eventHandler = (window.addEventListener as jest.Mock).mock.calls[0][1];

      const storageEvent = {
        key: 'other-storage-key',
        newValue: 'some-value',
      };

      eventHandler(storageEvent);

      expect(window.dispatchEvent).not.toHaveBeenCalled();
    });
  });

  describe('Session Cleanup', () => {
    test('removes old sessions based on TTL', () => {
      const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(); // 8 days ago
      const recentDate = new Date().toISOString();

      const sessions = [
        { ...mockSession, id: 'old-session', updatedAt: oldDate },
        { ...mockSession, id: 'recent-session', updatedAt: recentDate },
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(sessions));

      sessionManager.cleanupOldSessions();

      const savedData = (localStorageMock.setItem as jest.Mock).mock.calls[0][1];
      const savedSessions = JSON.parse(savedData);

      expect(savedSessions).toHaveLength(1);
      expect(savedSessions[0].id).toBe('recent-session');
    });

    test('handles cleanup errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => sessionManager.cleanupOldSessions()).not.toThrow();
    });
  });

  describe('Storage Information', () => {
    test('provides storage usage information', () => {
      const sessions = [mockSession];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(sessions));

      const info = sessionManager.getStorageInfo();

      expect(info.sessionCount).toBe(1);
      expect(info.totalSize).toBeGreaterThan(0);
      expect(info.averageSize).toBeGreaterThan(0);
      expect(info.oldestSession).toBe(mockSession.updatedAt);
    });

    test('handles empty storage', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const info = sessionManager.getStorageInfo();

      expect(info.sessionCount).toBe(0);
      expect(info.totalSize).toBe(0);
      expect(info.averageSize).toBe(0);
      expect(info.oldestSession).toBeNull();
    });
  });

  describe('Import/Export', () => {
    test('exports conversations with metadata', () => {
      const sessions = [mockSession];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(sessions));

      const exported = sessionManager.exportConversations();
      const parsed = JSON.parse(exported);

      expect(parsed.version).toBe('1.0');
      expect(parsed.exportDate).toBeDefined();
      expect(parsed.conversations).toEqual(sessions);
    });

    test('imports valid conversation data', async () => {
      const backupData = JSON.stringify({
        version: '1.0',
        exportDate: new Date().toISOString(),
        conversations: [mockSession],
      });

      const result = await sessionManager.importConversations(backupData);

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    test('rejects invalid import data', async () => {
      const invalidData = JSON.stringify({ invalid: 'format' });

      const result = await sessionManager.importConversations(invalidData);

      expect(result).toBe(false);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    test('handles malformed JSON in import', async () => {
      const result = await sessionManager.importConversations('invalid-json');

      expect(result).toBe(false);
    });
  });

  describe('Session Limits', () => {
    test('limits stored sessions to maximum count', async () => {
      // Create 55 sessions (over the 50 limit)
      const sessions = Array.from({ length: 55 }, (_, i) => ({
        ...mockSession,
        id: `session-${i}`,
      }));

      localStorageMock.getItem.mockReturnValue(JSON.stringify(sessions.slice(0, 49)));

      await sessionManager.saveConversation(sessions[54]);

      const savedData = (localStorageMock.setItem as jest.Mock).mock.calls[0][1];
      const savedSessions = JSON.parse(savedData);

      expect(savedSessions.length).toBeLessThanOrEqual(50);
      expect(savedSessions[0].id).toBe('session-54'); // New session should be first
    });

    test('removes duplicates when saving existing session', async () => {
      const existingSessions = [mockSession];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingSessions));

      // Save the same session again with updated data
      const updatedSession = { ...mockSession, updatedAt: new Date().toISOString() };
      await sessionManager.saveConversation(updatedSession);

      const savedData = (localStorageMock.setItem as jest.Mock).mock.calls[0][1];
      const savedSessions = JSON.parse(savedData);

      expect(savedSessions).toHaveLength(1);
      expect(savedSessions[0].updatedAt).toBe(updatedSession.updatedAt);
    });
  });
});