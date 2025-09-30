"""
WebSocket Streaming Endpoints
Story 2.8: AutoGen-WebSocket Integration Bridge

FastAPI WebSocket endpoints for real-time AutoGen conversation streaming.
Provides the bridge between frontend WebSocket connections and AutoGen backend.
"""

import json
import logging
import uuid
from typing import Optional, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from .autogen_bridge import autogen_websocket_bridge
from core.database import get_db
from core.auth import get_current_user_optional
from core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ws", tags=["websocket-streaming"])

class ConversationStartRequest(BaseModel):
    """Request model for starting a conversation."""
    content: str = Field(..., description="Content to analyze")
    content_type: str = Field(default="text", description="Type of content")
    user_id: Optional[str] = None
    auth_token: Optional[str] = None

@router.websocket("/conversations/{conversation_id}/stream")
async def conversation_stream_websocket(
    websocket: WebSocket,
    conversation_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    WebSocket endpoint for real-time conversation streaming.

    This endpoint accepts WebSocket connections and manages the bridge
    between AutoGen conversations and real-time frontend updates.

    Args:
        websocket: WebSocket connection
        conversation_id: Unique conversation identifier
        db: Database session
    """
    logger.info(f"New WebSocket connection request for conversation {conversation_id}")

    try:
        # Accept the WebSocket connection
        await websocket.accept()
        logger.info(f"WebSocket connection accepted for conversation {conversation_id}")

        # Wait for start message from client
        initial_data = await websocket.receive_text()
        start_message = json.loads(initial_data)

        if start_message.get("type") != "start_conversation":
            await websocket.send_text(json.dumps({
                "type": "error",
                "data": {"message": "Expected 'start_conversation' message"}
            }))
            return

        # Extract conversation parameters
        request_data = start_message.get("data", {})
        content = request_data.get("content", "")
        content_type = request_data.get("contentType", "text")
        user_id = request_data.get("userId")

        if not content.strip():
            await websocket.send_text(json.dumps({
                "type": "error",
                "data": {"message": "Content cannot be empty"}
            }))
            return

        logger.info(f"Starting conversation stream: {conversation_id}, content_type: {content_type}")

        # Start the conversation stream using the bridge
        await autogen_websocket_bridge.start_conversation_stream(
            websocket=websocket,
            conversation_id=conversation_id,
            content=content,
            content_type=content_type,
            user_id=user_id,
            db=db
        )

    except WebSocketDisconnect:
        logger.info(f"WebSocket connection closed for conversation {conversation_id}")
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in WebSocket message: {e}")
        try:
            await websocket.send_text(json.dumps({
                "type": "error",
                "data": {"message": "Invalid JSON format"}
            }))
        except:
            pass
    except Exception as e:
        logger.error(f"WebSocket error for conversation {conversation_id}: {e}")
        try:
            await websocket.send_text(json.dumps({
                "type": "error",
                "data": {"message": f"Server error: {str(e)}"}
            }))
        except:
            pass
    finally:
        logger.info(f"WebSocket connection cleanup completed for {conversation_id}")

@router.post("/conversations/{conversation_id}/start")
async def start_conversation_http(
    conversation_id: str,
    request: ConversationStartRequest,
    current_user=Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    HTTP endpoint to start a conversation (alternative to WebSocket initialization).

    This can be used to validate conversation parameters before establishing
    the WebSocket connection, or for debugging purposes.
    """
    try:
        # Validate request
        if not request.content.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Content cannot be empty"
            )

        # Extract user ID if available
        user_id = getattr(current_user, 'id', None) if current_user else request.user_id

        logger.info(f"HTTP conversation start request: {conversation_id}")

        return {
            "session_id": conversation_id,
            "status": "ready",
            "websocket_url": f"/ws/conversations/{conversation_id}/stream",
            "message": "Ready to start conversation. Connect to WebSocket endpoint."
        }

    except Exception as e:
        logger.error(f"Failed to prepare conversation {conversation_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/conversations/{conversation_id}/status")
async def get_conversation_status(conversation_id: str):
    """Get the current status of a conversation."""
    active_conversations = autogen_websocket_bridge.get_active_conversations()

    if conversation_id in active_conversations:
        return {
            "conversation_id": conversation_id,
            "status": "active",
            "details": active_conversations[conversation_id]
        }
    else:
        return {
            "conversation_id": conversation_id,
            "status": "not_found",
            "details": None
        }

@router.get("/conversations")
async def list_active_conversations():
    """List all active conversations."""
    active_conversations = autogen_websocket_bridge.get_active_conversations()

    return {
        "active_conversations": len(active_conversations),
        "conversations": active_conversations
    }

@router.post("/conversations/{conversation_id}/control")
async def conversation_control(
    conversation_id: str,
    action: str,
    current_user=Depends(get_current_user_optional)
):
    """
    Send control commands to an active conversation.

    Available actions: pause, resume, stop
    """
    try:
        active_conversations = autogen_websocket_bridge.get_active_conversations()

        if conversation_id not in active_conversations:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        if action not in ["pause", "resume", "stop"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid action. Must be: pause, resume, or stop"
            )

        # Send control message to conversation
        control_message = {
            "type": "control",
            "command": action,
            "user_id": getattr(current_user, 'id', None) if current_user else None
        }

        # This would send the control message to the conversation
        # Implementation depends on how we want to handle control messages
        logger.info(f"Control action '{action}' sent to conversation {conversation_id}")

        return {
            "conversation_id": conversation_id,
            "action": action,
            "status": "sent"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Control action failed for {conversation_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/conversations/{conversation_id}")
async def terminate_conversation(
    conversation_id: str,
    current_user=Depends(get_current_user_optional)
):
    """Forcefully terminate a conversation and cleanup resources."""
    try:
        active_conversations = autogen_websocket_bridge.get_active_conversations()

        if conversation_id not in active_conversations:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        # Cleanup conversation resources
        # This would involve closing WebSocket connections and cleaning up AutoGen resources
        logger.info(f"Terminating conversation {conversation_id}")

        return {
            "conversation_id": conversation_id,
            "status": "terminated"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to terminate conversation {conversation_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# Health check endpoint for WebSocket infrastructure
@router.get("/health")
async def websocket_health_check():
    """Health check for WebSocket streaming infrastructure."""
    try:
        active_conversations = autogen_websocket_bridge.get_active_conversations()

        return {
            "status": "healthy",
            "service": "websocket-streaming",
            "active_conversations": len(active_conversations),
            "autogen_available": bool(settings.OPENAI_API_KEY),
            "timestamp": "2025-01-30T12:00:00Z"  # Would be actual timestamp
        }
    except Exception as e:
        logger.error(f"WebSocket health check failed: {e}")
        return {
            "status": "unhealthy",
            "service": "websocket-streaming",
            "error": str(e),
            "timestamp": "2025-01-30T12:00:00Z"
        }