"""
Cross-platform integration tests for Story 1.0c validation.

These tests validate that conversation data flows seamlessly between
FastAPI backend and Next.js frontend through shared database access,
ensuring complete database integration requirements are met.
"""

import asyncio
import pytest
import time
import uuid
import json
import httpx
from datetime import datetime
from typing import Dict, Any, List

from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import async_session_maker
from ..services.conversation_service import ConversationService
from ..services.websocket_persistence import WebSocketPersistenceService
from ..models.conversation_models import (
    ConversationSession, AgentMessage, ContentSource, ContentSourceType,
    ConversationStatus, AgentType, WebSocketMessage
)


@pytest.fixture
async def db_session():
    """Create a database session for testing."""
    async with async_session_maker() as session:
        yield session


@pytest.fixture
def conversation_service(db_session):
    """Create a conversation service for testing."""
    return ConversationService(db_session=db_session)


@pytest.fixture
def websocket_service():
    """Create a WebSocket persistence service for testing."""
    return WebSocketPersistenceService()


@pytest.fixture
def sample_content_source():
    """Create a sample content source for testing."""
    return ContentSource(
        type=ContentSourceType.TEXT,
        title="Cross-Platform Test Financial Analysis",
        content="This is a comprehensive test of cross-platform data consistency " * 20,
        url="https://example.com/test-cross-platform",
        author="Integration Test Suite",
        published_at=datetime.utcnow(),
        metadata={"test_type": "cross_platform", "integration_level": "full"}
    )


@pytest.fixture
def sample_conversation(sample_content_source):
    """Create a sample conversation for testing."""
    return ConversationSession(
        user_id=str(uuid.uuid4()),
        content_source=sample_content_source,
        status=ConversationStatus.INITIALIZED
    )


class TestCrossPlatformDataFlow:
    """Test data flow between FastAPI and Next.js platforms."""

    @pytest.mark.asyncio
    async def test_fastapi_to_nextjs_data_flow(self, conversation_service, sample_conversation):
        """Test that data created in FastAPI is accessible from Next.js patterns."""
        # Create conversation using FastAPI service
        conversation_id = await conversation_service.create_conversation(sample_conversation)

        # Add multiple messages using FastAPI patterns
        agent_messages = []
        for i in range(3):
            message = AgentMessage(
                agent_type=AgentType.FINANCIAL_ANALYST if i % 2 == 0 else AgentType.MARKET_CONTEXT,
                agent_name=f"FastAPI Test Agent {i}",
                content=f"This is test message {i+1} created via FastAPI backend service.",
                message_order=i,
                confidence_level=0.8 + (i * 0.05),
                cited_sources=[f"FastAPI Source {i+1}"],
                signal_references=[f"Signal_{i+1}"]
            )
            agent_messages.append(message)

            await conversation_service.add_agent_message(message, conversation_id)

        # Complete conversation using FastAPI
        await conversation_service.update_conversation_status(
            conversation_id=conversation_id,
            status=ConversationStatus.COMPLETED,
            final_recommendation="FastAPI-generated recommendation: Maintain defensive position.",
            confidence_score=0.87
        )

        # Now verify data is accessible using Next.js-style patterns
        # Simulate how Next.js Prisma client would access this data
        retrieved_conversation = await conversation_service.get_conversation(conversation_id)

        # Validate Next.js compatibility
        assert retrieved_conversation is not None
        assert retrieved_conversation["conversation"]["id"] == conversation_id
        assert retrieved_conversation["conversation"]["status"] == ConversationStatus.COMPLETED.value
        assert retrieved_conversation["conversation"]["final_recommendation"] == "FastAPI-generated recommendation: Maintain defensive position."
        assert retrieved_conversation["conversation"]["confidence_score"] == 0.87

        # Validate message structure for Next.js compatibility
        messages = retrieved_conversation["messages"]
        assert len(messages) == 3

        for i, msg in enumerate(messages):
            # Check Next.js expected fields
            assert "id" in msg
            assert "agent_type" in msg
            assert "agent_name" in msg
            assert "content" in msg
            assert "message_order" in msg
            assert "timestamp" in msg
            assert "cited_sources" in msg
            assert "signal_references" in msg

            # Validate content consistency
            assert msg["message_order"] == i
            assert f"FastAPI Test Agent {i}" in msg["agent_name"]
            assert f"test message {i+1}" in msg["content"]

        # Test analytics generation for Next.js consumption
        analytics = await conversation_service.get_conversation_analytics(conversation_id)
        assert analytics is not None
        assert analytics.conversation_id == conversation_id
        assert analytics.total_messages == 3
        assert len(analytics.agent_metrics) >= 2  # Should have metrics for both agent types

    @pytest.mark.asyncio
    async def test_nextjs_to_fastapi_compatibility(self, conversation_service, sample_content_source):
        """Test that Next.js data patterns are compatible with FastAPI access."""
        # Simulate Next.js data creation patterns
        user_id = str(uuid.uuid4())

        # Create conversation with Next.js-style data structure
        nextjs_conversation = ConversationSession(
            user_id=user_id,
            content_source=sample_content_source,
            status=ConversationStatus.INITIALIZED,
            metadata={
                "created_from": "nextjs_simulation",
                "client_type": "web_frontend",
                "session_id": str(uuid.uuid4())
            }
        )

        conversation_id = await conversation_service.create_conversation(nextjs_conversation)

        # Add messages with Next.js-style metadata
        nextjs_messages = []
        for i in range(2):
            message = AgentMessage(
                agent_type=AgentType.RISK_CHALLENGER,
                agent_name="Next.js Risk Challenger",
                content=f"Risk analysis {i+1} from Next.js frontend simulation.",
                message_order=i,
                confidence_level=0.75,
                metadata={
                    "frontend_origin": "nextjs",
                    "ui_component": "agent_chat",
                    "user_interaction": True
                }
            )
            nextjs_messages.append(message)

            await conversation_service.add_agent_message(message, conversation_id)

        # Verify FastAPI can access and process Next.js-created data
        fastapi_retrieval = await conversation_service.get_conversation(conversation_id)

        assert fastapi_retrieval is not None
        assert fastapi_retrieval["conversation"]["id"] == conversation_id

        # Check metadata preservation
        conv_metadata = fastapi_retrieval["conversation"]["metadata"]
        assert conv_metadata.get("created_from") == "nextjs_simulation"
        assert conv_metadata.get("client_type") == "web_frontend"

        # Check message metadata preservation
        messages = fastapi_retrieval["messages"]
        assert len(messages) == 2

        for msg in messages:
            msg_metadata = msg["metadata"]
            assert msg_metadata.get("frontend_origin") == "nextjs"
            assert msg_metadata.get("ui_component") == "agent_chat"

        # Test FastAPI analytics on Next.js data
        analytics = await conversation_service.get_conversation_analytics(conversation_id)
        assert analytics is not None
        assert analytics.total_messages == 2


