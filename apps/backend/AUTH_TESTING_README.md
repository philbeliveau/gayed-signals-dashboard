# Clerk Authentication Testing with FastAPI MCP

This document explains how to use the FastAPI MCP server to test Clerk authentication across all 14 protected API routes.

## 🎯 What This Tests

The MCP auth tester validates:

1. **Auth Enforcement**: All 14 routes return `401 Unauthorized` without valid Clerk tokens
2. **Graceful Degradation**: Routes handle disabled middleware without crashing (try-catch pattern)
3. **Development Mode**: Routes log warnings when Clerk auth is unavailable
4. **Coverage**: All conversation and content processing routes are protected

## 📋 Protected Routes Being Tested

### Conversation Routes (10 endpoints)
- `GET /api/conversations` - List conversations
- `POST /api/conversations` - Create conversation
- `GET /api/conversations/{id}` - Get specific conversation
- `PATCH /api/conversations/{id}` - Update conversation
- `DELETE /api/conversations/{id}` - Delete conversation
- `GET /api/conversations/{id}/messages` - Get messages
- `POST /api/conversations/{id}/messages` - Add message
- `GET /api/conversations/{id}/export` - Export conversation
- `GET /api/conversations/{id}/stream` - Stream conversation (GET)
- `POST /api/conversations/{id}/stream` - Stream conversation (POST)

### Content Processing Routes (4 endpoints)
- `POST /api/content/text` - Analyze text content
- `POST /api/content/substack` - Extract Substack article
- `POST /api/content/unified` - Unified content processing
- `POST /api/simple-youtube` - Extract YouTube transcript

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd apps/backend
pip install -r requirements.txt
```

This installs `fastapi-mcp>=0.1.0` and all required dependencies.

### 2. Start Next.js Application

```bash
# Terminal 1
cd apps/web
npm run dev
```

The Next.js app should be running on `http://localhost:3000`.

### 3. Start MCP Auth Tester

```bash
# Terminal 2
cd apps/backend
uvicorn mcp_auth_tester:app --reload --port 8001
```

The MCP server will start on `http://localhost:8001`.

### 4. Connect with MCP Inspector

```bash
# Terminal 3
npx @modelcontextprotocol/inspector
```

Then connect to: `http://localhost:8001/mcp`

## 🧪 Available Test Tools

### 1. `test_unauthorized_access`

**Purpose**: Verify all 14 routes return 401 without auth token

**Usage in MCP Inspector**:
```json
{
  "test_conversation_id": "test_conv_123"
}
```

**Expected Result**:
```json
{
  "test_name": "Unauthorized Access Test",
  "total_routes": 14,
  "passed": 14,
  "failed": 0,
  "success_rate": "100.0%",
  "all_passed": true
}
```

### 2. `test_dev_mode_fallback`

**Purpose**: Verify try-catch pattern handles disabled middleware gracefully

**Usage**: Call with default parameters

**Expected Result**:
- All routes should return 401 without crashing
- No 500 errors from unhandled exceptions

### 3. `test_auth_coverage`

**Purpose**: Meta-test to verify all routes are documented and testable

**Expected Result**:
```json
{
  "total_routes": 14,
  "coverage_complete": true
}
```

### 4. `test_specific_route`

**Purpose**: Debug individual endpoint auth behavior

**Usage**:
```json
{
  "method": "GET",
  "path": "/api/conversations",
  "clerk_token": "optional_token_here"
}
```

**Example for parameterized route**:
```json
{
  "method": "GET",
  "path": "/api/conversations/{conversation_id}",
  "conversation_id": "test_123"
}
```

### 5. `test_all_routes_summary`

**Purpose**: Comprehensive overview of all auth enforcement

**Expected Result**:
```json
{
  "conversation_routes": [
    {"endpoint": "GET /api/conversations", "status": 401, "auth_enforced": true, "icon": "✅"}
  ],
  "content_routes": [
    {"endpoint": "POST /api/content/text", "status": 401, "auth_enforced": true, "icon": "✅"}
  ],
  "summary": {
    "total_routes": 14,
    "passed": 14,
    "success_rate": "100.0%",
    "all_passing": true
  }
}
```

