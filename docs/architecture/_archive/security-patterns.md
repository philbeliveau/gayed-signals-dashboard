# Security Patterns & Authentication

## UUID Conversion Protection (CRITICAL)

### The UUID Conversion Bug Problem
Based on previous project experience, Clerk authentication IDs must be properly converted to database UUIDs to prevent runtime errors. This pattern prevents authentication bugs throughout the system.

### Secure Authentication Patterns

#### ✅ CORRECT: Always use UUID utilities
```typescript
import { getCurrentUserId } from '@/lib/auth/userMapping';

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId(); // Returns UUID, never Clerk ID

  const conversations = await prisma.agentConversation.findMany({
    where: { userId } // Safe UUID query
  });
}
```

#### ❌ INCORRECT: Never use Clerk ID directly in database queries
```typescript
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  const { userId: clerkId } = await auth();

  // ❌ BUG: This will cause UUID conversion errors
  const conversations = await prisma.agentConversation.findMany({
    where: { userId: clerkId } // Wrong! clerkId is not a UUID
  });
}
```

### Authentication Mapping Utility (CRITICAL)
```typescript
// lib/auth/userMapping.ts - PREVENTS UUID CONVERSION BUGS
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function getUserIdFromClerkId(clerkUserId: string): Promise<string> {
  try {
    // Find existing user by Clerk ID
    let user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true }
    });

    // Create user if not exists (webhook fallback)
    if (!user) {
      console.log(`🔧 Creating user for Clerk ID: ${clerkUserId}`);
      user = await prisma.user.create({
        data: {
          clerkUserId,
          email: `${clerkUserId}@temp.local`, // Temporary, will be updated by webhook
        },
        select: { id: true }
      });
    }

    return user.id; // Returns PostgreSQL UUID
  } catch (error) {
    console.error('❌ UUID conversion error:', error);
    throw new Error(`Failed to convert Clerk ID to UUID: ${clerkUserId}`);
  }
}

export async function getCurrentUserId(): Promise<string> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    throw new Error('User not authenticated');
  }
  return getUserIdFromClerkId(clerkUserId);
}
```

### API Route Security Pattern
```typescript
// app/api/conversations/route.ts - SECURE PATTERN
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth/userMapping';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // ✅ SECURE: Get UUID, not Clerk ID
    const userId = await getCurrentUserId();

    // ✅ SECURE: Query with UUID in WHERE clause for ownership
    const conversations = await prisma.agentConversation.findMany({
      where: {
        userId: userId, // UUID format, not Clerk ID
      },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' }
        },
        signalContext: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ conversations });

  } catch (error) {
    console.error('❌ Conversations API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
```

## Input Validation Patterns

### FastAPI Validation with Pydantic
```python
from pydantic import BaseModel, Field, validator
from typing import Literal, Optional

class ContentSource(BaseModel):
    type: Literal["substack", "youtube", "text"]
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=10)
    url: Optional[str] = Field(None, regex=r"^https?://.*")

    @validator('content')
    def validate_financial_content(cls, v):
        """Ensure content is relevant for financial analysis."""
        FINANCIAL_KEYWORDS = [
            'market', 'trading', 'investment', 'portfolio', 'stock',
            'bond', 'equity', 'volatility', 'signal', 'analysis'
        ]
        if not any(keyword in v.lower() for keyword in FINANCIAL_KEYWORDS):
            raise ValueError('Content must be financial in nature')
        return v

    @validator('url')
    def validate_url_for_type(cls, v, values):
        """Validate URL requirements based on content type."""
        content_type = values.get('type')
        if content_type in ['substack', 'youtube'] and not v:
            raise ValueError(f'URL is required for {content_type} content')
        return v
```

### Frontend Input Validation
```typescript
// Enhanced form validation with Zod
import { z } from 'zod';

const contentSourceSchema = z.object({
  type: z.enum(['substack', 'youtube', 'text']),
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  url: z.string().url('Invalid URL').optional()
}).refine((data) => {
  // URL required for external content types
  if (['substack', 'youtube'].includes(data.type) && !data.url) {
    return false;
  }
  return true;
}, {
  message: "URL is required for Substack and YouTube content",
  path: ["url"]
});

export type ContentSourceInput = z.infer<typeof contentSourceSchema>;
```

## Database Security Patterns

### UUID-Safe Prisma Schema
```prisma
// UUID-Safe User Management (prevents Clerk ID conversion bugs)
model User {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  clerkUserId       String   @unique @map("clerk_user_id")
  email             String   @unique
  firstName         String?  @map("first_name")
  lastName          String?  @map("last_name")
  imageUrl          String?  @map("image_url")
  isActive          Boolean  @default(true) @map("is_active")
  preferences       Json?
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  lastLoginAt       DateTime? @map("last_login_at")

  // Relations
  agentSessions     AgentSession[]
  conversationExports ConversationExport[]
  userSubscriptions UserSubscription[]

  @@map("users")
}
```

### Query Security Patterns
```typescript
// Always use prepared statements and proper typing
async function getUserConversations(userId: string, limit: number = 20) {
  // ✅ SECURE: Parameterized query with UUID validation
  if (!isValidUUID(userId)) {
    throw new Error('Invalid user ID format');
  }

  return await prisma.agentConversation.findMany({
    where: {
      userId, // Safe parameterized query
      user: {
        isActive: true // Additional security check
      }
    },
    take: Math.min(limit, 100), // Prevent excessive data retrieval
    orderBy: { createdAt: 'desc' },
    include: {
      messages: {
        select: {
          agentType: true,
          messageContent: true,
          timestamp: true,
          confidence: true
          // ⚠️ Exclude sensitive metadata by default
        }
      }
    }
  });
}

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
```

## Environment Security

### Secrets Management
```bash
# ✅ SECURE: Use environment variables for all secrets
OPENAI_API_KEY=sk-...
CLERK_SECRET_KEY=sk_test_...
DATABASE_URL=postgresql://...

# ❌ NEVER: Hardcode secrets in source code
# const OPENAI_KEY = "sk-hardcoded-key"; // DON'T DO THIS
```

### Environment Validation
```typescript
// Validate all required environment variables at startup
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  DATABASE_URL: z.string().url(),
  CLERK_SECRET_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  // ... other required vars
});

// This will throw at startup if any required env vars are missing
export const env = envSchema.parse(process.env);
```

## WebSocket Security

### Connection Authentication
```python
# Secure WebSocket connection with JWT validation
from fastapi import WebSocket, WebSocketDisconnect, status
from jose import JWTError, jwt

async def websocket_endpoint(websocket: WebSocket, token: str):
    try:
        # Validate JWT token before accepting connection
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        await websocket.accept()

        # Store authenticated connection
        connection_manager.add_connection(websocket, user_id)

    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
    except WebSocketDisconnect:
        connection_manager.remove_connection(websocket, user_id)
```

## Rate Limiting & Abuse Prevention

### API Rate Limiting
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/agent-sessions")
@limiter.limit("10/minute")  # Limit conversation creation
async def create_session(request: Request, session_data: AgentSessionRequest):
    # Implementation
    pass

@app.websocket("/ws/agent-debate/{session_id}")
@limiter.limit("5/minute")  # Limit WebSocket connections
async def websocket_debate(websocket: WebSocket, session_id: str):
    # Implementation
    pass
```