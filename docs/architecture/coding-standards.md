# Coding Standards

## Data Pipeline Standards (Railway Backend Pattern)

### Data Fetching Pattern (Frontend)

**CRITICAL:** Frontend code MUST use Railway backend wrappers, NOT UnifiedDataService directly.

```typescript
// ✅ FRONTEND: Use Railway backend via service wrappers
import { fetchSignalsWithFallback } from '@/lib/api/fetch-signals';
import { MarketDataV2Service } from '@/lib/api/market-data-v2';

// For calculated signals (dashboard)
const signals = await fetchSignalsWithFallback({
  symbols: ['SPY', 'TLT'],
  fast: false
});

// For raw market data (backtesting - Story 4.0i)
const marketDataService = new MarketDataV2Service();
const marketData = await marketDataService.getMarketData({
  symbols: ['WOOD', 'GLD'],
  startDate: '2024-01-01',
  endDate: '2024-11-01'
});

// ❌ FRONTEND: NEVER import UnifiedDataService directly
import { UnifiedDataService } from '@/domains/data-pipeline/services'; // WRONG - Backend only!

// ❌ FRONTEND: NEVER fetch directly from external APIs
const response = await fetch('https://api.tiingo.com/...'); // WRONG
```

### Data Fetching Pattern (Railway Backend Only)

**ONLY Railway backend code** should import UnifiedDataService:

```typescript
// ✅ RAILWAY BACKEND: Use UnifiedDataService internally
import { UnifiedDataService } from '@/domains/data-pipeline/services';

const dataService = new UnifiedDataService();
const marketData = await dataService.fetchMarketData(symbols, {
  requireProvenance: true,
  validateQuality: true,
  useCache: true
});
```

### Data Validation Pattern

**Railway backend responses include automatic quality validation:**

```typescript
// ✅ Railway backend includes quality metrics automatically
const response = await fetchSignalsWithFallback({ symbols: ['SPY'] });

// Quality validation is built into Railway response
if (response.metadata.quality?.averageScore < 0.8) {
  console.warn('Low quality data detected', response.metadata.quality);
  // Handle degraded data appropriately
}

// ✅ For custom validation (backend only)
import { DataQualityValidator } from '@/domains/data-pipeline/validators';

const validation = await DataQualityValidator.validate(data);
if (validation.score < 0.7) {
  logger.warn('Low quality data', validation);
  // Degrade confidence or reject
}

// ❌ NEVER use unvalidated data
const signal = calculateSignal(rawData); // WRONG - no validation
```

### Provenance Tracking Pattern

**Railway backend responses include automatic provenance tracking:**

```typescript
// ✅ Railway backend includes provenance automatically
const response = await fetchSignalsWithFallback({ symbols: ['SPY'] });

// Provenance is built into Railway response
console.log('Data source:', response.metadata.dataSource);
console.log('Fetched at:', response.metadata.calculatedAt);

// Access per-signal provenance
response.signals.forEach(signal => {
  if (signal.provenance) {
    console.log(`${signal.type} from:`, signal.provenance.sources);
  }
});

// ✅ For custom provenance (backend only)
interface DataWithProvenance<T> {
  data: T;
  provenance: {
    source: string;
    fetchedAt: Date;
    quality: number;
    validationPassed: boolean;
  };
}

// ❌ NEVER return data without provenance
return { signals }; // WRONG - missing provenance
```

### Error Handling for Data Operations

**Railway backend provides automatic fallback:**

```typescript
// ✅ Railway backend with automatic local fallback
import { fetchSignalsWithFallback } from '@/lib/api/fetch-signals';
import { USE_RAILWAY_BACKEND, logMigrationMetric } from '@/lib/feature-flags';

try {
  // Automatic Railway → Local API fallback
  const data = await fetchSignalsWithFallback({ symbols: ['SPY'] });
  return data;
} catch (error) {
  // Both Railway and local API failed
  console.error('All data sources unavailable', error);
  return {
    error: 'Data unavailable',
    available: false,
    reason: 'ALL_SOURCES_FAILED'
  };
}

// ✅ Manual Railway fallback pattern (for custom endpoints)
if (USE_RAILWAY_BACKEND) {
  try {
    const data = await fetchFromRailway();
    logMigrationMetric('railway', true);
    return data;
  } catch (error) {
    console.warn('Railway failed, falling back to local API');
    logMigrationMetric('railway', false);
    // Fall through to local API
  }
}

// Fallback: local API
const data = await fetchFromLocalAPI();
logMigrationMetric('local', true);
return data;

// ❌ NEVER generate synthetic fallback data
catch (error) {
  return generateFakeData(); // WRONG - violates data integrity
}
```

## Railway Backend Integration Pattern (Stories 4.0h/4.0i)

### Architecture Overview

