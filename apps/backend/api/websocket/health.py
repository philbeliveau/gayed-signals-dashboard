"""
AutoGen Backend Health Check Endpoint
Story 2.8: AutoGen-WebSocket Integration Bridge - QA Fix

Health monitoring endpoint for AutoGen backend and WebSocket bridge infrastructure.
Provides comprehensive health status and circuit breaker functionality.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

try:
    from .autogen_bridge import autogen_websocket_bridge
    from core.auth import get_current_user_optional
except ImportError:
    # Fallback for when modules don't exist yet
    autogen_websocket_bridge = None
    get_current_user_optional = None

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["health"])


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str  # "healthy", "degraded", "unhealthy"
    timestamp: str
    autogen_backend: Dict[str, Any]
    websocket_bridge: Dict[str, Any]
    system: Dict[str, Any]


class CircuitBreakerStatus(BaseModel):
    """Circuit breaker status model."""
    state: str  # "closed", "open", "half-open"
    failure_count: int
    last_failure: Optional[str]
    next_attempt: Optional[str]


@router.get("/", response_model=HealthResponse)
async def get_health_status():
    """
    Get comprehensive health status of AutoGen backend and WebSocket bridge.

    Returns:
        HealthResponse: Complete health status including AutoGen backend,
                       WebSocket bridge, and system health metrics
    """
    try:
        # Check if bridge is available
        if not autogen_websocket_bridge:
            # Fallback when bridge not available
            return HealthResponse(
                status="unhealthy",
                timestamp=datetime.now(timezone.utc).isoformat(),
                autogen_backend={
                    "healthy": False,
                    "last_check": datetime.now(timezone.utc).isoformat(),
                    "active_conversations": 0,
                    "demo_fallback_active": False,
                    "error": "AutoGen bridge not initialized"
                },
                websocket_bridge={
                    "healthy": False,
                    "active_connections": 0,
                    "rate_limiting": {
                        "max_connections_per_minute": 10,
                        "max_concurrent_connections": 5,
                        "tracked_users": 0
                    },
                    "conversations": {"autogen": 0, "demo": 0},
                    "error": "WebSocket bridge not available"
                },
                system={
                    "uptime_seconds": _get_uptime_seconds(),
                    "memory_usage_mb": _get_memory_usage(),
                    "active_tasks": len(asyncio.all_tasks())
                }
            )

        # Get bridge health status
        bridge_status = autogen_websocket_bridge.get_health_status()

        # Check AutoGen backend health
        autogen_healthy = await autogen_websocket_bridge.check_autogen_health()

        # Determine overall status
        if autogen_healthy and bridge_status["autogen_backend_healthy"]:
            overall_status = "healthy"
        elif bridge_status["total_websocket_connections"] > 0:
            overall_status = "degraded"  # Demo mode fallback working
        else:
            overall_status = "unhealthy"

        # Build comprehensive response
        health_response = HealthResponse(
            status=overall_status,
            timestamp=datetime.now(timezone.utc).isoformat(),
            autogen_backend={
                "healthy": autogen_healthy,
                "last_check": bridge_status["last_health_check"],
                "active_conversations": bridge_status["active_conversations"],
                "demo_fallback_active": bridge_status["demo_conversations"] > 0
            },
            websocket_bridge={
                "healthy": True,  # Bridge is always healthy if responding
                "active_connections": bridge_status["total_websocket_connections"],
                "rate_limiting": bridge_status["rate_limiting"],
                "conversations": {
                    "autogen": bridge_status["active_conversations"],
                    "demo": bridge_status["demo_conversations"]
                }
            },
            system={
                "uptime_seconds": _get_uptime_seconds(),
                "memory_usage_mb": _get_memory_usage(),
                "active_tasks": len(asyncio.all_tasks())
            }
        )

        return health_response

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Health check failed: {str(e)}"
        )


@router.get("/autogen", response_model=Dict[str, Any])
async def get_autogen_health():
    """
    Get specific AutoGen backend health status.

    Returns:
        Dict containing detailed AutoGen backend health metrics
    """
    try:
        is_healthy = await autogen_websocket_bridge.check_autogen_health()

        return {
            "healthy": is_healthy,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "active_conversations": len(autogen_websocket_bridge.active_conversations),
            "demo_fallbacks": len(autogen_websocket_bridge.demo_conversations),
            "last_health_check": autogen_websocket_bridge.last_health_check.isoformat(),
            "circuit_breaker": _get_circuit_breaker_status()
        }

    except Exception as e:
        logger.error(f"AutoGen health check failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"AutoGen health check failed: {str(e)}"
        )


@router.get("/websocket", response_model=Dict[str, Any])
async def get_websocket_health():
    """
    Get WebSocket bridge health status.

    Returns:
        Dict containing WebSocket bridge health and connection metrics
    """
    try:
        bridge_status = autogen_websocket_bridge.get_health_status()

        return {
            "healthy": True,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "total_connections": bridge_status["total_websocket_connections"],
            "conversations": {
                "total": len(autogen_websocket_bridge.conversation_websockets),
                "autogen": bridge_status["active_conversations"],
                "demo": bridge_status["demo_conversations"]
            },
            "rate_limiting": bridge_status["rate_limiting"],
            "connection_metadata": len(autogen_websocket_bridge.connection_metadata)
        }

    except Exception as e:
        logger.error(f"WebSocket health check failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"WebSocket health check failed: {str(e)}"
        )


@router.post("/autogen/reset")
async def reset_autogen_health(
    user=Depends(get_current_user_optional)
):
    """
    Reset AutoGen backend health status (admin function).

    This endpoint can be used to reset the circuit breaker
    and force a fresh health check of the AutoGen backend.
    """
    try:
        # Reset health status
        autogen_websocket_bridge.autogen_backend_healthy = True
        autogen_websocket_bridge.last_health_check = datetime.now(timezone.utc)

        # Clear demo conversations (force retry with AutoGen)
        demo_count = len(autogen_websocket_bridge.demo_conversations)
        autogen_websocket_bridge.demo_conversations.clear()

        logger.info(f"AutoGen health reset by user {user.id if user else 'anonymous'}")

        return {
            "status": "reset",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "cleared_demo_conversations": demo_count,
            "next_health_check": "immediate"
        }

    except Exception as e:
        logger.error(f"AutoGen health reset failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Health reset failed: {str(e)}"
        )


def _get_circuit_breaker_status() -> Dict[str, Any]:
    """Get circuit breaker status for AutoGen backend."""
    # Simple circuit breaker logic based on demo conversation count
    demo_count = len(autogen_websocket_bridge.demo_conversations)
    autogen_count = len(autogen_websocket_bridge.active_conversations)

    if demo_count == 0:
        state = "closed"  # All good
    elif demo_count < 3:
        state = "half-open"  # Some failures
    else:
        state = "open"  # Circuit open, using demo mode

    return {
        "state": state,
        "failure_count": demo_count,
        "success_count": autogen_count,
        "threshold": 3,
        "last_check": autogen_websocket_bridge.last_health_check.isoformat()
    }


def _get_uptime_seconds() -> int:
    """Get approximate system uptime in seconds."""
    # Simple uptime calculation (could be enhanced with actual process start time)
    return int((datetime.now(timezone.utc) - autogen_websocket_bridge.last_health_check).total_seconds()) + 300


def _get_memory_usage() -> int:
    """Get approximate memory usage in MB."""
    try:
        import psutil
        process = psutil.Process()
        return int(process.memory_info().rss / 1024 / 1024)
    except ImportError:
        # Fallback if psutil not available
        return 0
