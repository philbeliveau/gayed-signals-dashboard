# Technology Stack Specifications

## Definitive Technology Selection

This is the **DEFINITIVE** technology selection for the entire project based on audit findings and brownfield enhancement strategy. This table preserves existing proven technologies while adding AutoGen capabilities.

### Core Technology Stack

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| **Frontend Language** | TypeScript | 5.x | Type-safe frontend development | Already implemented across codebase, proven reliability |
| **Frontend Framework** | Next.js | 15.3.4 | React-based full-stack framework | Current implementation with app router, professional UI foundation |
| **UI Component Library** | Tailwind CSS + Headless UI | 4.x + 2.2.4 | Professional financial services design | Existing sophisticated theme system, accessibility compliant |
| **State Management** | Zustand + React Query | Latest | Client/server state management | Lightweight, already configured for signal data |
| **Backend Language** | Python | 3.11+ | AI/ML integration and financial calculations | Required for AutoGen, existing signal engines |
| **Backend Framework** | FastAPI | Latest | High-performance async API framework | **AutoGen officially supports FastAPI with WebSocket integration** |

### AutoGen Integration Stack

| Category | Technology | Version | Purpose | Configuration |
|----------|------------|---------|---------|---------------|
| **AutoGen Runtime** | Microsoft AutoGen | **v0.2.36 (Python)** | Multi-agent conversation framework | **Latest stable version with FastAPI/WebSocket support** |
| **AutoGen Extensions** | autogen-ext[openai] | Latest | OpenAI integration for agents | **Required for GPT-4 agent conversations** |
| **LLM Integration** | OpenAI GPT-4 Turbo | Latest | Agent conversation intelligence | **AutoGen config: `{"model": "gpt-4", "api_key": "YOUR_OPENAI_API_KEY"}`** |

### AutoGen Installation & Configuration

#### Installation Command
```bash
pip install -U "autogen-agentchat" "autogen-ext[openai]" "fastapi" "uvicorn[standard]" "PyYAML"
```

#### FastAPI Integration Pattern
```python
# Based on official AutoGen FastAPI documentation
from fastapi import FastAPI, WebSocket
from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import OpenAIChatCompletionClient

app = FastAPI()

@app.websocket("/ws/agent-debate")
async def agent_debate(websocket: WebSocket):
    await websocket.accept()

    # AutoGen agent configuration
    financial_agent = AssistantAgent(
        "financial_analyst",
        model_client=OpenAIChatCompletionClient(model="gpt-4"),
        system_message="You are a financial analyst specializing in market signals..."
    )
```

#### Configuration Pattern
```python
# AutoGen OpenAI configuration
config_list = [
    {"model": "gpt-4", "api_key": "YOUR_OPENAI_API_KEY"},
    {"model": "gpt-4-turbo", "api_key": "YOUR_OPENAI_API_KEY"}
]
```

### API & Communication Stack

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| **API Style** | REST + WebSocket | OpenAPI 3.0 | RESTful APIs with real-time streaming | **AutoGen provides native FastAPI WebSocket examples** |
| **Real-time Communication** | FastAPI WebSocket + Socket.io | Native + Latest | **Agent conversation streaming** | **AutoGen officially supports FastAPI WebSocket endpoints** |

### Database & Storage Stack

| Category | Technology | Version | Purpose | Security Pattern |
|----------|------------|---------|---------|------------------|
| **Database** | PostgreSQL | 15+ | Primary data persistence | Railway infrastructure, ACID compliance for financial data |
| **Database ORM** | Prisma | Latest | Type-safe database access | **UUID schema design prevents authentication bugs** |
| **Cache** | Redis | 7.x | Session state and conversation caching | Required for real-time agent state management |
| **File Storage** | Railway Volume Storage | Latest | Conversation exports and uploads | Cost-effective within current platform |

### Authentication & Security Stack

| Category | Technology | Version | Purpose | Security Implementation |
|----------|------------|---------|---------|------------------------|
| **Authentication** | Clerk | 6.32.2 | Enterprise auth with session management | **Enhanced with graceful fallback for demo mode** |
| **UUID Management** | Custom Utilities | Latest | **Prevent Clerk ID conversion bugs** | **Critical for preventing runtime authentication errors** |

### Testing Stack

| Category | Technology | Version | Purpose | Implementation |
|----------|------------|---------|---------|----------------|
| **Frontend Testing** | Jest + Testing Library | 30.x + 16.3.0 | Component and integration testing | Current test infrastructure preserved |
| **Backend Testing** | Pytest + AsyncIO | Latest | **AutoGen agent behavior testing** | **Python standard for multi-agent conversation testing** |
| **E2E Testing** | Playwright | 1.53.2 | Full-stack integration testing | Already installed, financial workflow testing |

