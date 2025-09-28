"""
AutoGen agent conversation API routes.

This module provides endpoints for:
- Creating AutoGen agent conversation sessions
- Managing agent debates and streaming conversations
- Exporting conversation results for client presentations
"""

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from typing import Dict, List, Optional, Any
import logging
import json
import uuid
from datetime import datetime

from core.config import settings
from services.autogen_orchestrator import AutoGenOrchestrator
from models.conversation_models import (
    ConversationCreateRequest,
    ConversationResponse,
    AgentMessage,
    ContentSource,
    ConversationStatus
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Global orchestrator instance
orchestrator: Optional[AutoGenOrchestrator] = None


def get_orchestrator() -> AutoGenOrchestrator:
    """Get or create AutoGen orchestrator instance."""
    global orchestrator
    if orchestrator is None:
        if not settings.ENABLE_AUTOGEN_AGENTS:
            raise HTTPException(
                status_code=503,
                detail="AutoGen agents are disabled in configuration"
            )

        try:
            orchestrator = AutoGenOrchestrator(settings.get_autogen_config())
        except Exception as e:
            logger.error(f"Failed to initialize AutoGen orchestrator: {e}")
            raise HTTPException(
                status_code=500,
                detail="Failed to initialize AutoGen service"
            )

    return orchestrator


@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(
    request: ConversationCreateRequest,
    agent_orchestrator: AutoGenOrchestrator = Depends(get_orchestrator)
) -> ConversationResponse:
    """
    Create a new AutoGen agent conversation session.

    This endpoint initializes a conversation with three specialized agents:
    - Financial Analyst: Analyzes content using market signals
    - Market Context: Provides broader market context via Perplexity
    - Risk Challenger: Questions assumptions and provides counter-analysis
    """
    try:
        logger.info(f"Creating new conversation for content: {request.content.title[:50]}...")

        session = await agent_orchestrator.create_session(
            content=request.content,
            user_id=request.user_id
        )

        return ConversationResponse(
            conversation_id=session.id,
            status=session.status,
            created_at=session.created_at,
            content_source=session.content_source,
            message="Conversation initialized successfully"
        )

    except Exception as e:
        logger.error(f"Failed to create conversation: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create conversation: {str(e)}"
        )


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    agent_orchestrator: AutoGenOrchestrator = Depends(get_orchestrator)
) -> Dict[str, Any]:
    """Get conversation details and messages."""
    try:
        session = await agent_orchestrator.get_session(conversation_id)
        if not session:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found"
            )

        return {
            "conversation_id": session.id,
            "status": session.status,
            "content_source": session.content_source,
            "messages": session.messages,
            "created_at": session.created_at,
            "updated_at": session.updated_at
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get conversation {conversation_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve conversation"
        )


@router.post("/conversations/{conversation_id}/start")
async def start_conversation(
    conversation_id: str,
    agent_orchestrator: AutoGenOrchestrator = Depends(get_orchestrator)
) -> Dict[str, str]:
    """Start the AutoGen agent debate for the conversation."""
    try:
        await agent_orchestrator.start_debate(conversation_id)

        return {
            "message": "Agent debate started successfully",
            "conversation_id": conversation_id,
            "status": "running"
        }

    except Exception as e:
        logger.error(f"Failed to start conversation {conversation_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start conversation: {str(e)}"
        )


@router.websocket("/conversations/{conversation_id}/stream")
async def stream_conversation(
    websocket: WebSocket,
    conversation_id: str
):
    """
    WebSocket endpoint for real-time agent conversation streaming.

    Streams agent messages as they are generated during the debate.
    """
    await websocket.accept()

    try:
        # Get orchestrator without dependency injection for WebSocket
        if not settings.ENABLE_WEBSOCKET_STREAMING:
            await websocket.send_text(json.dumps({
                "error": "WebSocket streaming is disabled"
            }))
            await websocket.close()
            return

        agent_orchestrator = get_orchestrator()

        # Register WebSocket for this conversation
        await agent_orchestrator.register_websocket(conversation_id, websocket)

        # Keep connection alive and handle incoming messages
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)

                # Handle client commands (pause, resume, etc.)
                if message.get("command") == "pause":
                    await agent_orchestrator.pause_debate(conversation_id)
                elif message.get("command") == "resume":
                    await agent_orchestrator.resume_debate(conversation_id)
                elif message.get("command") == "stop":
                    await agent_orchestrator.stop_debate(conversation_id)
                    break

            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON received from WebSocket: {data}")

    except Exception as e:
        logger.error(f"WebSocket error for conversation {conversation_id}: {e}")
        await websocket.send_text(json.dumps({
            "error": f"WebSocket error: {str(e)}"
        }))
    finally:
        # Unregister WebSocket
        try:
            agent_orchestrator = get_orchestrator()
            await agent_orchestrator.unregister_websocket(conversation_id, websocket)
        except:
            pass
        await websocket.close()


@router.get("/conversations/{conversation_id}/export")
async def export_conversation(
    conversation_id: str,
    format: str = "markdown",
    agent_orchestrator: AutoGenOrchestrator = Depends(get_orchestrator)
) -> Dict[str, Any]:
    """
    Export conversation for client presentations.

    Supported formats:
    - markdown: Formatted markdown suitable for documentation
    - json: Raw JSON data for programmatic access
    - summary: Executive summary with key insights
    """
    try:
        session = await agent_orchestrator.get_session(conversation_id)
        if not session:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found"
            )

        if format == "markdown":
            content = await agent_orchestrator.export_markdown(session)
        elif format == "json":
            content = await agent_orchestrator.export_json(session)
        elif format == "summary":
            content = await agent_orchestrator.export_summary(session)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported export format: {format}"
            )

        return {
            "conversation_id": conversation_id,
            "format": format,
            "content": content,
            "exported_at": datetime.utcnow().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to export conversation {conversation_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to export conversation"
        )


@router.get("/conversations")
async def list_conversations(
    user_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    agent_orchestrator: AutoGenOrchestrator = Depends(get_orchestrator)
) -> Dict[str, Any]:
    """List conversations with optional filtering."""
    try:
        conversations = await agent_orchestrator.list_sessions(
            user_id=user_id,
            status=status,
            limit=limit,
            offset=offset
        )

        return {
            "conversations": conversations,
            "total": len(conversations),
            "limit": limit,
            "offset": offset
        }

    except Exception as e:
        logger.error(f"Failed to list conversations: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to list conversations"
        )


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    agent_orchestrator: AutoGenOrchestrator = Depends(get_orchestrator)
) -> Dict[str, str]:
    """Delete a conversation and its associated data."""
    try:
        success = await agent_orchestrator.delete_session(conversation_id)
        if not success:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found"
            )

        return {
            "message": "Conversation deleted successfully",
            "conversation_id": conversation_id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete conversation {conversation_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete conversation"
        )


@router.get("/health")
async def autogen_health_check() -> Dict[str, Any]:
    """Health check for AutoGen service."""
    try:
        if not settings.ENABLE_AUTOGEN_AGENTS:
            return {
                "status": "disabled",
                "message": "AutoGen agents are disabled in configuration"
            }

        # Test orchestrator initialization
        agent_orchestrator = get_orchestrator()
        health_status = await agent_orchestrator.health_check()

        return {
            "status": "healthy" if health_status else "unhealthy",
            "autogen_enabled": settings.ENABLE_AUTOGEN_AGENTS,
            "websocket_enabled": settings.ENABLE_WEBSOCKET_STREAMING,
            "model": settings.AUTOGEN_MODEL,
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"AutoGen health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }