# Technical Assumptions

## Repository Structure: Monorepo
Single repository containing frontend (Next.js), backend (FastAPI), and shared utilities. This approach simplifies development coordination and deployment for the MVP while allowing future separation if needed for platform integration.

## Service Architecture
**AutoGen-Centric Microservices within Monorepo:** FastAPI backend service hosting Microsoft AutoGen agents, separate WebSocket service for real-time communications, PostgreSQL database service, and Redis cache service. All services deployed as separate Railway services but coordinated through shared repository.

## Testing Requirements
**Unit + Integration Testing:** Unit tests for individual agent behaviors and API endpoints, integration tests for multi-agent conversations and WebSocket functionality. Focus on AutoGen conversation reliability and real-time performance validation rather than comprehensive testing pyramid given MVP timeline constraints.

## Additional Technical Assumptions and Requests

**Frontend Technology Stack:**
- **Framework:** Next.js 14+ with TypeScript for type safety and partnership-ready code quality
- **Hosting:** Vercel with automatic deployments and preview branches for development iterations
- **UI Library:** Tailwind CSS + Headless UI for professional financial services design system
- **Real-Time:** Socket.io client for WebSocket connections to agent debate streams
- **State Management:** Zustand for client-side state, React Query for server state and caching

**Backend Technology Stack:**
- **API Framework:** FastAPI (Python) for high-performance async operations and native AutoGen integration
- **Hosting:** Railway for backend deployment, database hosting, and service orchestration
- **AutoGen Runtime:** Microsoft AutoGen 0.2+ with custom financial agent implementations
- **LLM Integration:** OpenAI GPT-4 Turbo for agent conversations with fallback to GPT-4
- **Real-Time Server:** Socket.io server for WebSocket management and conversation broadcasting

**Database and Infrastructure:**
- **Primary Database:** PostgreSQL 15+ on Railway for conversation history and session management
- **Cache Layer:** Redis on Railway for real-time conversation state and API response caching
- **File Storage:** Railway volume storage for conversation exports and content uploads
- **CDN:** Vercel's integrated CDN for global content delivery and performance

**Integration Requirements:**
- **Gayed Signals Integration:** RESTful API integration with existing signal calculation infrastructure
- **Perplexity MCP:** Real-time market intelligence through Railway-hosted backend service
- **Content Processing:** YouTube transcript API integration, Substack content extraction
- **Cross-Origin Configuration:** Proper CORS setup between Vercel frontend and Railway backend

**Security and Compliance:**
- **Authentication:** JWT tokens with Railway-hosted auth service
- **Data Encryption:** TLS 1.3 for data in transit, encrypted PostgreSQL storage
- **Environment Security:** Railway environment variables for secure credential management
- **API Rate Limiting:** OpenAI and Perplexity API cost controls and usage monitoring
