'use client';

import { useCallback, useEffect, useState } from 'react';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { useConversationStore } from '@/domains/ai-agents/stores/conversationStore';
import { useDashboardStore } from '@/stores/dashboardStore';

export interface ConversationPreferences {
  // Display preferences
  autoScroll: boolean;
  showTimestamps: boolean;
  showConfidenceScores: boolean;
  compactMessageView: boolean;
  messageGrouping: boolean;

  // Audio preferences
  enableNotifications: boolean;
  notificationSound: 'none' | 'subtle' | 'prominent';
  enableSpeechSynthesis: boolean;
  speechRate: number; // 0.5 - 2.0

  // Performance preferences
  messageBufferSize: number; // Number of messages to keep in memory
  autoCleanupAfter: number; // Hours before auto-cleanup
  enableVirtualization: boolean;
  reducedAnimations: boolean;

  // Agent preferences
  preferredAgentOrder: string[];
  hideSpecificAgents: string[];
  showAgentAvatars: boolean;
  groupMessagesByAgent: boolean;

  // Export preferences
  defaultExportFormat: 'json' | 'csv' | 'pdf' | 'markdown';
  includeMetadata: boolean;
  includeTimestamps: boolean;
  includeConfidenceScores: boolean;

  // Privacy preferences
  persistConversations: boolean;
  shareUsageAnalytics: boolean;
  autoDeleteAfterDays: number;
}

const defaultConversationPreferences: ConversationPreferences = {
  // Display preferences
  autoScroll: true,
  showTimestamps: true,
  showConfidenceScores: true,
  compactMessageView: false,
  messageGrouping: true,

  // Audio preferences
  enableNotifications: true,
  notificationSound: 'subtle',
  enableSpeechSynthesis: false,
  speechRate: 1.0,

  // Performance preferences
  messageBufferSize: 200,
  autoCleanupAfter: 24,
  enableVirtualization: true,
  reducedAnimations: false,

  // Agent preferences
  preferredAgentOrder: ['FINANCIAL_ANALYST', 'MARKET_CONTEXT', 'RISK_CHALLENGER'],
  hideSpecificAgents: [],
  showAgentAvatars: true,
  groupMessagesByAgent: true,

  // Export preferences
  defaultExportFormat: 'json',
  includeMetadata: true,
  includeTimestamps: true,
  includeConfidenceScores: true,

  // Privacy preferences
  persistConversations: true,
  shareUsageAnalytics: true,
  autoDeleteAfterDays: 30,
};

/**
 * Hook for managing conversation-specific preferences that integrate with user preferences
 */
