"""
FastAPI routes for AutoGen conversation management.
"""

import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field, validator

from services.conversation_manager import (
    AutoGenConversationManager,
    ConversationError,
    ConversationTimeoutError
)
from core.config import settings

logger = logging.getLogger(__name__)

# Global conversation manager instance
_conversation_manager: Optional[AutoGenConversationManager] = None


def get_conversation_manager() -> AutoGenConversationManager:
    """
    Get or create the global conversation manager instance.

    Returns:
        AutoGenConversationManager instance
    """
    global _conversation_manager
    if _conversation_manager is None:
        _conversation_manager = AutoGenConversationManager()
    return _conversation_manager


# Pydantic models for request/response
class ConversationRequest(BaseModel):
    """Request model for starting a new conversation."""

    message: str = Field(
        ...,
        min_length=10,
        max_length=5000,
        description="The financial content or question to analyze"
    )
    max_turns: Optional[int] = Field(
        default=6,
        ge=2,
        le=20,
        description="Maximum number of conversation turns"
    )
    timeout: Optional[int] = Field(
        default=90,
        ge=30,
        le=300,
        description="Conversation timeout in seconds"
    )
    conversation_id: Optional[str] = Field(
        default=None,
        description="Optional conversation ID"
    )

    @validator('message')
    def validate_message(cls, v):
        """Validate the conversation message."""
        if not v.strip():
            raise ValueError("Message cannot be empty or whitespace only")
        return v.strip()


class ConversationResponse(BaseModel):
    """Response model for conversation results."""

    conversation_id: str
    status: str
    initial_message: str
    messages: list
    summary: str
    duration: float
    participant_count: int
    message_count: int
    performance: Dict[str, Any]
    metadata: Dict[str, Any]
    error: Optional[str] = None


class ConversationStatusResponse(BaseModel):
    """Response model for conversation status."""

    conversation_id: str
    status: str
    start_time: float
    participants: list
    duration: Optional[float] = None
    error: Optional[str] = None


class AgentInfoResponse(BaseModel):
    """Response model for agent information."""

    agents: list
    total_count: int
    configuration: Dict[str, Any]


class PerformanceMetricsResponse(BaseModel):
    """Response model for performance metrics."""

    total_conversations: int
    success_rate: float
    average_duration: float
    within_target_rate: float
    agent_count: int
    model_config: Dict[str, Any]


# Router setup
router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post("/start", response_model=ConversationResponse)
async def start_conversation(
    request: ConversationRequest,
    background_tasks: BackgroundTasks,
    conversation_manager: AutoGenConversationManager = Depends(get_conversation_manager)
):
    """
    Start a new AutoGen conversation with financial analysis agents.

    Args:
        request: Conversation request parameters
        background_tasks: FastAPI background tasks
        conversation_manager: AutoGen conversation manager instance

    Returns:
        ConversationResponse: Complete conversation results

    Raises:
        HTTPException: If conversation fails or times out
    """
    try:
        logger.info(f"Starting new conversation with message: {request.message[:100]}...")

        # Start the conversation
        result = await conversation_manager.start_conversation(
            initial_message=request.message,
            max_turns=request.max_turns,
            timeout=request.timeout,
            conversation_id=request.conversation_id
        )

        logger.info(f"Conversation {result['conversation_id']} completed successfully")

        return ConversationResponse(**result)

    except ConversationTimeoutError as e:
        logger.warning(f"Conversation timed out: {str(e)}")
        raise HTTPException(
            status_code=408,
            detail={
                "error": "Conversation timeout",
                "message": str(e),
                "suggestion": "Try reducing message complexity or increasing timeout"
            }
        )

    except ConversationError as e:
        logger.error(f"Conversation error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Conversation failed",
                "message": str(e),
                "suggestion": "Please try again or contact support if the issue persists"
            }
        )

    except Exception as e:
        logger.error(f"Unexpected error starting conversation: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal server error",
                "message": "An unexpected error occurred while starting the conversation"
            }
        )


