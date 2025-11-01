'use client';

import { ConversationSession } from '@/types/agents';

export class ConversationSessionManager {
  private readonly SESSION_KEY = 'gayed-conversation-sessions';
  private readonly MAX_SESSIONS = 50;
  private readonly SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  /**
   * Save conversation to persistent storage (localStorage + database)
   */
  async saveConversation(conversation: ConversationSession): Promise<void> {
    try {
      // Save to localStorage first for immediate availability
      await this.saveToLocalStorage(conversation);

      // Save to database for cross-device sync (fire and forget)
      this.saveToDatabaseAsync(conversation);
    } catch (error) {
      console.error('Failed to save conversation:', error);
      throw new Error('Conversation save failed');
    }
  }

  /**
   * Save conversation to localStorage with size management
   */
  private async saveToLocalStorage(conversation: ConversationSession): Promise<void> {
    try {
      const existing = this.getStoredSessions();

      // Remove existing conversation with same ID to prevent duplicates
      const filtered = existing.filter(session => session.id !== conversation.id);

      // Add new conversation at the beginning
      const updated = [conversation, ...filtered.slice(0, this.MAX_SESSIONS - 1)];

      localStorage.setItem(this.SESSION_KEY, JSON.stringify(updated));
    } catch (error) {
      // Handle localStorage quota exceeded
      if (error instanceof DOMException && error.code === 22) {
        console.warn('localStorage quota exceeded, cleaning up old sessions');
        this.cleanupOldSessions();

        // Retry with fewer sessions
        const existing = this.getStoredSessions();
        const updated = [conversation, ...existing.slice(0, 19)]; // Keep only 20 sessions
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(updated));
      } else {
        throw error;
      }
    }
  }

  /**
   * Save conversation to database asynchronously
   */
  private async saveToDatabaseAsync(conversation: ConversationSession): Promise<void> {
    try {
      const response = await fetch('/api/conversations/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(conversation),
      });

      if (!response.ok) {
        throw new Error(`Database save failed: ${response.statusText}`);
      }
    } catch (error) {
      // Don't throw for database errors - localStorage is primary storage
      console.error('Database save failed (continuing with localStorage):', error);
    }
  }

  /**
   * Load conversations from localStorage
   */
  getStoredSessions(): ConversationSession[] {
    try {
      const stored = localStorage.getItem(this.SESSION_KEY);
      if (!stored) return [];

      const sessions = JSON.parse(stored);

      // Validate data structure
      if (!Array.isArray(sessions)) {
        console.warn('Invalid conversation data format, resetting');
        localStorage.removeItem(this.SESSION_KEY);
        return [];
      }

      return sessions.filter(this.isValidSession);
    } catch (error) {
      console.error('Failed to load conversations from localStorage:', error);
      // Reset corrupted data
      localStorage.removeItem(this.SESSION_KEY);
      return [];
    }
  }

  /**
   * Load conversations from database and merge with localStorage
   */
  async loadConversationsFromDatabase(): Promise<ConversationSession[]> {
    try {
      const response = await fetch('/api/conversations/history');
      if (!response.ok) {
        throw new Error(`Failed to load from database: ${response.statusText}`);
      }

      const databaseSessions = await response.json();
      const localSessions = this.getStoredSessions();

      // Merge sessions, preferring database versions for conflicts
      const merged = this.mergeSessions(databaseSessions, localSessions);

      // Update localStorage with merged data
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(merged));

      return merged;
    } catch (error) {
      console.error('Failed to load from database, using localStorage:', error);
      return this.getStoredSessions();
    }
  }

  /**
   * Get specific conversation by ID
   */
  getConversationById(sessionId: string): ConversationSession | undefined {
    const sessions = this.getStoredSessions();
    return sessions.find(session => session.id === sessionId);
  }

  /**
   * Delete conversation from storage
   */
  async deleteConversation(sessionId: string): Promise<void> {
    try {
      // Remove from localStorage
      const existing = this.getStoredSessions();
      const filtered = existing.filter(session => session.id !== sessionId);
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(filtered));

      // Remove from database (fire and forget)
      fetch(`/api/conversations/${sessionId}`, { method: 'DELETE' })
        .catch(error => console.error('Database deletion failed:', error));
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      throw new Error('Conversation deletion failed');
    }
  }

  /**
   * Setup cross-tab synchronization
   */
  setupCrossTabSync(): () => void {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === this.SESSION_KEY && event.newValue) {
        try {
          const updatedSessions = JSON.parse(event.newValue);

          // Trigger custom event for components to react
          window.dispatchEvent(new CustomEvent('conversationStorageUpdate', {
            detail: updatedSessions
          }));
        } catch (error) {
          console.error('Failed to parse cross-tab conversation update:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Return cleanup function
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }

  /**
   * Cleanup old sessions based on TTL
   */
  cleanupOldSessions(): void {
    try {
      const sessions = this.getStoredSessions();
      const cutoffTime = Date.now() - this.SESSION_TTL;

      const recentSessions = sessions.filter(session => {
        const sessionTime = new Date(session.updatedAt).getTime();
        return sessionTime > cutoffTime;
      });

      localStorage.setItem(this.SESSION_KEY, JSON.stringify(recentSessions));

      console.log(`Cleaned up ${sessions.length - recentSessions.length} old conversations`);
    } catch (error) {
      console.error('Session cleanup failed:', error);
    }
  }

  /**
   * Get storage usage information
   */
  getStorageInfo(): {
    sessionCount: number;
    totalSize: number;
    averageSize: number;
    oldestSession: string | null;
  } {
    const sessions = this.getStoredSessions();
    const serialized = localStorage.getItem(this.SESSION_KEY) || '';
    const totalSize = new Blob([serialized]).size;

    let oldestSession: string | null = null;
    if (sessions.length > 0) {
      oldestSession = sessions.reduce((oldest, current) =>
        new Date(current.updatedAt) < new Date(oldest.updatedAt) ? current : oldest
      ).updatedAt;
    }

    return {
      sessionCount: sessions.length,
      totalSize,
      averageSize: sessions.length > 0 ? totalSize / sessions.length : 0,
      oldestSession,
    };
  }

  /**
   * Export conversations for backup
   */
  exportConversations(): string {
    const sessions = this.getStoredSessions();
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      version: '1.0',
      conversations: sessions,
    }, null, 2);
  }

  /**
   * Import conversations from backup
   */
  async importConversations(backupData: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(backupData);

      if (!parsed.conversations || !Array.isArray(parsed.conversations)) {
        throw new Error('Invalid backup format');
      }

      const validSessions = parsed.conversations.filter(this.isValidSession);
      const existing = this.getStoredSessions();
      const merged = this.mergeSessions(validSessions, existing);

      localStorage.setItem(this.SESSION_KEY, JSON.stringify(merged));
      return true;
    } catch (error) {
      console.error('Failed to import conversations:', error);
      return false;
    }
  }

  /**
   * Validate session structure
   */
  private isValidSession(session: any): session is ConversationSession {
    return (
      session &&
      typeof session.id === 'string' &&
      typeof session.userId === 'string' &&
      typeof session.status === 'string' &&
      Array.isArray(session.messages) &&
      typeof session.createdAt === 'string' &&
      typeof session.updatedAt === 'string'
    );
  }

  /**
   * Merge sessions from different sources, preferring newer versions
   */
  private mergeSessions(
    primary: ConversationSession[],
    secondary: ConversationSession[]
  ): ConversationSession[] {
    const sessionMap = new Map<string, ConversationSession>();

    // Add secondary sessions first
    secondary.forEach(session => {
      sessionMap.set(session.id, session);
    });

    // Override with primary sessions (newer or authoritative)
    primary.forEach(session => {
      const existing = sessionMap.get(session.id);
      if (!existing || new Date(session.updatedAt) >= new Date(existing.updatedAt)) {
        sessionMap.set(session.id, session);
      }
    });

    // Convert back to array, sorted by update time (newest first)
    return Array.from(sessionMap.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, this.MAX_SESSIONS);
  }
}

// Singleton instance
export const conversationSessionManager = new ConversationSessionManager();

export default conversationSessionManager;