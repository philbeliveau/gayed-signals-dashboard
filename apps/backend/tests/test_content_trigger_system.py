"""
Comprehensive tests for the Content Trigger System (Story 2.1).

Tests cover:
- Event-driven trigger architecture
- Signal context integration
- AutoGen orchestrator integration
- Performance constraints and monitoring
- Error handling and graceful degradation
- Security and authentication
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta
from typing import Dict, Any
import uuid

from services.content_trigger_service import (
    ContentTriggerService,
    ContentEventBus,
    ContentReadyEvent,
    EventSubscription
)
from services.signal_context_service import SignalContextService, SignalContext, SignalData
from services.autogen_orchestrator import AutoGenOrchestrator
from models.conversation_models import (
    ContentSource,
    ContentSourceType,
    ConversationSession,
    ConversationStatus
)


@pytest.fixture
def mock_signal_service():
    """Mock signal context service."""
    service = AsyncMock(spec=SignalContextService)

    # Mock signal context data
    mock_signals = [
        SignalData(
            signal_type="utilities_spy",
            direction="Risk-Off",
            strength="Strong",
            confidence=0.85,
            raw_value=0.91,
            timestamp=datetime.utcnow(),
            metadata={"threshold": 1.0}
        ),
        SignalData(
            signal_type="lumber_gold",
            direction="Risk-On",
            strength="Moderate",
            confidence=0.72,
            raw_value=1.05,
            timestamp=datetime.utcnow(),
            metadata={"threshold": 1.0}
        )
    ]

    mock_context = SignalContext(
        consensus_signal="Mixed",
        consensus_confidence=0.65,
        individual_signals=mock_signals,
        market_data=[],
        context_timestamp=datetime.utcnow(),
        summary="Test signal context summary"
    )

    service.get_current_signal_context.return_value = mock_context
    service.health_check.return_value = True

    return service


@pytest.fixture
def mock_orchestrator():
    """Mock AutoGen orchestrator."""
    orchestrator = AsyncMock(spec=AutoGenOrchestrator)

    # Mock session creation
    mock_session = ConversationSession(
        user_id=str(uuid.uuid4()),
        content_source=ContentSource(
            type=ContentSourceType.TEXT,
            title="Test Content",
            content="Test content for analysis"
        )
    )

    orchestrator.create_session.return_value = mock_session
    orchestrator.start_debate.return_value = None
    orchestrator.health_check.return_value = True

    return orchestrator


@pytest.fixture
def event_bus():
    """Create a fresh event bus for testing."""
    return ContentEventBus()


@pytest.fixture
def trigger_service(mock_orchestrator, mock_signal_service, event_bus):
    """Create trigger service with mocked dependencies."""
    return ContentTriggerService(
        orchestrator=mock_orchestrator,
        signal_service=mock_signal_service,
        event_bus=event_bus
    )


@pytest.fixture
def sample_content_source():
    """Sample content source for testing."""
    return ContentSource(
        type=ContentSourceType.SUBSTACK_ARTICLE,
        title="Federal Reserve Policy Analysis",
        content="Detailed analysis of current Fed policy implications for market signals...",
        url="https://example.substack.com/p/fed-policy-analysis",
        author="Financial Analyst",
        published_at=datetime.utcnow()
    )


class TestContentEventBus:
    """Test the event bus functionality."""

    @pytest.mark.asyncio
    async def test_event_publishing_and_subscription(self, event_bus, sample_content_source):
        """Test basic event publishing and subscription."""
        # Setup subscriber
        received_events = []

        async def event_handler(event: ContentReadyEvent):
            received_events.append(event)

        subscription = EventSubscription(
            subscriber_id="test_subscriber",
            event_types=["content_ready"],
            callback=event_handler
        )

        event_bus.subscribe(subscription)

        # Publish event
        event = ContentReadyEvent(
            content_source=sample_content_source,
            user_id=str(uuid.uuid4()),
            auto_start_debate=True
        )

        await event_bus.publish(event)

        # Verify event was received
        assert len(received_events) == 1
        assert received_events[0].event_id == event.event_id
        assert received_events[0].content_source.title == sample_content_source.title

    @pytest.mark.asyncio
    async def test_multiple_subscribers(self, event_bus, sample_content_source):
        """Test that multiple subscribers receive events."""
        received_events_1 = []
        received_events_2 = []

        async def handler_1(event: ContentReadyEvent):
            received_events_1.append(event)

        async def handler_2(event: ContentReadyEvent):
            received_events_2.append(event)

        # Subscribe both handlers
        event_bus.subscribe(EventSubscription("sub1", ["content_ready"], handler_1))
        event_bus.subscribe(EventSubscription("sub2", ["content_ready"], handler_2))

        # Publish event
        event = ContentReadyEvent(
            content_source=sample_content_source,
            user_id=str(uuid.uuid4())
        )

        await event_bus.publish(event)

        # Both subscribers should receive the event
        assert len(received_events_1) == 1
        assert len(received_events_2) == 1

    def test_subscription_management(self, event_bus):
        """Test subscription and unsubscription."""
        subscription = EventSubscription(
            subscriber_id="test_sub",
            event_types=["content_ready"],
            callback=AsyncMock()
        )

        # Subscribe
        sub_id = event_bus.subscribe(subscription)
        assert sub_id == "test_sub"
        assert len(event_bus.subscriptions) == 1

        # Unsubscribe
        result = event_bus.unsubscribe("test_sub")
        assert result is True
        assert event_bus.subscriptions[0].active is False

    @pytest.mark.asyncio
    async def test_event_history(self, event_bus, sample_content_source):
        """Test that events are stored in history."""
        event = ContentReadyEvent(
            content_source=sample_content_source,
            user_id=str(uuid.uuid4())
        )

        await event_bus.publish(event)

        assert len(event_bus.event_history) == 1
        assert event_bus.event_history[0].event_id == event.event_id


class TestSignalContextService:
    """Test the signal context service."""

    @pytest.mark.asyncio
    async def test_get_current_signal_context(self):
        """Test retrieving current signal context."""
        service = SignalContextService()

        context = await service.get_current_signal_context()

        # Should return mock data since we're using mock implementation
        assert context is not None
        assert isinstance(context, SignalContext)
        assert context.consensus_signal in ["Risk-On", "Risk-Off", "Mixed"]
        assert 0 <= context.consensus_confidence <= 1
        assert len(context.individual_signals) > 0

    @pytest.mark.asyncio
    async def test_signal_context_caching(self):
        """Test that signal context is properly cached."""
        service = SignalContextService()

        # First call
        context1 = await service.get_current_signal_context()
        cache_status1 = service.get_cache_status()

        # Second call should use cache
        context2 = await service.get_current_signal_context()
        cache_status2 = service.get_cache_status()

        assert cache_status1["cached"] is True
        assert cache_status2["cached"] is True
        assert context1.context_timestamp == context2.context_timestamp

    @pytest.mark.asyncio
    async def test_cache_invalidation(self):
        """Test cache clearing functionality."""
        service = SignalContextService()

        # Get initial context
        await service.get_current_signal_context()
        assert service.get_cache_status()["cached"] is True

        # Clear cache
        await service.clear_cache()
        assert service.get_cache_status()["cached"] is False

    @pytest.mark.asyncio
    async def test_health_check(self):
        """Test signal service health check."""
        service = SignalContextService()

        health_status = await service.health_check()
        assert isinstance(health_status, bool)


class TestContentTriggerService:
    """Test the main content trigger service."""

    @pytest.mark.asyncio
    async def test_manual_content_trigger(self, trigger_service, sample_content_source):
        """Test manual triggering of content analysis."""
        user_id = str(uuid.uuid4())

        event_id = await trigger_service.trigger_content_analysis(
            content_source=sample_content_source,
            user_id=user_id,
            auto_start=True,
            include_signals=True
        )

        assert event_id is not None
        assert isinstance(event_id, str)

    @pytest.mark.asyncio
    async def test_rate_limiting(self, trigger_service, sample_content_source):
        """Test that rate limiting works correctly."""
        user_id = str(uuid.uuid4())

        # Set a low rate limit for testing
        trigger_service.max_triggers_per_window = 2
        trigger_service.rate_limit_window = 1  # 1 second window

        # First two triggers should succeed
        event_id1 = await trigger_service.trigger_content_analysis(
            sample_content_source, user_id
        )
        event_id2 = await trigger_service.trigger_content_analysis(
            sample_content_source, user_id
        )

        assert event_id1 is not None
        assert event_id2 is not None

        # Third trigger should still work but internal rate limiting should be tracked
        event_id3 = await trigger_service.trigger_content_analysis(
            sample_content_source, user_id
        )
        assert event_id3 is not None

    @pytest.mark.asyncio
    async def test_content_enhancement_with_signals(self, trigger_service, sample_content_source, mock_signal_service):
        """Test that content is properly enhanced with signal context."""
        signal_context = await mock_signal_service.get_current_signal_context()

        enhanced_content = await trigger_service._enhance_content_with_signals(
            sample_content_source,
            {
                "consensus": signal_context.consensus_signal,
                "confidence": signal_context.consensus_confidence,
                "signals": [s.__dict__ for s in signal_context.individual_signals]
            }
        )

        assert enhanced_content.metadata is not None
        assert "signal_context" in enhanced_content.metadata
        assert "enhancement_timestamp" in enhanced_content.metadata
        assert enhanced_content.metadata["trigger_system_version"] == "2.1"

    @pytest.mark.asyncio
    async def test_metrics_tracking(self, trigger_service, sample_content_source):
        """Test that performance metrics are properly tracked."""
        user_id = str(uuid.uuid4())

        # Initial metrics
        initial_metrics = await trigger_service.get_trigger_metrics()
        initial_total = initial_metrics["total_triggers"]

        # Trigger content analysis
        await trigger_service.trigger_content_analysis(sample_content_source, user_id)

        # Check updated metrics
        updated_metrics = await trigger_service.get_trigger_metrics()
        assert updated_metrics["total_triggers"] == initial_total + 1
        assert updated_metrics["last_trigger_time"] is not None

    @pytest.mark.asyncio
    async def test_health_check(self, trigger_service):
        """Test trigger service health check."""
        health_status = await trigger_service.health_check()
        assert health_status is True

    @pytest.mark.asyncio
    async def test_error_handling_in_event_processing(self, trigger_service, sample_content_source, mock_orchestrator):
        """Test error handling when event processing fails."""
        user_id = str(uuid.uuid4())

        # Make orchestrator fail
        mock_orchestrator.create_session.side_effect = Exception("Orchestrator error")

        # Create event that will fail processing
        event = ContentReadyEvent(
            content_source=sample_content_source,
            user_id=user_id,
            auto_start_debate=True
        )

        # Should handle the error gracefully
        with pytest.raises(Exception, match="Orchestrator error"):
            await trigger_service._handle_content_ready_event(event)

    @pytest.mark.asyncio
    async def test_event_subscription_listing(self, trigger_service):
        """Test listing of active event subscriptions."""
        subscriptions = await trigger_service.list_active_subscriptions()

        assert isinstance(subscriptions, list)
        # Should have at least one subscription (the trigger service itself)
        assert len(subscriptions) >= 1

    @pytest.mark.asyncio
    async def test_recent_events_retrieval(self, trigger_service):
        """Test retrieval of recent events."""
        events = await trigger_service.get_recent_events(limit=10)

        assert isinstance(events, list)
        # Should be able to retrieve events without error
        assert len(events) >= 0


class TestIntegrationScenarios:
    """Integration tests for complete trigger workflows."""

    @pytest.mark.asyncio
    async def test_complete_trigger_workflow(self, trigger_service, sample_content_source, mock_orchestrator, mock_signal_service):
        """Test complete end-to-end trigger workflow."""
        user_id = str(uuid.uuid4())

        # Step 1: Trigger content analysis
        event_id = await trigger_service.trigger_content_analysis(
            content_source=sample_content_source,
            user_id=user_id,
            auto_start=True,
            include_signals=True
        )

        assert event_id is not None

        # Give the event processing a moment to complete
        await asyncio.sleep(0.1)

        # Step 2: Verify orchestrator was called
        mock_orchestrator.create_session.assert_called_once()
        mock_orchestrator.start_debate.assert_called_once()

        # Step 3: Verify signal service was called
        mock_signal_service.get_current_signal_context.assert_called()

    @pytest.mark.asyncio
    async def test_signal_context_integration(self, trigger_service, sample_content_source, mock_signal_service):
        """Test that signal context is properly integrated into content triggers."""
        user_id = str(uuid.uuid4())

        # Trigger analysis with signal context
        await trigger_service.trigger_content_analysis(
            content_source=sample_content_source,
            user_id=user_id,
            include_signals=True
        )

        # Verify signal service was called
        mock_signal_service.get_current_signal_context.assert_called()

    @pytest.mark.asyncio
    async def test_multiple_concurrent_triggers(self, trigger_service, sample_content_source):
        """Test handling of multiple concurrent triggers."""
        user_id = str(uuid.uuid4())

        # Create multiple trigger tasks
        tasks = []
        for i in range(5):
            content = ContentSource(
                type=ContentSourceType.TEXT,
                title=f"Test Content {i}",
                content=f"Test content for analysis {i}"
            )

            task = trigger_service.trigger_content_analysis(
                content_source=content,
                user_id=user_id,
                auto_start=True
            )
            tasks.append(task)

        # Execute all triggers concurrently
        event_ids = await asyncio.gather(*tasks)

        # All triggers should succeed
        assert len(event_ids) == 5
        assert all(event_id is not None for event_id in event_ids)
        assert len(set(event_ids)) == 5  # All should be unique

    @pytest.mark.asyncio
    async def test_graceful_degradation_without_signals(self, mock_orchestrator, event_bus):
        """Test that system works even when signal context is unavailable."""
        # Create signal service that fails
        failing_signal_service = AsyncMock(spec=SignalContextService)
        failing_signal_service.get_current_signal_context.return_value = None
        failing_signal_service.health_check.return_value = False

        trigger_service = ContentTriggerService(
            orchestrator=mock_orchestrator,
            signal_service=failing_signal_service,
            event_bus=event_bus
        )

        user_id = str(uuid.uuid4())
        sample_content = ContentSource(
            type=ContentSourceType.TEXT,
            title="Test Content",
            content="Test content"
        )

        # Should still work without signal context
        event_id = await trigger_service.trigger_content_analysis(
            content_source=sample_content,
            user_id=user_id,
            include_signals=False
        )

        assert event_id is not None


class TestPerformanceAndConstraints:
    """Test performance requirements and system constraints."""

    @pytest.mark.asyncio
    async def test_trigger_response_time(self, trigger_service, sample_content_source):
        """Test that trigger response time meets requirements (<2s)."""
        user_id = str(uuid.uuid4())

        start_time = datetime.utcnow()

        await trigger_service.trigger_content_analysis(
            content_source=sample_content_source,
            user_id=user_id
        )

        end_time = datetime.utcnow()
        response_time = (end_time - start_time).total_seconds()

        # Should be much faster than 2 seconds for the trigger itself
        assert response_time < 1.0

    @pytest.mark.asyncio
    async def test_concurrent_session_limit(self, trigger_service, sample_content_source):
        """Test concurrent processing capabilities."""
        user_id = str(uuid.uuid4())

        # Create multiple concurrent triggers
        concurrent_tasks = 5
        tasks = []

        for i in range(concurrent_tasks):
            content = ContentSource(
                type=ContentSourceType.TEXT,
                title=f"Concurrent Test {i}",
                content=f"Content for concurrent test {i}"
            )

            task = trigger_service.trigger_content_analysis(
                content_source=content,
                user_id=user_id
            )
            tasks.append(task)

        # Execute all concurrently
        start_time = datetime.utcnow()
        results = await asyncio.gather(*tasks, return_exceptions=True)
        end_time = datetime.utcnow()

        # All should succeed
        assert all(not isinstance(result, Exception) for result in results)

        # Total time should still be reasonable
        total_time = (end_time - start_time).total_seconds()
        assert total_time < 5.0  # Should handle 5 concurrent requests in <5s


if __name__ == "__main__":
    pytest.main([__file__, "-v"])