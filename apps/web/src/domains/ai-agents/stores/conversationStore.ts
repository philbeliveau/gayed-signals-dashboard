'use client';

import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import {
  AgentMessage,
  ConversationStatus,
  ConversationResult,
  LiveConversationMessage,
  ConversationSession
} from '@/types/agents';

interface ActiveConversation {
  sessionId: string | null;
  status: ConversationStatus;
  messages: LiveConversationMessage[];
  participants: string[];
  startedAt: Date | null;
  completedAt: Date | null;
  contentSource?: 'text' | 'youtube' | 'substack';
  sourceMetadata?: Record<string, any>;
}

interface ConversationUIState {
  isDisplayVisible: boolean;
  isStreaming: boolean;
  autoScroll: boolean;
  conversationMode: 'overlay' | 'sidebar' | 'fullscreen';
  sidebarWidth: number;
}

interface ConversationState {
  // Active conversation state
  activeConversation: ActiveConversation;

  // Conversation history (limited for performance)
  conversationHistory: ConversationSession[];

  // UI state
  ui: ConversationUIState;

  // Actions - Conversation management
  startConversation: (
    sessionId: string,
    participants: string[],
    contentSource?: 'text' | 'youtube' | 'substack',
    sourceMetadata?: Record<string, any>
  ) => void;
  addMessage: (message: LiveConversationMessage) => void;
  updateStatus: (status: ConversationStatus) => void;
  completeConversation: (result: ConversationResult) => void;
  clearActiveConversation: () => void;

  // Actions - UI management
  toggleDisplay: () => void;
  setDisplayVisible: (visible: boolean) => void;
  setConversationMode: (mode: 'overlay' | 'sidebar' | 'fullscreen') => void;
  setSidebarWidth: (width: number) => void;
  setAutoScroll: (enabled: boolean) => void;

  // Actions - History management
  loadConversationHistory: () => Promise<void>;
  getConversationById: (sessionId: string) => ConversationSession | undefined;
  deleteConversation: (sessionId: string) => void;
  clearHistory: () => void;

  // Actions - State synchronization
  syncWithWebSocket: (wsMessage: any) => void;
}

// Default state values
const defaultActiveConversation: ActiveConversation = {
  sessionId: null,
  status: 'initializing',
  messages: [],
  participants: [],
  startedAt: null,
  completedAt: null,
};

const defaultUIState: ConversationUIState = {
  isDisplayVisible: false,
  isStreaming: false,
  autoScroll: true,
  conversationMode: 'sidebar',
  sidebarWidth: 400,
};