export function useConversationPreferences() {
  const { preferences: userPreferences, updateETFSelection } = useUserPreferences();
  const { ui: conversationUI, setAutoScroll } = useConversationStore();
  const { compactMode, setCompactMode } = useDashboardStore();

  // Local state for conversation preferences
  const [conversationPrefs, setConversationPrefs] = useState<ConversationPreferences>(
    defaultConversationPreferences
  );
  const [mounted, setMounted] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    setMounted(true);
    loadPreferences();
  }, []);

  // Save preferences when they change
  useEffect(() => {
    if (mounted) {
      savePreferences();
    }
  }, [conversationPrefs, mounted]);

  // Sync with conversation store
  useEffect(() => {
    if (mounted) {
      setAutoScroll(conversationPrefs.autoScroll);
    }
  }, [conversationPrefs.autoScroll, setAutoScroll, mounted]);

  // Sync with dashboard store
  useEffect(() => {
    if (mounted && conversationPrefs.compactMessageView !== compactMode) {
      setCompactMode(conversationPrefs.compactMessageView);
    }
  }, [conversationPrefs.compactMessageView, compactMode, setCompactMode, mounted]);

  const loadPreferences = useCallback(() => {
    try {
      const stored = localStorage.getItem('gayed-conversation-preferences');
      if (stored) {
        const parsed = JSON.parse(stored);
        setConversationPrefs(prev => ({
          ...prev,
          ...parsed,
        }));
      }
    } catch (error) {
      console.error('Failed to load conversation preferences:', error);
    }
  }, []);

  const savePreferences = useCallback(() => {
    try {
      localStorage.setItem('gayed-conversation-preferences', JSON.stringify(conversationPrefs));
    } catch (error) {
      console.error('Failed to save conversation preferences:', error);
    }
  }, [conversationPrefs]);

  // Update specific preference
  const updatePreference = useCallback(<K extends keyof ConversationPreferences>(
    key: K,
    value: ConversationPreferences[K]
  ) => {
    setConversationPrefs(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // Bulk update preferences
  const updatePreferences = useCallback((updates: Partial<ConversationPreferences>) => {
    setConversationPrefs(prev => ({
      ...prev,
      ...updates,
    }));
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setConversationPrefs(defaultConversationPreferences);
  }, []);

  // Import/export preferences
  const exportPreferences = useCallback((): string => {
    return JSON.stringify({
      conversationPreferences: conversationPrefs,
      exportDate: new Date().toISOString(),
      version: '1.0',
    }, null, 2);
  }, [conversationPrefs]);

  const importPreferences = useCallback((data: string): boolean => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.conversationPreferences) {
        setConversationPrefs(prev => ({
          ...prev,
          ...parsed.conversationPreferences,
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import conversation preferences:', error);
      return false;
    }
  }, []);

  // Performance-related getters
  const getPerformanceSettings = useCallback(() => {
    return {
      messageBufferSize: conversationPrefs.messageBufferSize,
      enableVirtualization: conversationPrefs.enableVirtualization,
      reducedAnimations: conversationPrefs.reducedAnimations,
      autoCleanupAfter: conversationPrefs.autoCleanupAfter,
    };
  }, [conversationPrefs]);

  // Display-related getters
  const getDisplaySettings = useCallback(() => {
    return {
      autoScroll: conversationPrefs.autoScroll,
      showTimestamps: conversationPrefs.showTimestamps,
      showConfidenceScores: conversationPrefs.showConfidenceScores,
      compactMessageView: conversationPrefs.compactMessageView,
      messageGrouping: conversationPrefs.messageGrouping,
      showAgentAvatars: conversationPrefs.showAgentAvatars,
      groupMessagesByAgent: conversationPrefs.groupMessagesByAgent,
    };
  }, [conversationPrefs]);

  // Audio-related getters
  const getAudioSettings = useCallback(() => {
    return {
      enableNotifications: conversationPrefs.enableNotifications,
      notificationSound: conversationPrefs.notificationSound,
      enableSpeechSynthesis: conversationPrefs.enableSpeechSynthesis,
      speechRate: conversationPrefs.speechRate,
    };
  }, [conversationPrefs]);

  // Privacy-related getters
  const getPrivacySettings = useCallback(() => {
    return {
      persistConversations: conversationPrefs.persistConversations,
      shareUsageAnalytics: conversationPrefs.shareUsageAnalytics,
      autoDeleteAfterDays: conversationPrefs.autoDeleteAfterDays,
    };
  }, [conversationPrefs]);

  // Agent-related functions
  const updateAgentOrder = useCallback((agentOrder: string[]) => {
    updatePreference('preferredAgentOrder', agentOrder);
  }, [updatePreference]);

  const toggleAgentVisibility = useCallback((agentType: string) => {
    const isHidden = conversationPrefs.hideSpecificAgents.includes(agentType);
    const updatedHidden = isHidden
      ? conversationPrefs.hideSpecificAgents.filter(agent => agent !== agentType)
      : [...conversationPrefs.hideSpecificAgents, agentType];

    updatePreference('hideSpecificAgents', updatedHidden);
  }, [conversationPrefs.hideSpecificAgents, updatePreference]);

  // Notification functions
  const shouldShowNotification = useCallback((messageType: string): boolean => {
    return conversationPrefs.enableNotifications && document.hidden;
  }, [conversationPrefs.enableNotifications]);

  const playNotificationSound = useCallback(() => {
    if (conversationPrefs.notificationSound === 'none') return;

    try {
      const audio = new Audio();
      audio.volume = 0.3;

      if (conversationPrefs.notificationSound === 'subtle') {
        // Soft notification sound
        audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmgYBjiM2e';
      } else {
        // Prominent notification sound
        audio.src = 'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQ4AAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwF';
      }

      audio.play().catch(error => {
        console.warn('Failed to play notification sound:', error);
      });
    } catch (error) {
      console.warn('Notification sound not supported:', error);
    }
  }, [conversationPrefs.notificationSound]);

  return {
    // Current preferences
    preferences: conversationPrefs,

    // Update functions
    updatePreference,
    updatePreferences,
    resetToDefaults,

    // Import/export
    exportPreferences,
    importPreferences,

    // Grouped getters
    getPerformanceSettings,
    getDisplaySettings,
    getAudioSettings,
    getPrivacySettings,

    // Agent management
    updateAgentOrder,
    toggleAgentVisibility,

    // Notification functions
    shouldShowNotification,
    playNotificationSound,

    // State
    isLoaded: mounted,
  };
}

export default useConversationPreferences;