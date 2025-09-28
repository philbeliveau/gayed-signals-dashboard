# Epic 2: Financial Content Processing & Debate Triggers

**Epic Goal:** Extend existing content processing capabilities to handle Substack articles and YouTube videos, creating automated triggers for specialized financial agent debates. This epic leverages current API infrastructure and adds content analysis that initiates AutoGen conversations using existing market data and signal context.

## Story 2.1: Substack Article Content Extraction Integration

**As a financial advisor,**
**I want to input Substack article URLs for automated content extraction,**
**so that AutoGen agents can analyze financial commentary and articles in the context of current market signals.**

### Acceptance Criteria
1. New API endpoint `/api/content/substack` extends existing API structure in current `/app/api/` pattern
2. Substack URL content extraction leverages existing `web-search-service.ts` and HTTP client patterns
3. Article text parsing and financial relevance validation using existing content processing utilities
4. Content extraction integrates with existing error handling and monitoring from current API routes
5. Extracted content stored temporarily using existing session management and database infrastructure
6. Content validation ensures financial relevance before triggering agent debates
7. Article metadata (title, author, publication date) captured and stored with content
8. Integration with existing Clerk authentication ensures secure content processing
9. Content processing status tracked using existing monitoring and logging systems
10. Extracted content formatted for optimal AutoGen agent analysis and conversation triggers

## Story 2.2: YouTube Video Transcript Integration Enhancement

**As a financial professional,**
**I want to analyze YouTube financial videos through transcript processing,**
**so that AutoGen agents can debate video content in the context of current Gayed signals.**

### Acceptance Criteria
1. Existing YouTube transcript processing enhanced to trigger AutoGen financial agent debates
2. Current `/api/simple-youtube/` endpoint extended to support AutoGen conversation initiation
3. Video transcript extraction leverages existing `video-insights.ts` and content processing capabilities
4. Financial video content validation using existing relevance detection and filtering
5. Transcript processing integrates with existing performance monitoring and caching systems
6. Video metadata (title, channel, duration, view count) captured using current data structures
7. Transcript content optimized for AutoGen agent analysis with existing content formatting utilities
8. Integration maintains existing error handling and fallback mechanisms for video processing
9. Processed transcripts stored using existing database and session management infrastructure
10. YouTube content analysis triggers AutoGen debates using current signal context and market data

## Story 2.3: Direct Text Input Content Processing

**As a financial analyst,**
**I want to paste research reports or market commentary directly,**
**so that AutoGen agents can analyze any financial text content for immediate debate.**

### Acceptance Criteria
1. Direct text input interface added to existing dashboard UI using current component patterns
2. Text content validation ensures financial relevance using existing content filtering capabilities
3. Input processing leverages existing API infrastructure and authentication systems
4. Text content prepared for AutoGen agent analysis using current content formatting utilities
5. Content storage and session management using existing database and caching infrastructure
6. Input validation prevents malicious content and ensures appropriate length limits
7. Text processing integrates with existing error handling and user feedback systems
8. Content analysis triggers AutoGen debates with current market signal context
9. Direct input maintains existing security measures and user session management
10. Processed text formatted optimally for financial agent conversation and analysis

## Story 2.4: Content Analysis Debate Trigger System

**As a system user,**
**I want content processing to automatically trigger relevant AutoGen agent debates,**
**so that I receive comprehensive analysis combining content insights with current market signals.**

### Acceptance Criteria
1. Content trigger system integrates processed content with existing signal calculation and market data
2. Debate initiation uses current AutoGen orchestrator developed in Epic 1 with content context
3. Content analysis combines with existing Gayed signal states for comprehensive agent conversations
4. Trigger system respects existing rate limiting and performance monitoring constraints
5. Content-driven debates include current market context from existing enhanced market client
6. Debate triggers maintain existing error handling and graceful degradation capabilities
7. Content analysis results stored and linked with existing conversation logging and session management
8. Trigger system integrates with existing monitoring to track content processing performance
9. Content debates produce actionable insights combining article/video analysis with signal data
10. Trigger workflow maintains existing security and authentication requirements throughout process

## Story 2.5: Enhanced Content Processing Dashboard Integration

**As a financial professional,**
**I want content processing integrated seamlessly with the existing dashboard,**
**so that I can trigger content analysis and view results within current workflow.**

### Acceptance Criteria
1. Content input controls added to existing dashboard using current UI component patterns
2. Content processing status displayed using existing loading states and progress indicators
3. AutoGen debate results from content analysis integrated with current signal display
4. Content history and session management using existing dashboard state management patterns
5. Content processing UI maintains existing responsive design and mobile optimization
6. Integration preserves existing dashboard performance and user experience standards
7. Content analysis results exportable using existing dashboard export capabilities
8. Error states and user feedback consistent with current dashboard error handling patterns
9. Content processing controls respect existing user preferences and theme management
10. Content analysis workflow integrates with existing navigation and user experience flow