## 🔧 Claude Desktop Integration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "clerk-auth-tester": {
      "command": "python",
      "args": [
        "-m",
        "uvicorn",
        "apps.backend.mcp_auth_tester:app",
        "--host",
        "0.0.0.0",
        "--port",
        "8001"
      ],
      "env": {
        "PYTHONPATH": "/path/to/gayed-signals-dashboard"
      }
    }
  }
}
```

Then ask Claude:
```
Use the clerk-auth-tester to verify all routes return 401 without auth
```

## 📊 Interpreting Test Results

### ✅ Passing Test
```json
{
  "route": "GET /api/conversations",
  "status_code": 401,
  "expected": 401,
  "passed": true
}
```
**Meaning**: Route correctly enforces authentication

### ❌ Failing Test
```json
{
  "route": "GET /api/conversations",
  "status_code": 200,
  "expected": 401,
  "passed": false
}
```
**Meaning**: Route is NOT enforcing authentication (security issue)

### 💥 Error Test
```json
{
  "route": "GET /api/conversations",
  "status_code": 500,
  "passed": false,
  "error": "Internal Server Error"
}
```
**Meaning**: Route crashed (likely missing try-catch wrapper)

## 🐛 Troubleshooting

### MCP Server Won't Start

**Issue**: `ModuleNotFoundError: No module named 'fastapi_mcp'`

**Solution**:
```bash
pip install fastapi-mcp
```

### Next.js Not Running

**Issue**: Connection refused to `localhost:3000`

**Solution**: Start Next.js app first:
```bash
cd apps/web
npm run dev
```

### All Tests Showing 500 Errors

**Issue**: Routes are crashing instead of returning 401

**Solution**: Verify try-catch pattern is applied:
```typescript
let userId: string | null = null
try {
  const authResult = await auth()
  userId = authResult.userId
} catch (authError) {
  console.log('⚠️ Clerk auth not available - using development mode')
}
```

### Routes Returning 200 Instead of 401

**Issue**: Auth enforcement not working

**Solution**: Check that routes return 401 when `userId` is null:
```typescript
if (!userId) {
  return NextResponse.json(
    { error: 'Unauthorized - Authentication required' },
    { status: 401 }
  )
}
```

## 🔐 Testing with Valid Clerk Tokens

### Get a Clerk Session Token

1. Open browser DevTools on `localhost:3000`
2. In Console, run:
```javascript
await window.Clerk.session.getToken()
```
3. Copy the token

### Test with Token

Use `test_specific_route` with the token:
```json
{
  "method": "GET",
  "path": "/api/conversations",
  "clerk_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Expected**: Should return 200 with actual conversation data

## 📈 Success Criteria

All tests should show:
- ✅ **14/14 routes** return 401 without auth
- ✅ **0 errors** (no 500 responses)
- ✅ **100% success rate** on unauthorized access test
- ✅ **Graceful degradation** with disabled middleware

## 🎯 What's Being Validated

This test suite confirms the fix applied to all 14 routes:

**Before Fix**:
```typescript
const { userId } = auth() // ❌ Throws error when middleware disabled
```

**After Fix**:
```typescript
let userId: string | null = null
try {
  const authResult = await auth()
  userId = authResult.userId
} catch (authError) {
  console.log('⚠️ Clerk auth not available - using development mode')
}
// ✅ Route continues, returns 401 properly
```

## 📚 Additional Resources

- [FastAPI MCP Documentation](https://github.com/tadata-org/fastapi_mcp)
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
- [Clerk Authentication Docs](https://clerk.com/docs)

## 🔄 Continuous Testing

Add to your CI/CD pipeline:

```bash
#!/bin/bash
# Start services
npm run dev &
NEXTJS_PID=$!
uvicorn apps.backend.mcp_auth_tester:app --port 8001 &
MCP_PID=$!

# Wait for services
sleep 10

# Run tests via HTTP
curl http://localhost:8001/test/all-routes-summary | jq '.summary.all_passing'

# Cleanup
kill $NEXTJS_PID $MCP_PID
```

Expected output: `true`
