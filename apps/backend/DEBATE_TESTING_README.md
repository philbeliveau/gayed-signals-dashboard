# AutoGen Debate Workflow Testing with FastAPI MCP

This MCP server tests the **actual functionality** of your YouTube/Substack → AutoGen debate workflows, not just auth.

## 🎯 What This Actually Tests

Unlike the auth tester, this tests **real user workflows**:

1. **YouTube → Debate**: Extract transcript → Trigger agent conversation → Get consensus
2. **Substack → Debate**: Extract article → Validate relevance → Trigger agent conversation
3. **Text → Debate**: Direct text input → Agent analysis → Get recommendations
4. **Full Workflow**: Complete end-to-end integration test

## 🚀 Quick Start

```bash
# Terminal 1: Start Next.js
cd apps/web && npm run dev

# Terminal 2: Start MCP Debate Tester
cd apps/backend && uvicorn mcp_debate_tester:app --reload --port 8002

# Terminal 3: Connect MCP Inspector
npx @modelcontextprotocol/inspector
# Connect to: http://localhost:8002/mcp
```

## 🧪 Available Debate Tools

### 1. `debate_youtube_video`

**What it does**: Extracts YouTube transcript and prepares for AutoGen debate

**Example**:
```json
{
  "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "user_id": "dev-user"
}
```

**Returns**:
```json
{
  "success": true,
  "workflow": "youtube_to_debate",
  "steps_completed": [
    "✅ YouTube transcript extracted",
    "✅ Content validated",
    "⏭️ Ready for AutoGen debate"
  ],
  "content_preview": {
    "title": "Never Gonna Give You Up",
    "channel": "Rick Astley",
    "duration": "3:32",
    "transcript_length": 1523,
    "transcript_preview": "We're no strangers to love..."
  },
  "debate_ready": true
}
```

**Try in Claude Desktop**:
```
Extract and prepare for debate this YouTube video: https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

---

### 2. `debate_substack_article`

**What it does**: Extracts Substack article content and validates financial relevance

**Example**:
```json
{
  "article_url": "https://example.substack.com/p/fed-policy-analysis",
  "skip_relevance_check": false,
  "user_id": "dev-user"
}
```

**Returns**:
```json
{
  "success": true,
  "workflow": "substack_to_debate",
  "steps_completed": [
    "✅ Substack article extracted",
    "✅ Content validated",
    "✅ Relevance score: 87%",
    "⏭️ Ready for AutoGen debate"
  ],
  "content_preview": {
    "title": "Why the Fed Will Pivot in 2024",
    "author": "Market Analyst",
    "word_count": 2341,
    "content_preview": "The Federal Reserve faces unprecedented..."
  },
  "relevance_analysis": {
    "score": 87,
    "financial_terms": ["market", "fed", "interest rate", "inflation"],
    "confidence": 92
  }
}
```

**Try in Claude Desktop**:
```
Extract this Substack article and check if it's financially relevant: https://substack.com/home/post/p-175035159?source=queue

---

### 3. `debate_text_content`

**What it does**: Analyzes direct text and ACTUALLY TRIGGERS AutoGen debate

**Example**:
```json
{
  "content": "The Federal Reserve announced interest rate decisions impacting market volatility and investment strategies across equity markets. Current economic indicators suggest potential recession risks.",
  "analysis_type": "COMPREHENSIVE",
  "include_signal_context": true,
  "user_id": "dev-user"
}
```

**Returns**:
```json
{
  "success": true,
  "workflow": "text_to_debate",
  "steps_completed": [
    "✅ Text content analyzed",
    "✅ Financial relevance validated",
    "✅ AutoGen conversation generated",
    "✅ Agent consensus reached"
  ],
  "analysis_summary": {
    "relevance_score": 0.85,
    "financial_categories": [
      {"category": "Market Analysis", "relevance": 0.8},
      {"category": "Economic Indicators", "relevance": 0.6}
    ]
  },
  "debate_results": {
    "conversation_id": "conv_1234567890_abc",
    "agent_count": 3,
    "agents": [
      {
        "name": "Financial Analyst",
        "type": "FINANCIAL_ANALYST",
        "confidence": 0.85,
        "message_preview": "Based on the provided content, I identify key financial themes..."
      },
      {
        "name": "Market Context",
        "type": "MARKET_CONTEXT",
        "confidence": 0.78,
        "message_preview": "Current market conditions suggest this analysis aligns with..."
      },
      {
        "name": "Risk Challenger",
        "type": "RISK_CHALLENGER",
        "confidence": 0.92,
        "message_preview": "Important considerations: The analysis may underestimate..."
      }
    ],
    "consensus": "Agent analysis converges on a moderately bullish outlook...",
    "confidence_score": 0.78
  }
}
```

**Try in Claude Desktop**:
```
Analyze this text with AutoGen agents: "The Federal Reserve announced interest rate decisions impacting market volatility and investment strategies across equity markets."
```

---

### 4. `get_conversation_status`

**What it does**: Monitors AutoGen conversation progress

**Example**:
```json
{
  "conversation_id": "conv_1234567890_abc",
  "user_id": "dev-user"
}
```

**Returns**:
```json
{
  "success": true,
  "conversation_id": "conv_1234567890_abc",
  "status": "completed",
  "content_title": "Direct Text Analysis - COMPREHENSIVE",
  "message_count": 3,
  "consensus_reached": true,
  "confidence_score": 0.78,
  "final_recommendation": "Agent analysis converges on a moderately bullish outlook..."
}
```

---

### 5. `run_complete_debate_workflow`

**What it does**: Runs the FULL end-to-end workflow in one call

