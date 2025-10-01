# FastAPI MCP Integration Guide

## Overview

Your Gayed Signals Dashboard FastAPI backend is now integrated with **FastAPI MCP**, allowing Claude and other MCP-compatible clients to directly call your API endpoints as tools.

## What is FastAPI MCP?

FastAPI MCP automatically exposes your FastAPI endpoints as **Model Context Protocol (MCP) tools**, enabling:
- ✅ Direct API calls from Claude Desktop/Code
- ✅ Zero configuration - auto-discovery of all endpoints
- ✅ Automatic tool descriptions from FastAPI endpoint docstrings
- ✅ Type safety from Pydantic models
- ✅ Both HTTP and SSE (Server-Sent Events) transports

## Installation Status

### ✅ Completed Steps

1. **Package Installed**: `fastapi-mcp>=0.1.0` added to requirements.txt
2. **Backend Integration**: MCP endpoints mounted in `main.py`
3. **Endpoints Exposed**:
   - HTTP Transport: `http://localhost:8000/mcp`
   - SSE Transport: `http://localhost:8000/mcp/sse`

## Available API Endpoints (Now MCP Tools)

Your FastAPI backend exposes the following endpoints as MCP tools:

### 📹 YouTube Processing
- **POST** `/api/v1/youtube/process` - Process YouTube videos with transcription
- **GET** `/api/v1/videos` - List processed videos
- **GET** `/api/v1/videos/{video_id}` - Get video details

### 📊 Economic Data (FRED API)
- **GET** `/api/v1/economic/data` - Fetch Federal Reserve economic data
- **GET** `/api/v1/economic/indicators` - Get economic indicators

### 🤖 AutoGen Conversations
- **POST** `/api/v1/conversations` - Create AutoGen agent conversation
- **GET** `/api/v1/conversations/{conversation_id}` - Get conversation details
- **WebSocket** `/api/v1/conversations/stream` - Stream live agent debates

### 🎯 Content Triggers (Story 2.1)
- **POST** `/api/content/triggers/analyze` - Analyze content to trigger agent debates

### 📁 Video Organization
- **GET** `/api/v1/folders` - List video folders
- **POST** `/api/v1/folders` - Create new folder

### 💬 Custom Prompts
- **GET** `/api/v1/prompts` - List saved prompts
- **POST** `/api/v1/prompts` - Create custom prompt

## Configuration for Claude Desktop

### Option 1: Copy Configuration to Claude Desktop (Recommended)

1. **Locate your Claude Desktop config**:
   ```bash
   # macOS
   ~/Library/Application Support/Claude/claude_desktop_config.json

   # Windows
   %APPDATA%/Claude/claude_desktop_config.json

   # Linux
   ~/.config/Claude/claude_desktop_config.json
   ```

2. **Add the MCP server configuration**:
   ```bash
   # macOS
   cp mcp-config-claude-desktop.json ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

   Or manually merge this into your existing config:
   ```json
   {
     "mcpServers": {
       "gayed-signals-api": {
         "command": "npx",
         "args": [
           "-y",
           "@modelcontextprotocol/server-http",
           "http://localhost:8000/mcp"
         ],
         "env": {
           "GAYED_API_URL": "http://localhost:8000"
         }
       }
     }
   }
   ```

3. **Restart Claude Desktop** to load the new configuration

### Option 2: Use MCP Inspector (Testing)

The MCP Inspector is a web-based tool for testing MCP servers:

```bash
# Install MCP Inspector globally
npm install -g @modelcontextprotocol/inspector

# Run the inspector
mcp-inspector
```

Then connect to: `http://localhost:8000/mcp`

## Starting Your MCP-Enabled Backend

### Method 1: Using npm (from monorepo root)

```bash
# Start backend only
npm run dev --workspace=backend

# Or start both frontend and backend
npm run dev
```

### Method 2: Direct Python execution

