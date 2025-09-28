# Source Tree Organization

## Directory Structure Rules

### Enhanced Monorepo Structure
```bash
# ✅ REQUIRED: All new components follow existing domain structure
gayed-signals-dashboard/
├── apps/                              # Application packages
│   ├── web/                           # Frontend application
│   │   ├── src/
│   │   │   ├── domains/               # Domain-driven architecture (PRESERVED)
│   │   │   │   ├── ai-agents/         # Enhanced for AutoGen integration
│   │   │   │   │   ├── components/    # Agent-specific UI components
│   │   │   │   │   ├── hooks/         # Agent state management hooks
│   │   │   │   │   ├── services/      # Agent orchestration services
│   │   │   │   │   ├── types/         # AutoGen type definitions
│   │   │   │   │   └── utils/         # Agent-specific utilities
│   │   │   │   ├── trading-signals/   # Existing signal infrastructure (PRESERVED)
│   │   │   │   ├── market-data/       # Existing market data (PRESERVED)
│   │   │   │   └── risk-management/   # Existing risk management (PRESERVED)
│   │   │   ├── components/            # Shared UI components
│   │   │   │   ├── agents/            # NEW: AutoGen-specific components
│   │   │   │   ├── auth/              # Enhanced authentication components
│   │   │   │   ├── layout/            # Existing professional layout
│   │   │   │   ├── signals/           # Existing signal components
│   │   │   │   └── ui/                # Existing shared UI components
│   │   │   ├── lib/                   # Enhanced utilities and configurations
│   │   │   │   ├── auth/              # Authentication utilities (UUID mapping)
│   │   │   │   ├── database/          # Database connection and queries
│   │   │   │   ├── websocket/         # WebSocket client management
│   │   │   │   └── utils/             # General utilities
│   │   │   └── types/                 # Global type definitions
│   │   │       ├── agents.ts          # AutoGen-specific types
│   │   │       ├── api.ts             # API response types
│   │   │       └── database.ts        # Database model types
│   │   ├── prisma/                    # Database schema and migrations
│   │   ├── next.config.ts             # Enhanced configuration
│   │   └── package.json
│   └── backend/                       # FastAPI AutoGen service
│       ├── src/
│       │   ├── agents/                # AutoGen agent implementations
│       │   ├── api/                   # FastAPI endpoints
│       │   ├── services/              # Business logic services
│       │   ├── models/                # Pydantic models
│       │   ├── database/              # Database layer
│       │   ├── integrations/          # External API integrations
│       │   └── config/                # Configuration
│       ├── tests/                     # Backend testing
│       ├── requirements.txt           # Python dependencies
│       ├── Dockerfile                 # Railway deployment
│       └── main.py                    # FastAPI application entry
├── packages/                          # Shared packages
│   ├── shared/                        # Shared types/utilities
│   ├── ui/                            # Shared UI components
│   └── config/                        # Shared configuration
├── docs/                              # Documentation
│   ├── architecture/                  # Architecture documentation
│   │   ├── coding-standards.md        # This file
│   │   ├── source-tree.md            # Source tree organization
│   │   ├── security-patterns.md      # Security and authentication
│   │   ├── git-workflow.md           # Git workflow standards
│   │   └── tech-stack.md             # Technology specifications
│   ├── prd/                          # Product Requirements (existing)
│   ├── api/                          # API documentation
│   └── development/                  # Development guides
├── infrastructure/                   # Deployment configurations
│   ├── railway/                      # Railway deployment configs
│   ├── vercel/                       # Vercel deployment configs
│   └── docker/                       # Development containers
├── scripts/                          # Automation scripts
├── .env.example                      # Environment template
├── package.json                      # Root package.json with workspaces
├── turbo.json                        # Turborepo configuration
├── CLAUDE.md                         # Project instructions
└── README.md                         # Project documentation
```

## Component File Standards

### Component Structure Template
```typescript
// ✅ Component file structure (AgentConversationDisplay.tsx)
import React from 'react';
import { AgentMessage, ConversationStatus } from '@/types/agents';

// Types defined at component level
interface AgentConversationDisplayProps {
  messages: AgentMessage[];
  status: ConversationStatus;
  onExport: (format: ExportFormat) => void;
}

// Main component with descriptive name
export function AgentConversationDisplay({
  messages,
  status,
  onExport
}: AgentConversationDisplayProps) {
  // Component implementation
}

// Sub-components in same file for cohesion
function ConversationHeader({ status }: { status: ConversationStatus }) {
  // Implementation
}

function MessagesList({ messages }: { messages: AgentMessage[] }) {
  // Implementation
}

// Default export for easy importing
export default AgentConversationDisplay;
```