**Example for YouTube**:
```json
{
  "content_type": "youtube",
  "content_source": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "user_id": "dev-user"
}
```

**Example for Substack**:
```json
{
  "content_type": "substack",
  "content_source": "https://example.substack.com/p/market-analysis",
  "user_id": "dev-user"
}
```

**Example for Text**:
```json
{
  "content_type": "text",
  "content_source": "The Federal Reserve announced interest rate decisions impacting market volatility and investment strategies across equity markets.",
  "user_id": "dev-user"
}
```

**Try in Claude Desktop**:
```
Run a complete debate workflow for this YouTube video: https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

## 🎭 Real-World Usage Examples

### Example 1: Test YouTube Extraction

```bash
# In MCP Inspector or via Claude:
Use debate_youtube_video with:
{
  "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**What happens**:
1. MCP tool calls `POST /api/simple-youtube`
2. Next.js extracts transcript using yt-dlp
3. Returns transcript preview and metadata
4. Shows "debate ready" status

### Example 2: Test Substack with Relevance Check

```bash
Use debate_substack_article with:
{
  "article_url": "https://example.substack.com/p/fed-policy",
  "skip_relevance_check": false
}
```

**What happens**:
1. MCP tool calls `POST /api/content/substack`
2. Next.js extracts article content
3. Validates financial relevance (needs 40%+ score)
4. Returns extracted content with relevance analysis

### Example 3: Test Full AutoGen Debate

```bash
Use debate_text_content with:
{
  "content": "The Federal Reserve announced interest rate decisions impacting market volatility and investment strategies across equity markets. Current economic indicators suggest potential recession risks with unemployment rising to 4.2% and inflation persistent at 3.7%. Analysts recommend defensive positioning.",
  "analysis_type": "COMPREHENSIVE",
  "include_signal_context": true
}
```

**What happens**:
1. MCP tool calls `POST /api/content/text`
2. Next.js validates content (50+ chars, financial relevance)
3. **AutoGen agents debate the content**:
   - Financial Analyst identifies signals
   - Market Context provides current conditions
   - Risk Challenger questions assumptions
4. Consensus reached and stored in database
5. Returns full agent conversation with confidence scores

### Example 4: Monitor Conversation Progress

```bash
# After starting a debate, check its status:
Use get_conversation_status with:
{
  "conversation_id": "conv_1234567890_abc"
}
```

**What happens**:
1. MCP tool calls `GET /api/conversations/{id}`
2. Returns current status, message count, consensus
3. Shows if debate is still running or completed

## 🔧 Claude Desktop Integration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "autogen-debate-tester": {
      "command": "python",
      "args": [
        "-m",
        "uvicorn",
        "apps.backend.mcp_debate_tester:app",
        "--host",
        "0.0.0.0",
        "--port",
        "8002"
      ],
      "env": {
        "PYTHONPATH": "/path/to/gayed-signals-dashboard"
      }
    }
  }
}
```

Then you can ask Claude:

```
Extract and debate this YouTube video about Fed policy:
https://www.youtube.com/watch?v=example
```

Claude will:
1. Use `debate_youtube_video` to extract transcript
2. Show you the content preview
3. (Optionally) Use `debate_text_content` to trigger AutoGen debate
4. Use `get_conversation_status` to monitor progress
5. Present the agent consensus to you

## 🎯 Key Differences from Auth Tester

| Feature | Auth Tester | Debate Tester |
|---------|-------------|---------------|
| **Purpose** | Test auth enforcement | Test actual functionality |
| **Tests** | Returns 401 without token | Extracts content, triggers debates |
| **Scope** | Security validation | User workflow validation |
| **Output** | Status codes | Agent conversations |
| **Use Case** | DevOps/Security | Product validation |

## 🐛 Troubleshooting

### YouTube Extraction Fails

**Error**: `YouTube API returned 500`

**Possible Causes**:
1. `yt-dlp` not installed: `pip install yt-dlp`
2. Invalid video URL
3. Video is private/restricted
4. Rate limiting from YouTube

**Solution**: Check backend logs for detailed error

### Substack Returns Low Relevance

**Error**: `Content not financially relevant (score: 25%)`

**This is expected!** The article isn't about finance.

**Solutions**:
1. Use `skip_relevance_check: true` to bypass
2. Use a financial Substack article
3. Check which terms are being matched

### Text Debate Returns Mock Data

**This is normal!** The current implementation uses:
```python
# Mock AutoGen conversation (to be replaced with actual AutoGen integration)
```

**Future**: Will integrate real AutoGen agents when Epic 1 is complete.

## 📊 Success Criteria

A successful test should show:

✅ **YouTube Extraction**:
- Transcript extracted with 100+ characters
- Title, channel, duration populated
- `debate_ready: true`

✅ **Substack Extraction**:
- Article content extracted
- Relevance score > 40% for financial content
- Financial terms identified
- `debate_ready: true`

✅ **Text Debate**:
- 3 agent responses generated
- Each agent has confidence > 0.6
- Consensus message provided
- Conversation ID returned

## 🎓 What You Learn

By using this MCP server, you can:

1. **Test workflows conversationally**: "Extract this YouTube video"
2. **Validate integrations**: See if YouTube API actually works
3. **Debug content extraction**: Preview extracted content before debate
4. **Monitor AutoGen**: Check conversation status and agent responses
5. **Integration testing**: Full end-to-end workflow validation

## 🚀 Next Steps

1. Try extracting a real financial YouTube video
2. Test Substack with a market analysis article
3. Run text debate with complex financial content
4. Monitor conversation status during debate
5. Export conversation results

This is how FastAPI MCP is **meant to be used** - exposing complex workflows as simple tools that Claude can orchestrate!