export const useConversationStore = create<ConversationState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        activeConversation: defaultActiveConversation,
        conversationHistory: [],
        ui: defaultUIState,

        // Conversation management actions
        startConversation: (sessionId, participants, contentSource, sourceMetadata) => {
          set({
            activeConversation: {
              sessionId,
              status: 'initializing',
              messages: [],
              participants,
              startedAt: new Date(),
              completedAt: null,
              contentSource,
              sourceMetadata,
            },
            ui: {
              ...get().ui,
              isStreaming: true,
              isDisplayVisible: true,
            },
          });
        },

        addMessage: (message) => {
          set((state) => ({
            activeConversation: {
              ...state.activeConversation,
              messages: [...state.activeConversation.messages, message],
              status: 'active',
            },
          }));
        },

        updateStatus: (status) => {
          set((state) => ({
            activeConversation: {
              ...state.activeConversation,
              status,
            },
            ui: {
              ...state.ui,
              isStreaming: status === 'active',
            },
          }));
        },

        completeConversation: (result) => {
          const state = get();
          const completedConversation: ConversationSession = {
            id: state.activeConversation.sessionId || '',
            userId: '', // Will be populated by auth context
            contentSource: state.activeConversation.contentSource || 'text',
            status: 'completed',
            messages: state.activeConversation.messages.map(msg => ({
              id: msg.id,
              agentName: msg.agent,
              agentType: msg.agent as any, // Type conversion for compatibility
              role: msg.agent,
              message: msg.content,
              timestamp: new Date(msg.timestamp).toISOString(),
              confidence: msg.confidence,
            })),
            createdAt: state.activeConversation.startedAt?.toISOString() || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: {
              result,
              ...state.activeConversation.sourceMetadata,
            },
          };

          set((state) => ({
            activeConversation: {
              ...state.activeConversation,
              status: 'completed',
              completedAt: new Date(),
            },
            conversationHistory: [
              completedConversation,
              ...state.conversationHistory.slice(0, 49), // Keep last 50 conversations
            ],
            ui: {
              ...state.ui,
              isStreaming: false,
            },
          }));
        },

        clearActiveConversation: () => {
          set({
            activeConversation: defaultActiveConversation,
            ui: {
              ...get().ui,
              isStreaming: false,
            },
          });
        },

        // UI management actions
        toggleDisplay: () => {
          set((state) => ({
            ui: {
              ...state.ui,
              isDisplayVisible: !state.ui.isDisplayVisible,
            },
          }));
        },

        setDisplayVisible: (visible) => {
          set((state) => ({
            ui: {
              ...state.ui,
              isDisplayVisible: visible,
            },
          }));
        },

        setConversationMode: (mode) => {
          set((state) => ({
            ui: {
              ...state.ui,
              conversationMode: mode,
            },
          }));
        },

        setSidebarWidth: (width) => {
          set((state) => ({
            ui: {
              ...state.ui,
              sidebarWidth: Math.max(300, Math.min(800, width)), // Clamp between 300-800px
            },
          }));
        },

        setAutoScroll: (enabled) => {
          set((state) => ({
            ui: {
              ...state.ui,
              autoScroll: enabled,
            },
          }));
        },

        // History management actions
        loadConversationHistory: async () => {
          try {
            const response = await fetch('/api/conversations/history');
            if (response.ok) {
              const history = await response.json();
              set({ conversationHistory: history });
            }
          } catch (error) {
            console.error('Failed to load conversation history:', error);
          }
        },

        getConversationById: (sessionId) => {
          return get().conversationHistory.find(conv => conv.id === sessionId);
        },

        deleteConversation: (sessionId) => {
          set((state) => ({
            conversationHistory: state.conversationHistory.filter(
              conv => conv.id !== sessionId
            ),
          }));
        },

        clearHistory: () => {
          set({ conversationHistory: [] });
        },

        // WebSocket synchronization
        syncWithWebSocket: (wsMessage) => {
          const { type, data, sessionId } = wsMessage;
          const state = get();

          // Only process messages for the active conversation
          if (sessionId !== state.activeConversation.sessionId) {
            return;
          }

          switch (type) {
            case 'agent-message':
              get().addMessage(data);
              break;
            case 'conversation-status':
              get().updateStatus(data.status);
              break;
            case 'conversation-complete':
              get().completeConversation(data.result);
              break;
            case 'error':
              get().updateStatus('error');
              console.error('Conversation error:', data);
              break;
          }
        },
      }),
      {
        name: 'conversation-state',
        // Only persist conversation history and UI preferences
        partialize: (state) => ({
          conversationHistory: state.conversationHistory,
          ui: {
            isDisplayVisible: state.ui.isDisplayVisible,
            autoScroll: state.ui.autoScroll,
            conversationMode: state.ui.conversationMode,
            sidebarWidth: state.ui.sidebarWidth,
          },
        }),
        // Merge strategy for partial state restoration
        merge: (persistedState, currentState) => ({
          ...currentState,
          conversationHistory: (persistedState as any)?.conversationHistory || [],
          ui: {
            ...currentState.ui,
            ...((persistedState as any)?.ui || {}),
          },
        }),
      }
    )
  )
);

// Cross-tab synchronization listener
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'conversation-state' && event.newValue) {
      try {
        const updatedState = JSON.parse(event.newValue);
        const store = useConversationStore.getState();

        // Only sync conversation history and UI preferences
        useConversationStore.setState({
          conversationHistory: updatedState.state?.conversationHistory || store.conversationHistory,
          ui: {
            ...store.ui,
            ...(updatedState.state?.ui || {}),
          },
        });
      } catch (error) {
        console.error('Failed to sync conversation state across tabs:', error);
      }
    }
  });
}

export default useConversationStore;