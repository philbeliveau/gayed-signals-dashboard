"""
Content Trigger API Routes.

API endpoints for the unified content trigger system that handles:
- Manual content trigger requests
- Event-driven content processing integration
- Trigger performance monitoring
- Event subscription management
"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging
import uuid

from models.conversation_models import (
    ContentSource,
    ConversationCreateRequest,
    ConversationResponse,
    ConversationStatus
)
from services.content_trigger_service import ContentTriggerService, ContentReadyEvent
from services.autogen_orchestrator import AutoGenOrchestrator
from services.signal_context_service import SignalContextService
from core.security import get_current_user_id
from core.config import settings

# Router setup
router = APIRouter(prefix="/api/content-triggers", tags=["content-triggers"])
logger = logging.getLogger(__name__)

# Service instances (would typically be injected via dependency injection)
signal_service = SignalContextService()
orchestrator = AutoGenOrchestrator(config={
    "model": "gpt-4",
    "api_key": settings.OPENAI_API_KEY,
    "organization": settings.OPENAI_ORG_ID
})
trigger_service = ContentTriggerService(orchestrator, signal_service)


@router.post("/trigger", response_model=Dict[str, Any])
async def trigger_content_analysis(
    request: ConversationCreateRequest,
    user_id: str = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """
    Manually trigger content analysis with AutoGen agents.

    This endpoint publishes a content ready event that triggers the
    unified content processing system with signal context integration.
    """
    try:
        logger.info(f"Manual content trigger requested by user {user_id} for: {request.content.title}")

        # Validate user matches request
        if request.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User ID mismatch"
            )

        # Trigger content analysis via event system
        event_id = await trigger_service.trigger_content_analysis(
            content_source=request.content,
            user_id=user_id,
            auto_start=request.auto_start,
            include_signals=True
        )

        response = {
            "success": True,
            "event_id": event_id,
            "message": "Content analysis triggered successfully",
            "timestamp": datetime.utcnow().isoformat(),
            "auto_start": request.auto_start,
            "includes_signal_context": True
        }

        logger.info(f"Content trigger successful: event {event_id}")
        return response

    except Exception as e:
        logger.error(f"Content trigger failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to trigger content analysis: {str(e)}"
        )


@router.get("/metrics", response_model=Dict[str, Any])
async def get_trigger_metrics(
    user_id: str = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """Get performance metrics for the content trigger system."""
    try:
        metrics = await trigger_service.get_trigger_metrics()

        # Add system health information
        health_status = await trigger_service.health_check()

        response = {
            "performance_metrics": metrics,
            "system_health": {
                "healthy": health_status,
                "timestamp": datetime.utcnow().isoformat()
            },
            "rate_limiting": {
                "max_triggers_per_window": trigger_service.max_triggers_per_window,
                "window_seconds": trigger_service.rate_limit_window,
                "current_window_usage": len(trigger_service.recent_triggers)
            }
        }

        return response

    except Exception as e:
        logger.error(f"Failed to get trigger metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve metrics: {str(e)}"
        )


@router.get("/events/recent", response_model=List[Dict[str, Any]])
async def get_recent_events(
    limit: int = 50,
    user_id: str = Depends(get_current_user_id)
) -> List[Dict[str, Any]]:
    """Get recent content trigger events for debugging and monitoring."""
    try:
        if limit > 100:
            limit = 100  # Cap at 100 for performance

        events = await trigger_service.get_recent_events(limit=limit)

        # Filter events for current user only
        user_events = [
            event for event in events
            if event.get("user_id") == user_id
        ]

        logger.info(f"Retrieved {len(user_events)} recent events for user {user_id}")
        return user_events

    except Exception as e:
        logger.error(f"Failed to get recent events: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve recent events: {str(e)}"
        )


@router.get("/subscriptions", response_model=List[Dict[str, Any]])
async def get_active_subscriptions(
    user_id: str = Depends(get_current_user_id)
) -> List[Dict[str, Any]]:
    """Get list of active event subscriptions (admin endpoint)."""
    try:
        # Note: This is primarily for system monitoring/debugging
        subscriptions = await trigger_service.list_active_subscriptions()

        logger.info(f"Retrieved {len(subscriptions)} active subscriptions")
        return subscriptions

    except Exception as e:
        logger.error(f"Failed to get active subscriptions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve subscriptions: {str(e)}"
        )


@router.get("/signal-context", response_model=Dict[str, Any])
async def get_current_signal_context(
    user_id: str = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """Get current signal context that would be used in triggered analyses."""
    try:
        signal_context = await signal_service.get_current_signal_context()

        if not signal_context:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Signal context service temporarily unavailable"
            )

        # Format response for API consumption
        response = {
            "consensus": {
                "signal": signal_context.consensus_signal,
                "confidence": signal_context.consensus_confidence
            },
            "individual_signals": [
                {
                    "type": signal.signal_type,
                    "direction": signal.direction,
                    "strength": signal.strength,
                    "confidence": signal.confidence,
                    "raw_value": signal.raw_value,
                    "timestamp": signal.timestamp.isoformat()
                }
                for signal in signal_context.individual_signals
            ],
            "market_data": [
                {
                    "symbol": data.symbol,
                    "price": data.price,
                    "change": data.change,
                    "change_percent": data.change_percent,
                    "timestamp": data.timestamp.isoformat()
                }
                for data in signal_context.market_data
            ],
            "context_timestamp": signal_context.context_timestamp.isoformat(),
            "agent_summary": signal_context.summary
        }

        return response

    except Exception as e:
        logger.error(f"Failed to get signal context: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve signal context: {str(e)}"
        )


@router.post("/signal-context/refresh", response_model=Dict[str, Any])
async def refresh_signal_context(
    user_id: str = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """Force refresh of cached signal context."""
    try:
        # Clear cache and fetch fresh data
        await signal_service.clear_cache()
        signal_context = await signal_service.get_current_signal_context()

        if not signal_context:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Failed to refresh signal context"
            )

        response = {
            "success": True,
            "message": "Signal context refreshed successfully",
            "timestamp": signal_context.context_timestamp.isoformat(),
            "consensus": signal_context.consensus_signal,
            "confidence": signal_context.consensus_confidence
        }

        logger.info(f"Signal context refreshed for user {user_id}")
        return response

    except Exception as e:
        logger.error(f"Failed to refresh signal context: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to refresh signal context: {str(e)}"
        )


@router.get("/health", response_model=Dict[str, Any])
async def health_check() -> Dict[str, Any]:
    """Health check endpoint for the content trigger system."""
    try:
        # Check all service components
        trigger_healthy = await trigger_service.health_check()
        signal_healthy = await signal_service.health_check()
        orchestrator_healthy = await orchestrator.health_check()

        overall_healthy = all([trigger_healthy, signal_healthy, orchestrator_healthy])

        response = {
            "healthy": overall_healthy,
            "timestamp": datetime.utcnow().isoformat(),
            "components": {
                "content_trigger_service": trigger_healthy,
                "signal_context_service": signal_healthy,
                "autogen_orchestrator": orchestrator_healthy
            },
            "version": "2.1.0"
        }

        status_code = status.HTTP_200_OK if overall_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
        return JSONResponse(content=response, status_code=status_code)

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            content={
                "healthy": False,
                "timestamp": datetime.utcnow().isoformat(),
                "error": str(e)
            },
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE
        )


# Webhook endpoint for external content processing systems
@router.post("/webhook/content-ready")
async def content_ready_webhook(
    event_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Webhook endpoint for external content processing systems.

    This allows external systems to notify the trigger service
    when content processing is complete.
    """
    try:
        logger.info("Content ready webhook received")

        # Validate required fields
        required_fields = ["content_source", "user_id"]
        for field in required_fields:
            if field not in event_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Missing required field: {field}"
                )

        # Create ContentSource from webhook data
        content_data = event_data["content_source"]
        content_source = ContentSource(**content_data)

        # Create and publish event
        event = ContentReadyEvent(
            content_source=content_source,
            user_id=event_data["user_id"],
            processing_metadata=event_data.get("metadata", {}),
            signal_context_needed=event_data.get("include_signals", True),
            auto_start_debate=event_data.get("auto_start", True)
        )

        await trigger_service.event_bus.publish(event)

        response = {
            "success": True,
            "event_id": event.event_id,
            "message": "Content ready event processed successfully",
            "timestamp": datetime.utcnow().isoformat()
        }

        logger.info(f"Webhook processed successfully: event {event.event_id}")
        return response

    except Exception as e:
        logger.error(f"Webhook processing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process webhook: {str(e)}"
        )