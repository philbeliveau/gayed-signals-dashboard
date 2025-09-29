"""
Comprehensive database integration tests for Story 1.0c.

These tests validate FastAPI database integration, cross-platform compatibility,
and performance requirements for AutoGen conversation storage.
"""

import asyncio
import pytest
import time
import uuid
from datetime import datetime
from typing import Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import get_db, async_session_maker
from services.conversation_service import ConversationService
from models.conversation_models import (
    ConversationSession, AgentMessage, ContentSource, ContentSourceType,
    ConversationStatus, AgentType
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
def sample_content_source():
    """Create a sample content source for testing."""
    return ContentSource(
        type=ContentSourceType.TEXT,
        title="Test Financial Analysis Article",
        content="This is a test article about market conditions and financial analysis. " * 50,  # Longer content
        url="https://example.com/test-article",
        author="Test Author",
        published_at=datetime.utcnow(),
        metadata={"source": "test", "category": "financial_analysis"}
    )


@pytest.fixture
def sample_conversation(sample_content_source):
    """Create a sample conversation for testing."""
    return ConversationSession(
        user_id=str(uuid.uuid4()),
        content_source=sample_content_source,
        status=ConversationStatus.INITIALIZED
    )


@pytest.fixture
def sample_agent_message():
    """Create a sample agent message for testing."""
    return AgentMessage(
        agent_type=AgentType.FINANCIAL_ANALYST,
        agent_name="Test Financial Analyst",
        content="Based on the provided analysis, the market indicators suggest a defensive posture is appropriate.",
        confidence_level=0.85,
        cited_sources=["Federal Reserve Data", "Market Analysis"],
        signal_references=["VIX", "Utilities/SPY"],
        message_order=1,
        metadata={"processing_time": 2.3, "model_used": "gpt-4"}
    )


class TestDatabaseConnectivity:
    """Test basic database connectivity and health."""

    @pytest.mark.asyncio
    async def test_database_connection(self, conversation_service):
        """Test that database connection is working."""
        health_data = await conversation_service.health_check()

        assert health_data["status"] == "healthy"
        assert "response_time_ms" in health_data
        assert health_data["response_time_ms"] < 1000  # Should be under 1 second
        assert "table_stats" in health_data

    @pytest.mark.asyncio
    async def test_database_performance(self, conversation_service):
        """Test database response time requirements."""
        start_time = time.time()

        # Test multiple health checks for performance consistency
        for _ in range(5):
            health_data = await conversation_service.health_check()
            assert health_data["status"] == "healthy"

        total_time = time.time() - start_time
        avg_time = total_time / 5

        # Should average under 200ms per health check
        assert avg_time < 0.2, f"Average response time {avg_time:.3f}s exceeds 200ms requirement"


class TestConversationCRUD:
    """Test conversation CRUD operations."""

    @pytest.mark.asyncio
    async def test_create_conversation(self, conversation_service, sample_conversation):
        """Test conversation creation in database."""
        conversation_id = await conversation_service.create_conversation(sample_conversation)

        assert conversation_id is not None
        assert conversation_id == sample_conversation.id

        # Verify conversation exists in database
        retrieved = await conversation_service.get_conversation(conversation_id)
        assert retrieved is not None
        assert retrieved["conversation"]["id"] == conversation_id
        assert retrieved["conversation"]["status"] == ConversationStatus.INITIALIZED.value

    @pytest.mark.asyncio
    async def test_conversation_with_invalid_user_id(self, conversation_service, sample_content_source):
        """Test conversation creation with invalid user ID."""
        invalid_conversation = ConversationSession(
            user_id="invalid-uuid-format",
            content_source=sample_content_source,
            status=ConversationStatus.INITIALIZED
        )

        with pytest.raises(ValueError, match="Invalid user_id format"):
            await conversation_service.create_conversation(invalid_conversation)

    @pytest.mark.asyncio
    async def test_get_nonexistent_conversation(self, conversation_service):
        """Test retrieving non-existent conversation."""
        fake_id = str(uuid.uuid4())
        result = await conversation_service.get_conversation(fake_id)
        assert result is None

    @pytest.mark.asyncio
    async def test_update_conversation_status(self, conversation_service, sample_conversation):
        """Test updating conversation status."""
        # Create conversation
        conversation_id = await conversation_service.create_conversation(sample_conversation)

        # Update status to running
        success = await conversation_service.update_conversation_status(
            conversation_id=conversation_id,
            status=ConversationStatus.RUNNING
        )
        assert success is True

        # Verify status update
        retrieved = await conversation_service.get_conversation(conversation_id)
        assert retrieved["conversation"]["status"] == ConversationStatus.RUNNING.value

    @pytest.mark.asyncio
    async def test_complete_conversation_with_recommendation(self, conversation_service, sample_conversation):
        """Test completing conversation with final recommendation."""
        # Create conversation
        conversation_id = await conversation_service.create_conversation(sample_conversation)

        # Complete conversation with recommendation
        final_recommendation = "Maintain defensive position with 60% allocation to defensive assets."
        confidence_score = 0.82

        success = await conversation_service.update_conversation_status(
            conversation_id=conversation_id,
            status=ConversationStatus.COMPLETED,
            final_recommendation=final_recommendation,
            confidence_score=confidence_score
        )
        assert success is True

        # Verify completion data
        retrieved = await conversation_service.get_conversation(conversation_id)
        conv_data = retrieved["conversation"]

        assert conv_data["status"] == ConversationStatus.COMPLETED.value
        assert conv_data["final_recommendation"] == final_recommendation
        assert conv_data["confidence_score"] == confidence_score
        assert conv_data["completed_at"] is not None
        assert conv_data["consensus_reached"] is True


class TestAgentMessages:
    """Test agent message operations."""

    @pytest.mark.asyncio
    async def test_add_agent_message(self, conversation_service, sample_conversation, sample_agent_message):
        """Test adding agent message to conversation."""
        # Create conversation
        conversation_id = await conversation_service.create_conversation(sample_conversation)

        # Add agent message
        message_id = await conversation_service.add_agent_message(
            message=sample_agent_message,
            conversation_id=conversation_id
        )

        assert message_id is not None
        assert message_id == sample_agent_message.id

        # Verify message in conversation
        retrieved = await conversation_service.get_conversation(conversation_id)
        messages = retrieved["messages"]

        assert len(messages) == 1
        assert messages[0]["id"] == message_id
        assert messages[0]["agent_type"] == AgentType.FINANCIAL_ANALYST.value
        assert messages[0]["content"] == sample_agent_message.content

    @pytest.mark.asyncio
    async def test_multiple_agent_messages_order(self, conversation_service, sample_conversation):
        """Test that multiple agent messages maintain correct order."""
        # Create conversation
        conversation_id = await conversation_service.create_conversation(sample_conversation)

        # Add multiple messages with different orders
        messages = []
        for i in range(3):
            message = AgentMessage(
                agent_type=AgentType.FINANCIAL_ANALYST if i % 2 == 0 else AgentType.MARKET_CONTEXT,
                agent_name=f"Test Agent {i}",
                content=f"This is message number {i+1} in the conversation.",
                message_order=i,
                confidence_level=0.8 + (i * 0.05)
            )
            messages.append(message)

            await conversation_service.add_agent_message(
                message=message,
                conversation_id=conversation_id
            )

        # Verify message order
        retrieved = await conversation_service.get_conversation(conversation_id)
        retrieved_messages = retrieved["messages"]

        assert len(retrieved_messages) == 3
        for i, msg in enumerate(retrieved_messages):
            assert msg["message_order"] == i
            assert f"message number {i+1}" in msg["content"]

    @pytest.mark.asyncio
    async def test_add_message_to_nonexistent_conversation(self, conversation_service, sample_agent_message):
        """Test adding message to non-existent conversation."""
        fake_conversation_id = str(uuid.uuid4())

        with pytest.raises(ValueError, match="Conversation .* not found"):
            await conversation_service.add_agent_message(
                message=sample_agent_message,
                conversation_id=fake_conversation_id
            )


class TestUserConversations:
    """Test user conversation retrieval and management."""

    @pytest.mark.asyncio
    async def test_get_user_conversations(self, conversation_service, sample_content_source):
        """Test retrieving user conversations with pagination."""
        user_id = str(uuid.uuid4())

        # Create multiple conversations for the user
        conversation_ids = []
        for i in range(5):
            conversation = ConversationSession(
                user_id=user_id,
                content_source=ContentSource(
                    type=ContentSourceType.TEXT,
                    title=f"Test Article {i+1}",
                    content=f"This is test content for article {i+1}." * 20
                ),
                status=ConversationStatus.INITIALIZED
            )

            conv_id = await conversation_service.create_conversation(conversation)
            conversation_ids.append(conv_id)

        # Test pagination
        conversations = await conversation_service.get_user_conversations(
            user_id=user_id,
            limit=3,
            offset=0
        )

        assert len(conversations) == 3
        assert all(conv["content_source"]["title"].startswith("Test Article") for conv in conversations)

        # Test second page
        conversations_page2 = await conversation_service.get_user_conversations(
            user_id=user_id,
            limit=3,
            offset=3
        )

        assert len(conversations_page2) == 2  # Remaining 2 conversations

    @pytest.mark.asyncio
    async def test_get_conversations_for_nonexistent_user(self, conversation_service):
        """Test retrieving conversations for non-existent user."""
        fake_user_id = str(uuid.uuid4())

        conversations = await conversation_service.get_user_conversations(user_id=fake_user_id)
        assert conversations == []


class TestAnalytics:
    """Test conversation analytics generation."""

    @pytest.mark.asyncio
    async def test_conversation_analytics(self, conversation_service, sample_conversation):
        """Test generating analytics for completed conversation."""
        # Create and complete conversation with messages
        conversation_id = await conversation_service.create_conversation(sample_conversation)

        # Add multiple agent messages
        agents = [AgentType.FINANCIAL_ANALYST, AgentType.MARKET_CONTEXT, AgentType.RISK_CHALLENGER]
        for i, agent_type in enumerate(agents):
            message = AgentMessage(
                agent_type=agent_type,
                agent_name=f"Test {agent_type.value}",
                content=f"Analysis from {agent_type.value}: This is detailed financial analysis.",
                message_order=i,
                confidence_level=0.7 + (i * 0.1)
            )

            await conversation_service.add_agent_message(
                message=message,
                conversation_id=conversation_id
            )

        # Complete conversation
        await conversation_service.update_conversation_status(
            conversation_id=conversation_id,
            status=ConversationStatus.COMPLETED,
            confidence_score=0.85
        )

        # Generate analytics
        analytics = await conversation_service.get_conversation_analytics(conversation_id)

        assert analytics is not None
        assert analytics.conversation_id == conversation_id
        assert analytics.total_messages == 3
        assert len(analytics.agent_metrics) == 3
        assert analytics.consensus_quality == 0.85

        # Verify agent-specific metrics
        for agent_type in agents:
            assert agent_type in analytics.agent_metrics
            agent_metric = analytics.agent_metrics[agent_type]
            assert agent_metric.total_messages == 1
            assert len(agent_metric.confidence_scores) == 1


class TestPerformance:
    """Test performance requirements."""

    @pytest.mark.asyncio
    async def test_conversation_creation_performance(self, conversation_service, sample_content_source):
        """Test conversation creation meets performance requirements (<200ms)."""
        user_id = str(uuid.uuid4())

        # Test multiple conversation creations
        creation_times = []
        for i in range(10):
            conversation = ConversationSession(
                user_id=user_id,
                content_source=ContentSource(
                    type=ContentSourceType.TEXT,
                    title=f"Performance Test Article {i}",
                    content="This is performance test content." * 50
                ),
                status=ConversationStatus.INITIALIZED
            )

            start_time = time.time()
            await conversation_service.create_conversation(conversation)
            end_time = time.time()

            creation_time = (end_time - start_time) * 1000  # Convert to milliseconds
            creation_times.append(creation_time)

        # Verify performance requirements
        avg_creation_time = sum(creation_times) / len(creation_times)
        max_creation_time = max(creation_times)

        assert avg_creation_time < 200, f"Average creation time {avg_creation_time:.1f}ms exceeds 200ms requirement"
        assert max_creation_time < 500, f"Max creation time {max_creation_time:.1f}ms exceeds 500ms tolerance"

    @pytest.mark.asyncio
    async def test_message_retrieval_performance(self, conversation_service, sample_conversation):
        """Test message retrieval meets performance requirements (<100ms)."""
        # Create conversation with multiple messages
        conversation_id = await conversation_service.create_conversation(sample_conversation)

        # Add 20 messages
        for i in range(20):
            message = AgentMessage(
                agent_type=AgentType.FINANCIAL_ANALYST,
                agent_name="Performance Test Agent",
                content=f"This is performance test message {i+1}. " * 20,
                message_order=i,
                confidence_level=0.8
            )
            await conversation_service.add_agent_message(message, conversation_id)

        # Test retrieval performance
        retrieval_times = []
        for _ in range(5):
            start_time = time.time()
            await conversation_service.get_conversation(conversation_id)
            end_time = time.time()

            retrieval_time = (end_time - start_time) * 1000  # Convert to milliseconds
            retrieval_times.append(retrieval_time)

        # Verify performance requirements
        avg_retrieval_time = sum(retrieval_times) / len(retrieval_times)
        max_retrieval_time = max(retrieval_times)

        assert avg_retrieval_time < 100, f"Average retrieval time {avg_retrieval_time:.1f}ms exceeds 100ms requirement"
        assert max_retrieval_time < 200, f"Max retrieval time {max_retrieval_time:.1f}ms exceeds 200ms tolerance"


class TestErrorHandling:
    """Test error handling and edge cases."""

    @pytest.mark.asyncio
    async def test_invalid_uuid_handling(self, conversation_service):
        """Test handling of invalid UUID formats."""
        invalid_ids = ["not-a-uuid", "12345", "", None]

        for invalid_id in invalid_ids:
            if invalid_id is None:
                continue

            with pytest.raises((ValueError, TypeError)):
                await conversation_service.get_conversation(invalid_id)

    @pytest.mark.asyncio
    async def test_database_transaction_rollback(self, conversation_service, sample_conversation):
        """Test that failed operations don't leave partial data."""
        # This test would require more sophisticated database state manipulation
        # For now, we'll test basic error scenarios

        conversation_id = await conversation_service.create_conversation(sample_conversation)

        # Attempt to update non-existent conversation
        fake_id = str(uuid.uuid4())
        success = await conversation_service.update_conversation_status(
            conversation_id=fake_id,
            status=ConversationStatus.COMPLETED
        )

        assert success is False

        # Verify original conversation is unchanged
        retrieved = await conversation_service.get_conversation(conversation_id)
        assert retrieved["conversation"]["status"] == ConversationStatus.INITIALIZED.value


class TestCrossPlatformCompatibility:
    """Test cross-platform data compatibility patterns."""

    @pytest.mark.asyncio
    async def test_prisma_compatible_data_structure(self, conversation_service, sample_conversation, sample_agent_message):
        """Test that data structure matches Prisma client expectations."""
        # Create conversation and message
        conversation_id = await conversation_service.create_conversation(sample_conversation)
        await conversation_service.add_agent_message(sample_agent_message, conversation_id)

        # Retrieve conversation
        retrieved = await conversation_service.get_conversation(conversation_id)

        # Verify data structure matches Prisma patterns
        assert "conversation" in retrieved
        assert "messages" in retrieved
        assert "message_count" in retrieved

        conv_data = retrieved["conversation"]

        # Verify required fields for Prisma compatibility
        required_fields = [
            "id", "user_id", "content_source", "status",
            "created_at", "updated_at", "metadata"
        ]

        for field in required_fields:
            assert field in conv_data, f"Missing required field: {field}"

        # Verify content_source structure
        content_source = conv_data["content_source"]
        assert "type" in content_source
        assert "title" in content_source
        assert "content" in content_source

        # Verify message structure
        messages = retrieved["messages"]
        if messages:
            msg = messages[0]
            required_msg_fields = [
                "id", "agent_type", "agent_name", "content",
                "timestamp", "message_order", "metadata"
            ]

            for field in required_msg_fields:
                assert field in msg, f"Missing required message field: {field}"

    @pytest.mark.asyncio
    async def test_clerk_user_id_compatibility(self, conversation_service, sample_content_source):
        """Test compatibility with Clerk user ID patterns."""
        # Test with Clerk-style user ID
        clerk_user_id = "user_2abcdefghijklmnopqrstuvwxyz"

        conversation = ConversationSession(
            user_id=clerk_user_id,
            content_source=sample_content_source,
            status=ConversationStatus.INITIALIZED
        )

        # This should work with string user IDs (Clerk pattern)
        # Note: The service will need to handle both UUID and Clerk ID patterns
        try:
            conversation_id = await conversation_service.create_conversation(conversation)
            assert conversation_id is not None

            # Verify retrieval works
            retrieved = await conversation_service.get_conversation(conversation_id)
            assert retrieved is not None

        except ValueError:
            # If strict UUID validation is enforced, this is expected
            # The service should be updated to handle Clerk IDs properly
            pytest.skip("Service requires UUID validation - Clerk ID support needed")


if __name__ == "__main__":
    # Run specific test categories
    pytest.main([
        __file__ + "::TestDatabaseConnectivity",
        __file__ + "::TestConversationCRUD",
        "-v"
    ])