```
┌─────────────────────────────────────────┐
│  Frontend Application (Vercel)          │
│  ├─ Dashboard Signals ✅                │
│  └─ Backtesting System (Story 4.0i) 📝 │
└────────┬────────────────────────────────┘
         │ HTTP/REST (Railway → Local fallback)
         ↓
┌────────────────────────────────────────┐
│  Railway Backend (Python FastAPI)      │
│  ├─ /api/v2/signals (signals)          │
│  └─ /api/v2/market-data (OHLCV data)   │
└────────┬───────────────────────────────┘
         │ Internal method calls
         ↓
┌────────────────────────────────────────┐
│  UnifiedDataService (TypeScript)       │
│  ├─ Tiingo API calls                   │
│  ├─ PostgreSQL persistence             │
│  ├─ Redis caching                      │
│  ├─ Circuit breakers                   │
│  ├─ Quality validation                 │
│  └─ Provenance tracking                │
└─────────────────────────────────────────┘
```

### Key Principles

1. **Single Source of Truth:** All data flows through Railway backend
2. **No Direct Database Access:** Frontend calls Railway API only
3. **Automatic Caching:** Redis cache managed by Railway backend
4. **Quality Enforcement:** Minimum quality score 0.8
5. **Provenance Tracking:** Every data point has source information
6. **Graceful Degradation:** Railway → Local API → Error (NO synthetic data)

### Frontend Pattern

```typescript
// ✅ CORRECT: Use Railway backend wrappers
import { fetchSignalsWithFallback } from '@/lib/api/fetch-signals';
import { MarketDataV2Service } from '@/lib/api/market-data-v2';

// Dashboard signals (Story 4.0h - COMPLETE)
const signals = await fetchSignalsWithFallback({
  symbols: ['SPY', 'TLT', 'XLU', 'GLD', 'XLF'],
  fast: false
});

// Backtesting market data (Story 4.0i - IN PROGRESS)
const marketDataService = new MarketDataV2Service();
const marketData = await marketDataService.getMarketData({
  symbols: ['WOOD', 'GLD'],
  startDate: '2024-01-01',
  endDate: '2024-11-01'
});

// ❌ WRONG: Direct imports
import { UnifiedDataService } from '@/domains/data-pipeline/services'; // Backend only!
import { fetchMarketData } from '@/domains/market-data/services/yahoo-finance'; // Deprecated!
```

### Railway Response Structure

```typescript
// Signal Response (from /api/v2/signals)
interface SignalV2Response {
  success: boolean;
  data: SignalV2[];
  metadata: {
    sources: {
      primary: 'postgresql' | 'redis' | 'live';
      failedSources: string[];
    };
    quality: {
      averageScore: number; // 0-1 scale (minimum 0.8 enforced)
      issues: string[];
    };
    timing: {
      totalMs: number;
      cached: boolean;
    };
  };
}

// Market Data Response (from /api/v2/market-data - Story 4.0i)
interface MarketDataResponse {
  success: boolean;
  data: Array<{
    symbol: string;
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  metadata: {
    source: 'tiingo' | 'postgresql' | 'redis';
    quality: {
      score: number; // 0-1 scale (minimum 0.8 enforced)
      issues: string[];
    };
    timing: {
      totalMs: number;
      cached: boolean;
    };
    provenance: {
      dataProvider: string;
      fetchedAt: string;
      dataPoints: number;
    };
  };
}
```

### Feature Flag Support

```typescript
// Use feature flag for gradual rollout
import { USE_RAILWAY_BACKEND, logMigrationMetric } from '@/lib/feature-flags';

if (USE_RAILWAY_BACKEND) {
  // Use Railway backend
  const data = await fetchSignalsWithFallback({ symbols });
  logMigrationMetric('railway', true);
} else {
  // Use local API
  const data = await fetchFromLocalAPI();
  logMigrationMetric('local', true);
}
```

### Performance Targets

| Metric | Target | Railway Backend |
|--------|--------|-----------------|
| Cached responses | <500ms | ✅ ~234ms (Redis) |
| Fresh data | <2s | ✅ ~1.2s (PostgreSQL) |
| Fallback to local | <3s | ✅ ~2.1s (Local API) |
| Quality score | ≥0.8 | ✅ ~0.95 (enforced) |
| Data freshness | <60s | ✅ ~30s (real-time) |

## TypeScript/JavaScript Standards

### File Naming Conventions
```typescript
// ✅ Components: PascalCase (AgentConversationDisplay.tsx)
// ✅ Hooks: camelCase with 'use' prefix (useAgentConversation.ts)
// ✅ Utilities: camelCase (authUtils.ts)
// ✅ Types: PascalCase (AgentMessage.ts)
// ✅ Constants: SCREAMING_SNAKE_CASE (API_ENDPOINTS.ts)
```

### Import Organization
```typescript
import React from 'react';                    // External libraries first
import { NextRequest } from 'next/server';    // Framework imports
import { AgentType } from '@/types/agents';   // Internal types
import { Button } from '@/components/ui';     // Local components
import './component.css';                     // Styles last
```