### API Route Standards
```typescript
// app/api/agent-sessions/route.ts - Standard API route structure
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { AgentSessionRequest, AgentSessionResponse } from '@/types/api';

// GET handler with proper authentication
export async function GET(request: NextRequest) {
  return withAuth(request, async (authReq) => {
    try {
      // Implementation with UUID-safe patterns
      const userId = authReq.userId!; // UUID from auth middleware

      const sessions = await prisma.agentSession.findMany({
        where: { userId }, // Safe UUID query
        include: {
          messages: { orderBy: { messageOrder: 'asc' } }
        }
      });

      return NextResponse.json({ sessions });
    } catch (error) {
      console.error('Agent sessions fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      );
    }
  });
}
```

### Backend File Standards
```python
# backend/agents/financial_agent.py - AutoGen agent implementation
from typing import Dict, List, Optional, AsyncIterator
import asyncio
from datetime import datetime

from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import OpenAIChatCompletionClient

from ..models.conversation_models import AgentMessage, ContentSource
from ..services.signal_context_service import SignalContextService
from ..config.settings import settings

class FinancialAnalystAgent:
    """AutoGen Financial Analyst Agent for market signal analysis."""

    def __init__(self, signal_service: SignalContextService) -> None:
        self._signal_service = signal_service
        self._agent = self._initialize_agent()

    def _initialize_agent(self) -> AssistantAgent:
        """Initialize AutoGen agent with financial analyst persona."""
        model_client = OpenAIChatCompletionClient(
            model="gpt-4",
            api_key=settings.openai_api_key
        )

        return AssistantAgent(
            name="financial_analyst",
            model_client=model_client,
            system_message=self._get_system_message()
        )

    def _get_system_message(self) -> str:
        """Get the system message for the financial analyst agent."""
        return """
        You are a professional financial analyst specializing in market regime analysis
        and signal interpretation. Your role in this debate is to:

        1. Analyze financial content using quantitative data and market signals
        2. Provide specific metrics, confidence levels, and historical context
        3. Reference current market conditions and volatility measurements
        4. Support your analysis with concrete evidence and data sources

        Always maintain a professional, analytical tone suitable for client presentations.
        Include specific confidence percentages and cite relevant market indicators.
        """
```

## Environment Configuration

### Environment Variables Structure
```bash
# .env.example - Template for all required environment variables

# Core Application
NODE_ENV=development
PORT=3000
NEXTAUTH_URL=http://localhost:3000

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/gayed_signals
DIRECT_URL=postgresql://user:password@localhost:5432/gayed_signals

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# AutoGen & AI Services
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-...

# External APIs (Existing)
TIINGO_API_KEY=...
FRED_API_KEY=...
PERPLEXITY_API_KEY=...

# Infrastructure
REDIS_URL=redis://localhost:6379
RAILWAY_STATIC_URL=https://...
VERCEL_URL=https://...

# Feature Flags
ENABLE_AUTOGEN_AGENTS=true
ENABLE_WEBSOCKET_STREAMING=true
ENABLE_CONVERSATION_EXPORT=true

# Monitoring & Logging
LOG_LEVEL=info
SENTRY_DSN=https://...
```

### Configuration Management
```typescript
// src/lib/config/environment.ts - Centralized environment management
import { z } from 'zod';

const envSchema = z.object({
  // Core
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().default(3000),

  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  // Authentication
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
  CLERK_SECRET_KEY: z.string(),

  // AI Services
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_ORG_ID: z.string().optional(),

  // External APIs
  TIINGO_API_KEY: z.string(),
  FRED_API_KEY: z.string(),
  PERPLEXITY_API_KEY: z.string(),

  // Feature Flags
  ENABLE_AUTOGEN_AGENTS: z.string().transform(val => val === 'true').default('true'),
  ENABLE_WEBSOCKET_STREAMING: z.string().transform(val => val === 'true').default('true'),
});

export const env = envSchema.parse(process.env);

// Type-safe environment access
export type Environment = z.infer<typeof envSchema>;
```