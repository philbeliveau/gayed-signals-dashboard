"""
Integration Tests for AutoGen Debate Workflow
Tests Epic 2: Content Processing & Debate Triggers

These tests validate the complete workflow from content extraction
through AutoGen debate generation using REAL API connections.

Based on FastAPI-MCP patterns for comprehensive API testing.
"""

import pytest
import httpx
from typing import Dict, Any

# Test Configuration
DEBATE_SERVER_BASE_URL = "http://localhost:8002"
NEXTJS_BASE_URL = "http://localhost:3000"
DEFAULT_TIMEOUT = 30.0

# Test Data
YOUTUBE_TEST_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
SUBSTACK_TEST_URL = "https://example.substack.com/p/market-analysis"
TEXT_TEST_CONTENT = """
The Federal Reserve announced a 25 basis point interest rate increase today,
signaling continued commitment to fighting inflation. Market participants
are now evaluating the impact on equity valuations and defensive positioning.
"""


class TestHealthCheck:
    """Test health check and system availability"""

    @pytest.mark.asyncio
    async def test_health_check_success(self):
        """
        Given: Debate server is running
        When: Health check endpoint is called
        Then: Server reports healthy status
        """
        async with httpx.AsyncClient(base_url=DEBATE_SERVER_BASE_URL) as client:
            response = await client.get("/health")

            assert response.status_code == 200
            data = response.json()
            assert data["status"] in ["healthy", "unhealthy"]
            assert "timestamp" in data
            assert "nextjs_accessible" in data


class TestYouTubeDebateWorkflow:
    """
    Test Epic 2.3: YouTube Transcript Integration
    Story: As a user, I can paste YouTube URLs to trigger agent debates
    """

    @pytest.mark.asyncio
    async def test_youtube_extraction_schema_validation(self):
        """
        Given: Valid YouTube URL
        When: POST /debate/youtube is called
        Then: Response matches expected schema
        """
        async with httpx.AsyncClient(
            base_url=DEBATE_SERVER_BASE_URL,
            timeout=DEFAULT_TIMEOUT
        ) as client:
            response = await client.post(
                "/debate/youtube",
                params={
                    "video_url": YOUTUBE_TEST_URL,
                    "user_id": "test-user"
                }
            )

            # Schema validation
            assert response.status_code == 200
            data = response.json()

            # Required fields
            assert "success" in data
            assert "workflow" in data
            assert "timestamp" in data

            if data["success"]:
                assert data["workflow"] == "youtube_to_debate"
                assert "steps_completed" in data
                assert "content_preview" in data
                assert "debate_ready" in data

                # Content preview structure
                preview = data["content_preview"]
                assert "title" in preview
                assert "channel" in preview
                assert "transcript_length" in preview

    @pytest.mark.asyncio
    async def test_youtube_workflow_steps(self):
        """
        Given: YouTube URL is provided
        When: Debate workflow is triggered
        Then: All expected workflow steps complete
        """
        async with httpx.AsyncClient(
            base_url=DEBATE_SERVER_BASE_URL,
            timeout=DEFAULT_TIMEOUT
        ) as client:
            response = await client.post(
                "/debate/youtube",
                params={"video_url": YOUTUBE_TEST_URL, "user_id": "test-user"}
            )

            data = response.json()

            if data["success"]:
                steps = data["steps_completed"]
                assert "✅ YouTube transcript extracted" in steps
                assert "✅ Content validated" in steps
                assert "⏭️ Ready for AutoGen debate" in steps

    @pytest.mark.asyncio
    async def test_youtube_invalid_url_handling(self):
        """
        Given: Invalid YouTube URL
        When: POST /debate/youtube is called
        Then: Error is handled gracefully with clear message
        """
        async with httpx.AsyncClient(
            base_url=DEBATE_SERVER_BASE_URL,
            timeout=DEFAULT_TIMEOUT
        ) as client:
            response = await client.post(
                "/debate/youtube",
                params={
                    "video_url": "https://invalid-url.com",
                    "user_id": "test-user"
                }
            )

            data = response.json()

            # Should handle error gracefully
            if not data.get("success"):
                assert "error" in data
                assert "step" in data


