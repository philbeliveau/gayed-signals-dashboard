# Coding Standards

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