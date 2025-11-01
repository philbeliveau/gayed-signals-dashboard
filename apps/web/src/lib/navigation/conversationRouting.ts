'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { useConversationStore } from '@/domains/ai-agents/stores/conversationStore';
import { useDashboardStore } from '@/stores/dashboardStore';

export interface ConversationRouteParams {
  sessionId?: string;
  mode?: 'overlay' | 'sidebar' | 'fullscreen';
  panel?: 'conversations';
  autoStart?: boolean;
}

/**
 * Hook for managing conversation-related navigation and URL state
 */
export function useConversationNavigation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const { activeConversation, startConversation, clearActiveConversation } = useConversationStore();
  const { setActivePanel, setConversationMode, openConversationPanel } = useDashboardStore();

  // Navigation functions
  const navigateToConversation = useCallback((
    sessionId: string,
    options: Partial<ConversationRouteParams> = {}
  ) => {
    const params = new URLSearchParams(searchParams?.toString() || '');

    // Set conversation parameters
    params.set('conversation', sessionId);

    if (options.mode) {
      params.set('mode', options.mode);
    }

    if (options.panel) {
      params.set('panel', options.panel);
    }

    // Navigate with updated params
    router.push(`${pathname}?${params.toString()}`);

    // Update dashboard state
    if (options.mode) {
      setConversationMode(options.mode);
    }

    if (options.panel === 'conversations') {
      setActivePanel('conversations');
      openConversationPanel();
    }
  }, [router, pathname, searchParams, setConversationMode, setActivePanel, openConversationPanel]);

  const navigateToNewConversation = useCallback((
    participants: string[],
    contentSource?: 'text' | 'youtube' | 'substack',
    sourceMetadata?: Record<string, any>
  ) => {
    // Generate new session ID
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Start conversation
    startConversation(sessionId, participants, contentSource, sourceMetadata);

    // Navigate to conversation
    navigateToConversation(sessionId, {
      mode: 'sidebar',
      panel: 'conversations',
    });

    return sessionId;
  }, [startConversation, navigateToConversation]);

  const exitConversation = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() || '');

    // Remove conversation parameters
    params.delete('conversation');
    params.delete('mode');

    // Clear conversation state
    clearActiveConversation();

    // Navigate without conversation params
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newUrl);
  }, [router, pathname, searchParams, clearActiveConversation]);

  const updateConversationMode = useCallback((mode: 'overlay' | 'sidebar' | 'fullscreen') => {
    const params = new URLSearchParams(searchParams?.toString() || '');

    if (activeConversation.sessionId) {
      params.set('mode', mode);
      router.push(`${pathname}?${params.toString()}`);
    }

    setConversationMode(mode);
  }, [router, pathname, searchParams, activeConversation.sessionId, setConversationMode]);

  // URL state parsing
  const getConversationFromUrl = useCallback((): ConversationRouteParams | null => {
    if (!searchParams) return null;

    const sessionId = searchParams.get('conversation');
    const mode = searchParams.get('mode') as 'overlay' | 'sidebar' | 'fullscreen' | null;
    const panel = searchParams.get('panel') as 'conversations' | null;
    const autoStart = searchParams.get('autoStart') === 'true';

    if (!sessionId) return null;

    return {
      sessionId,
      mode: mode || undefined,
      panel: panel || undefined,
      autoStart,
    };
  }, [searchParams]);

  // Sync URL state with conversation state on mount and URL changes
  useEffect(() => {
    const urlState = getConversationFromUrl();

    if (urlState?.sessionId && urlState.sessionId !== activeConversation.sessionId) {
      // URL has conversation ID that doesn't match active conversation
      // This could happen on page refresh or direct navigation

      console.log('Syncing conversation state with URL:', urlState);

      // Update dashboard state
      if (urlState.mode) {
        setConversationMode(urlState.mode);
      }

      if (urlState.panel === 'conversations') {
        setActivePanel('conversations');
        openConversationPanel();
      }

      // Note: Actual conversation loading should be handled by the component
      // that manages conversation sessions, not here
    } else if (!urlState?.sessionId && activeConversation.sessionId) {
      // URL doesn't have conversation but we have active conversation
      // This could happen if user manually edited URL
      // For now, we'll keep the conversation active but this could be configurable
    }
  }, [
    searchParams,
    activeConversation.sessionId,
    setConversationMode,
    setActivePanel,
    openConversationPanel,
    getConversationFromUrl,
  ]);

  return {
    // Navigation functions
    navigateToConversation,
    navigateToNewConversation,
    exitConversation,
    updateConversationMode,

    // State parsing
    getConversationFromUrl,

    // Current URL state
    currentConversationId: getConversationFromUrl()?.sessionId || null,
    currentMode: getConversationFromUrl()?.mode || 'sidebar',
  };
}

/**
 * Hook for handling browser navigation events (back/forward) with conversation state
 */
export function useConversationNavigationSync() {
  const { activeConversation, clearActiveConversation } = useConversationStore();
  const { closeConversationPanel } = useDashboardStore();

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Get conversation ID from current URL after navigation
      const params = new URLSearchParams(window.location.search);
      const urlConversationId = params.get('conversation');

      // If URL no longer has conversation ID but we have active conversation
      if (!urlConversationId && activeConversation.sessionId) {
        clearActiveConversation();
        closeConversationPanel();
      }

      // If URL has different conversation ID, the component handling
      // conversation loading should pick this up via useConversationNavigation
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeConversation.sessionId, clearActiveConversation, closeConversationPanel]);
}

/**
 * Generate conversation shareable URLs
 */
export function generateConversationUrl(
  sessionId: string,
  baseUrl: string = window.location.origin,
  options: Partial<ConversationRouteParams> = {}
): string {
  const url = new URL(window.location.pathname, baseUrl);
  const params = new URLSearchParams();

  params.set('conversation', sessionId);

  if (options.mode) {
    params.set('mode', options.mode);
  }

  if (options.panel) {
    params.set('panel', options.panel);
  }

  if (options.autoStart) {
    params.set('autoStart', 'true');
  }

  url.search = params.toString();
  return url.toString();
}

/**
 * Parse conversation URL and extract parameters
 */
export function parseConversationUrl(url: string): ConversationRouteParams | null {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;

    const sessionId = params.get('conversation');
    if (!sessionId) return null;

    return {
      sessionId,
      mode: params.get('mode') as 'overlay' | 'sidebar' | 'fullscreen' | undefined,
      panel: params.get('panel') as 'conversations' | undefined,
      autoStart: params.get('autoStart') === 'true',
    };
  } catch {
    return null;
  }
}

/**
 * Conversation breadcrumb generation for navigation UI
 */
export function generateConversationBreadcrumbs(
  sessionId: string | null,
  conversationTitle?: string
): Array<{ label: string; href: string; active: boolean }> {
  const breadcrumbs = [
    {
      label: 'Dashboard',
      href: '/',
      active: false,
    },
  ];

  if (sessionId) {
    breadcrumbs.push({
      label: 'Conversations',
      href: '/?panel=conversations',
      active: false,
    });

    breadcrumbs.push({
      label: conversationTitle || `Session ${sessionId.slice(-8)}`,
      href: `/?conversation=${sessionId}&panel=conversations`,
      active: true,
    });
  }

  return breadcrumbs;
}

export default {
  useConversationNavigation,
  useConversationNavigationSync,
  generateConversationUrl,
  parseConversationUrl,
  generateConversationBreadcrumbs,
};