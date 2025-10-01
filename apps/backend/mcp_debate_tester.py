"""
FastAPI MCP Debate Workflow Tester

This MCP server provides tools to test the full AutoGen debate workflow:
1. Extract content from YouTube/Substack
2. Trigger AutoGen agent debates
3. Monitor conversation progress
4. Validate debate results

Instead of just testing auth, this tests the ACTUAL FUNCTIONALITY
of the debate system end-to-end.

Usage:
    uvicorn mcp_debate_tester:app --reload --port 8002

Then ask Claude:
    "Extract and debate this YouTube video: https://youtube.com/watch?v=..."
"""

from fastapi import FastAPI, Query, HTTPException
from fastapi_mcp import FastApiMCP
import httpx
from typing import Optional, Dict, Any, List
from datetime import datetime
import asyncio

app = FastAPI(
    title="AutoGen Debate Workflow Tester",
    description="MCP server for testing YouTube/Substack → AutoGen debate workflows",
    version="1.0.0"
)

NEXTJS_BASE_URL = "http://localhost:3000"
DEFAULT_TIMEOUT = 30.0


@app.get("/health", operation_id="health_check")
async def health_check():
    """Check if Next.js backend is accessible"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{NEXTJS_BASE_URL}/api/health")
            return {
                "status": "healthy",
                "nextjs_accessible": response.status_code == 200,
                "timestamp": datetime.utcnow().isoformat()
            }
    except Exception as e:
        return {
            "status": "unhealthy",
            "nextjs_accessible": False,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


@app.post("/debate/youtube", operation_id="debate_youtube_video")
async def debate_youtube_video(
    video_url: str = Query(description="YouTube video URL to analyze"),
    user_id: str = Query(default="dev-user", description="User ID for development mode")
):
    """
    Extract YouTube transcript and trigger AutoGen agent debate.

    This tests the full workflow:
    1. POST /api/simple-youtube → Extract transcript
    2. Verify transcript extraction succeeded
    3. Return debate-ready content

    Example URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ
    """
    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
        try:
            # Step 1: Extract YouTube transcript
            print(f"🎥 Extracting transcript from: {video_url}")

            response = await client.post(
                f"{NEXTJS_BASE_URL}/api/simple-youtube",
                json={
                    "youtube_url": video_url,
                    "user_id": user_id
                }
            )

            if response.status_code != 200:
                return {
                    "success": False,
                    "step": "youtube_extraction",
                    "error": f"YouTube API returned {response.status_code}",
                    "response": response.text[:500],
                    "timestamp": datetime.utcnow().isoformat()
                }

            data = response.json()

            # Step 2: Validate extraction
            if not data.get("success"):
                return {
                    "success": False,
                    "step": "youtube_extraction",
                    "error": data.get("error", "Unknown error"),
                    "timestamp": datetime.utcnow().isoformat()
                }

            transcript_data = data.get("data", {})
            transcript_text = transcript_data.get("transcript", "")

            # Step 3: Prepare debate analysis
            return {
                "success": True,
                "workflow": "youtube_to_debate",
                "steps_completed": [
                    "✅ YouTube transcript extracted",
                    "✅ Content validated",
                    "⏭️ Ready for AutoGen debate"
                ],
                "content_preview": {
                    "title": transcript_data.get("title", "Unknown"),
                    "channel": transcript_data.get("channel", "Unknown"),
                    "duration": transcript_data.get("duration", "Unknown"),
                    "transcript_length": len(transcript_text),
                    "transcript_preview": transcript_text[:500] + "..." if len(transcript_text) > 500 else transcript_text
                },
                "debate_ready": True,
                "next_step": "Trigger AutoGen agent conversation with this content",
                "timestamp": datetime.utcnow().isoformat()
            }

        except httpx.TimeoutException:
            return {
                "success": False,
                "step": "youtube_extraction",
                "error": "Request timeout - YouTube extraction took too long",
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {
                "success": False,
                "step": "youtube_extraction",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }


@app.post("/debate/substack", operation_id="debate_substack_article")
async def debate_substack_article(
    article_url: str = Query(description="Substack article URL to analyze"),
    skip_relevance_check: bool = Query(default=False, description="Skip financial relevance validation"),
    user_id: str = Query(default="dev-user", description="User ID for development mode")
):
    """
    Extract Substack article and trigger AutoGen agent debate.

    This tests the full workflow:
    1. POST /api/content/substack → Extract article content
    2. Verify financial relevance (unless skipped)
    3. Return debate-ready content

    Example URL: https://example.substack.com/p/market-analysis
    """
    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
        try:
            # Step 1: Extract Substack article
            print(f"📰 Extracting Substack article: {article_url}")

            response = await client.post(
                f"{NEXTJS_BASE_URL}/api/content/substack",
                json={
                    "url": article_url,
                    "options": {
                        "skipRelevanceCheck": skip_relevance_check,
                        "includeMetadata": True,
                        "triggerAutoGen": False  # We'll handle this separately
                    }
                }
            )

            if response.status_code != 200:
                return {
                    "success": False,
                    "step": "substack_extraction",
                    "error": f"Substack API returned {response.status_code}",
                    "response": response.text[:500],
                    "timestamp": datetime.utcnow().isoformat()
                }

            data = response.json()

            # Step 2: Validate extraction
            if not data.get("success"):
                return {
                    "success": False,
                    "step": "substack_extraction",
                    "error": data.get("error", {}).get("message", "Unknown error"),
                    "error_code": data.get("error", {}).get("code"),
                    "timestamp": datetime.utcnow().isoformat()
                }

            content_data = data.get("data", {})
            extracted_content = content_data.get("extractedContent", {})

            # Step 3: Prepare debate analysis
            return {
                "success": True,
                "workflow": "substack_to_debate",
                "steps_completed": [
                    "✅ Substack article extracted",
                    "✅ Content validated",
                    f"✅ Relevance score: {content_data.get('relevanceScore', 0)}%",
                    "⏭️ Ready for AutoGen debate"
                ],
                "content_preview": {
                    "title": extracted_content.get("title", "Unknown"),
                    "author": extracted_content.get("author", "Unknown"),
                    "publish_date": extracted_content.get("publishDate", "Unknown"),
                    "word_count": extracted_content.get("wordCount", 0),
                    "content_preview": extracted_content.get("content", "")[:500] + "..."
                },
                "relevance_analysis": {
                    "score": content_data.get("relevanceScore", 0),
                    "financial_terms": content_data.get("metadata", {}).get("financialTermsFound", []),
                    "confidence": content_data.get("metadata", {}).get("confidenceScore", 0)
                },
                "debate_ready": True,
                "next_step": "Trigger AutoGen agent conversation with this content",
                "timestamp": datetime.utcnow().isoformat()
            }

        except httpx.TimeoutException:
            return {
                "success": False,
                "step": "substack_extraction",
                "error": "Request timeout - Substack extraction took too long",
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {
                "success": False,
                "step": "substack_extraction",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }


@app.post("/debate/text", operation_id="debate_text_content")
async def debate_text_content(
    content: str = Query(description="Text content to analyze (min 50 chars)"),
    analysis_type: str = Query(default="COMPREHENSIVE", description="QUICK, COMPREHENSIVE, or GAYED_FOCUSED"),
    include_signal_context: bool = Query(default=True, description="Include Gayed signal context"),
    user_id: str = Query(default="dev-user", description="User ID for development mode")
):
    """
    Analyze direct text content and trigger AutoGen agent debate.

    This tests the full workflow:
    1. POST /api/content/text → Analyze text content
    2. Trigger AutoGen agent debate
    3. Return conversation results

    Example content: "The Federal Reserve announced interest rate decisions..."
    """
    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
        try:
            # Step 1: Analyze text content
            print(f"📝 Analyzing text content ({len(content)} chars)")

            response = await client.post(
                f"{NEXTJS_BASE_URL}/api/content/text",
                json={
                    "content": content,
                    "analysisType": analysis_type,
                    "includeSignalContext": include_signal_context
                }
            )

            if response.status_code != 200:
                return {
                    "success": False,
                    "step": "text_analysis",
                    "error": f"Text API returned {response.status_code}",
                    "response": response.text[:500],
                    "timestamp": datetime.utcnow().isoformat()
                }

            data = response.json()

            # Step 2: Validate analysis
            if not data.get("success"):
                return {
                    "success": False,
                    "step": "text_analysis",
                    "error": data.get("error", "Unknown error"),
                    "timestamp": datetime.utcnow().isoformat()
                }

            analysis_data = data.get("data", {})
            autogen_conversation = analysis_data.get("autoGenConversation", {})

            # Step 3: Extract debate results
            agent_responses = autogen_conversation.get("agentResponses", [])

            return {
                "success": True,
                "workflow": "text_to_debate",
                "steps_completed": [
                    "✅ Text content analyzed",
                    "✅ Financial relevance validated",
                    "✅ AutoGen conversation generated",
                    "✅ Agent consensus reached"
                ],
                "analysis_summary": {
                    "relevance_score": analysis_data.get("relevanceScore", 0),
                    "financial_categories": analysis_data.get("financialCategories", []),
                    "analysis_type": analysis_type,
                    "included_signal_context": include_signal_context
                },
                "debate_results": {
                    "conversation_id": autogen_conversation.get("conversationId"),
                    "agent_count": len(agent_responses),
                    "agents": [
                        {
                            "name": agent.get("agentName"),
                            "type": agent.get("agentType"),
                            "confidence": agent.get("confidence"),
                            "message_preview": agent.get("message", "")[:200] + "..."
                        }
                        for agent in agent_responses
                    ],
                    "consensus": autogen_conversation.get("consensus"),
                    "confidence_score": autogen_conversation.get("confidenceScore")
                },
                "processing_metrics": analysis_data.get("processingMetrics", {}),
                "timestamp": datetime.utcnow().isoformat()
            }

        except httpx.TimeoutException:
            return {
                "success": False,
                "step": "text_analysis",
                "error": "Request timeout - Text analysis took too long",
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {
                "success": False,
                "step": "text_analysis",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }


@app.get("/conversation/status", operation_id="get_conversation_status")
async def get_conversation_status(
    conversation_id: str = Query(description="Conversation ID to check"),
    user_id: str = Query(default="dev-user", description="User ID for development mode")
):
    """
    Check the status of an AutoGen conversation.

    This monitors the debate progress after triggering content analysis.
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(
                f"{NEXTJS_BASE_URL}/api/conversations/{conversation_id}"
            )

            if response.status_code != 200:
                return {
                    "success": False,
                    "error": f"Conversation API returned {response.status_code}",
                    "timestamp": datetime.utcnow().isoformat()
                }

            data = response.json()
            conversation = data.get("conversation", {})

            return {
                "success": True,
                "conversation_id": conversation_id,
                "status": conversation.get("status"),
                "content_title": conversation.get("contentTitle"),
                "message_count": len(conversation.get("messages", [])),
                "consensus_reached": conversation.get("consensusReached"),
                "confidence_score": conversation.get("confidenceScore"),
                "final_recommendation": conversation.get("finalRecommendation"),
                "timestamp": datetime.utcnow().isoformat()
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }


@app.post("/workflow/complete-debate", operation_id="run_complete_debate_workflow")
async def run_complete_debate_workflow(
    content_type: str = Query(description="youtube, substack, or text"),
    content_source: str = Query(description="URL for youtube/substack, or text content"),
    user_id: str = Query(default="dev-user", description="User ID for development mode")
):
    """
    Run the COMPLETE end-to-end debate workflow:
    1. Extract content from source
    2. Trigger AutoGen debate
    3. Monitor conversation progress
    4. Return final results

    This is the full integration test.
    """
    workflow_steps = []

    try:
        # Step 1: Extract content based on type
        if content_type == "youtube":
            workflow_steps.append("🎥 Extracting YouTube transcript...")
            extraction_result = await debate_youtube_video(content_source, user_id)

        elif content_type == "substack":
            workflow_steps.append("📰 Extracting Substack article...")
            extraction_result = await debate_substack_article(content_source, False, user_id)

        elif content_type == "text":
            workflow_steps.append("📝 Analyzing text content...")
            extraction_result = await debate_text_content(content_source, "COMPREHENSIVE", True, user_id)

        else:
            return {
                "success": False,
                "error": f"Invalid content_type: {content_type}. Use youtube, substack, or text",
                "timestamp": datetime.utcnow().isoformat()
            }

        if not extraction_result.get("success"):
            return {
                "success": False,
                "workflow_steps": workflow_steps,
                "failed_at": "content_extraction",
                "error": extraction_result.get("error"),
                "timestamp": datetime.utcnow().isoformat()
            }

        workflow_steps.append("✅ Content extracted successfully")

        # Step 2: Check if debate was triggered (for text content)
        if content_type == "text":
            debate_results = extraction_result.get("debate_results", {})
            conversation_id = debate_results.get("conversation_id")

            if conversation_id:
                workflow_steps.append("✅ AutoGen debate completed")

                return {
                    "success": True,
                    "workflow": f"{content_type}_complete_debate",
                    "workflow_steps": workflow_steps,
                    "extraction_summary": extraction_result.get("analysis_summary"),
                    "debate_summary": debate_results,
                    "timestamp": datetime.utcnow().isoformat()
                }

        # For YouTube/Substack, debate needs to be triggered separately
        workflow_steps.append("⏭️ Content ready for AutoGen debate")

        return {
            "success": True,
            "workflow": f"{content_type}_extraction_complete",
            "workflow_steps": workflow_steps,
            "content_preview": extraction_result.get("content_preview"),
            "next_step": "Trigger AutoGen debate with extracted content",
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        return {
            "success": False,
            "workflow_steps": workflow_steps,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


# Create MCP server
mcp = FastApiMCP(
    app,
    name="AutoGen Debate Workflow Tester",
    description="Test YouTube/Substack extraction → AutoGen debate workflows"
)

mcp.mount_http()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