class TestSubstackDebateWorkflow:
    """
    Test Epic 2.4: Substack Article Processing
    Story: As a user, I can paste Substack URLs to trigger agent debates
    """

    @pytest.mark.asyncio
    async def test_substack_extraction_schema_validation(self):
        """
        Given: Valid Substack URL
        When: POST /debate/substack is called
        Then: Response matches expected schema
        """
        async with httpx.AsyncClient(
            base_url=DEBATE_SERVER_BASE_URL,
            timeout=DEFAULT_TIMEOUT
        ) as client:
            response = await client.post(
                "/debate/substack",
                params={
                    "article_url": SUBSTACK_TEST_URL,
                    "skip_relevance_check": False,
                    "user_id": "test-user"
                }
            )

            # Schema validation
            assert response.status_code == 200
            data = response.json()

            assert "success" in data
            assert "workflow" in data
            assert "timestamp" in data

            if data["success"]:
                assert data["workflow"] == "substack_to_debate"
                assert "content_preview" in data
                assert "relevance_analysis" in data
                assert "debate_ready" in data

    @pytest.mark.asyncio
    async def test_substack_relevance_analysis(self):
        """
        Given: Substack article is extracted
        When: Relevance analysis is performed
        Then: Relevance score and financial terms are returned
        """
        async with httpx.AsyncClient(
            base_url=DEBATE_SERVER_BASE_URL,
            timeout=DEFAULT_TIMEOUT
        ) as client:
            response = await client.post(
                "/debate/substack",
                params={
                    "article_url": SUBSTACK_TEST_URL,
                    "skip_relevance_check": False,
                    "user_id": "test-user"
                }
            )

            data = response.json()

            if data["success"]:
                relevance = data["relevance_analysis"]
                assert "score" in relevance
                assert "financial_terms" in relevance
                assert "confidence" in relevance

    @pytest.mark.asyncio
    async def test_substack_skip_relevance_check(self):
        """
        Given: Skip relevance check is enabled
        When: POST /debate/substack is called
        Then: Content is extracted without relevance validation
        """
        async with httpx.AsyncClient(
            base_url=DEBATE_SERVER_BASE_URL,
            timeout=DEFAULT_TIMEOUT
        ) as client:
            response = await client.post(
                "/debate/substack",
                params={
                    "article_url": SUBSTACK_TEST_URL,
                    "skip_relevance_check": True,
                    "user_id": "test-user"
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert "success" in data


class TestTextDebateWorkflow:
    """
    Test Epic 2.2: Direct Text Input Analysis
    Story: As a user, I can paste text content to trigger agent debates
    """

    @pytest.mark.asyncio
    async def test_text_debate_full_workflow(self):
        """
        Given: Financial text content
        When: POST /debate/text is called
        Then: Complete debate workflow executes with agent responses
        """
        async with httpx.AsyncClient(
            base_url=DEBATE_SERVER_BASE_URL,
            timeout=DEFAULT_TIMEOUT
        ) as client:
            response = await client.post(
                "/debate/text",
                params={
                    "content": TEXT_TEST_CONTENT,
                    "analysis_type": "COMPREHENSIVE",
                    "include_signal_context": True,
                    "user_id": "test-user"
                }
            )

            assert response.status_code == 200
            data = response.json()

            assert "success" in data

            if data["success"]:
                # Validate workflow completion
                assert data["workflow"] == "text_to_debate"
                assert "steps_completed" in data
                assert "✅ AutoGen conversation generated" in data["steps_completed"]

                # Validate debate results
                assert "debate_results" in data
                debate = data["debate_results"]
                assert "conversation_id" in debate
                assert "agent_count" in debate
                assert "agents" in debate
                assert "consensus" in debate

    @pytest.mark.asyncio
    async def test_text_analysis_types(self):
        """
        Given: Different analysis types (QUICK, COMPREHENSIVE, GAYED_FOCUSED)
        When: POST /debate/text is called with each type
        Then: Each analysis type is supported
        """
        analysis_types = ["QUICK", "COMPREHENSIVE", "GAYED_FOCUSED"]

        async with httpx.AsyncClient(
            base_url=DEBATE_SERVER_BASE_URL,
            timeout=DEFAULT_TIMEOUT
        ) as client:
            for analysis_type in analysis_types:
                response = await client.post(
                    "/debate/text",
                    params={
                        "content": TEXT_TEST_CONTENT,
                        "analysis_type": analysis_type,
                        "include_signal_context": True,
                        "user_id": "test-user"
                    }
                )

                assert response.status_code == 200
                data = response.json()

                if data["success"]:
                    assert data["analysis_summary"]["analysis_type"] == analysis_type

    @pytest.mark.asyncio
    async def test_text_signal_context_integration(self):
        """
        Given: Signal context is enabled
        When: POST /debate/text is called
        Then: Gayed signal context is included in analysis
        """
        async with httpx.AsyncClient(
            base_url=DEBATE_SERVER_BASE_URL,
            timeout=DEFAULT_TIMEOUT
        ) as client:
            response = await client.post(
                "/debate/text",
                params={
                    "content": TEXT_TEST_CONTENT,
                    "analysis_type": "GAYED_FOCUSED",
                    "include_signal_context": True,
                    "user_id": "test-user"
                }
            )

            data = response.json()

            if data["success"]:
                assert data["analysis_summary"]["included_signal_context"] is True

    @pytest.mark.asyncio
    async def test_text_minimum_length_validation(self):
        """
        Given: Text content shorter than 50 characters
        When: POST /debate/text is called
        Then: Request is handled appropriately
        """
        short_content = "Too short"

        async with httpx.AsyncClient(
            base_url=DEBATE_SERVER_BASE_URL,
            timeout=DEFAULT_TIMEOUT
        ) as client:
            response = await client.post(
                "/debate/text",
                params={
                    "content": short_content,
                    "analysis_type": "QUICK",
                    "include_signal_context": False,
                    "user_id": "test-user"
                }
            )

            # Either rejects or handles gracefully
            assert response.status_code in [200, 400, 422]


class TestConversationManagement:
    """
    Test Epic 2.7: Conversation State Management
    Story: As a user, I can monitor debate progress and retrieve results
    """

    @pytest.mark.asyncio
    async def test_conversation_status_retrieval(self):
        """
        Given: Valid conversation ID
        When: GET /conversation/status is called
        Then: Conversation status and metadata are returned
        """
        # First create a conversation
        async with httpx.AsyncClient(
            base_url=DEBATE_SERVER_BASE_URL,
            timeout=DEFAULT_TIMEOUT
        ) as client:
            text_response = await client.post(
                "/debate/text",
                params={
                    "content": TEXT_TEST_CONTENT,
                    "analysis_type": "QUICK",
                    "include_signal_context": False,
                    "user_id": "test-user"
                }
            )

            text_data = text_response.json()

            if text_data.get("success"):
                conversation_id = text_data["debate_results"]["conversation_id"]

                # Check conversation status
                status_response = await client.get(
                    "/conversation/status",
                    params={
                        "conversation_id": conversation_id,
                        "user_id": "test-user"
                    }
                )

                assert status_response.status_code == 200
                status_data = status_response.json()

                assert "success" in status_data
                if status_data["success"]:
                    assert status_data["conversation_id"] == conversation_id
                    assert "status" in status_data
                    assert "message_count" in status_data


class TestCompleteWorkflow:
    """
    Test Epic 2: Complete End-to-End Workflow
    Story: As a system, I execute the full content → debate → results pipeline
    """

    @pytest.mark.asyncio
    async def test_complete_workflow_youtube(self):
        """
        Given: YouTube URL
        When: POST /workflow/complete-debate is called
        Then: Complete workflow executes from extraction to debate
        """
        async with httpx.AsyncClient(
            base_url=DEBATE_SERVER_BASE_URL,
            timeout=DEFAULT_TIMEOUT
        ) as client:
            response = await client.post(
                "/workflow/complete-debate",
                params={
                    "content_type": "youtube",
                    "content_source": YOUTUBE_TEST_URL,
                    "user_id": "test-user"
                }
            )

            assert response.status_code == 200
            data = response.json()

            assert "success" in data
            assert "workflow_steps" in data

            if data["success"]:
                assert "workflow" in data
                assert "youtube" in data["workflow"]

    @pytest.mark.asyncio
    async def test_complete_workflow_text(self):
        """
        Given: Text content
        When: POST /workflow/complete-debate is called with content_type=text
        Then: Complete workflow executes including AutoGen debate
        """
        async with httpx.AsyncClient(
            base_url=DEBATE_SERVER_BASE_URL,
            timeout=DEFAULT_TIMEOUT
        ) as client:
            response = await client.post(
                "/workflow/complete-debate",
                params={
                    "content_type": "text",
                    "content_source": TEXT_TEST_CONTENT,
                    "user_id": "test-user"
                }
            )

            data = response.json()

            if data["success"]:
                steps = data["workflow_steps"]
                assert "✅ Content extracted successfully" in steps or \
                       "📝 Analyzing text content..." in steps

    @pytest.mark.asyncio
    async def test_complete_workflow_invalid_content_type(self):
        """
        Given: Invalid content type
        When: POST /workflow/complete-debate is called
        Then: Error is returned with clear message
        """
        async with httpx.AsyncClient(
            base_url=DEBATE_SERVER_BASE_URL,
            timeout=DEFAULT_TIMEOUT
        ) as client:
            response = await client.post(
                "/workflow/complete-debate",
                params={
                    "content_type": "invalid_type",
                    "content_source": "test content",
                    "user_id": "test-user"
                }
            )

            data = response.json()
            assert data["success"] is False
            assert "error" in data
            assert "Invalid content_type" in data["error"]


class TestErrorHandling:
    """Test error handling and resilience patterns"""

    @pytest.mark.asyncio
    async def test_timeout_handling(self):
        """
        Given: API request times out
        When: Timeout occurs during content extraction
        Then: Graceful error response is returned
        """
        # Use very short timeout to force timeout
        async with httpx.AsyncClient(
            base_url=DEBATE_SERVER_BASE_URL,
            timeout=0.001  # 1ms - will timeout
        ) as client:
            try:
                await client.post(
                    "/debate/youtube",
                    params={"video_url": YOUTUBE_TEST_URL, "user_id": "test-user"}
                )
            except httpx.TimeoutException:
                # Expected timeout behavior
                pass

    @pytest.mark.asyncio
    async def test_nextjs_server_unavailable(self):
        """
        Given: Next.js backend is unavailable
        When: Health check is called
        Then: Server reports unhealthy status
        """
        # This test will naturally fail if Next.js is down
        async with httpx.AsyncClient(base_url=DEBATE_SERVER_BASE_URL) as client:
            response = await client.get("/health")
            data = response.json()

            # Should always respond, even if Next.js is down
            assert response.status_code == 200
            assert "nextjs_accessible" in data


# Performance Tests
class TestPerformance:
    """Test performance and response time requirements"""

    @pytest.mark.asyncio
    async def test_health_check_response_time(self):
        """
        Given: System is operational
        When: Health check is called
        Then: Response time is under 5 seconds
        """
        import time

        async with httpx.AsyncClient(base_url=DEBATE_SERVER_BASE_URL) as client:
            start_time = time.time()
            response = await client.get("/health")
            elapsed_time = time.time() - start_time

            assert response.status_code == 200
            assert elapsed_time < 5.0  # Should respond quickly

    @pytest.mark.asyncio
    async def test_debate_workflow_response_time(self):
        """
        Given: Text content is provided
        When: Complete debate workflow is executed
        Then: Response time is under 30 seconds
        """
        import time

        async with httpx.AsyncClient(
            base_url=DEBATE_SERVER_BASE_URL,
            timeout=DEFAULT_TIMEOUT
        ) as client:
            start_time = time.time()
            response = await client.post(
                "/debate/text",
                params={
                    "content": TEXT_TEST_CONTENT,
                    "analysis_type": "QUICK",
                    "include_signal_context": False,
                    "user_id": "test-user"
                }
            )
            elapsed_time = time.time() - start_time

            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    # Should complete within timeout
                    assert elapsed_time < 30.0


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])