```bash
cd apps/backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Verify MCP is Running

Once the backend starts, you should see:
```
INFO:     Initializing FastAPI MCP integration...
INFO:     ✅ FastAPI MCP mounted at /mcp
INFO:     ✅ FastAPI MCP SSE transport mounted at /mcp/sse
INFO:     Application startup complete.
```

Test the MCP endpoint:
```bash
curl http://localhost:8000/mcp
```

Expected response: MCP protocol handshake or tools list

## Using MCP Tools in Claude

Once configured, you can use your API as tools in Claude Desktop or Claude Code:

### Example 1: Fetch Economic Data

**Prompt to Claude**:
> "Use the gayed-signals-api to fetch the latest unemployment rate from FRED"

**Claude will**:
1. Discover the `/api/v1/economic/data` tool
2. Call it with appropriate parameters
3. Return the real Federal Reserve data

### Example 2: Process YouTube Video

**Prompt to Claude**:
> "Process this YouTube video using the gayed-signals-api: https://www.youtube.com/watch?v=example"

**Claude will**:
1. Call the `/api/v1/youtube/process` endpoint
2. Wait for transcription completion
3. Return video insights and summary

### Example 3: Start AutoGen Agent Debate

**Prompt to Claude**:
> "Create an AutoGen agent conversation to analyze the latest Fed meeting minutes"

**Claude will**:
1. Call `/api/v1/conversations` to start agent debate
2. Stream real-time agent responses
3. Return consensus analysis

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Claude Desktop                         │
│                  (MCP Client - You)                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ MCP Protocol (HTTP/SSE)
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              FastAPI Backend (Port 8000)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  FastAPI MCP Integration (/mcp)                      │   │
│  │  - Auto-discovers all FastAPI endpoints             │   │
│  │  - Converts to MCP tools                            │   │
│  │  - Provides OpenAPI schema                          │   │
│  └─────────────────┬────────────────────────────────────┘   │
│                    │                                         │
│  ┌─────────────────▼────────────────────────────────────┐   │
│  │         FastAPI Application Routes                   │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │  YouTube Processing (/api/v1/youtube)        │    │   │
│  │  │  Economic Data (/api/v1/economic)            │    │   │
│  │  │  AutoGen Conversations (/api/v1/conversations)│   │   │
│  │  │  Content Triggers (/api/content/triggers)    │    │   │
│  │  └──────────────────────────────────────────────┘    │   │
│  └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                       │
                       │ Calls External Services
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          External Services (Real Data Sources)              │
│  - FRED API (Federal Reserve Economic Data)                 │
│  - OpenAI GPT-4 (AutoGen Agent Responses)                   │
│  - Perplexity MCP (Market Intelligence)                     │
│  - YouTube API (Video Transcripts)                          │
└─────────────────────────────────────────────────────────────┘
```

## Security Considerations

### Current Setup (Development)

- ⚠️ **No authentication on MCP endpoints** - Safe for local development
- ✅ Individual API routes still enforce authentication via Clerk
- ✅ CORS configured for Next.js integration

### Production Setup (Recommended)

Add authentication to MCP endpoints:

```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer

security = HTTPBearer()

async def verify_mcp_token(credentials = Depends(security)):
    """Verify MCP client authentication token."""
    if credentials.credentials != os.getenv("MCP_SECRET_TOKEN"):
        raise HTTPException(status_code=401, detail="Invalid MCP token")
    return credentials

# Apply to MCP initialization
mcp = FastApiMCP(
    app,
    name="gayed-signals-api",
    dependencies=[Depends(verify_mcp_token)]  # ✅ Require auth for all MCP calls
)
```

Then configure Claude Desktop with the token:
```json
{
  "mcpServers": {
    "gayed-signals-api": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-http", "http://localhost:8000/mcp"],
      "env": {
        "MCP_SECRET_TOKEN": "your-secure-token-here"
      }
    }
  }
}
```

## Troubleshooting

