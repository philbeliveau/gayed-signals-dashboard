"""
Content Trigger Service for AutoGen Agent Debates.

This service implements the unified event-driven trigger system that:
1. Listens for content processing completion events
2. Combines content with current Gayed signal context
3. Triggers AutoGen agent debates automatically
4. Maintains loose coupling between content processing and agent orchestration
"""

import logging
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime
from dataclasses import dataclass, field
import uuid

from models.conversation_models import ContentSource
from services.autogen_orchestrator import AutoGenOrchestrator
from services.signal_context_service import SignalContextService


@dataclass
class ContentReadyEvent:
    """Event published when content processing is complete."""
    content_source: ContentSource
    user_id: str
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    processing_metadata: Dict[str, Any] = field(default_factory=dict)
    signal_context_needed: bool = True
    auto_start_debate: bool = True
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class EventSubscription:
    """Subscription to content events."""
    subscriber_id: str
    event_types: List[str]
    callback: Callable[[ContentReadyEvent], None]
    active: bool = True


class ContentEventBus:
    """Event bus for content processing events."""

    def __init__(self):
        self.subscriptions: List[EventSubscription] = []
        self.event_history: List[ContentReadyEvent] = []
        self.logger = logging.getLogger(__name__)
        self.max_history = 1000  # Keep last 1000 events for debugging

    async def publish(self, event: ContentReadyEvent) -> None:
        """Publish a content ready event to all subscribers."""
        self.logger.info(f"Publishing content ready event {event.event_id} for content: {event.content_source.title}")

        # Store event in history
        self.event_history.append(event)
        if len(self.event_history) > self.max_history:
            self.event_history.pop(0)

        # Notify all active subscribers
        for subscription in self.subscriptions:
            if subscription.active and "content_ready" in subscription.event_types:
                try:
                    await subscription.callback(event)
                except Exception as e:
                    self.logger.error(f"Error notifying subscriber {subscription.subscriber_id}: {e}")

    def subscribe(self, subscription: EventSubscription) -> str:
        """Subscribe to content events."""
        self.subscriptions.append(subscription)
        self.logger.info(f"New subscriber {subscription.subscriber_id} registered")
        return subscription.subscriber_id

    def unsubscribe(self, subscriber_id: str) -> bool:
        """Unsubscribe from content events."""
        for subscription in self.subscriptions:
            if subscription.subscriber_id == subscriber_id:
                subscription.active = False
                self.logger.info(f"Subscriber {subscriber_id} unsubscribed")
                return True
        return False


