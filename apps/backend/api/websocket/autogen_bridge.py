"""
AutoGen-WebSocket Integration Bridge
Story 2.8: AutoGen-WebSocket Integration Bridge

Bridge connecting AutoGen agent conversations to WebSocket infrastructure for real-time streaming.
Enables live agent debates to stream to frontend clients while maintaining existing demo mode fallback.
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List, Callable, Awaitable
from collections import defaultdict
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

# Redis for persistent rate limiting
try:
    import redis.asyncio as redis
    redis_available = True
except ImportError:
    redis = None
    redis_available = False

logger = logging.getLogger(__name__)

# Import dependencies with graceful fallback
AutoGenConversationManager = None
AgentMessage = None

try:
    from ..v1.conversations import AutoGenConversationManager
except ImportError:
    logger.warning("AutoGen conversation modules not available - demo fallback only")

try:
    from models.conversation import AgentMessage
except ImportError:
    logger.warning("Database models not available - limited functionality")


class AutoGenWebSocketBridge:
    """
    Bridge connecting AutoGen conversations to WebSocket infrastructure.

    This class manages the translation between AutoGen conversation events
    and WebSocket messages, enabling real-time streaming of agent debates
    to frontend clients.
    """

    def __init__(self):
        # Active WebSocket connections per conversation
        self.conversation_websockets: Dict[str, List[WebSocket]] = {}

        # Active AutoGen conversation managers
        self.active_conversations: Dict[str, AutoGenConversationManager] = {}

        # Demo mode conversations for fallback
        self.demo_conversations: Dict[str, 'DemoConversationManager'] = {}

        # WebSocket connection metadata
        self.connection_metadata: Dict[str, Dict[str, Any]] = {}

        # Rate limiting configuration
        self.max_connections_per_minute = 10
        self.max_connections_per_user = 5

        # Redis connection for persistent rate limiting
        self.redis_client: Optional[redis.Redis] = None
        if redis_available:
            try:
                import os
                redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
                self.redis_client = redis.from_url(redis_url, decode_responses=True)
                logger.info("Redis rate limiting enabled")
            except Exception as e:
                logger.warning(f"Redis connection failed, using in-memory rate limiting: {e}")
                self.redis_client = None
        else:
            logger.warning("Redis not available, using in-memory rate limiting")

        # Fallback in-memory rate limiting when Redis unavailable
        self.connection_attempts: Dict[str, List[datetime]] = defaultdict(list)

        # Health monitoring
        self.autogen_backend_healthy = True
        self.last_health_check = datetime.now(timezone.utc)

    async def start_conversation_stream(
        self,
        websocket: WebSocket,
        conversation_id: str,
        content: str,
        content_type: str,
        user_id: Optional[str] = None,
        db: Optional[AsyncSession] = None
    ) -> None:
        """
        Start AutoGen conversation with real-time WebSocket streaming.

        Args:
            websocket: WebSocket connection for streaming
            conversation_id: Unique conversation identifier
            content: Content to analyze
            content_type: Type of content (text, youtube, substack)
            user_id: Optional authenticated user ID
            db: Optional database session
        """
        try:
            # Rate limiting check before accepting connection
            if user_id and not await self._check_rate_limit(user_id):
                await websocket.close(code=1008, reason="Rate limit exceeded")
                logger.warning(f"Rate limit exceeded for user {user_id}")
                return

            # Accept WebSocket connection
            await websocket.accept()
            logger.info(f"WebSocket accepted for conversation {conversation_id}")

            # Record connection attempt for rate limiting
            if user_id:
                await self._record_connection_attempt(user_id)

            # Register WebSocket for this conversation
            if conversation_id not in self.conversation_websockets:
                self.conversation_websockets[conversation_id] = []
            self.conversation_websockets[conversation_id].append(websocket)

            # Store connection metadata
            self.connection_metadata[f"{conversation_id}_{id(websocket)}"] = {
                "conversation_id": conversation_id,
                "user_id": user_id,
                "connected_at": datetime.now(timezone.utc),
                "last_activity": datetime.now(timezone.utc)
            }

            # Send initial status
            await self.send_conversation_status(conversation_id, "initializing")

            try:
                # Attempt to create and start AutoGen conversation
                await self._start_autogen_conversation(conversation_id, content, content_type, user_id, db)

                # Keep WebSocket alive and handle messages
                await self._handle_websocket_messages(websocket, conversation_id)

            except Exception as autogen_error:
                logger.warning(f"AutoGen conversation failed: {autogen_error}")
                # Fallback to demo mode
                await self._start_demo_fallback(conversation_id, content, content_type)

                # Continue handling WebSocket
                await self._handle_websocket_messages(websocket, conversation_id)

        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected for conversation {conversation_id}")
        except Exception as e:
            logger.error(f"WebSocket stream error for conversation {conversation_id}: {e}")
            await self._send_error_to_websocket(websocket, str(e))
        finally:
            # Cleanup
            await self._cleanup_conversation_websocket(conversation_id, websocket)

    async def _start_autogen_conversation(
        self,
        conversation_id: str,
        content: str,
        content_type: str,
        user_id: Optional[str] = None,
        db: Optional[AsyncSession] = None
    ) -> None:
        """Start AutoGen conversation and set up event handlers."""

        # Create content source for AutoGen
        from ..v1.conversations import ContentSource
        content_source = ContentSource(
            type=content_type,
            title=f"Analysis Request - {content_type.title()}",
            content=content,
            publish_date=datetime.now(timezone.utc)
        )

        # Create AutoGen conversation manager
        manager = AutoGenConversationManager(
            session_id=conversation_id,
            content_source=content_source,
            signal_context=None,  # Could be enhanced with real signal data
            db_session=db,
            user_id=user_id
        )

        # Store active conversation
        self.active_conversations[conversation_id] = manager

        # Set up event handlers to bridge AutoGen events to WebSocket
        await self._setup_autogen_event_handlers(conversation_id, manager)

        # Initialize AutoGen agents
        await manager.initialize_agents()

        # Start the conversation in a background task
        asyncio.create_task(self._run_autogen_conversation(conversation_id, manager))

    async def _setup_autogen_event_handlers(
        self,
        conversation_id: str,
        manager: AutoGenConversationManager
    ) -> None:
        """Set up event handlers to translate AutoGen events to WebSocket messages."""

        # Store original methods and wrap them (for potential future use)
        # original_send_message = manager._send_message
        # original_send_error = manager._send_error

        async def enhanced_send_message(websocket: WebSocket, message: AgentMessage):
            """Enhanced message sender that broadcasts to all WebSocket connections."""
            # Convert AutoGen message to WebSocket format
            websocket_message = {
                "type": "agent_message",
                "session_id": conversation_id,
                "timestamp": message.timestamp.isoformat(),
                "data": {
                    "id": message.id,
                    "agentType": self._map_agent_id_to_type(message.agent_id),
                    "agentName": message.agent_name,
                    "role": self._get_agent_role(message.agent_id),
                    "message": message.content,
                    "confidence": message.confidence / 100.0 if message.confidence else 0.7,
                    "timestamp": message.timestamp.isoformat(),
                    "metadata": message.metadata
                }
            }

            # Broadcast to all WebSocket connections
            await self.broadcast_to_conversation(conversation_id, websocket_message)

        async def enhanced_send_error(websocket: WebSocket, error_message: str):
            """Enhanced error sender that broadcasts errors to all connections."""
            error_data = {
                "type": "error",
                "session_id": conversation_id,
                "data": {"message": error_message}
            }
            await self.broadcast_to_conversation(conversation_id, error_data)

        # Replace manager methods with enhanced versions
        manager._send_message = enhanced_send_message
        manager._send_error = enhanced_send_error

    def _map_agent_id_to_type(self, agent_id: str) -> str:
        """Map AutoGen agent IDs to frontend agent types."""
        mapping = {
            "financial_analyst": "FINANCIAL_ANALYST",
            "market_context": "MARKET_CONTEXT",
            "risk_challenger": "RISK_CHALLENGER"
        }
        return mapping.get(agent_id, "UNKNOWN")

    def _get_agent_role(self, agent_id: str) -> str:
        """Get agent role for frontend display."""
        mapping = {
            "financial_analyst": "analyst",
            "market_context": "context",
            "risk_challenger": "challenger"
        }
        return mapping.get(agent_id, "agent")

    async def _run_autogen_conversation(
        self,
        conversation_id: str,
        manager: AutoGenConversationManager
    ) -> None:
        """Run the AutoGen conversation in background task."""
        try:
            # Send active status
            await self.send_conversation_status(conversation_id, "active")

            # Create a mock WebSocket for the AutoGen manager
            # (The actual WebSocket broadcasting is handled by our enhanced methods)
            class MockWebSocket:
                async def send_text(self, data: str):
                    pass  # No-op, we handle broadcasting separately

            mock_ws = MockWebSocket()

            # Start the conversation
            await manager.start_conversation(mock_ws)

            # Send completion status
            await self.send_conversation_status(conversation_id, "completed")

        except Exception as e:
            logger.error(f"AutoGen conversation error: {e}")
            await self.send_conversation_status(conversation_id, "error")
            await self._start_demo_fallback(conversation_id, "", "text")

    async def _start_demo_fallback(
        self,
        conversation_id: str,
        content: str,
        content_type: str
    ) -> None:
        """Start demo mode fallback when AutoGen fails."""
        logger.info(f"Starting demo fallback for conversation {conversation_id}")

        # Notify clients about fallback mode
        fallback_message = {
            "type": "fallback_mode",
            "session_id": conversation_id,
            "data": {
                "mode": "demo",
                "reason": "autogen_unavailable",
                "message": "AutoGen backend unavailable, continuing in demo mode"
            }
        }
        await self.broadcast_to_conversation(conversation_id, fallback_message)

        # Create demo conversation manager
        demo_manager = DemoConversationManager(conversation_id, content)
        self.demo_conversations[conversation_id] = demo_manager

        # Start demo conversation
        await demo_manager.start_demo_conversation(
            lambda msg: self.broadcast_to_conversation(conversation_id, msg)
        )

    async def _handle_websocket_messages(
        self,
        websocket: WebSocket,
        conversation_id: str
    ) -> None:
        """Handle incoming WebSocket messages during conversation."""
        try:
            while True:
                # Wait for WebSocket messages
                data = await websocket.receive_text()
                message = json.loads(data)

                # Update last activity
                connection_key = f"{conversation_id}_{id(websocket)}"
                if connection_key in self.connection_metadata:
                    self.connection_metadata[connection_key]["last_activity"] = datetime.now(timezone.utc)

                # Handle client commands
                if message.get("type") == "control":
                    await self._handle_client_control(conversation_id, message)
                elif message.get("type") == "ping":
                    # Respond to ping for connection health
                    await websocket.send_text(json.dumps({"type": "pong"}))

        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected for conversation {conversation_id}")
        except Exception as e:
            logger.error(f"WebSocket message handling error: {e}")

    async def _handle_client_control(
        self,
        conversation_id: str,
        message: Dict[str, Any]
    ) -> None:
        """Handle client control commands (pause, resume, etc.)."""
        command = message.get("command")

        if command == "pause":
            # Could pause AutoGen conversation
            logger.info(f"Pause command received for {conversation_id}")
        elif command == "resume":
            # Could resume AutoGen conversation
            logger.info(f"Resume command received for {conversation_id}")
        elif command == "stop":
            # Stop conversation
            await self.send_conversation_status(conversation_id, "stopped")

    async def send_conversation_status(
        self,
        conversation_id: str,
        status: str
    ) -> None:
        """Send conversation status update to all WebSocket clients."""
        status_message = {
            "type": "conversation_status",
            "session_id": conversation_id,
            "data": {
                "status": status,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        }
        await self.broadcast_to_conversation(conversation_id, status_message)

    async def broadcast_to_conversation(
        self,
        conversation_id: str,
        message: Dict[str, Any]
    ) -> None:
        """Broadcast message to all WebSocket connections for a conversation."""
        if conversation_id not in self.conversation_websockets:
            return

        # Get all active websockets for this conversation
        websockets = self.conversation_websockets[conversation_id].copy()
        disconnected_websockets = []

        # Send message to all connected clients
        for websocket in websockets:
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.warning(f"Failed to send message to WebSocket: {e}")
                disconnected_websockets.append(websocket)

        # Remove disconnected websockets
        for websocket in disconnected_websockets:
            try:
                self.conversation_websockets[conversation_id].remove(websocket)
            except ValueError:
                pass  # Already removed

    async def _send_error_to_websocket(
        self,
        websocket: WebSocket,
        error_message: str
    ) -> None:
        """Send error message to specific WebSocket."""
        try:
            error_data = {
                "type": "error",
                "data": {"message": error_message}
            }
            await websocket.send_text(json.dumps(error_data))
        except Exception as e:
            logger.error(f"Failed to send error to WebSocket: {e}")

    async def _cleanup_conversation_websocket(
        self,
        conversation_id: str,
        websocket: WebSocket
    ) -> None:
        """Clean up WebSocket connection and conversation resources."""
        try:
            # Remove WebSocket from conversation list
            if conversation_id in self.conversation_websockets:
                try:
                    self.conversation_websockets[conversation_id].remove(websocket)
                except ValueError:
                    pass  # Already removed

                # If no more websockets, cleanup conversation
                if not self.conversation_websockets[conversation_id]:
                    del self.conversation_websockets[conversation_id]

                    # Cleanup AutoGen conversation
                    if conversation_id in self.active_conversations:
                        # AutoGen manager cleanup would go here
                        del self.active_conversations[conversation_id]

                    # Cleanup demo conversation
                    if conversation_id in self.demo_conversations:
                        del self.demo_conversations[conversation_id]

            # Remove connection metadata
            connection_key = f"{conversation_id}_{id(websocket)}"
            if connection_key in self.connection_metadata:
                del self.connection_metadata[connection_key]

        except Exception as e:
            logger.error(f"Cleanup error: {e}")

    def get_active_conversations(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all active conversations."""
        return {
            conversation_id: {
                "type": "autogen" if conversation_id in self.active_conversations else "demo",
                "websocket_connections": len(self.conversation_websockets.get(conversation_id, [])),
                "status": "active"  # Could be enhanced with real status
            }
            for conversation_id in {
                *self.active_conversations.keys(),
                *self.demo_conversations.keys()
            }
        }

    async def _check_rate_limit(self, user_id: str) -> bool:
        """
        Check if user has exceeded rate limits using Redis or in-memory fallback.

        Rate limits:
        - 10 connections per minute per user
        - 5 concurrent connections per user

        Args:
            user_id: User identifier

        Returns:
            True if within rate limits, False if exceeded
        """
        if self.redis_client:
            return await self._check_rate_limit_redis(user_id)
        else:
            return await self._check_rate_limit_memory(user_id)

    async def _check_rate_limit_redis(self, user_id: str) -> bool:
        """Redis-backed rate limiting with persistence across restarts."""
        try:
            now = datetime.now(timezone.utc)
            minute_key = f"rate_limit:{user_id}:{now.strftime('%Y%m%d%H%M')}"
            concurrent_key = f"concurrent:{user_id}"

            # Check connections per minute limit using Redis sorted set
            minute_count = await self.redis_client.zcard(minute_key)
            if minute_count >= self.max_connections_per_minute:
                logger.warning(f"User {user_id} exceeded connections per minute limit (Redis)")
                return False

            # Check concurrent connections limit
            concurrent_count = await self.redis_client.scard(concurrent_key)
            if concurrent_count >= self.max_connections_per_user:
                logger.warning(f"User {user_id} exceeded concurrent connections limit (Redis)")
                return False

            return True

        except Exception as e:
            logger.error(f"Redis rate limit check failed: {e}, falling back to memory")
            return await self._check_rate_limit_memory(user_id)

    async def _check_rate_limit_memory(self, user_id: str) -> bool:
        """In-memory rate limiting fallback."""
        now = datetime.now(timezone.utc)
        one_minute_ago = now - timedelta(minutes=1)

        # Clean old connection attempts
        user_attempts = self.connection_attempts[user_id]
        self.connection_attempts[user_id] = [
            attempt for attempt in user_attempts
            if attempt > one_minute_ago
        ]

        # Check connections per minute limit
        if len(self.connection_attempts[user_id]) >= self.max_connections_per_minute:
            logger.warning(f"User {user_id} exceeded connections per minute limit (memory)")
            return False

        # Check concurrent connections limit
        user_connections = sum(
            1 for metadata in self.connection_metadata.values()
            if metadata.get("user_id") == user_id
        )

        if user_connections >= self.max_connections_per_user:
            logger.warning(f"User {user_id} exceeded concurrent connections limit (memory)")
            return False

        return True

    async def _record_connection_attempt(self, user_id: str) -> None:
        """Record a connection attempt for rate limiting."""
        if self.redis_client:
            await self._record_connection_attempt_redis(user_id)
        else:
            self._record_connection_attempt_memory(user_id)

    async def _record_connection_attempt_redis(self, user_id: str) -> None:
        """Record connection attempt in Redis with TTL."""
        try:
            now = datetime.now(timezone.utc)
            timestamp = now.timestamp()
            minute_key = f"rate_limit:{user_id}:{now.strftime('%Y%m%d%H%M')}"
            concurrent_key = f"concurrent:{user_id}"

            # Add to minute counter with TTL
            await self.redis_client.zadd(minute_key, {str(timestamp): timestamp})
            await self.redis_client.expire(minute_key, 60)  # Expire after 1 minute

            # Add to concurrent connections set
            connection_id = f"{user_id}_{timestamp}"
            await self.redis_client.sadd(concurrent_key, connection_id)
            await self.redis_client.expire(concurrent_key, 3600)  # Expire after 1 hour

        except Exception as e:
            logger.error(f"Redis connection recording failed: {e}, falling back to memory")
            self._record_connection_attempt_memory(user_id)

    def _record_connection_attempt_memory(self, user_id: str) -> None:
        """Record connection attempt in memory."""
        now = datetime.now(timezone.utc)
        self.connection_attempts[user_id].append(now)

    async def check_autogen_health(self) -> bool:
        """
        Check AutoGen backend health.

        Returns:
            True if backend is healthy, False otherwise
        """
        try:
            # Simple health check - could be enhanced with actual backend ping
            # For now, assume healthy unless we've had recent failures
            now = datetime.now(timezone.utc)

            # If we haven't checked in the last 5 minutes, do a basic check
            if now - self.last_health_check > timedelta(minutes=5):
                self.last_health_check = now

                # In a real implementation, this would ping the AutoGen backend
                # For now, we'll consider it healthy unless there are many failures
                failure_count = len([
                    conv_id for conv_id in self.demo_conversations.keys()
                    if conv_id not in self.active_conversations
                ])

                self.autogen_backend_healthy = failure_count < 3

            return self.autogen_backend_healthy

        except Exception as e:
            logger.error(f"Health check failed: {e}")
            self.autogen_backend_healthy = False
            return False

    def get_health_status(self) -> Dict[str, Any]:
        """Get comprehensive health status of the bridge."""
        return {
            "autogen_backend_healthy": self.autogen_backend_healthy,
            "last_health_check": self.last_health_check.isoformat(),
            "active_conversations": len(self.active_conversations),
            "demo_conversations": len(self.demo_conversations),
            "total_websocket_connections": sum(
                len(websockets) for websockets in self.conversation_websockets.values()
            ),
            "rate_limiting": {
                "backend": "redis" if self.redis_client else "memory",
                "redis_available": self.redis_client is not None,
                "max_connections_per_minute": self.max_connections_per_minute,
                "max_concurrent_connections": self.max_connections_per_user,
                "tracked_users": len(self.connection_attempts)  # Only for memory mode
            }
        }


