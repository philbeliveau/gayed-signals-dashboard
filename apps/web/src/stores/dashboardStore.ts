'use client';

import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { useConversationStore } from '@/domains/ai-agents/stores/conversationStore';

interface DashboardLayoutState {
  // Existing dashboard state can be extended here
  sidebarCollapsed: boolean;
  activePanel: 'signals' | 'conversations' | 'portfolio' | 'settings';

  // Conversation integration
  conversationSidebarOpen: boolean;
  conversationMode: 'overlay' | 'sidebar' | 'fullscreen';
  conversationPanelWidth: number;

  // Layout preferences
  showSignalSummary: boolean;
  compactMode: boolean;
  gridLayout: '1x1' | '2x1' | '2x2' | '3x2';
}

interface DashboardState extends DashboardLayoutState {
  // Actions - Layout management
  toggleSidebar: () => void;
  setActivePanel: (panel: 'signals' | 'conversations' | 'portfolio' | 'settings') => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Actions - Conversation integration
  toggleConversationSidebar: () => void;
  setConversationMode: (mode: 'overlay' | 'sidebar' | 'fullscreen') => void;
  setConversationPanelWidth: (width: number) => void;
  openConversationPanel: () => void;
  closeConversationPanel: () => void;

  // Actions - Layout preferences
  setShowSignalSummary: (show: boolean) => void;
  setCompactMode: (compact: boolean) => void;
  setGridLayout: (layout: '1x1' | '2x1' | '2x2' | '3x2') => void;

  // Actions - State coordination
  syncWithConversationState: () => void;
  resetToDefaults: () => void;
}

// Default state
const defaultState: DashboardLayoutState = {
  sidebarCollapsed: false,
  activePanel: 'signals',
  conversationSidebarOpen: false,
  conversationMode: 'sidebar',
  conversationPanelWidth: 400,
  showSignalSummary: true,
  compactMode: false,
  gridLayout: '2x2',
};

export const useDashboardStore = create<DashboardState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        ...defaultState,

        // Layout management actions
        toggleSidebar: () => {
          set((state) => ({
            sidebarCollapsed: !state.sidebarCollapsed,
          }));
        },

        setActivePanel: (panel) => {
          set({ activePanel: panel });

          // Auto-open conversation sidebar when conversations panel is selected
          if (panel === 'conversations') {
            get().openConversationPanel();
          }
        },

        setSidebarCollapsed: (collapsed) => {
          set({ sidebarCollapsed: collapsed });
        },

        // Conversation integration actions
        toggleConversationSidebar: () => {
          set((state) => ({
            conversationSidebarOpen: !state.conversationSidebarOpen,
          }));
        },

        setConversationMode: (mode) => {
          set({ conversationMode: mode });

          // Adjust layout based on conversation mode
          if (mode === 'fullscreen') {
            set({
              sidebarCollapsed: true,
              conversationSidebarOpen: true,
            });
          } else if (mode === 'sidebar') {
            set({
              sidebarCollapsed: false,
              conversationSidebarOpen: true,
            });
          }
        },

        setConversationPanelWidth: (width) => {
          const clampedWidth = Math.max(300, Math.min(800, width));
          set({ conversationPanelWidth: clampedWidth });
        },

        openConversationPanel: () => {
          set({
            conversationSidebarOpen: true,
            activePanel: 'conversations',
          });
        },

        closeConversationPanel: () => {
          set({
            conversationSidebarOpen: false,
          });

          // Return to signals panel if conversations was active
          if (get().activePanel === 'conversations') {
            set({ activePanel: 'signals' });
          }
        },

        // Layout preferences actions
        setShowSignalSummary: (show) => {
          set({ showSignalSummary: show });
        },

        setCompactMode: (compact) => {
          set({ compactMode: compact });

          // Adjust conversation panel width for compact mode
          if (compact) {
            set({ conversationPanelWidth: 320 });
          } else {
            set({ conversationPanelWidth: 400 });
          }
        },

        setGridLayout: (layout) => {
          set({ gridLayout: layout });
        },

        // State coordination
        syncWithConversationState: () => {
          const conversationState = useConversationStore.getState();

          // Auto-open conversation panel when conversation starts
          if (conversationState.activeConversation.sessionId) {
            get().openConversationPanel();
          }

          // Sync conversation display preferences
          if (conversationState.ui.isDisplayVisible) {
            set({
              conversationSidebarOpen: true,
              conversationMode: conversationState.ui.conversationMode,
            });
          }
        },

        resetToDefaults: () => {
          set(defaultState);
        },
      }),
      {
        name: 'dashboard-state',
        partialize: (state) => ({
          sidebarCollapsed: state.sidebarCollapsed,
          activePanel: state.activePanel,
          conversationMode: state.conversationMode,
          conversationPanelWidth: state.conversationPanelWidth,
          showSignalSummary: state.showSignalSummary,
          compactMode: state.compactMode,
          gridLayout: state.gridLayout,
          // Don't persist conversationSidebarOpen as it should reset on page load
        }),
        merge: (persistedState, currentState) => ({
          ...currentState,
          ...persistedState,
        }),
      }
    )
  )
);

// Cross-store synchronization
// Subscribe to conversation state changes and update dashboard accordingly
if (typeof window !== 'undefined') {
  useConversationStore.subscribe(
    (state) => state.activeConversation.status,
    (status) => {
      const dashboardStore = useDashboardStore.getState();

      switch (status) {
        case 'initializing':
          // Auto-open conversation panel when conversation starts
          dashboardStore.openConversationPanel();
          break;
        case 'completed':
          // Keep panel open but user can manually close if desired
          break;
        case 'error':
          // Could optionally close panel on error, but better UX to keep it open
          break;
      }
    }
  );

  // Subscribe to conversation display visibility
  useConversationStore.subscribe(
    (state) => state.ui.isDisplayVisible,
    (isVisible) => {
      const dashboardStore = useDashboardStore.getState();

      if (isVisible) {
        dashboardStore.openConversationPanel();
      }
    }
  );

  // Subscribe to conversation mode changes
  useConversationStore.subscribe(
    (state) => state.ui.conversationMode,
    (mode) => {
      const dashboardStore = useDashboardStore.getState();
      dashboardStore.setConversationMode(mode);
    }
  );

  // Subscribe to dashboard active panel changes and sync with conversation store
  useDashboardStore.subscribe(
    (state) => state.activePanel,
    (panel) => {
      const conversationStore = useConversationStore.getState();

      if (panel === 'conversations' && !conversationStore.ui.isDisplayVisible) {
        // Show conversation display when conversations panel is selected
        useConversationStore.setState({
          ui: {
            ...conversationStore.ui,
            isDisplayVisible: true,
          },
        });
      }
    }
  );
}

export default useDashboardStore;