class ContentTriggerService:
    """
    Unified content trigger system for AutoGen agent debates.

    This service implements event-driven architecture to automatically trigger
    agent debates when content processing completes, while maintaining loose
    coupling between components.
    """

    def __init__(
        self,
        orchestrator: AutoGenOrchestrator,
        signal_service: SignalContextService,
        event_bus: Optional[ContentEventBus] = None
    ):
        self.orchestrator = orchestrator
        self.signal_service = signal_service
        self.event_bus = event_bus or ContentEventBus()
        self.logger = logging.getLogger(__name__)

        # Performance tracking
        self.trigger_metrics = {
            "total_triggers": 0,
            "successful_triggers": 0,
            "failed_triggers": 0,
            "average_response_time": 0.0,
            "last_trigger_time": None
        }

        # Rate limiting
        self.rate_limit_window = 60  # seconds
        self.max_triggers_per_window = 10
        self.recent_triggers: List[datetime] = []

        # Subscribe to content events
        self._setup_event_subscription()

    def _setup_event_subscription(self) -> None:
        """Setup subscription to content ready events."""
        subscription = EventSubscription(
            subscriber_id=f"content_trigger_service_{uuid.uuid4()}",
            event_types=["content_ready"],
            callback=self._handle_content_ready_event
        )
        self.event_bus.subscribe(subscription)
        self.logger.info("Content trigger service subscribed to content events")

    async def _handle_content_ready_event(self, event: ContentReadyEvent) -> None:
        """Handle content ready event by triggering agent debate."""
        try:
            start_time = datetime.utcnow()

            # Check rate limiting
            if not self._check_rate_limit():
                self.logger.warning(f"Rate limit exceeded for event {event.event_id}")
                return

            self.logger.info(f"Processing content ready event {event.event_id}")

            # Process the content trigger
            await self._process_content_trigger(event)

            # Update metrics
            end_time = datetime.utcnow()
            response_time = (end_time - start_time).total_seconds()
            self._update_metrics(response_time, success=True)

        except Exception as e:
            self.logger.error(f"Failed to process content trigger for event {event.event_id}: {e}")
            self._update_metrics(0, success=False)
            raise

    def _check_rate_limit(self) -> bool:
        """Check if we're within rate limiting constraints."""
        now = datetime.utcnow()

        # Remove triggers outside the rate limit window
        cutoff_time = now.timestamp() - self.rate_limit_window
        self.recent_triggers = [
            trigger for trigger in self.recent_triggers
            if trigger.timestamp() > cutoff_time
        ]

        # Check if we can process another trigger
        if len(self.recent_triggers) >= self.max_triggers_per_window:
            return False

        self.recent_triggers.append(now)
        return True

    async def _process_content_trigger(self, event: ContentReadyEvent) -> None:
        """Process content trigger and initiate agent debate."""
        try:
            # Step 1: Gather signal context if needed
            signal_context = None
            if event.signal_context_needed:
                signal_context = await self.signal_service.get_current_signal_context()
                self.logger.info(f"Retrieved signal context for event {event.event_id}")

            # Step 2: Create enhanced content source with signal context
            enhanced_content = await self._enhance_content_with_signals(
                event.content_source,
                signal_context
            )

            # Step 3: Create conversation session
            session = await self.orchestrator.create_session(
                content=enhanced_content,
                user_id=event.user_id
            )

            self.logger.info(f"Created conversation session {session.id} for event {event.event_id}")

            # Step 4: Start debate if auto-start is enabled
            if event.auto_start_debate:
                await self.orchestrator.start_debate(session.id)
                self.logger.info(f"Started agent debate for session {session.id}")

        except Exception as e:
            self.logger.error(f"Content trigger processing failed: {e}")
            raise

    async def _enhance_content_with_signals(
        self,
        content_source: ContentSource,
        signal_context: Optional[Dict[str, Any]]
    ) -> ContentSource:
        """Enhance content source with current signal context."""
        if not signal_context:
            return content_source

        # Add signal context to content metadata
        enhanced_metadata = content_source.metadata.copy()
        enhanced_metadata.update({
            "signal_context": signal_context,
            "enhancement_timestamp": datetime.utcnow().isoformat(),
            "trigger_system_version": "2.1"
        })

        # Create enhanced content with signal context included
        enhanced_content = ContentSource(
            type=content_source.type,
            title=content_source.title,
            content=content_source.content,
            url=content_source.url,
            author=content_source.author,
            published_at=content_source.published_at,
            metadata=enhanced_metadata
        )

        return enhanced_content

    def _update_metrics(self, response_time: float, success: bool) -> None:
        """Update trigger performance metrics."""
        self.trigger_metrics["total_triggers"] += 1

        if success:
            self.trigger_metrics["successful_triggers"] += 1
        else:
            self.trigger_metrics["failed_triggers"] += 1

        # Update average response time
        total_successful = self.trigger_metrics["successful_triggers"]
        if total_successful > 0:
            current_avg = self.trigger_metrics["average_response_time"]
            self.trigger_metrics["average_response_time"] = (
                (current_avg * (total_successful - 1) + response_time) / total_successful
            )

        self.trigger_metrics["last_trigger_time"] = datetime.utcnow().isoformat()

    async def trigger_content_analysis(
        self,
        content_source: ContentSource,
        user_id: str,
        auto_start: bool = True,
        include_signals: bool = True
    ) -> str:
        """
        Manually trigger content analysis (for API endpoints).

        Returns the event ID for tracking.
        """
        event = ContentReadyEvent(
            content_source=content_source,
            user_id=user_id,
            signal_context_needed=include_signals,
            auto_start_debate=auto_start
        )

        await self.event_bus.publish(event)
        self.logger.info(f"Manual trigger published for content: {content_source.title}")

        return event.event_id

    async def get_trigger_metrics(self) -> Dict[str, Any]:
        """Get current trigger performance metrics."""
        return self.trigger_metrics.copy()

    async def health_check(self) -> bool:
        """Perform health check for the trigger service."""
        try:
            # Check if orchestrator is healthy
            if not await self.orchestrator.health_check():
                return False

            # Check if signal service is available
            if not await self.signal_service.health_check():
                return False

            # Check event bus health
            if not self.event_bus:
                return False

            return True

        except Exception as e:
            self.logger.error(f"Trigger service health check failed: {e}")
            return False

    async def list_active_subscriptions(self) -> List[Dict[str, Any]]:
        """List all active event subscriptions."""
        return [
            {
                "subscriber_id": sub.subscriber_id,
                "event_types": sub.event_types,
                "active": sub.active
            }
            for sub in self.event_bus.subscriptions
            if sub.active
        ]

    async def get_recent_events(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent content events for debugging."""
        events = self.event_bus.event_history[-limit:]
        return [
            {
                "event_id": event.event_id,
                "content_title": event.content_source.title,
                "user_id": event.user_id,
                "timestamp": event.timestamp.isoformat(),
                "auto_start_debate": event.auto_start_debate
            }
            for event in events
        ]