@router.get("/status/{conversation_id}", response_model=ConversationStatusResponse)
async def get_conversation_status(
    conversation_id: str,
    conversation_manager: AutoGenConversationManager = Depends(get_conversation_manager)
):
    """
    Get the status of a specific conversation.

    Args:
        conversation_id: Unique conversation identifier
        conversation_manager: AutoGen conversation manager instance

    Returns:
        ConversationStatusResponse: Conversation status information

    Raises:
        HTTPException: If conversation not found
    """
    try:
        status = conversation_manager.get_conversation_status(conversation_id)

        if status is None:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "Conversation not found",
                    "conversation_id": conversation_id
                }
            )

        return ConversationStatusResponse(
            conversation_id=conversation_id,
            **status
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting conversation status: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal server error",
                "message": "Failed to retrieve conversation status"
            }
        )


@router.get("/agents", response_model=AgentInfoResponse)
async def get_agent_info(
    conversation_manager: AutoGenConversationManager = Depends(get_conversation_manager)
):
    """
    Get information about available agents.

    Args:
        conversation_manager: AutoGen conversation manager instance

    Returns:
        AgentInfoResponse: Agent information and configuration
    """
    try:
        agents = conversation_manager.get_agent_info()

        # Mask sensitive configuration data (SEC-001 fix)
        masked_config = settings.mask_sensitive_data(settings.get_autogen_config())

        return AgentInfoResponse(
            agents=agents,
            total_count=len(agents),
            configuration=masked_config
        )

    except Exception as e:
        logger.error(f"Error getting agent info: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal server error",
                "message": "Failed to retrieve agent information"
            }
        )


@router.get("/metrics", response_model=PerformanceMetricsResponse)
async def get_performance_metrics(
    conversation_manager: AutoGenConversationManager = Depends(get_conversation_manager)
):
    """
    Get performance metrics for the conversation system.

    Args:
        conversation_manager: AutoGen conversation manager instance

    Returns:
        PerformanceMetricsResponse: System performance metrics
    """
    try:
        metrics = conversation_manager.get_performance_metrics()

        # Handle case where no conversations have been completed
        if "message" in metrics:
            # Mask sensitive configuration data (SEC-001 fix)
            masked_config = settings.mask_sensitive_data(conversation_manager.model_config)

            return PerformanceMetricsResponse(
                total_conversations=0,
                success_rate=0.0,
                average_duration=0.0,
                within_target_rate=0.0,
                agent_count=len(conversation_manager.agents),
                model_config=masked_config
            )

        return PerformanceMetricsResponse(**metrics)

    except Exception as e:
        logger.error(f"Error getting performance metrics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal server error",
                "message": "Failed to retrieve performance metrics"
            }
        )


@router.get("/health")
async def health_check(
    conversation_manager: AutoGenConversationManager = Depends(get_conversation_manager)
):
    """
    Health check endpoint for the conversation system.

    Args:
        conversation_manager: AutoGen conversation manager instance

    Returns:
        Health status information
    """
    try:
        # Validate API keys as part of health check (SEC-001 fix)
        api_validation = settings.validate_api_keys()

        return {
            "status": "healthy" if api_validation["overall_status"]["critical_keys_present"] else "degraded",
            "agents_available": len(conversation_manager.agents),
            "autogen_enabled": settings.ENABLE_AUTOGEN_AGENTS,
            "websocket_enabled": settings.ENABLE_WEBSOCKET_STREAMING,
            "model": settings.AUTOGEN_MODEL,
            "api_keys_status": {
                "openai": api_validation["openai_api_key"]["present"],
                "fred": api_validation["fred_api_key"]["present"],
                "tiingo": api_validation["tiingo_api_key"]["present"],
                "all_valid_format": api_validation["overall_status"]["all_keys_valid_format"]
            },
            "timestamp": "2025-01-28T19:00:00Z"
        }

    except Exception as e:
        logger.error(f"Health check failed: {str(e)}", exc_info=True)
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": "2025-01-28T19:00:00Z"
        }


@router.get("/security/api-keys")
async def validate_api_keys():
    """
    Validate API key configuration and format (SEC-001 endpoint).

    Returns:
        API key validation results with masked values
    """
    try:
        validation_results = settings.validate_api_keys()
        logger.info("API key validation requested - returning masked results")
        return validation_results

    except Exception as e:
        logger.error(f"Error validating API keys: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal server error",
                "message": "Failed to validate API key configuration"
            }
        )