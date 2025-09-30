/**
 * Agent Configuration Constants
 *
 * Centralized configuration for agent display properties, icons, and descriptions
 * used across the Live Conversation Display and other agent-related components.
 */

export interface AgentConfig {
  color: string;
  icon: string;
  name: string;
  description: string;
}

export const AGENT_CONFIG: Record<string, AgentConfig> = {
  'FINANCIAL_ANALYST': {
    color: 'bg-theme-info-bg border-theme-info-border text-theme-info',
    icon: '📊',
    name: 'Financial Analyst',
    description: 'Market Signal Analysis'
  },
  'MARKET_CONTEXT': {
    color: 'bg-theme-success-bg border-theme-success-border text-theme-success',
    icon: '🌍',
    name: 'Market Context',
    description: 'Real-time Intelligence'
  },
  'RISK_CHALLENGER': {
    color: 'bg-theme-warning-bg border-theme-warning-border text-theme-warning',
    icon: '⚠️',
    name: 'Risk Challenger',
    description: 'Critical Assessment'
  }
};

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  color: 'bg-theme-bg-secondary border-theme-border text-theme-text-muted',
  icon: '🤖',
  name: 'AI Agent',
  description: 'AI Agent'
};

// Animation and timing constants
export const CONVERSATION_TIMING = {
  MESSAGE_INTERVAL: 3000, // ms between mock messages
  AUTO_SCROLL_DELAY: 100, // ms delay for auto-scroll
} as const;