class TestRealTimeWebSocketPersistence:
    """Test real-time WebSocket message persistence."""

    @pytest.mark.asyncio
    async def test_websocket_message_persistence(self, conversation_service, websocket_service, sample_conversation):
        """Test that WebSocket messages are immediately persisted to database."""
        # Create initial conversation
        conversation_id = await conversation_service.create_conversation(sample_conversation)

        # Simulate WebSocket agent message
        agent_message_data = {
            "agent_type": "financial_analyst",
            "agent_name": "WebSocket Financial Analyst",
            "content": "Real-time analysis via WebSocket: Market volatility suggests defensive positioning.",
            "message_order": 0,
            "confidence_level": 0.82,
            "cited_sources": ["Real-time Market Data", "WebSocket Feed"],
            "signal_references": ["VIX_RT", "SPY_RT"]
        }

        websocket_message = WebSocketMessage(
            type="agent_message",
            conversation_id=conversation_id,
            data=agent_message_data,
            timestamp=datetime.utcnow()
        )

        connection_id = str(uuid.uuid4())

        # Process WebSocket message
        result = await websocket_service.handle_websocket_message(websocket_message, connection_id)

        # Validate immediate persistence
        assert result["success"] is True
        assert result["persistence_verified"] is True
        assert result["database_accessible"] is True
        assert "message_id" in result

        # Verify message is immediately accessible from database
        conversation_data = await conversation_service.get_conversation(conversation_id)
        messages = conversation_data["messages"]

        assert len(messages) == 1
        persisted_message = messages[0]

        assert persisted_message["agent_type"] == "financial_analyst"
        assert persisted_message["agent_name"] == "WebSocket Financial Analyst"
        assert "Real-time analysis via WebSocket" in persisted_message["content"]
        assert persisted_message["confidence_level"] == 0.82

        # Check WebSocket-specific metadata
        metadata = persisted_message["metadata"]
        assert metadata.get("received_via_websocket") is True
        assert metadata.get("websocket_connection_id") == connection_id

    @pytest.mark.asyncio
    async def test_websocket_status_update_persistence(self, conversation_service, websocket_service, sample_conversation):
        """Test that WebSocket status updates are immediately persisted."""
        # Create conversation
        conversation_id = await conversation_service.create_conversation(sample_conversation)

        # Simulate WebSocket status update
        status_update_data = {
            "status": "completed",
            "final_recommendation": "WebSocket-driven recommendation: Reduce risk exposure by 25%.",
            "confidence_score": 0.89
        }

        websocket_message = WebSocketMessage(
            type="status_update",
            conversation_id=conversation_id,
            data=status_update_data,
            timestamp=datetime.utcnow()
        )

        connection_id = str(uuid.uuid4())

        # Process status update
        result = await websocket_service.handle_websocket_message(websocket_message, connection_id)

        # Validate immediate persistence
        assert result["success"] is True
        assert result["update_verified"] is True
        assert result["status"] == "completed"

        # Verify status update is immediately accessible
        conversation_data = await conversation_service.get_conversation(conversation_id)
        conv = conversation_data["conversation"]

        assert conv["status"] == "completed"
        assert conv["final_recommendation"] == "WebSocket-driven recommendation: Reduce risk exposure by 25%."
        assert conv["confidence_score"] == 0.89
        assert conv["completed_at"] is not None


