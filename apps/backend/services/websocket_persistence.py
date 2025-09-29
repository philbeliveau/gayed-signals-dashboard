"""
WebSocket message persistence service for real-time conversation updates.

This service handles real-time WebSocket messages and persists them to the database,
ensuring that agent conversations are immediately available across both FastAPI
and Next.js platforms for Story 1.0c.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any, Set
from uuid import UUID
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError

from ..core.database import async_session_maker
from ..services.conversation_service import ConversationService
from ..models.conversation_models import (
    AgentMessage, ConversationStatus, AgentType, WebSocketMessage
)

logger = logging.getLogger(__name__)


class WebSocketPersistenceService:
    """
    Service for persisting WebSocket messages to database in real-time.

    Handles agent conversation messages streamed via WebSocket and ensures
    immediate database persistence for cross-platform accessibility.
    """

    def __init__(self):
        """Initialize the WebSocket persistence service."""
        self.active_connections: Dict[str, Set[str]] = {}  # conversation_id -> set of connection_ids
        self.conversation_service = ConversationService()
        self.message_queue: Dict[str, List[Dict[str, Any]]] = {}  # conversation_id -> queued messages
        self.processing_locks: Dict[str, asyncio.Lock] = {}  # conversation_id -> processing lock

    async def handle_websocket_message(
        self,
        websocket_message: WebSocketMessage,
        connection_id: str
    ) -> Dict[str, Any]:
        """
        Process incoming WebSocket message and persist to database.

        Args:
            websocket_message: WebSocket message with agent conversation data
            connection_id: Unique connection identifier

        Returns:
            Dict with processing result and persistence confirmation
        """
        try:
            conversation_id = websocket_message.conversation_id

            # Ensure processing lock exists for conversation
            if conversation_id not in self.processing_locks:
                self.processing_locks[conversation_id] = asyncio.Lock()

            # Register connection for this conversation
            if conversation_id not in self.active_connections:
                self.active_connections[conversation_id] = set()
            self.active_connections[conversation_id].add(connection_id)

            # Process message based on type
            async with self.processing_locks[conversation_id]:
                if websocket_message.type == "agent_message":
                    return await self._persist_agent_message(websocket_message, connection_id)

                elif websocket_message.type == "status_update":
                    return await self._persist_status_update(websocket_message, connection_id)

                elif websocket_message.type == "debate_complete":
                    return await self._persist_debate_completion(websocket_message, connection_id)

                elif websocket_message.type == "error":
                    return await self._handle_error_message(websocket_message, connection_id)

                else:
                    logger.warning(f"Unknown WebSocket message type: {websocket_message.type}")
                    return {
                        "success": False,
                        "error": f"Unknown message type: {websocket_message.type}",
                        "conversation_id": conversation_id,
                        "connection_id": connection_id
                    }

        except Exception as e:
            logger.error(f"❌ Error processing WebSocket message: {e}")
            return {
                "success": False,
                "error": str(e),
                "conversation_id": websocket_message.conversation_id,
                "connection_id": connection_id,
                "timestamp": datetime.utcnow()
            }

    async def _persist_agent_message(
        self,
        websocket_message: WebSocketMessage,
        connection_id: str
    ) -> Dict[str, Any]:
        """Persist agent message from WebSocket to database."""
        try:
            conversation_id = websocket_message.conversation_id
            message_data = websocket_message.data

            # Validate message data structure
            if not isinstance(message_data, dict):
                raise ValueError("Agent message data must be a dictionary")

            required_fields = ["agent_type", "agent_name", "content", "message_order"]
            missing_fields = [field for field in required_fields if field not in message_data]

            if missing_fields:
                raise ValueError(f"Missing required fields: {missing_fields}")

            # Create AgentMessage object
            agent_message = AgentMessage(
                agent_type=AgentType(message_data["agent_type"]),
                agent_name=message_data["agent_name"],
                content=message_data["content"],
                confidence_level=message_data.get("confidence_level"),
                cited_sources=message_data.get("cited_sources", []),
                signal_references=message_data.get("signal_references", []),
                message_order=message_data["message_order"],
                metadata={
                    **message_data.get("metadata", {}),
                    "websocket_connection_id": connection_id,
                    "received_via_websocket": True,
                    "websocket_timestamp": websocket_message.timestamp.isoformat()
                }
            )

            # Persist to database
            message_id = await self.conversation_service.add_agent_message(
                message=agent_message,
                conversation_id=conversation_id
            )

            # Verify persistence by attempting retrieval
            conversation_data = await self.conversation_service.get_conversation(conversation_id)
            if not conversation_data:
                raise ValueError(f"Failed to verify message persistence for conversation {conversation_id}")

            # Check if message was successfully added
            persisted_message = None
            for msg in conversation_data["messages"]:
                if msg["id"] == message_id:
                    persisted_message = msg
                    break

            if not persisted_message:
                raise ValueError(f"Message {message_id} not found after persistence")

            logger.info(f"✅ Persisted WebSocket agent message {message_id} to conversation {conversation_id}")

            return {
                "success": True,
                "message_id": message_id,
                "conversation_id": conversation_id,
                "agent_type": agent_message.agent_type.value,
                "message_order": agent_message.message_order,
                "persistence_verified": True,
                "connection_id": connection_id,
                "processed_at": datetime.utcnow(),
                "database_accessible": True
            }

        except ValueError as e:
            logger.warning(f"Validation error persisting agent message: {e}")
            return {
                "success": False,
                "error": f"Validation error: {str(e)}",
                "conversation_id": websocket_message.conversation_id,
                "connection_id": connection_id
            }

        except SQLAlchemyError as e:
            logger.error(f"❌ Database error persisting agent message: {e}")
            return {
                "success": False,
                "error": "Database error occurred",
                "conversation_id": websocket_message.conversation_id,
                "connection_id": connection_id,
                "database_accessible": False
            }

        except Exception as e:
            logger.error(f"❌ Unexpected error persisting agent message: {e}")
            return {
                "success": False,
                "error": str(e),
                "conversation_id": websocket_message.conversation_id,
                "connection_id": connection_id
            }

    async def _persist_status_update(
        self,
        websocket_message: WebSocketMessage,
        connection_id: str
    ) -> Dict[str, Any]:
        """Persist conversation status update from WebSocket to database."""
        try:
            conversation_id = websocket_message.conversation_id
            status_data = websocket_message.data

            if not isinstance(status_data, dict):
                raise ValueError("Status update data must be a dictionary")

            if "status" not in status_data:
                raise ValueError("Status field is required")

            # Update conversation status
            success = await self.conversation_service.update_conversation_status(
                conversation_id=conversation_id,
                status=ConversationStatus(status_data["status"]),
                final_recommendation=status_data.get("final_recommendation"),
                confidence_score=status_data.get("confidence_score")
            )

            if not success:
                raise ValueError(f"Failed to update status for conversation {conversation_id}")

            # Verify update by retrieving conversation
            conversation_data = await self.conversation_service.get_conversation(conversation_id)
            if not conversation_data:
                raise ValueError(f"Failed to verify status update for conversation {conversation_id}")

            current_status = conversation_data["conversation"]["status"]
            if current_status != status_data["status"]:
                raise ValueError(f"Status update verification failed: expected {status_data['status']}, got {current_status}")

            logger.info(f"✅ Persisted WebSocket status update for conversation {conversation_id}: {status_data['status']}")

            return {
                "success": True,
                "conversation_id": conversation_id,
                "status": status_data["status"],
                "update_verified": True,
                "connection_id": connection_id,
                "processed_at": datetime.utcnow()
            }

        except ValueError as e:
            logger.warning(f"Validation error persisting status update: {e}")
            return {
                "success": False,
                "error": f"Validation error: {str(e)}",
                "conversation_id": websocket_message.conversation_id,
                "connection_id": connection_id
            }

        except SQLAlchemyError as e:
            logger.error(f"❌ Database error persisting status update: {e}")
            return {
                "success": False,
                "error": "Database error occurred",
                "conversation_id": websocket_message.conversation_id,
                "connection_id": connection_id
            }

        except Exception as e:
            logger.error(f"❌ Unexpected error persisting status update: {e}")
            return {
                "success": False,
                "error": str(e),
                "conversation_id": websocket_message.conversation_id,
                "connection_id": connection_id
            }

    async def _persist_debate_completion(
        self,
        websocket_message: WebSocketMessage,
        connection_id: str
    ) -> Dict[str, Any]:
        """Persist debate completion data from WebSocket to database."""
        try:
            conversation_id = websocket_message.conversation_id
            completion_data = websocket_message.data

            if not isinstance(completion_data, dict):
                raise ValueError("Debate completion data must be a dictionary")

            # Update conversation to completed status with final data
            success = await self.conversation_service.update_conversation_status(
                conversation_id=conversation_id,
                status=ConversationStatus.COMPLETED,
                final_recommendation=completion_data.get("final_recommendation"),
                confidence_score=completion_data.get("confidence_score")
            )

            if not success:
                raise ValueError(f"Failed to complete conversation {conversation_id}")

            # Generate and store analytics if available
            analytics = await self.conversation_service.get_conversation_analytics(conversation_id)

            logger.info(f"✅ Persisted WebSocket debate completion for conversation {conversation_id}")

            return {
                "success": True,
                "conversation_id": conversation_id,
                "status": "completed",
                "final_recommendation": completion_data.get("final_recommendation"),
                "confidence_score": completion_data.get("confidence_score"),
                "analytics_generated": analytics is not None,
                "connection_id": connection_id,
                "completed_at": datetime.utcnow()
            }

        except ValueError as e:
            logger.warning(f"Validation error persisting debate completion: {e}")
            return {
                "success": False,
                "error": f"Validation error: {str(e)}",
                "conversation_id": websocket_message.conversation_id,
                "connection_id": connection_id
            }

        except Exception as e:
            logger.error(f"❌ Error persisting debate completion: {e}")
            return {
                "success": False,
                "error": str(e),
                "conversation_id": websocket_message.conversation_id,
                "connection_id": connection_id
            }

    async def _handle_error_message(
        self,
        websocket_message: WebSocketMessage,
        connection_id: str
    ) -> Dict[str, Any]:
        """Handle error messages from WebSocket conversations."""
        try:
            conversation_id = websocket_message.conversation_id
            error_data = websocket_message.data

            # Update conversation status to error if not already completed
            conversation_data = await self.conversation_service.get_conversation(conversation_id)

            if conversation_data and conversation_data["conversation"]["status"] not in ["completed", "cancelled"]:
                await self.conversation_service.update_conversation_status(
                    conversation_id=conversation_id,
                    status=ConversationStatus.ERROR
                )

            logger.warning(f"⚠️ WebSocket error for conversation {conversation_id}: {error_data}")

            return {
                "success": True,
                "conversation_id": conversation_id,
                "error_handled": True,
                "error_data": error_data,
                "connection_id": connection_id,
                "handled_at": datetime.utcnow()
            }

        except Exception as e:
            logger.error(f"❌ Error handling WebSocket error message: {e}")
            return {
                "success": False,
                "error": str(e),
                "conversation_id": websocket_message.conversation_id,
                "connection_id": connection_id
            }

    async def disconnect_client(self, conversation_id: str, connection_id: str) -> None:
        """Handle client disconnection and cleanup."""
        try:
            if conversation_id in self.active_connections:
                self.active_connections[conversation_id].discard(connection_id)

                # Clean up empty conversation connections
                if not self.active_connections[conversation_id]:
                    del self.active_connections[conversation_id]

                    # Clean up processing locks for inactive conversations
                    if conversation_id in self.processing_locks:
                        del self.processing_locks[conversation_id]

            logger.info(f"✅ Disconnected client {connection_id} from conversation {conversation_id}")

        except Exception as e:
            logger.error(f"❌ Error disconnecting client: {e}")

    async def get_active_connections(self, conversation_id: str) -> List[str]:
        """Get list of active connection IDs for a conversation."""
        return list(self.active_connections.get(conversation_id, set()))

    async def broadcast_to_conversation(
        self,
        conversation_id: str,
        message: Dict[str, Any],
        exclude_connection: Optional[str] = None
    ) -> int:
        """
        Broadcast message to all active connections for a conversation.

        Returns:
            int: Number of connections that received the broadcast
        """
        try:
            connections = self.active_connections.get(conversation_id, set())

            if exclude_connection:
                connections = connections - {exclude_connection}

            # This would typically involve actual WebSocket broadcasting
            # For now, we'll log the broadcast action
            logger.info(f"📢 Broadcasting to {len(connections)} connections for conversation {conversation_id}")

            return len(connections)

        except Exception as e:
            logger.error(f"❌ Error broadcasting to conversation: {e}")
            return 0

    async def health_check(self) -> Dict[str, Any]:
        """Health check for WebSocket persistence service."""
        try:
            # Test database connectivity through conversation service
            db_health = await self.conversation_service.health_check()

            return {
                "status": "healthy" if db_health["status"] == "healthy" else "degraded",
                "active_conversations": len(self.active_connections),
                "total_connections": sum(len(conns) for conns in self.active_connections.values()),
                "processing_locks": len(self.processing_locks),
                "database_health": db_health["status"],
                "database_response_time": db_health.get("response_time_ms", 0),
                "timestamp": datetime.utcnow()
            }

        except Exception as e:
            logger.error(f"❌ WebSocket persistence health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow()
            }


# Global service instance
websocket_persistence_service = WebSocketPersistenceService()