### Development Stack

| Category | Technology | Version | Purpose | Configuration |
|----------|------------|---------|---------|---------------|
| **Build Tool** | npm | Latest | Package management and scripts | Current monorepo tool, proven workflow |
| **Bundler** | Next.js built-in | Turbopack | Optimized bundling and dev experience | Built into Next.js 15.3.4, fastest development |
| **CSS Framework** | Tailwind CSS | 4.x | Utility-first styling system | Current professional UI foundation |

### Infrastructure Stack

| Category | Technology | Version | Purpose | Cost Structure |
|----------|------------|---------|---------|----------------|
| **IaC Tool** | Railway CLI + Vercel CLI | Latest | Infrastructure deployment | Matches current platform choice |
| **CI/CD** | GitHub Actions | Latest | Automated testing and deployment | Industry standard, Vercel integration |
| **Monitoring** | Railway Metrics + Vercel Analytics | Built-in | System performance and usage tracking | Cost-effective monitoring within platforms |
| **Logging** | Winston (Node) + Python logging | Latest | Application and error logging | Structured logging for financial compliance |

## Platform Architecture

### Deployment Architecture
- **Frontend**: Vercel (Global CDN)
- **Backend**: Railway (US-East)
- **Database**: Railway PostgreSQL
- **Cache**: Railway Redis
- **File Storage**: Railway Volume Storage

### Cost Analysis
```
Railway (Backend + Database + Redis): ~$150/month
Vercel (Frontend + CDN): ~$20/month
External APIs (OpenAI, Tiingo, etc.): ~$30/month
Total: ~$200/month (within MVP budget)
```

## Required Dependencies

### Frontend Dependencies (package.json)
```json
{
  "dependencies": {
    "@clerk/nextjs": "^6.32.2",
    "@headlessui/react": "^2.2.4",
    "@heroicons/react": "^2.2.0",
    "@prisma/client": "latest",
    "next": "15.3.4",
    "react": "^18.2.0",
    "tailwindcss": "^4.x",
    "zustand": "latest",
    "@tanstack/react-query": "latest",
    "socket.io-client": "latest"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^18",
    "jest": "^30.0.3",
    "playwright": "^1.53.2",
    "prisma": "latest"
  }
}
```

### Backend Dependencies (requirements.txt)
```txt
# Core FastAPI
fastapi==0.115.6
uvicorn[standard]==0.32.0
python-multipart==0.0.12
websockets==13.1

# AutoGen Stack
pyautogen==0.2.36
openai==1.58.1
autogen-ext[openai]==latest

# Data & Validation
pydantic==2.10.2
pydantic-settings==2.6.1
asyncpg==0.30.0
redis==5.2.0

# Security
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4

# Utilities
python-dotenv==1.0.1
aiofiles==24.1.0
```

## Environment Requirements

### Required Environment Variables
```bash
# Core Application
NODE_ENV=development|production
PORT=3000|8000

# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# AutoGen & AI
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-...

# External APIs
TIINGO_API_KEY=...
FRED_API_KEY=...
PERPLEXITY_API_KEY=...

# Feature Flags
ENABLE_AUTOGEN_AGENTS=true
ENABLE_WEBSOCKET_STREAMING=true
```

## Performance Requirements

### Frontend Performance Targets
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **WebSocket Connection**: < 500ms
- **Agent Message Latency**: < 2s

### Backend Performance Targets
- **API Response Time**: < 200ms (95th percentile)
- **WebSocket Message Throughput**: > 100 messages/second
- **Agent Response Generation**: < 10s per message
- **Database Query Time**: < 100ms (95th percentile)

### AutoGen Performance Configuration
```python
# Optimized AutoGen settings for financial analysis
agent_config = {
    "model": "gpt-4",
    "temperature": 0.1,  # Lower temperature for consistent financial analysis
    "max_tokens": 500,   # Concise responses for real-time streaming
    "timeout": 30,       # 30 second timeout for agent responses
}
```

## Security Requirements

### Security Stack
- **TLS**: 1.3 minimum
- **Authentication**: JWT with Clerk
- **Authorization**: UUID-based resource ownership
- **Input Validation**: Pydantic (backend) + Zod (frontend)
- **Rate Limiting**: 10 requests/minute per user
- **CORS**: Restricted to known domains

### Security Monitoring
- **Failed Authentication Attempts**: Log and alert
- **Unusual API Usage**: Rate limiting and monitoring
- **WebSocket Abuse**: Connection limits and monitoring
- **Data Access Patterns**: Audit logging for compliance