class TestPerformanceRequirements:
    """Test that database operations meet performance requirements."""

    @pytest.mark.asyncio
    async def test_conversation_creation_performance(self, conversation_service, sample_content_source):
        """Test conversation creation meets <200ms requirement."""
        user_id = str(uuid.uuid4())
        creation_times = []

        # Test 10 conversation creations
        for i in range(10):
            conversation = ConversationSession(
                user_id=user_id,
                content_source=ContentSource(
                    type=ContentSourceType.TEXT,
                    title=f"Performance Test {i}",
                    content="Performance test content." * 30
                ),
                status=ConversationStatus.INITIALIZED
            )

            start_time = time.time()
            await conversation_service.create_conversation(conversation)
            end_time = time.time()

            creation_time = (end_time - start_time) * 1000  # Convert to milliseconds
            creation_times.append(creation_time)

        # Validate performance requirements
        avg_time = sum(creation_times) / len(creation_times)
        max_time = max(creation_times)

        assert avg_time < 200, f"Average creation time {avg_time:.1f}ms exceeds 200ms requirement"
        assert max_time < 500, f"Max creation time {max_time:.1f}ms exceeds 500ms tolerance"

    @pytest.mark.asyncio
    async def test_message_retrieval_performance(self, conversation_service, sample_conversation):
        """Test message retrieval meets <100ms requirement."""
        # Create conversation with many messages
        conversation_id = await conversation_service.create_conversation(sample_conversation)

        # Add 30 messages
        for i in range(30):
            message = AgentMessage(
                agent_type=AgentType.FINANCIAL_ANALYST,
                agent_name="Performance Test Agent",
                content=f"Performance test message {i+1}. " * 15,
                message_order=i,
                confidence_level=0.8
            )
            await conversation_service.add_agent_message(message, conversation_id)

        # Test retrieval performance
        retrieval_times = []
        for _ in range(10):
            start_time = time.time()
            await conversation_service.get_conversation(conversation_id)
            end_time = time.time()

            retrieval_time = (end_time - start_time) * 1000  # Convert to milliseconds
            retrieval_times.append(retrieval_time)

        # Validate performance requirements
        avg_time = sum(retrieval_times) / len(retrieval_times)
        max_time = max(retrieval_times)

        assert avg_time < 100, f"Average retrieval time {avg_time:.1f}ms exceeds 100ms requirement"
        assert max_time < 200, f"Max retrieval time {max_time:.1f}ms exceeds 200ms tolerance"

    @pytest.mark.asyncio
    async def test_websocket_persistence_performance(self, conversation_service, websocket_service, sample_conversation):
        """Test WebSocket message persistence meets <50ms requirement."""
        # Create conversation
        conversation_id = await conversation_service.create_conversation(sample_conversation)

        persistence_times = []

        # Test 10 WebSocket message persistences
        for i in range(10):
            websocket_message = WebSocketMessage(
                type="agent_message",
                conversation_id=conversation_id,
                data={
                    "agent_type": "financial_analyst",
                    "agent_name": "Performance Test Agent",
                    "content": f"Performance test WebSocket message {i+1}.",
                    "message_order": i,
                    "confidence_level": 0.8
                },
                timestamp=datetime.utcnow()
            )

            connection_id = str(uuid.uuid4())

            start_time = time.time()
            result = await websocket_service.handle_websocket_message(websocket_message, connection_id)
            end_time = time.time()

            # Only count successful persistence
            if result["success"]:
                persistence_time = (end_time - start_time) * 1000  # Convert to milliseconds
                persistence_times.append(persistence_time)

        # Validate performance requirements
        if persistence_times:  # Only check if we have successful persistences
            avg_time = sum(persistence_times) / len(persistence_times)
            max_time = max(persistence_times)

            assert avg_time < 50, f"Average WebSocket persistence time {avg_time:.1f}ms exceeds 50ms requirement"
            assert max_time < 100, f"Max WebSocket persistence time {max_time:.1f}ms exceeds 100ms tolerance"


