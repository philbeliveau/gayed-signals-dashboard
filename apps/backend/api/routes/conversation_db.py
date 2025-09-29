"""
FastAPI routes for conversation database operations with enhanced error handling and validation.

These routes provide comprehensive CRUD operations for AutoGen agent conversations,
designed to work seamlessly with the Next.js frontend through standardized API patterns.
This is the database layer implementation for Story 1.0c.
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends, Query, Path, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...services.conversation_service import ConversationService
from ...models.conversation_models import (
    ConversationSession, ConversationCreateRequest, ConversationResponse,
    AgentMessage, ConversationStatus, AgentType, ContentSource, ContentSourceType,
    ConversationAnalytics, ConversationError
)

logger = logging.getLogger(__name__)

# Create router with prefix and tags for database operations
router = APIRouter(
    prefix="/api/conversations/db",
    tags=["conversation-database"],
    responses={
        404: {"description": "Conversation not found"},
        422: {"description": "Validation error"},
        500: {"description": "Internal server error"}
    }
)


def get_conversation_service(db: AsyncSession = Depends(get_db)) -> ConversationService:
    """Dependency to get conversation service with database session."""
    return ConversationService(db_session=db)


@router.post(
    "/",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new agent conversation in database",
    description="Create a new AutoGen agent conversation for financial content analysis with database persistence"
)
async def create_conversation(
    request: ConversationCreateRequest,
    service: ConversationService = Depends(get_conversation_service)
) -> ConversationResponse:
    """
    Create a new AutoGen agent conversation session with database persistence.

    Args:
        request: Conversation creation request with content source and user info
        service: Injected conversation service

    Returns:
        ConversationResponse: Created conversation details

    Raises:
        HTTPException: If creation fails due to validation or database errors
    """
    try:
        # Create conversation session object
        conversation = ConversationSession(
            user_id=request.user_id,
            content_source=request.content,
            status=ConversationStatus.INITIALIZED
        )

        # Save to database
        conversation_id = await service.create_conversation(conversation)

        logger.info(f"✅ Created conversation {conversation_id} for user {request.user_id}")

        return ConversationResponse(
            conversation_id=conversation_id,
            status=conversation.status,
            created_at=conversation.created_at,
            content_source=conversation.content_source,
            message="Conversation created successfully in database"
        )

    except ValueError as e:
        logger.warning(f"Validation error creating conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Validation error: {str(e)}"
        )

    except Exception as e:
        logger.error(f"❌ Unexpected error creating conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create conversation in database"
        )


@router.get(
    "/users/{user_id}/conversations",
    response_model=List[Dict[str, Any]],
    summary="Get user conversations from database",
    description="Retrieve paginated list of conversations for authenticated user from database"
)
async def get_user_conversations(
    user_id: str = Path(..., description="User ID (Clerk ID or database UUID)"),
    limit: int = Query(20, ge=1, le=100, description="Maximum conversations to return"),
    offset: int = Query(0, ge=0, description="Number of conversations to skip"),
    service: ConversationService = Depends(get_conversation_service)
) -> List[Dict[str, Any]]:
    """
    Get paginated list of user conversations with summary information from database.

    Args:
        user_id: User identifier (Clerk ID or database UUID)
        limit: Maximum number of conversations to return (1-100)
        offset: Number of conversations to skip for pagination
        service: Injected conversation service

    Returns:
        List of conversation summaries with metadata
    """
    try:
        conversations = await service.get_user_conversations(
            user_id=user_id,
            limit=limit,
            offset=offset
        )

        logger.info(f"✅ Retrieved {len(conversations)} conversations for user {user_id}")
        return conversations

    except Exception as e:
        logger.error(f"❌ Error retrieving user conversations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve conversations from database"
        )


@router.get(
    "/{conversation_id}",
    response_model=Dict[str, Any],
    summary="Get conversation details from database",
    description="Retrieve complete conversation with all agent messages from database"
)
async def get_conversation(
    conversation_id: str = Path(..., description="UUID of the conversation"),
    user_id: Optional[str] = Query(None, description="User ID for access control"),
    service: ConversationService = Depends(get_conversation_service)
) -> Dict[str, Any]:
    """
    Retrieve complete conversation with all agent messages and metadata from database.

    Args:
        conversation_id: UUID of the conversation to retrieve
        user_id: Optional user ID for access control
        service: Injected conversation service

    Returns:
        Dict containing conversation data and all messages

    Raises:
        HTTPException: If conversation not found or access denied
    """
    try:
        # Validate conversation_id format
        try:
            UUID(conversation_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid conversation ID format"
            )

        # Retrieve conversation
        conversation_data = await service.get_conversation(
            conversation_id=conversation_id,
            user_id=user_id
        )

        if not conversation_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or access denied"
            )

        logger.info(f"✅ Retrieved conversation {conversation_id} from database")
        return conversation_data

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"❌ Error retrieving conversation {conversation_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve conversation from database"
        )


@router.patch(
    "/{conversation_id}/status",
    response_model=Dict[str, Any],
    summary="Update conversation status in database",
    description="Update conversation status and completion metadata in database"
)
async def update_conversation_status(
    conversation_id: str = Path(..., description="UUID of the conversation"),
    status: ConversationStatus = Query(..., description="New conversation status"),
    final_recommendation: Optional[str] = Query(None, description="Final recommendation text"),
    confidence_score: Optional[float] = Query(None, ge=0.0, le=1.0, description="Confidence score"),
    service: ConversationService = Depends(get_conversation_service)
) -> Dict[str, Any]:
    """
    Update conversation status and completion metadata in database.

    Args:
        conversation_id: UUID of the conversation to update
        status: New conversation status
        final_recommendation: Optional final recommendation text
        confidence_score: Optional confidence score (0.0-1.0)
        service: Injected conversation service

    Returns:
        Dict with update confirmation

    Raises:
        HTTPException: If conversation not found or update fails
    """
    try:
        # Validate conversation_id format
        try:
            UUID(conversation_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid conversation ID format"
            )

        # Update conversation
        success = await service.update_conversation_status(
            conversation_id=conversation_id,
            status=status,
            final_recommendation=final_recommendation,
            confidence_score=confidence_score
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        logger.info(f"✅ Updated conversation {conversation_id} status to {status.value} in database")

        return {
            "conversation_id": conversation_id,
            "status": status.value,
            "updated_at": datetime.utcnow(),
            "message": "Status updated successfully in database"
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"❌ Error updating conversation status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update conversation status in database"
        )


@router.post(
    "/{conversation_id}/messages",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Add agent message to database",
    description="Add new agent message to conversation in database"
)
async def add_agent_message(
    conversation_id: str = Path(..., description="UUID of the conversation"),
    message: AgentMessage = ...,
    service: ConversationService = Depends(get_conversation_service)
) -> Dict[str, Any]:
    """
    Add new agent message to conversation in database.

    Args:
        conversation_id: UUID of the conversation
        message: AgentMessage object with content and metadata
        service: Injected conversation service

    Returns:
        Dict with message creation confirmation

    Raises:
        HTTPException: If conversation not found or message creation fails
    """
    try:
        # Validate conversation_id format
        try:
            UUID(conversation_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid conversation ID format"
            )

        # Add message to conversation
        message_id = await service.add_agent_message(
            message=message,
            conversation_id=conversation_id
        )

        logger.info(f"✅ Added message {message_id} to conversation {conversation_id} in database")

        return {
            "message_id": message_id,
            "conversation_id": conversation_id,
            "agent_type": message.agent_type.value,
            "agent_name": message.agent_name,
            "timestamp": message.timestamp,
            "message": "Agent message added successfully to database"
        }

    except ValueError as e:
        logger.warning(f"Validation error adding message: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Validation error: {str(e)}"
        )

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"❌ Error adding agent message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add agent message to database"
        )


@router.delete(
    "/{conversation_id}",
    response_model=Dict[str, Any],
    summary="Delete conversation from database",
    description="Delete conversation and all associated messages from database"
)
async def delete_conversation(
    conversation_id: str = Path(..., description="UUID of the conversation"),
    user_id: str = Query(..., description="User ID for access control"),
    service: ConversationService = Depends(get_conversation_service)
) -> Dict[str, Any]:
    """
    Delete conversation and all associated messages from database with user access control.

    Args:
        conversation_id: UUID of the conversation to delete
        user_id: User ID for access control
        service: Injected conversation service

    Returns:
        Dict with deletion confirmation

    Raises:
        HTTPException: If conversation not found or access denied
    """
    try:
        # Validate conversation_id format
        try:
            UUID(conversation_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid conversation ID format"
            )

        # Delete conversation with access control
        success = await service.delete_conversation(
            conversation_id=conversation_id,
            user_id=user_id
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or access denied"
            )

        logger.info(f"✅ Deleted conversation {conversation_id} from database")

        return {
            "conversation_id": conversation_id,
            "deleted_at": datetime.utcnow(),
            "message": "Conversation deleted successfully from database"
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"❌ Error deleting conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete conversation from database"
        )


@router.get(
    "/{conversation_id}/analytics",
    response_model=ConversationAnalytics,
    summary="Get conversation analytics from database",
    description="Generate analytics data for completed conversation from database"
)
async def get_conversation_analytics(
    conversation_id: str = Path(..., description="UUID of the conversation"),
    service: ConversationService = Depends(get_conversation_service)
) -> ConversationAnalytics:
    """
    Generate comprehensive analytics data for a conversation from database.

    Args:
        conversation_id: UUID of the conversation
        service: Injected conversation service

    Returns:
        ConversationAnalytics: Detailed analytics data

    Raises:
        HTTPException: If conversation not found or analytics generation fails
    """
    try:
        # Validate conversation_id format
        try:
            UUID(conversation_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid conversation ID format"
            )

        # Generate analytics
        analytics = await service.get_conversation_analytics(conversation_id)

        if not analytics:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        logger.info(f"✅ Generated analytics for conversation {conversation_id} from database")
        return analytics

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"❌ Error generating conversation analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate conversation analytics from database"
        )


@router.get(
    "/health",
    response_model=Dict[str, Any],
    summary="Database health check",
    description="Check conversation database service health and connectivity"
)
async def database_health_check(
    service: ConversationService = Depends(get_conversation_service)
) -> Dict[str, Any]:
    """
    Perform health check for conversation database service and connectivity.

    Args:
        service: Injected conversation service

    Returns:
        Dict with health status and performance metrics
    """
    try:
        health_data = await service.health_check()

        if health_data["status"] == "healthy":
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content=health_data
            )
        else:
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content=health_data
            )

    except Exception as e:
        logger.error(f"❌ Database health check failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow()
            }
        )


# Test routes for cross-platform validation
@router.get(
    "/test/cross-platform/{conversation_id}",
    response_model=Dict[str, Any],
    summary="Test cross-platform data consistency",
    description="Test that conversation data created in FastAPI is accessible from Next.js patterns"
)
async def test_cross_platform_access(
    conversation_id: str = Path(..., description="UUID of the conversation"),
    service: ConversationService = Depends(get_conversation_service)
) -> Dict[str, Any]:
    """
    Test cross-platform data consistency by verifying conversation accessibility.

    This endpoint validates that data created in FastAPI backend can be
    accessed using patterns that match Next.js frontend expectations.

    Args:
        conversation_id: UUID of the conversation to test
        service: Injected conversation service

    Returns:
        Dict with cross-platform validation results
    """
    try:
        # Validate conversation_id format
        try:
            UUID(conversation_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid conversation ID format"
            )

        # Test database access patterns
        start_time = datetime.utcnow()

        # Pattern 1: Direct conversation retrieval
        conversation_data = await service.get_conversation(conversation_id)

        # Pattern 2: Health check for database connectivity
        health_data = await service.health_check()

        # Pattern 3: Analytics generation
        analytics_data = await service.get_conversation_analytics(conversation_id)

        end_time = datetime.utcnow()
        response_time = (end_time - start_time).total_seconds()

        return {
            "conversation_id": conversation_id,
            "cross_platform_test": {
                "conversation_accessible": conversation_data is not None,
                "database_healthy": health_data["status"] == "healthy",
                "analytics_generated": analytics_data is not None,
                "response_time_seconds": response_time,
                "test_passed": all([
                    conversation_data is not None,
                    health_data["status"] == "healthy",
                    response_time < 1.0  # Performance requirement
                ])
            },
            "conversation_summary": {
                "message_count": conversation_data.get("message_count", 0) if conversation_data else 0,
                "status": conversation_data["conversation"]["status"] if conversation_data else "unknown"
            } if conversation_data else None,
            "timestamp": datetime.utcnow()
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"❌ Cross-platform test failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to perform cross-platform validation test"
        )


# Error handlers specific to database operations
@router.exception_handler(ValueError)
async def validation_exception_handler(request, exc: ValueError):
    """Handle validation errors with detailed messages."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error_type": "validation_error",
            "message": str(exc),
            "source": "database_validation",
            "timestamp": datetime.utcnow().isoformat()
        }
    )


@router.exception_handler(Exception)
async def general_exception_handler(request, exc: Exception):
    """Handle unexpected errors with safe error messages."""
    logger.error(f"❌ Unhandled error in conversation database API: {exc}")

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error_type": "database_error",
            "message": "An unexpected database error occurred",
            "source": "conversation_database_api",
            "timestamp": datetime.utcnow().isoformat()
        }
    )