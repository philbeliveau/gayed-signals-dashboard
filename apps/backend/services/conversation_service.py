"""
Conversation service for database operations with AutoGen agent conversations.

This service provides CRUD operations for conversations and agent messages,
designed to work seamlessly with both FastAPI backend and Next.js frontend
through Prisma-compatible patterns.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from uuid import UUID

from sqlalchemy import text, select, update, delete, and_, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

from ..core.database import get_db, engine
from ..models.conversation_models import (
    ConversationSession, AgentMessage, ContentSource, ConversationStatus,
    AgentType, ContentSourceType, ConversationAnalytics, AgentPerformanceMetrics
)

logger = logging.getLogger(__name__)


class ConversationService:
    """
    Service for conversation database operations with enhanced error handling
    and performance optimizations for AutoGen agent conversations.
    """

    def __init__(self, db_session: Optional[AsyncSession] = None):
        """Initialize service with optional database session."""
        self._db_session = db_session

    async def _get_session(self) -> AsyncSession:
        """Get database session, using injected session or creating new one."""
        if self._db_session:
            return self._db_session

        # Create new session for standalone usage
        from ..core.database import async_session_maker
        return async_session_maker()

    async def create_conversation(self, conversation: ConversationSession) -> str:
        """
        Create new conversation in database with comprehensive error handling.

        Args:
            conversation: ConversationSession object with all required fields

        Returns:
            str: ID of created conversation

        Raises:
            ValueError: If conversation data is invalid
            SQLAlchemyError: If database operation fails
        """
        session = await self._get_session()

        try:
            # Validate user ID format
            try:
                UUID(conversation.user_id)
            except ValueError:
                raise ValueError(f"Invalid user_id format: {conversation.user_id}")

            # Insert conversation with optimized query
            query = text("""
                INSERT INTO conversations (
                    id, user_id, content_type, content_title, content_url,
                    content_author, content_published_at, content_data,
                    status, created_at, updated_at, metadata
                ) VALUES (
                    :id, :user_id, :content_type, :content_title, :content_url,
                    :content_author, :content_published_at, :content_data,
                    :status, :created_at, :updated_at, :metadata
                )
                RETURNING id
            """)

            # Prepare content data as JSON
            content_data = {
                "content": conversation.content_source.content,
                "metadata": conversation.content_source.metadata
            }

            result = await session.execute(query, {
                "id": conversation.id,
                "user_id": conversation.user_id,
                "content_type": conversation.content_source.type.value,
                "content_title": conversation.content_source.title,
                "content_url": conversation.content_source.url,
                "content_author": conversation.content_source.author,
                "content_published_at": conversation.content_source.published_at,
                "content_data": json.dumps(content_data),
                "status": conversation.status.value,
                "created_at": conversation.created_at,
                "updated_at": conversation.updated_at,
                "metadata": json.dumps(conversation.metadata)
            })

            await session.commit()
            conversation_id = result.scalar()

            logger.info(f"✅ Created conversation {conversation_id} for user {conversation.user_id}")
            return conversation_id

        except IntegrityError as e:
            await session.rollback()
            logger.error(f"❌ Database integrity error creating conversation: {e}")
            raise ValueError(f"Failed to create conversation: {str(e)}")

        except SQLAlchemyError as e:
            await session.rollback()
            logger.error(f"❌ Database error creating conversation: {e}")
            raise

        except Exception as e:
            await session.rollback()
            logger.error(f"❌ Unexpected error creating conversation: {e}")
            raise

        finally:
            if not self._db_session:
                await session.close()

    async def add_agent_message(self, message: AgentMessage, conversation_id: str) -> str:
        """
        Add agent message to conversation with validation and performance optimization.

        Args:
            message: AgentMessage object with all required fields
            conversation_id: UUID of the conversation

        Returns:
            str: ID of created message

        Raises:
            ValueError: If message data is invalid
            SQLAlchemyError: If database operation fails
        """
        session = await self._get_session()

        try:
            # Validate conversation exists and user has access
            conversation_check = await session.execute(
                text("SELECT user_id FROM conversations WHERE id = :conversation_id"),
                {"conversation_id": conversation_id}
            )

            if not conversation_check.scalar():
                raise ValueError(f"Conversation {conversation_id} not found")

            # Insert agent message
            query = text("""
                INSERT INTO agent_messages (
                    id, conversation_id, agent_type, agent_name, content,
                    confidence_level, message_order, timestamp, cited_sources,
                    signal_references, metadata
                ) VALUES (
                    :id, :conversation_id, :agent_type, :agent_name, :content,
                    :confidence_level, :message_order, :timestamp, :cited_sources,
                    :signal_references, :metadata
                )
                RETURNING id
            """)

            result = await session.execute(query, {
                "id": message.id,
                "conversation_id": conversation_id,
                "agent_type": message.agent_type.value,
                "agent_name": message.agent_name,
                "content": message.content,
                "confidence_level": message.confidence_level,
                "message_order": message.message_order,
                "timestamp": message.timestamp,
                "cited_sources": message.cited_sources,
                "signal_references": message.signal_references,
                "metadata": json.dumps(message.metadata)
            })

            # Update conversation updated_at timestamp
            await session.execute(
                text("UPDATE conversations SET updated_at = NOW() WHERE id = :conversation_id"),
                {"conversation_id": conversation_id}
            )

            await session.commit()
            message_id = result.scalar()

            logger.info(f"✅ Added message {message_id} to conversation {conversation_id}")
            return message_id

        except SQLAlchemyError as e:
            await session.rollback()
            logger.error(f"❌ Database error adding message: {e}")
            raise

        except Exception as e:
            await session.rollback()
            logger.error(f"❌ Unexpected error adding message: {e}")
            raise

        finally:
            if not self._db_session:
                await session.close()

    async def get_conversation(self, conversation_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Retrieve conversation with all messages and full data.

        Args:
            conversation_id: UUID of the conversation
            user_id: Optional user ID for access control

        Returns:
            Dict containing conversation and messages, or None if not found
        """
        session = await self._get_session()

        try:
            # Query conversation with user access control
            conversation_query = text("""
                SELECT
                    c.*,
                    u.clerk_id
                FROM conversations c
                JOIN users u ON c.user_id = u.id
                WHERE c.id = :conversation_id
                AND (:user_id IS NULL OR u.clerk_id = :user_id)
            """)

            # Query messages ordered by message_order
            messages_query = text("""
                SELECT * FROM agent_messages
                WHERE conversation_id = :conversation_id
                ORDER BY message_order ASC, timestamp ASC
            """)

            # Execute queries concurrently for performance
            conversation_task = session.execute(conversation_query, {
                "conversation_id": conversation_id,
                "user_id": user_id
            })
            messages_task = session.execute(messages_query, {
                "conversation_id": conversation_id
            })

            conversation_result, messages_result = await asyncio.gather(
                conversation_task, messages_task
            )

            conversation_row = conversation_result.first()
            if not conversation_row:
                logger.warning(f"Conversation {conversation_id} not found or access denied")
                return None

            messages_rows = messages_result.fetchall()

            # Parse JSON fields safely
            try:
                content_data = json.loads(conversation_row.content_data) if conversation_row.content_data else {}
                metadata = json.loads(conversation_row.metadata) if conversation_row.metadata else {}
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON in conversation {conversation_id}")
                content_data = {}
                metadata = {}

            # Build response structure
            conversation_data = {
                "id": conversation_row.id,
                "user_id": conversation_row.user_id,
                "clerk_id": conversation_row.clerk_id,
                "content_source": {
                    "type": conversation_row.content_type,
                    "title": conversation_row.content_title,
                    "content": content_data.get("content", ""),
                    "url": conversation_row.content_url,
                    "author": conversation_row.content_author,
                    "published_at": conversation_row.content_published_at,
                    "metadata": content_data.get("metadata", {})
                },
                "status": conversation_row.status,
                "created_at": conversation_row.created_at,
                "updated_at": conversation_row.updated_at,
                "completed_at": conversation_row.completed_at,
                "consensus_reached": conversation_row.consensus_reached,
                "final_recommendation": conversation_row.final_recommendation,
                "confidence_score": conversation_row.confidence_score,
                "metadata": metadata
            }

            # Parse messages with error handling
            messages_data = []
            for msg in messages_rows:
                try:
                    msg_metadata = json.loads(msg.metadata) if msg.metadata else {}
                except json.JSONDecodeError:
                    msg_metadata = {}

                messages_data.append({
                    "id": msg.id,
                    "agent_type": msg.agent_type,
                    "agent_name": msg.agent_name,
                    "content": msg.content,
                    "confidence_level": msg.confidence_level,
                    "cited_sources": msg.cited_sources or [],
                    "signal_references": msg.signal_references or [],
                    "timestamp": msg.timestamp,
                    "message_order": msg.message_order,
                    "metadata": msg_metadata
                })

            return {
                "conversation": conversation_data,
                "messages": messages_data,
                "message_count": len(messages_data)
            }

        except SQLAlchemyError as e:
            logger.error(f"❌ Database error retrieving conversation: {e}")
            raise

        except Exception as e:
            logger.error(f"❌ Unexpected error retrieving conversation: {e}")
            raise

        finally:
            if not self._db_session:
                await session.close()

    async def get_user_conversations(self, user_id: str, limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
        """
        Get paginated list of user conversations with summary data.

        Args:
            user_id: Clerk user ID or database user UUID
            limit: Maximum number of conversations to return
            offset: Number of conversations to skip

        Returns:
            List of conversation summaries with latest messages
        """
        session = await self._get_session()

        try:
            # Query with message counts and latest message preview
            query = text("""
                SELECT
                    c.*,
                    COUNT(m.id) as message_count,
                    MAX(m.timestamp) as last_message_at,
                    ARRAY_AGG(
                        DISTINCT m.agent_type
                        ORDER BY m.agent_type
                    ) FILTER (WHERE m.agent_type IS NOT NULL) as agents_participated
                FROM conversations c
                LEFT JOIN agent_messages m ON c.id = m.conversation_id
                JOIN users u ON c.user_id = u.id
                WHERE u.clerk_id = :user_id OR u.id = :user_id
                GROUP BY c.id
                ORDER BY c.updated_at DESC
                LIMIT :limit OFFSET :offset
            """)

            result = await session.execute(query, {
                "user_id": user_id,
                "limit": limit,
                "offset": offset
            })

            conversations = []
            for row in result.fetchall():
                try:
                    content_data = json.loads(row.content_data) if row.content_data else {}
                    metadata = json.loads(row.metadata) if row.metadata else {}
                except json.JSONDecodeError:
                    content_data = {}
                    metadata = {}

                conversations.append({
                    "id": row.id,
                    "content_source": {
                        "type": row.content_type,
                        "title": row.content_title,
                        "url": row.content_url,
                        "author": row.content_author,
                        "published_at": row.content_published_at
                    },
                    "status": row.status,
                    "created_at": row.created_at,
                    "updated_at": row.updated_at,
                    "completed_at": row.completed_at,
                    "consensus_reached": row.consensus_reached,
                    "final_recommendation": row.final_recommendation,
                    "confidence_score": row.confidence_score,
                    "message_count": row.message_count or 0,
                    "last_message_at": row.last_message_at,
                    "agents_participated": row.agents_participated or [],
                    "metadata": metadata
                })

            logger.info(f"✅ Retrieved {len(conversations)} conversations for user {user_id}")
            return conversations

        except SQLAlchemyError as e:
            logger.error(f"❌ Database error retrieving user conversations: {e}")
            raise

        except Exception as e:
            logger.error(f"❌ Unexpected error retrieving user conversations: {e}")
            raise

        finally:
            if not self._db_session:
                await session.close()

    async def update_conversation_status(self, conversation_id: str, status: ConversationStatus,
                                       final_recommendation: Optional[str] = None,
                                       confidence_score: Optional[float] = None) -> bool:
        """
        Update conversation status and completion data.

        Args:
            conversation_id: UUID of the conversation
            status: New conversation status
            final_recommendation: Optional final recommendation text
            confidence_score: Optional confidence score (0.0-1.0)

        Returns:
            bool: True if update successful, False if conversation not found
        """
        session = await self._get_session()

        try:
            # Build dynamic update query
            update_fields = ["status = :status", "updated_at = NOW()"]
            params = {"conversation_id": conversation_id, "status": status.value}

            if status == ConversationStatus.COMPLETED:
                update_fields.append("completed_at = NOW()")
                update_fields.append("consensus_reached = true")

            if final_recommendation:
                update_fields.append("final_recommendation = :final_recommendation")
                params["final_recommendation"] = final_recommendation

            if confidence_score is not None:
                update_fields.append("confidence_score = :confidence_score")
                params["confidence_score"] = confidence_score

            query = text(f"""
                UPDATE conversations
                SET {', '.join(update_fields)}
                WHERE id = :conversation_id
            """)

            result = await session.execute(query, params)
            await session.commit()

            rows_affected = result.rowcount
            if rows_affected > 0:
                logger.info(f"✅ Updated conversation {conversation_id} status to {status.value}")
                return True
            else:
                logger.warning(f"Conversation {conversation_id} not found for status update")
                return False

        except SQLAlchemyError as e:
            await session.rollback()
            logger.error(f"❌ Database error updating conversation status: {e}")
            raise

        except Exception as e:
            await session.rollback()
            logger.error(f"❌ Unexpected error updating conversation status: {e}")
            raise

        finally:
            if not self._db_session:
                await session.close()

    async def delete_conversation(self, conversation_id: str, user_id: str) -> bool:
        """
        Delete conversation and all associated messages with user access control.

        Args:
            conversation_id: UUID of the conversation
            user_id: Clerk user ID for access control

        Returns:
            bool: True if deletion successful, False if not found or access denied
        """
        session = await self._get_session()

        try:
            # Check user access and get internal user ID
            access_check = await session.execute(
                text("""
                    SELECT c.id FROM conversations c
                    JOIN users u ON c.user_id = u.id
                    WHERE c.id = :conversation_id AND u.clerk_id = :user_id
                """),
                {"conversation_id": conversation_id, "user_id": user_id}
            )

            if not access_check.scalar():
                logger.warning(f"Access denied or conversation not found: {conversation_id}")
                return False

            # Delete messages first (due to foreign key constraint)
            await session.execute(
                text("DELETE FROM agent_messages WHERE conversation_id = :conversation_id"),
                {"conversation_id": conversation_id}
            )

            # Delete conversation
            result = await session.execute(
                text("DELETE FROM conversations WHERE id = :conversation_id"),
                {"conversation_id": conversation_id}
            )

            await session.commit()

            if result.rowcount > 0:
                logger.info(f"✅ Deleted conversation {conversation_id}")
                return True
            else:
                return False

        except SQLAlchemyError as e:
            await session.rollback()
            logger.error(f"❌ Database error deleting conversation: {e}")
            raise

        except Exception as e:
            await session.rollback()
            logger.error(f"❌ Unexpected error deleting conversation: {e}")
            raise

        finally:
            if not self._db_session:
                await session.close()

    async def get_conversation_analytics(self, conversation_id: str) -> Optional[ConversationAnalytics]:
        """
        Generate analytics data for a completed conversation.

        Args:
            conversation_id: UUID of the conversation

        Returns:
            ConversationAnalytics object or None if conversation not found
        """
        session = await self._get_session()

        try:
            # Get conversation basics
            conv_query = text("""
                SELECT created_at, completed_at, status, confidence_score
                FROM conversations WHERE id = :conversation_id
            """)

            # Get agent performance metrics
            metrics_query = text("""
                SELECT
                    agent_type,
                    COUNT(*) as message_count,
                    AVG(confidence_level) as avg_confidence,
                    ARRAY_AGG(confidence_level) FILTER (WHERE confidence_level IS NOT NULL) as confidence_scores,
                    MIN(timestamp) as first_message,
                    MAX(timestamp) as last_message
                FROM agent_messages
                WHERE conversation_id = :conversation_id
                GROUP BY agent_type
            """)

            conv_result = await session.execute(conv_query, {"conversation_id": conversation_id})
            metrics_result = await session.execute(metrics_query, {"conversation_id": conversation_id})

            conv_row = conv_result.first()
            if not conv_row:
                return None

            # Calculate duration if completed
            duration_seconds = None
            if conv_row.completed_at and conv_row.created_at:
                duration_seconds = (conv_row.completed_at - conv_row.created_at).total_seconds()

            # Build agent metrics
            agent_metrics = {}
            total_messages = 0

            for metric_row in metrics_result.fetchall():
                agent_type = AgentType(metric_row.agent_type)

                # Calculate average response time (simplified)
                avg_response_time = 0.0
                if metric_row.first_message and metric_row.last_message:
                    time_span = (metric_row.last_message - metric_row.first_message).total_seconds()
                    avg_response_time = time_span / max(1, metric_row.message_count - 1)

                agent_metrics[agent_type] = AgentPerformanceMetrics(
                    agent_type=agent_type,
                    total_messages=metric_row.message_count,
                    average_response_time=avg_response_time,
                    confidence_scores=metric_row.confidence_scores or [],
                    error_count=0,  # Would need additional tracking
                    last_active=metric_row.last_message
                )

                total_messages += metric_row.message_count

            return ConversationAnalytics(
                conversation_id=conversation_id,
                total_duration_seconds=duration_seconds,
                total_messages=total_messages,
                agent_metrics=agent_metrics,
                consensus_quality=conv_row.confidence_score,
                client_satisfaction=None,  # Would need user feedback
                generated_at=datetime.utcnow()
            )

        except SQLAlchemyError as e:
            logger.error(f"❌ Database error generating analytics: {e}")
            raise

        except Exception as e:
            logger.error(f"❌ Unexpected error generating analytics: {e}")
            raise

        finally:
            if not self._db_session:
                await session.close()

    async def health_check(self) -> Dict[str, Any]:
        """
        Perform database health check for monitoring.

        Returns:
            Dict with health status and performance metrics
        """
        session = await self._get_session()

        try:
            start_time = datetime.utcnow()

            # Test basic connectivity
            await session.execute(text("SELECT 1"))

            # Get basic table stats
            stats_query = text("""
                SELECT
                    'conversations' as table_name,
                    COUNT(*) as row_count,
                    MAX(updated_at) as last_activity
                FROM conversations
                UNION ALL
                SELECT
                    'agent_messages' as table_name,
                    COUNT(*) as row_count,
                    MAX(timestamp) as last_activity
                FROM agent_messages
            """)

            stats_result = await session.execute(stats_query)

            response_time = (datetime.utcnow() - start_time).total_seconds()

            table_stats = {}
            for row in stats_result.fetchall():
                table_stats[row.table_name] = {
                    "row_count": row.row_count,
                    "last_activity": row.last_activity
                }

            return {
                "status": "healthy",
                "response_time_ms": response_time * 1000,
                "table_stats": table_stats,
                "database_engine": "postgresql+asyncpg",
                "timestamp": datetime.utcnow()
            }

        except Exception as e:
            logger.error(f"❌ Database health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow()
            }

        finally:
            if not self._db_session:
                await session.close()


# Global service instance for dependency injection
conversation_service = ConversationService()