### Backend won't start

**Error**: `Address already in use`
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Restart backend
npm run dev --workspace=backend
```

### Claude Desktop doesn't see MCP tools

1. **Check backend is running**:
   ```bash
   curl http://localhost:8000/mcp
   ```

2. **Verify Claude Desktop config**:
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

3. **Restart Claude Desktop** completely

4. **Check logs**:
   - Backend logs: Should show MCP initialization
   - Claude Desktop logs: Check for MCP connection errors

### MCP endpoint returns errors

**Check FastAPI logs** for detailed error messages:
```bash
cd apps/backend
python -m uvicorn main:app --reload --log-level debug
```

### Tools work but return 401 errors

This is expected! Individual API endpoints require Clerk authentication. Either:

1. **Use authenticated endpoints** - Pass Clerk session token
2. **Create public endpoints** - For MCP-specific tools
3. **Use MCP authentication** - Add token verification (see Security section)

## Testing Your MCP Integration

### Test 1: List Available Tools

```bash
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

Expected: JSON list of all your API endpoints as tools

### Test 2: Call a Tool (Health Check)

```bash
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get_health",
      "arguments": {}
    }
  }'
```

Expected: Health check response with service status

### Test 3: Real-Time Testing with MCP Inspector

1. Install and run MCP Inspector:
   ```bash
   npx @modelcontextprotocol/inspector
   ```

2. Connect to: `http://localhost:8000/mcp`

3. Browse available tools visually

4. Test tool calls with a UI

## Advanced Configuration

### Customize Tool Descriptions

FastAPI MCP uses your endpoint docstrings as tool descriptions:

```python
@app.get("/api/v1/economic/data")
async def get_economic_data(
    series_id: str,
    start_date: Optional[str] = None
):
    """
    Fetch real Federal Reserve economic data from FRED API.

    This tool retrieves authentic economic indicators including:
    - Unemployment rates
    - Inflation (CPI)
    - GDP growth
    - Interest rates

    All data is REAL and sourced directly from the Federal Reserve.
    NO synthetic or mock data is ever returned.
    """
    # Implementation...
```

### Exclude Endpoints from MCP

If you don't want certain endpoints exposed as MCP tools:

```python
from fastapi_mcp import FastApiMCP

mcp = FastApiMCP(
    app,
    include_paths=["/api/v1/*"],  # Only expose /api/v1/* endpoints
    exclude_paths=["/api/v1/admin/*"]  # Exclude admin endpoints
)
```

### Enable Auto-Discovery of New Endpoints

FastAPI MCP automatically discovers new endpoints when you add them to your FastAPI app. No configuration needed!

Just add a new router:
```python
from api.routes import new_feature

app.include_router(
    new_feature.router,
    prefix="/api/v1/new-feature",
    tags=["new-feature"]
)
```

It will automatically appear as MCP tools next time Claude queries the server.

## Next Steps

1. ✅ **Start the backend**: `npm run dev --workspace=backend`
2. ✅ **Configure Claude Desktop**: Copy `mcp-config-claude-desktop.json`
3. ✅ **Restart Claude Desktop**: Load the new MCP server
4. ✅ **Test in Claude**: Ask Claude to use your API tools
5. ⏭️ **Add authentication**: Secure MCP endpoints for production
6. ⏭️ **Monitor usage**: Track which tools are called most
7. ⏭️ **Optimize tool descriptions**: Improve docstrings for better Claude understanding

## Resources

- **FastAPI MCP Docs**: https://fastapi-mcp.tadata.com
- **MCP Protocol Spec**: https://spec.modelcontextprotocol.io
- **MCP Inspector**: https://github.com/modelcontextprotocol/inspector
- **Your Backend Docs**: http://localhost:8000/docs (when running)

---

**Status**: ✅ **Ready for Testing**
**Last Updated**: 2025-10-01
**Integration By**: Quinn (QA Test Architect)
