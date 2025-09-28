"""
AutoGen Orchestrator Service.

This service manages AutoGen agent conversations for financial analysis:
- Initializes and coordinates three specialized agents
- Manages conversation sessions and WebSocket streaming
- Provides export and analytics capabilities
"""

from typing import Dict, List, Optional, Any, AsyncIterator
import asyncio
import json
import logging
from datetime import datetime
from fastapi import WebSocket
import uuid

# AutoGen imports (will be installed with updated requirements)
try:
    from autogen_agentchat.agents import AssistantAgent
    from autogen_ext.models.openai import OpenAIChatCompletionClient
    AUTOGEN_AVAILABLE = True
except ImportError:
    # Graceful fallback for development without AutoGen installed
    AUTOGEN_AVAILABLE = False
    logging.warning("AutoGen not available - using mock implementation")

from models.conversation_models import (
    ConversationSession,
    ContentSource,
    AgentMessage,
    AgentType,
    ConversationStatus,
    AgentDebateState,
    WebSocketMessage
)


class MockAutoGenAgent:
    """Mock AutoGen agent for development without AutoGen installed."""

    def __init__(self, name: str, system_message: str):
        self.name = name
        self.system_message = system_message

    async def generate_reply(self, content: str) -> str:
        """Generate a mock reply for testing."""
        return f"Mock response from {self.name}: Analysis of '{content[:50]}...'"