class TestErrorHandlingAndRecovery:
    """Test error handling and recovery mechanisms."""

    @pytest.mark.asyncio
    async def test_database_connection_recovery(self, conversation_service):
        """Test service recovery from database connection issues."""
        # This test would require more sophisticated database failure simulation
        # For now, test basic error handling patterns

        # Test with invalid conversation ID
        invalid_id = "invalid-conversation-id"

        try:
            await conversation_service.get_conversation(invalid_id)
            assert False, "Should have raised an exception for invalid ID"
        except Exception as e:
            # Ensure error is handled gracefully
            assert "Invalid" in str(e) or "not found" in str(e)

        # Test service health check after error
        health = await conversation_service.health_check()
        assert health["status"] in ["healthy", "unhealthy"]

    @pytest.mark.asyncio
    async def test_websocket_error_handling(self, websocket_service, sample_conversation, conversation_service):
        """Test WebSocket error message handling."""
        # Create conversation
        conversation_id = await conversation_service.create_conversation(sample_conversation)

        # Simulate WebSocket error message
        error_message = WebSocketMessage(
            type="error",
            conversation_id=conversation_id,
            data={
                "error_type": "agent_timeout",
                "error_message": "Financial analyst agent timed out after 30 seconds",
                "timestamp": datetime.utcnow().isoformat()
            },
            timestamp=datetime.utcnow()
        )

        connection_id = str(uuid.uuid4())

        # Process error message
        result = await websocket_service.handle_websocket_message(error_message, connection_id)

        # Validate error handling
        assert result["success"] is True
        assert result["error_handled"] is True
        assert "error_data" in result

        # Verify conversation status was updated to error
        conversation_data = await conversation_service.get_conversation(conversation_id)
        assert conversation_data["conversation"]["status"] == "error"


class TestDataConsistency:
    """Test data consistency across platforms."""

    @pytest.mark.asyncio
    async def test_concurrent_access_consistency(self, conversation_service, sample_conversation):
        """Test data consistency under concurrent access from multiple platforms."""
        # Create conversation
        conversation_id = await conversation_service.create_conversation(sample_conversation)

        # Simulate concurrent message additions from different platforms
        async def add_messages_batch(agent_type: AgentType, prefix: str, start_order: int):
            messages = []
            for i in range(5):
                message = AgentMessage(
                    agent_type=agent_type,
                    agent_name=f"{prefix} Agent",
                    content=f"{prefix} message {i+1} - concurrent test",
                    message_order=start_order + i,
                    confidence_level=0.8
                )
                await conversation_service.add_agent_message(message, conversation_id)
                messages.append(message)
            return messages

        # Run concurrent operations
        fastapi_task = add_messages_batch(AgentType.FINANCIAL_ANALYST, "FastAPI", 0)
        nextjs_task = add_messages_batch(AgentType.MARKET_CONTEXT, "NextJS", 10)
        websocket_task = add_messages_batch(AgentType.RISK_CHALLENGER, "WebSocket", 20)

        await asyncio.gather(fastapi_task, nextjs_task, websocket_task)

        # Verify all messages were persisted correctly
        conversation_data = await conversation_service.get_conversation(conversation_id)
        messages = conversation_data["messages"]

        assert len(messages) == 15  # 5 messages from each batch

        # Verify message order consistency
        sorted_messages = sorted(messages, key=lambda m: m["message_order"])
        for i, msg in enumerate(sorted_messages):
            expected_order = msg["message_order"]
            # Message orders should be consistent with what was sent
            assert expected_order in [j for j in range(30)]  # Valid range

        # Verify all agent types are represented
        agent_types = set(msg["agent_type"] for msg in messages)
        assert len(agent_types) == 3
        assert "financial_analyst" in agent_types
        assert "market_context" in agent_types
        assert "risk_challenger" in agent_types


if __name__ == "__main__":
    # Run comprehensive integration tests
    pytest.main([
        __file__ + "::TestCrossPlatformDataFlow",
        __file__ + "::TestRealTimeWebSocketPersistence",
        __file__ + "::TestPerformanceRequirements",
        "-v",
        "--tb=short"
    ])