### Function Declarations
```typescript
// Prefer named functions for debugging
export async function createAgentSession(data: AgentSessionRequest): Promise<AgentSession> {
  // Implementation
}

// Error handling pattern
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  logger.error('Operation failed:', error);
  throw new APIError('Operation failed', { cause: error });
}
```

### Auth-First Validation Pattern

**CRITICAL SECURITY PATTERN**: All API routes MUST check authentication BEFORE parsing request bodies or validating parameters.

```typescript
// ✅ CORRECT: Auth-First Pattern
export async function POST(request: NextRequest) {
  try {
    // 1. AUTHENTICATE FIRST (before any other processing)
    let userId: string | null = null;
    try {
      const authResult = await auth();
      userId = authResult.userId;
    } catch (authError) {
      console.log('⚠️ Clerk auth not available - using development mode');
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // 2. THEN parse request body
    const body = await request.json();

    // 3. THEN validate parameters
    if (!body.required_field) {
      return NextResponse.json(
        { error: 'Field required' },
        { status: 400 }
      );
    }

    // 4. FINALLY process request
    // ... implementation
  }
}
```

**Anti-Patterns (PROHIBITED)**:

```typescript
// ❌ WRONG: Dev user fallback (authentication bypass)
const effectiveUserId = userId || 'dev-user';  // NEVER DO THIS

// ❌ WRONG: Parsing body before auth check
const body = await request.json();  // MUST happen AFTER auth check
if (!userId) return 401;

// ❌ WRONG: Validation before auth check
if (!body.field) return 400;  // MUST happen AFTER auth check
if (!userId) return 401;
```

**Why Auth-First Matters**:
- Prevents information leakage via validation error messages
- Ensures unauthorized users cannot trigger request processing
- Maintains consistent 401 responses for all unauthenticated requests
- Required for financial-grade security compliance

## Python Standards (FastAPI Backend)

### File Naming
```python
# File naming: snake_case for all Python files
# agent_orchestrator.py, conversation_models.py
```

### Import Organization
```python
import asyncio                              # Standard library
import uuid
from typing import Dict, List, Optional     # Typing imports
from datetime import datetime

from fastapi import HTTPException           # Third-party imports
from autogen_agentchat.agents import AssistantAgent
import openai

from .models.conversation_models import AgentMessage  # Local imports
from .services.auth_service import AuthService
from ..config.settings import settings
```

### Class Naming and Documentation
```python
class AgentOrchestrator:
    """Orchestrates AutoGen agent conversations for financial analysis."""

    def __init__(self, openai_client: openai.AsyncOpenAI) -> None:
        self._openai_client = openai_client
        self._active_sessions: Dict[str, ConversationSession] = {}

    async def create_session(self, content: ContentSource) -> ConversationSession:
        """Create a new agent conversation session.

        Args:
            content: The financial content to analyze

        Returns:
            ConversationSession: Active session for agent debate

        Raises:
            ValidationError: If content is invalid for financial analysis
        """
        # Implementation with proper error handling and logging
```

## Database Standards (Prisma)

### Model Naming
```prisma
// Model naming: PascalCase
model AgentConversation {
  id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid

  // Field naming: camelCase in schema, snake_case in database
  userId String @map("user_id") @db.Uuid
  contentSource Json @map("content_source")
  createdAt DateTime @default(now()) @map("created_at")

  // Relations: explicit naming
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages ConversationMessage[]

  @@map("agent_conversations") // Table names: snake_case
}
```

## Code Quality Standards

### Linting & Formatting
```json
// .eslintrc.json (TypeScript)
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "prefer-const": "error",
    "no-var": "error"
  }
}

// pyproject.toml (Python)
[tool.black]
line-length = 88
target-version = ['py311']

[tool.isort]
profile = "black"
multi_line_output = 3

[tool.mypy]
python_version = "3.11"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
```

### Testing Standards
```typescript
// Frontend testing patterns
describe('AgentConversationDisplay', () => {
  it('should render agent messages in chronological order', async () => {
    // Arrange
    const mockMessages = createMockAgentMessages();

    // Act
    render(<AgentConversationDisplay messages={mockMessages} />);

    // Assert
    expect(screen.getByText('Financial Analyst')).toBeInTheDocument();
  });
});
```

```python
# Backend testing patterns
import pytest
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_agent_orchestrator_creates_session():
    """Test that orchestrator properly creates conversation sessions."""
    # Arrange
    mock_openai = AsyncMock()
    orchestrator = AgentOrchestrator(mock_openai)
    content = ContentSource(type="text", title="Market Analysis", content="...")

    # Act
    session = await orchestrator.create_session(content)

    # Assert
    assert session.id is not None
    assert session.status == ConversationStatus.INITIALIZED
```