class AutoGenOrchestrator:
    """Orchestrates AutoGen agent conversations for financial analysis."""

    def __init__(self, config: Dict[str, Any]):
        """Initialize the orchestrator with AutoGen configuration."""
        self.config = config
        self.sessions: Dict[str, ConversationSession] = {}
        self.websockets: Dict[str, List[WebSocket]] = {}
        self.agents: Dict[AgentType, Any] = {}
        self.logger = logging.getLogger(__name__)

        # Initialize agents
        self._initialize_agents()

    def _initialize_agents(self) -> None:
        """Initialize the three specialized AutoGen agents."""
        try:
            if AUTOGEN_AVAILABLE:
                model_client = OpenAIChatCompletionClient(
                    model=self.config.get("model", "gpt-4"),
                    api_key=self.config.get("api_key"),
                    organization=self.config.get("organization")
                )

                # Financial Analyst Agent
                self.agents[AgentType.FINANCIAL_ANALYST] = AssistantAgent(
                    name="financial_analyst",
                    model_client=model_client,
                    system_message=self._get_financial_analyst_prompt()
                )

                # Market Context Agent
                self.agents[AgentType.MARKET_CONTEXT] = AssistantAgent(
                    name="market_context",
                    model_client=model_client,
                    system_message=self._get_market_context_prompt()
                )

                # Risk Challenger Agent
                self.agents[AgentType.RISK_CHALLENGER] = AssistantAgent(
                    name="risk_challenger",
                    model_client=model_client,
                    system_message=self._get_risk_challenger_prompt()
                )
            else:
                # Use mock agents for development
                self.agents[AgentType.FINANCIAL_ANALYST] = MockAutoGenAgent(
                    "financial_analyst",
                    self._get_financial_analyst_prompt()
                )
                self.agents[AgentType.MARKET_CONTEXT] = MockAutoGenAgent(
                    "market_context",
                    self._get_market_context_prompt()
                )
                self.agents[AgentType.RISK_CHALLENGER] = MockAutoGenAgent(
                    "risk_challenger",
                    self._get_risk_challenger_prompt()
                )

            self.logger.info("AutoGen agents initialized successfully")

        except Exception as e:
            self.logger.error(f"Failed to initialize AutoGen agents: {e}")
            raise

    def _get_financial_analyst_prompt(self) -> str:
        """Get system prompt for the Financial Analyst agent."""
        return """
        You are a professional financial analyst specializing in market regime analysis
        and signal interpretation. Your role in this debate is to:

        1. Analyze financial content using quantitative data and market signals
        2. Provide specific metrics, confidence levels, and historical context
        3. Reference current market conditions and volatility measurements
        4. Support your analysis with concrete evidence and data sources

        Always maintain a professional, analytical tone suitable for client presentations.
        Include specific confidence percentages and cite relevant market indicators.
        Limit responses to 3-4 sentences for real-time streaming.
        """

    def _get_market_context_prompt(self) -> str:
        """Get system prompt for the Market Context agent."""
        return """
        You are a market context specialist who provides broader economic and market
        perspective. Your role in this debate is to:

        1. Contextualize analysis within current macroeconomic conditions
        2. Reference recent market events, policy changes, and economic data
        3. Identify potential external factors affecting the analysis
        4. Provide historical parallels and market cycle context

        Use current market research and economic indicators to support your points.
        Focus on macro trends and market dynamics that others might miss.
        Limit responses to 3-4 sentences for real-time streaming.
        """

    def _get_risk_challenger_prompt(self) -> str:
        """Get system prompt for the Risk Challenger agent."""
        return """
        You are a risk management specialist whose role is to challenge assumptions
        and identify potential weaknesses in financial analysis. Your role is to:

        1. Question the assumptions made by other agents
        2. Identify potential risks, edge cases, and failure scenarios
        3. Provide alternative interpretations of the data
        4. Challenge overconfident predictions with historical counterexamples

        Be constructively skeptical and focus on risk management principles.
        Ask tough questions about what could go wrong with the analysis.
        Limit responses to 3-4 sentences for real-time streaming.
        """

    async def create_session(
        self,
        content: ContentSource,
        user_id: str
    ) -> ConversationSession:
        """Create a new conversation session."""
        session = ConversationSession(
            user_id=user_id,
            content_source=content,
            status=ConversationStatus.INITIALIZED
        )

        self.sessions[session.id] = session
        self.websockets[session.id] = []

        self.logger.info(f"Created conversation session {session.id} for user {user_id}")
        return session

    async def get_session(self, conversation_id: str) -> Optional[ConversationSession]:
        """Get conversation session by ID."""
        return self.sessions.get(conversation_id)

    async def start_debate(self, conversation_id: str) -> None:
        """Start the AutoGen agent debate for a conversation."""
        session = self.sessions.get(conversation_id)
        if not session:
            raise ValueError(f"Session {conversation_id} not found")

        session.status = ConversationStatus.RUNNING
        session.updated_at = datetime.utcnow()

        # Start the debate in the background
        asyncio.create_task(self._run_debate(session))

    async def _run_debate(self, session: ConversationSession) -> None:
        """Run the actual agent debate."""
        try:
            self.logger.info(f"Starting debate for session {session.id}")

            # Initialize debate with content analysis
            content_summary = f"Title: {session.content_source.title}\n"
            content_summary += f"Content: {session.content_source.content[:500]}..."

            # Round 1: Financial Analyst starts
            await self._agent_response(
                session,
                AgentType.FINANCIAL_ANALYST,
                f"Please analyze this financial content: {content_summary}",
                0
            )

            # Round 2: Market Context responds
            await self._agent_response(
                session,
                AgentType.MARKET_CONTEXT,
                f"Provide market context for the analysis of: {content_summary}",
                1
            )

            # Round 3: Risk Challenger responds
            await self._agent_response(
                session,
                AgentType.RISK_CHALLENGER,
                f"Challenge the assumptions in this financial analysis: {content_summary}",
                2
            )

            # Round 4: Financial Analyst responds to challenges
            last_message = session.messages[-1].content if session.messages else ""
            await self._agent_response(
                session,
                AgentType.FINANCIAL_ANALYST,
                f"Respond to this challenge: {last_message}",
                3
            )

            # Finalize session
            session.status = ConversationStatus.COMPLETED
            session.completed_at = datetime.utcnow()
            session.updated_at = datetime.utcnow()

            # Send completion message via WebSocket
            await self._broadcast_websocket_message(
                session.id,
                WebSocketMessage(
                    type="debate_complete",
                    conversation_id=session.id,
                    data={"status": "completed", "total_messages": len(session.messages)}
                )
            )

            self.logger.info(f"Debate completed for session {session.id}")

        except Exception as e:
            self.logger.error(f"Debate failed for session {session.id}: {e}")
            session.status = ConversationStatus.ERROR
            session.updated_at = datetime.utcnow()

    async def _agent_response(
        self,
        session: ConversationSession,
        agent_type: AgentType,
        prompt: str,
        message_order: int
    ) -> None:
        """Generate and process a response from a specific agent."""
        try:
            agent = self.agents[agent_type]

            # Generate response
            if AUTOGEN_AVAILABLE:
                # Real AutoGen implementation
                response = await agent.agenerate_reply([{"role": "user", "content": prompt}])
                content = response.content if hasattr(response, 'content') else str(response)
            else:
                # Mock implementation
                content = await agent.generate_reply(prompt)

            # Create agent message
            message = AgentMessage(
                agent_type=agent_type,
                agent_name=agent.name,
                content=content,
                confidence_level=0.8,  # Mock confidence level
                message_order=message_order,
                timestamp=datetime.utcnow()
            )

            # Add to session
            session.messages.append(message)
            session.updated_at = datetime.utcnow()

            # Broadcast via WebSocket
            await self._broadcast_websocket_message(
                session.id,
                WebSocketMessage(
                    type="agent_message",
                    conversation_id=session.id,
                    data=message
                )
            )

            # Add small delay for realistic streaming
            await asyncio.sleep(1)

        except Exception as e:
            self.logger.error(f"Agent response failed for {agent_type}: {e}")
            raise

    async def register_websocket(self, conversation_id: str, websocket: WebSocket) -> None:
        """Register a WebSocket for conversation updates."""
        if conversation_id not in self.websockets:
            self.websockets[conversation_id] = []
        self.websockets[conversation_id].append(websocket)

    async def unregister_websocket(self, conversation_id: str, websocket: WebSocket) -> None:
        """Unregister a WebSocket."""
        if conversation_id in self.websockets:
            try:
                self.websockets[conversation_id].remove(websocket)
            except ValueError:
                pass

    async def _broadcast_websocket_message(
        self,
        conversation_id: str,
        message: WebSocketMessage
    ) -> None:
        """Broadcast a message to all WebSockets for a conversation."""
        if conversation_id not in self.websockets:
            return

        websockets_to_remove = []
        for websocket in self.websockets[conversation_id]:
            try:
                await websocket.send_text(message.model_dump_json())
            except Exception as e:
                self.logger.warning(f"Failed to send WebSocket message: {e}")
                websockets_to_remove.append(websocket)

        # Remove failed WebSockets
        for websocket in websockets_to_remove:
            try:
                self.websockets[conversation_id].remove(websocket)
            except ValueError:
                pass

    async def pause_debate(self, conversation_id: str) -> None:
        """Pause an ongoing debate."""
        session = self.sessions.get(conversation_id)
        if session and session.status == ConversationStatus.RUNNING:
            session.status = ConversationStatus.PAUSED
            session.updated_at = datetime.utcnow()

    async def resume_debate(self, conversation_id: str) -> None:
        """Resume a paused debate."""
        session = self.sessions.get(conversation_id)
        if session and session.status == ConversationStatus.PAUSED:
            session.status = ConversationStatus.RUNNING
            session.updated_at = datetime.utcnow()

    async def stop_debate(self, conversation_id: str) -> None:
        """Stop an ongoing debate."""
        session = self.sessions.get(conversation_id)
        if session and session.status in [ConversationStatus.RUNNING, ConversationStatus.PAUSED]:
            session.status = ConversationStatus.CANCELLED
            session.updated_at = datetime.utcnow()

    async def export_markdown(self, session: ConversationSession) -> str:
        """Export conversation as formatted markdown."""
        markdown = f"# Financial Analysis Debate\n\n"
        markdown += f"**Content:** {session.content_source.title}\n"
        markdown += f"**Date:** {session.created_at.strftime('%Y-%m-%d %H:%M:%S')}\n\n"

        for message in session.messages:
            agent_name = message.agent_name.replace('_', ' ').title()
            markdown += f"## {agent_name}\n\n"
            markdown += f"{message.content}\n\n"
            if message.confidence_level:
                markdown += f"*Confidence: {message.confidence_level:.0%}*\n\n"

        return markdown

    async def export_json(self, session: ConversationSession) -> Dict[str, Any]:
        """Export conversation as JSON data."""
        return session.model_dump()

    async def export_summary(self, session: ConversationSession) -> str:
        """Export conversation as executive summary."""
        summary = f"Executive Summary: {session.content_source.title}\n\n"
        summary += f"Analysis completed on {session.created_at.strftime('%Y-%m-%d')}\n"
        summary += f"Total agent responses: {len(session.messages)}\n\n"
        summary += "Key insights from agent debate will be added here.\n"
        return summary

    async def list_sessions(
        self,
        user_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """List conversation sessions with filtering."""
        sessions = list(self.sessions.values())

        if user_id:
            sessions = [s for s in sessions if s.user_id == user_id]

        if status:
            sessions = [s for s in sessions if s.status == status]

        # Sort by created_at descending
        sessions.sort(key=lambda s: s.created_at, reverse=True)

        # Apply pagination
        paginated = sessions[offset:offset + limit]

        return [
            {
                "id": s.id,
                "status": s.status,
                "content_title": s.content_source.title,
                "created_at": s.created_at,
                "message_count": len(s.messages)
            }
            for s in paginated
        ]

    async def delete_session(self, conversation_id: str) -> bool:
        """Delete a conversation session."""
        if conversation_id in self.sessions:
            del self.sessions[conversation_id]
            if conversation_id in self.websockets:
                del self.websockets[conversation_id]
            return True
        return False

    async def health_check(self) -> bool:
        """Perform health check for the AutoGen service."""
        try:
            # Check if agents are initialized
            if not self.agents:
                return False

            # Check if all expected agents are present
            expected_agents = {AgentType.FINANCIAL_ANALYST, AgentType.MARKET_CONTEXT, AgentType.RISK_CHALLENGER}
            if set(self.agents.keys()) != expected_agents:
                return False

            return True

        except Exception as e:
            self.logger.error(f"Health check failed: {e}")
            return False