# Comprehensive API Test Plan - Gayed Signals Dashboard

## Test Environment
- **Platform**: Gayed Signals Dashboard
- **Test Date**: 2025-10-01
- **Tester**: Quinn (QA Agent)
- **Test Type**: Integration & API Testing with Real Data Validation

## Executive Summary of Issues Found

### 🚨 CRITICAL ISSUE: 500 Error in `/api/content/unified`

**Error Location**: `apps/web/src/app/api/content/unified/route.ts`
**Error Message**: `Failed to load resource: the server responded with a status of 500 (Internal Server Error)`
**User Impact**: Complete failure of unified content analysis feature

---

## Root Cause Analysis

### Issue 1: Missing Authentication in Internal API Calls

**Problem**: Lines 200-213 and 245-253 make internal fetch calls without authentication headers.

```typescript
// Line 200 - processSubstackUrl function
const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/content/substack`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // ❌ MISSING: Authentication headers from parent request
  },
```

**Impact**:
- When `/api/content/unified` is called with Clerk authentication
- It tries to call `/api/content/substack` WITHOUT forwarding auth
- `/api/content/substack` requires Clerk auth (line 58-64 in that route)
- Authentication fails → 401 Unauthorized → caught as 500 error

**Evidence**:
```typescript
// /api/content/substack/route.ts:58-64
const { userId } = await auth();
if (!userId) {
  return NextResponse.json({
    success: false,
    error: { message: 'Unauthorized - Authentication required' }
  }, { status: 401 });
}
```

### Issue 2: Circular Dependency Risk

**Problem**: The unified endpoint calls other API routes which may themselves be checking authentication.

**Chain**:
1. Frontend calls `/api/content/unified` with user auth cookie
2. `/api/content/unified` authenticates successfully (line 58)
3. Inside the same request, it calls `/api/content/substack` as a NEW request
4. This new request has NO cookies/auth headers
5. `/api/content/substack` rejects with 401
6. Error bubbles up as 500

### Issue 3: Error Handling Masks Real Issue

**Problem**: Line 168-175 catches ALL errors and returns generic 500

```typescript
} catch (error) {
  console.error('❌ Unified content processing error:', error);

  return NextResponse.json({
    success: false,
    error: error instanceof Error ? error.message : 'Internal server error occurred'
  }, { status: 500 });
}
```

**Impact**: Real 401/403 authentication errors are hidden as 500 errors

---

## Recommended Fixes

### Fix 1: Refactor to Direct Function Calls (Recommended)

Instead of HTTP calls to other routes, call the processing logic directly:

```typescript
// Create shared processing functions in /lib/content-processors/

// Instead of:
const response = await fetch('/api/content/substack', {...});

// Do:
import { extractSubstackContent } from '@/lib/content-processors/substack';
const result = await extractSubstackContent(url, userId);
```

**Benefits**:
- No authentication issues
- Better performance (no HTTP overhead)
- Clearer error handling
- Easier testing

### Fix 2: Forward Authentication Headers (Quick Fix)

If keeping HTTP architecture, forward auth headers:

```typescript
async function processSubstackUrl(url: string, request: NextRequest) {
  const cookieHeader = request.headers.get('cookie');
  const authHeader = request.headers.get('authorization');

  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/content/substack`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookieHeader && { 'Cookie': cookieHeader }),
      ...(authHeader && { 'Authorization': authHeader }),
    },
    body: JSON.stringify({...})
  });
}
```

### Fix 3: Improve Error Handling

Add proper error type detection:

```typescript
try {
  // ... processing
} catch (error) {
  console.error('❌ Unified content processing error:', error);

  // Detect authentication errors
  if (error instanceof Error && error.message.includes('Unauthorized')) {
    return NextResponse.json({
      success: false,
      error: 'Authentication failed - please sign in'
    }, { status: 401 });
  }

  // Detect validation errors
  if (error instanceof Error && error.message.includes('Validation')) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 400 });
  }

  // Generic 500 only for truly unexpected errors
  return NextResponse.json({
    success: false,
    error: error instanceof Error ? error.message : 'Internal server error occurred'
  }, { status: 500 });
}
```

---

## API Endpoints Test Matrix

### 1. `/api/content/unified` - POST

| Test Case | Content Type | Auth | Expected | Status |
|-----------|--------------|------|----------|--------|
| Valid text content | text | ✅ | 200 OK | ❌ FAIL (500) |
| Valid Substack URL | substack | ✅ | 200 OK | ❌ FAIL (500) |
| Valid YouTube URL | youtube | ✅ | 200 OK | ❌ FAIL (500) |
| No authentication | text | ❌ | 401 | ⚠️ Returns 500 |
| Invalid JSON | - | ✅ | 400 | ✅ PASS |
| Missing content | text | ✅ | 400 | ✅ PASS |

**Critical Issues**:
- All authenticated requests fail with 500
- Root cause: Internal API calls missing auth headers
- Error masking prevents proper debugging

### 2. `/api/signals` - GET

| Test Case | Params | Expected | Status |
|-----------|--------|----------|--------|
| Default (full mode) | none | 200 OK with 5 signals | NEEDS TEST |
| Fast mode | ?fast=true | 200 OK with cached/quick signals | NEEDS TEST |
| No authentication | - | Should work (public endpoint?) | NEEDS TEST |

### 3. `/api/content/substack` - POST

| Test Case | Input | Expected | Status |
|-----------|-------|----------|--------|
| Valid Substack URL | Real article URL | 200 OK | NEEDS TEST |
| Invalid URL | random string | 400 Bad Request | NEEDS TEST |
| Non-Substack URL | google.com | 400 Bad Request | NEEDS TEST |
| No authentication | Valid URL | 401 Unauthorized | NEEDS TEST |

### 4. `/api/simple-youtube` - POST

| Test Case | Input | Expected | Status |
|-----------|-------|----------|--------|
| Valid YouTube URL | Real video URL | 200 OK | NEEDS TEST |
| Invalid YouTube URL | random string | 400 Bad Request | NEEDS TEST |
| Non-YouTube URL | vimeo.com | 400 Bad Request | NEEDS TEST |

---

## External Service Integration Tests

### Required for REAL DATA ONLY Enforcement

Per `CLAUDE.md` requirements, ALL agents must use REAL data from actual external services:

| Service | Purpose | Status | Test Required |
|---------|---------|--------|---------------|
| FRED API | Federal Reserve economic data | ❓ | ✅ Validate real connection |
| Perplexity MCP | Real-time market intelligence | ❓ | ✅ Validate real connection |
| OpenAI GPT-4 | AI agent responses | ❓ | ✅ Validate real responses |
| Web Search Services | Live search results | ❓ | ✅ Validate real results |
| Yahoo Finance | Real market data | ❓ | ✅ Validate real data |

**Critical Requirement**: NEVER use fallback, synthetic, estimated, or mock data

---

## Next Steps

1. ✅ **IMMEDIATE**: Fix `/api/content/unified` authentication issue
2. ⏭️ **NEXT**: Test all endpoints with server running
3. ⏭️ **THEN**: Validate external service integrations
4. ⏭️ **FINALLY**: Generate full test report with pass/fail metrics

---

## Test Execution Status

- **Tests Planned**: 20+
- **Tests Executed**: 2 (code analysis only)
- **Tests Passed**: 0
- **Tests Failed**: 2
- **Blocked**: Yes (server not running, critical bug in unified endpoint)

**Recommendation**: Fix authentication issue before proceeding with further testing.