class DemoConversationManager:
    """Demo conversation manager for fallback mode."""

    def __init__(self, conversation_id: str, content: str):
        self.conversation_id = conversation_id
        self.content = content

    async def start_demo_conversation(
        self,
        message_callback: Callable[[Dict[str, Any]], Awaitable[None]]
    ) -> None:
        """
        Start demo conversation with REAL DATA ONLY.

        CRITICAL: Adheres to financial-grade data integrity requirements.
        NO synthetic market data, NO fabricated analysis.
        """

        # ⚠️ REAL DATA ONLY: Demo mode must use actual market context or explicit unavailability
        demo_messages = [
            {
                "id": str(uuid.uuid4()),
                "agentType": "FINANCIAL_ANALYST",
                "agentName": "Financial Analyst",
                "role": "analyst",
                "message": (
                    "⚠️ AutoGen backend unavailable - real-time analysis not accessible. "
                    "Demo mode active with no synthetic market data generated. "
                    "Please retry for live AutoGen analysis."
                ),
                "confidence": 0.0,  # Zero confidence for demo mode
                "timestamp": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "agentType": "MARKET_CONTEXT",
                "agentName": "Market Context",
                "role": "context",
                "message": (
                    "⚠️ Real-time market intelligence unavailable - Perplexity API not accessible in demo mode. "
                    "No synthetic market data provided. Connect to live AutoGen for current market analysis."
                ),
                "confidence": 0.0,  # Zero confidence for demo mode
                "timestamp": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "agentType": "RISK_CHALLENGER",
                "agentName": "Risk Challenger",
                "role": "challenger",
                "message": (
                    "⚠️ Risk analysis requires real AutoGen backend connection. "
                    "Demo mode cannot provide genuine risk assessment. "
                    "No fallback data generated. Please use live system for actual risk evaluation."
                ),
                "confidence": 0.0,  # Zero confidence for demo mode
                "timestamp": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "agentType": "FINANCIAL_ANALYST",
                "agentName": "Financial Analyst",
                "role": "analyst",
                "message": (
                    "🔄 Demo mode complete. No financial recommendations provided due to real data unavailability. "
                    "Please retry AutoGen connection for actual market analysis with live data sources."
                ),
                "confidence": 0.0,  # Zero confidence for demo mode
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        ]

        # Send messages with realistic timing
        for i, message_data in enumerate(demo_messages):
            await asyncio.sleep(3.0)  # 3 second intervals

            websocket_message = {
                "type": "agent_message",
                "session_id": self.conversation_id,
                "timestamp": message_data["timestamp"],
                "data": message_data
            }

            await message_callback(websocket_message)

        # Send completion
        await asyncio.sleep(2.0)
        completion_message = {
            "type": "conversation_complete",
            "session_id": self.conversation_id,
            "data": {
                "consensusReached": False,  # No consensus possible without real data
                "finalRecommendation": (
                    "⚠️ Demo mode complete - No financial recommendations provided. "
                    "AutoGen backend unavailable, no synthetic market analysis generated. "
                    "Please retry for live analysis with real data sources."
                ),
                "confidenceLevel": 0.0,  # Zero confidence in demo mode
                "keyInsights": [
                    "AutoGen backend connection failed",
                    "Real-time data sources unavailable",
                    "No synthetic market data generated",
                    "Live system required for actual analysis"
                ]
            }
        }
        await message_callback(completion_message)


# Global bridge instance
autogen_websocket_bridge = AutoGenWebSocketBridge()
