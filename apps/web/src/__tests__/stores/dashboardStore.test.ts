import { act, renderHook } from '@testing-library/react';
import { useDashboardStore } from '@/stores/dashboardStore';

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

describe('DashboardStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    act(() => {
      useDashboardStore.getState().resetToDefaults();
    });

    // Clear mocks
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Layout Management', () => {
    test('initializes with default state', () => {
      const { result } = renderHook(() => useDashboardStore());

      expect(result.current.sidebarCollapsed).toBe(false);
      expect(result.current.activePanel).toBe('signals');
      expect(result.current.conversationSidebarOpen).toBe(false);
      expect(result.current.conversationMode).toBe('sidebar');
      expect(result.current.conversationPanelWidth).toBe(400);
      expect(result.current.showSignalSummary).toBe(true);
      expect(result.current.compactMode).toBe(false);
      expect(result.current.gridLayout).toBe('2x2');
    });

    test('toggles sidebar collapse state', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarCollapsed).toBe(true);

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarCollapsed).toBe(false);
    });

    test('sets sidebar collapsed state', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.setSidebarCollapsed(true);
      });

      expect(result.current.sidebarCollapsed).toBe(true);

      act(() => {
        result.current.setSidebarCollapsed(false);
      });

      expect(result.current.sidebarCollapsed).toBe(false);
    });

    test('sets active panel', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.setActivePanel('portfolio');
      });

      expect(result.current.activePanel).toBe('portfolio');
    });

    test('auto-opens conversation panel when conversations panel is selected', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.setActivePanel('conversations');
      });

      expect(result.current.activePanel).toBe('conversations');
      expect(result.current.conversationSidebarOpen).toBe(true);
    });
  });

  describe('Conversation Integration', () => {
    test('toggles conversation sidebar', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.toggleConversationSidebar();
      });

      expect(result.current.conversationSidebarOpen).toBe(true);

      act(() => {
        result.current.toggleConversationSidebar();
      });

      expect(result.current.conversationSidebarOpen).toBe(false);
    });

    test('sets conversation mode', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.setConversationMode('fullscreen');
      });

      expect(result.current.conversationMode).toBe('fullscreen');
    });

    test('adjusts layout when conversation mode is fullscreen', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.setConversationMode('fullscreen');
      });

      expect(result.current.conversationMode).toBe('fullscreen');
      expect(result.current.sidebarCollapsed).toBe(true);
      expect(result.current.conversationSidebarOpen).toBe(true);
    });

    test('adjusts layout when conversation mode is sidebar', () => {
      const { result } = renderHook(() => useDashboardStore());

      // First set it to something else
      act(() => {
        result.current.setConversationMode('fullscreen');
      });

      act(() => {
        result.current.setConversationMode('sidebar');
      });

      expect(result.current.conversationMode).toBe('sidebar');
      expect(result.current.sidebarCollapsed).toBe(false);
      expect(result.current.conversationSidebarOpen).toBe(true);
    });

    test('sets and clamps conversation panel width', () => {
      const { result } = renderHook(() => useDashboardStore());

      // Test normal width
      act(() => {
        result.current.setConversationPanelWidth(500);
      });

      expect(result.current.conversationPanelWidth).toBe(500);

      // Test minimum clamp
      act(() => {
        result.current.setConversationPanelWidth(200);
      });

      expect(result.current.conversationPanelWidth).toBe(300);

      // Test maximum clamp
      act(() => {
        result.current.setConversationPanelWidth(1000);
      });

      expect(result.current.conversationPanelWidth).toBe(800);
    });

    test('opens conversation panel', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.openConversationPanel();
      });

      expect(result.current.conversationSidebarOpen).toBe(true);
      expect(result.current.activePanel).toBe('conversations');
    });

    test('closes conversation panel', () => {
      const { result } = renderHook(() => useDashboardStore());

      // First open it
      act(() => {
        result.current.openConversationPanel();
      });

      act(() => {
        result.current.closeConversationPanel();
      });

      expect(result.current.conversationSidebarOpen).toBe(false);
    });

    test('returns to signals panel when closing conversations panel', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.setActivePanel('conversations');
      });

      act(() => {
        result.current.closeConversationPanel();
      });

      expect(result.current.activePanel).toBe('signals');
    });
  });

  describe('Layout Preferences', () => {
    test('sets show signal summary preference', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.setShowSignalSummary(false);
      });

      expect(result.current.showSignalSummary).toBe(false);

      act(() => {
        result.current.setShowSignalSummary(true);
      });

      expect(result.current.showSignalSummary).toBe(true);
    });

    test('sets compact mode and adjusts conversation panel width', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.setCompactMode(true);
      });

      expect(result.current.compactMode).toBe(true);
      expect(result.current.conversationPanelWidth).toBe(320);

      act(() => {
        result.current.setCompactMode(false);
      });

      expect(result.current.compactMode).toBe(false);
      expect(result.current.conversationPanelWidth).toBe(400);
    });

    test('sets grid layout', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.setGridLayout('3x2');
      });

      expect(result.current.gridLayout).toBe('3x2');
    });
  });

  describe('State Coordination', () => {
    test('resets to default state', () => {
      const { result } = renderHook(() => useDashboardStore());

      // Change some values
      act(() => {
        result.current.setSidebarCollapsed(true);
        result.current.setActivePanel('portfolio');
        result.current.setConversationMode('fullscreen');
        result.current.setCompactMode(true);
      });

      // Reset to defaults
      act(() => {
        result.current.resetToDefaults();
      });

      expect(result.current.sidebarCollapsed).toBe(false);
      expect(result.current.activePanel).toBe('signals');
      expect(result.current.conversationMode).toBe('sidebar');
      expect(result.current.compactMode).toBe(false);
    });
  });

  describe('Persistence', () => {
    test('persists state to localStorage', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.setSidebarCollapsed(true);
        result.current.setActivePanel('portfolio');
        result.current.setConversationMode('fullscreen');
      });

      // The persistence is handled by Zustand middleware
      // We can verify the store calls localStorage.setItem
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'dashboard-state',
        expect.stringContaining('sidebarCollapsed')
      );
    });

    test('does not persist conversationSidebarOpen state', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.toggleConversationSidebar();
      });

      // conversationSidebarOpen should not be in persisted data
      const persistedData = (localStorageMock.setItem as jest.Mock).mock.calls
        .find(call => call[0] === 'dashboard-state')?.[1];

      if (persistedData) {
        const parsed = JSON.parse(persistedData);
        expect(parsed.state).not.toHaveProperty('conversationSidebarOpen');
      }
    });
  });

  describe('Edge Cases', () => {
    test('handles multiple rapid state changes', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        // Rapid succession of changes
        result.current.toggleSidebar();
        result.current.setActivePanel('conversations');
        result.current.setConversationMode('overlay');
        result.current.toggleConversationSidebar();
        result.current.setCompactMode(true);
      });

      // All changes should be applied
      expect(result.current.sidebarCollapsed).toBe(true);
      expect(result.current.activePanel).toBe('conversations');
      expect(result.current.conversationMode).toBe('overlay');
      expect(result.current.conversationSidebarOpen).toBe(false); // toggled after opening
      expect(result.current.compactMode).toBe(true);
    });

    test('maintains consistency when switching between conversation modes', () => {
      const { result } = renderHook(() => useDashboardStore());

      // Test mode switching sequence
      act(() => {
        result.current.setConversationMode('fullscreen');
      });

      expect(result.current.sidebarCollapsed).toBe(true);
      expect(result.current.conversationSidebarOpen).toBe(true);

      act(() => {
        result.current.setConversationMode('sidebar');
      });

      expect(result.current.sidebarCollapsed).toBe(false);
      expect(result.current.conversationSidebarOpen).toBe(true);

      act(() => {
        result.current.setConversationMode('overlay');
      });

      // Overlay mode doesn't change sidebar state
      expect(result.current.sidebarCollapsed).toBe(false);
      expect(result.current.conversationSidebarOpen).toBe(true);
    });
  });

  describe('State Synchronization', () => {
    test('maintains conversation panel state consistency', () => {
      const { result } = renderHook(() => useDashboardStore());

      // Open conversation panel
      act(() => {
        result.current.openConversationPanel();
      });

      expect(result.current.conversationSidebarOpen).toBe(true);
      expect(result.current.activePanel).toBe('conversations');

      // Switch to different panel
      act(() => {
        result.current.setActivePanel('signals');
      });

      // Conversation sidebar should still be open
      expect(result.current.conversationSidebarOpen).toBe(true);
      expect(result.current.activePanel).toBe('signals');

      // Close conversation panel should return to previous panel
      act(() => {
        result.current.closeConversationPanel();
      });

      expect(result.current.conversationSidebarOpen).toBe(false);
      expect(result.current.activePanel).toBe('signals');
    });

    test('handles panel switching with conversation sidebar open', () => {
      const { result } = renderHook(() => useDashboardStore());

      // Open conversation panel first
      act(() => {
        result.current.openConversationPanel();
      });

      // Switch to portfolio while conversation is open
      act(() => {
        result.current.setActivePanel('portfolio');
      });

      expect(result.current.activePanel).toBe('portfolio');
      expect(result.current.conversationSidebarOpen).toBe(true);

      // Close conversation from portfolio panel
      act(() => {
        result.current.closeConversationPanel();
      });

      // Should stay on portfolio panel
      expect(result.current.activePanel).toBe('portfolio');
      expect(result.current.conversationSidebarOpen).toBe(false);
    });
  });
});