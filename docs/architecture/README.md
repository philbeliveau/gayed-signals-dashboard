# Architecture Documentation

This directory contains the complete architectural specifications for the AutoGen Financial Intelligence Demo project. Developers should reference these documents throughout the development lifecycle.

## 📋 Architecture Documents

### Core Documentation
- **[coding-standards.md](./coding-standards.md)** - TypeScript, Python, and database coding standards with examples
- **[source-tree.md](./source-tree.md)** - Complete project structure, file organization, and component patterns
- **[security-patterns.md](./security-patterns.md)** - Security patterns, UUID conversion protection, and authentication
- **[git-workflow.md](./git-workflow.md)** - Git branching, commit standards, and PR requirements
- **[tech-stack.md](./tech-stack.md)** - Definitive technology stack with versions and configurations

## 🔄 Developer Workflow

### For New Features
1. **Read**: [source-tree.md](./source-tree.md) for proper file placement
2. **Follow**: [coding-standards.md](./coding-standards.md) for implementation patterns
3. **Implement**: [security-patterns.md](./security-patterns.md) for authentication and data access
4. **Use**: [tech-stack.md](./tech-stack.md) for technology choices and configurations
5. **Submit**: [git-workflow.md](./git-workflow.md) for PR and review process

### For Bug Fixes
1. **Verify**: [security-patterns.md](./security-patterns.md) for security-related issues
2. **Check**: [coding-standards.md](./coding-standards.md) for proper error handling
3. **Test**: Follow testing patterns in respective documents
4. **Document**: Update architecture docs if patterns change

### For Architecture Changes
1. **Update**: Relevant architecture documents
2. **Review**: Changes with architecture team
3. **Communicate**: Update team on pattern changes
4. **Validate**: Ensure existing code follows new patterns

## 🏗️ Architecture Overview

### Project Structure
```
gayed-signals-dashboard/
├── apps/
│   ├── web/                    # Next.js frontend (see source-tree.md)
│   └── backend/                # FastAPI AutoGen service (see source-tree.md)
├── docs/
│   └── architecture/           # This directory - architectural specifications
├── packages/                   # Shared packages
└── infrastructure/             # Deployment configurations
```

### Key Architectural Principles
1. **Domain-Driven Design**: Preserve existing `/domains/` structure
2. **UUID Security**: Prevent Clerk ID conversion bugs throughout
3. **AutoGen Integration**: Microsoft AutoGen v0.2.36 with FastAPI
4. **Professional UI**: Maintain sophisticated financial services design
5. **Brownfield Enhancement**: Build on existing infrastructure investments

### Technology Foundation
- **Frontend**: Next.js 15.3.4 + TypeScript + Tailwind CSS
- **Backend**: FastAPI + Microsoft AutoGen + Python 3.11+
- **Database**: PostgreSQL + Prisma with UUID-safe schema
- **Authentication**: Enhanced Clerk integration with fallback
- **Deployment**: Railway (backend) + Vercel (frontend)

## 🔐 Critical Security Patterns

### UUID Conversion (CRITICAL)
```typescript
// ✅ ALWAYS use this pattern
import { getCurrentUserId } from '@/lib/auth/userMapping';
const userId = await getCurrentUserId(); // Returns UUID, never Clerk ID

// ❌ NEVER do this
const { userId: clerkId } = await auth();
// Using clerkId directly in database queries causes runtime errors
```

### Input Validation
- **Frontend**: Zod schemas for type safety
- **Backend**: Pydantic models with custom validators
- **Database**: UUID validation and parameterized queries

### Authentication Flow
1. Clerk provides authentication
2. UUID mapping converts Clerk ID to database UUID
3. All database operations use UUIDs
4. WebSocket connections authenticated via JWT

## 📊 Development Standards Summary

### Code Quality
- **TypeScript**: Strict mode, explicit return types
- **Python**: Type hints, docstrings, async/await
- **Testing**: Jest (frontend) + Pytest (backend)
- **Linting**: ESLint + Black + isort

### Git Standards
- **Branches**: `feature/`, `fix/`, `docs/`, `arch/`
- **Commits**: `type(scope): description`
- **PRs**: Architecture compliance checklist required

### File Organization
- **Components**: Domain-based organization
- **APIs**: RESTful with WebSocket streaming
- **Types**: Shared across frontend/backend
- **Utilities**: Centralized in `lib/` directories

## 🚀 AutoGen Integration

### Agent Architecture
- **Financial Analyst**: Quantitative market analysis
- **Market Context**: Real-time market intelligence
- **Risk Challenger**: Contrarian viewpoints and stress testing

### Real-Time Streaming
- **WebSocket**: FastAPI native WebSocket support
- **Message Format**: Structured JSON with agent metadata
- **Connection Management**: Session-based with cleanup

### Signal Integration
- **Existing Signals**: Preserve current Gayed signal calculations
- **Agent Context**: Provide signal data to agents for analysis
- **Historical Data**: Include market context in conversations

## 📝 Documentation Maintenance

### When to Update Architecture Docs
- **New Patterns**: When introducing new coding patterns
- **Technology Changes**: When upgrading or changing technologies
- **Security Updates**: When security patterns change
- **Structure Changes**: When project organization changes

### Review Process
1. **Architecture Changes**: Require architect approval
2. **Security Changes**: Require security team review
3. **Infrastructure Changes**: Require DevOps review
4. **Breaking Changes**: Require team consensus

## 🔗 Related Documentation
- **Product Requirements**: `../prd/` - Business requirements and epic definitions
- **API Documentation**: `../api/` - Endpoint specifications and examples
- **Development Guides**: `../development/` - Setup and contribution guides

---

**Note**: This architecture documentation is the **single source of truth** for development patterns. When in doubt, refer to these documents or ask the architecture team.