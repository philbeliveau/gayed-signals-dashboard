"""
AutoGen Conversation API
Story 1.8: Multi-Agent Conversation Backend Implementation

FastAPI endpoints for managing AutoGen agent conversations
"""

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.responses import JSONResponse
from typing import Dict, List, Optional, Any
import asyncio
import json
import logging
from datetime import datetime
import uuid

from pydantic import BaseModel, Field
from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import OpenAIChatCompletionClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.config import settings
from core.auth import get_current_user_optional
from core.database import get_db
from models.conversation import ConversationSession, ConversationStatus, AgentMessage
from models.database import ConversationSession as DBConversationSession, ConversationMessage as DBConversationMessage

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/conversations", tags=["conversations"])

# Active WebSocket connections
active_connections: Dict[str, WebSocket] = {}
# Active conversation sessions
active_sessions: Dict[str, "AutoGenConversationManager"] = {}

class ContentSource(BaseModel):
    type: str = Field(..., description="Content type")
    title: str = Field(..., description="Content title")
    content: str = Field(..., description="Main content")
    url: Optional[str] = None
    author: Optional[str] = None
    publish_date: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None

class ConversationRequest(BaseModel):
    session_id: str = Field(..., description="Unique session identifier")
    content_source: ContentSource = Field(..., description="Content to analyze")
    signal_context: Optional[Dict[str, Any]] = None
    agents: List[str] = Field(default=["financial_analyst", "market_context", "risk_challenger"])
    config: Dict[str, Any] = Field(default_factory=dict)

class ConversationResponse(BaseModel):
    session_id: str
    status: str
    websocket_url: str
    estimated_duration_seconds: int = 90

class AutoGenConversationManager:
    """Manages AutoGen conversation between specialized financial agents"""

    def __init__(self, session_id: str, content_source: ContentSource, signal_context: Optional[Dict] = None, db_session: Optional[AsyncSession] = None, user_id: Optional[str] = None):
        self.session_id = session_id
        self.content_source = content_source
        self.signal_context = signal_context
        self.status = ConversationStatus.INITIALIZING
        self.messages: List[AgentMessage] = []
        self.db_session = db_session
        self.user_id = user_id
        self.db_conversation = None

        # Initialize AutoGen agents
        self.agents = {}
        self.message_count = 0
        self.max_messages = 15
        self.start_time = datetime.now()

        # Setup OpenAI client for AutoGen
        openai_key = settings.OPENAI_API_KEY
        if not openai_key:
            raise ValueError("OpenAI API key not configured")

        self.model_client = OpenAIChatCompletionClient(
            model="gpt-4",
            api_key=openai_key,
            timeout=30
        )

    async def initialize_agents(self):
        """Initialize the three specialized AutoGen agents and create database session"""
        try:
            # Create database conversation record if db_session is available
            if self.db_session:
                await self._create_db_conversation()

            # Financial Analyst Agent
            self.agents["financial_analyst"] = AssistantAgent(
                name="financial_analyst",
                model_client=self.model_client,
                system_message=self._get_financial_analyst_prompt()
            )

            # Market Context Agent
            self.agents["market_context"] = AssistantAgent(
                name="market_context",
                model_client=self.model_client,
                system_message=self._get_market_context_prompt()
            )

            # Risk Challenger Agent
            self.agents["risk_challenger"] = AssistantAgent(
                name="risk_challenger",
                model_client=self.model_client,
                system_message=self._get_risk_challenger_prompt()
            )

            self.status = ConversationStatus.ACTIVE
            await self._update_db_status()
            logger.info(f"AutoGen agents initialized for session {self.session_id}")

        except Exception as e:
            logger.error(f"Failed to initialize agents: {e}")
            self.status = ConversationStatus.FAILED
            await self._update_db_status()
            raise

    async def _create_db_conversation(self):
        """Create database conversation record"""
        if not self.db_session:
            return

        try:
            self.db_conversation = DBConversationSession(
                id=uuid.UUID(self.session_id),
                user_id=uuid.UUID(self.user_id) if self.user_id else None,
                content_title=self.content_source.title,
                content_type=self.content_source.type,
                content_text=self.content_source.content,
                content_url=self.content_source.url,
                content_author=self.content_source.author,
                content_published_at=self.content_source.publish_date,
                content_metadata=self.content_source.metadata,
                signal_context=self.signal_context or {},
                status=self.status.value
            )

            self.db_session.add(self.db_conversation)
            await self.db_session.commit()
            logger.info(f"Created database conversation record for session {self.session_id}")

        except Exception as e:
            logger.error(f"Failed to create database conversation: {e}")
            await self.db_session.rollback()

    async def _update_db_status(self):
        """Update conversation status in database"""
        if not self.db_session or not self.db_conversation:
            return

        try:
            self.db_conversation.status = self.status.value
            self.db_conversation.updated_at = datetime.now()

            if self.status == ConversationStatus.COMPLETED:
                self.db_conversation.completed_at = datetime.now()

            await self.db_session.commit()

        except Exception as e:
            logger.error(f"Failed to update database status: {e}")
            await self.db_session.rollback()

    def _get_financial_analyst_prompt(self) -> str:
        """System prompt for Financial Analyst Agent"""
        signal_context_str = ""
        if self.signal_context:
            signal_context_str = f"\n\nCurrent Signal Context:\n{json.dumps(self.signal_context, indent=2)}"

        return f"""You are a professional Financial Analyst specializing in market regime analysis and quantitative signals.

Your role in this debate:
1. Analyze the financial content using quantitative data and market signals
2. Provide specific metrics, confidence levels, and historical context
3. Reference current market conditions and volatility measurements
4. Support analysis with concrete evidence and data sources

Content to analyze: {self.content_source.title}
{self.content_source.content[:500]}...{signal_context_str}

Guidelines:
- Keep responses under 200 words for real-time flow
- Include specific confidence percentages (e.g., "75% confidence")
- Reference relevant market indicators and signals
- Maintain professional tone suitable for client presentations
- Build upon other agents' insights when they provide context
- End with clear position: Risk-On, Risk-Off, or Mixed with reasoning"""

    def _get_market_context_prompt(self) -> str:
        """System prompt for Market Context Agent"""
        return f"""You are a Market Context Agent specializing in economic environment and market conditions.

Your role in this debate:
1. Provide economic context and market environment analysis
2. Add Federal Reserve policy, employment, and inflation perspectives
3. Highlight geopolitical and macroeconomic factors
4. Challenge assumptions with broader market context

Content to analyze: {self.content_source.title}
{self.content_source.content[:500]}...

Guidelines:
- Keep responses under 200 words for real-time flow
- Focus on macro-economic context and environment
- Reference recent economic data, Fed policy, and global factors
- Provide perspective that other agents might miss
- Question narrow financial analysis with broader context
- Support or challenge other agents with economic reasoning"""

    def _get_risk_challenger_prompt(self) -> str:
        """System prompt for Risk Challenger Agent"""
        return f"""You are a Risk Challenger Agent specializing in contrarian analysis and risk assessment.

Your role in this debate:
1. Challenge assumptions and provide alternative perspectives
2. Identify potential risks and failure scenarios
3. Question optimistic or pessimistic biases
4. Stress-test conclusions with historical precedents

Content to analyze: {self.content_source.title}
{self.content_source.content[:500]}...

Guidelines:
- Keep responses under 200 words for real-time flow
- Play devil's advocate to strengthen analysis
- Ask "what if we're wrong?" questions
- Reference historical examples of similar situations
- Challenge consensus thinking with alternative scenarios
- Provide balanced perspective even when being contrarian"""

    async def start_conversation(self, websocket: WebSocket):
        """Start the AutoGen conversation flow"""
        try:
            await self.initialize_agents()

            # Start with Financial Analyst
            await self._get_agent_response("financial_analyst",
                f"Please analyze this content: {self.content_source.title}")

            # Continue conversation loop
            await self._conversation_loop(websocket)

        except Exception as e:
            logger.error(f"Conversation failed: {e}")
            await self._send_error(websocket, str(e))

    async def _conversation_loop(self, websocket: WebSocket):
        """Main conversation loop between agents"""
        conversation_history = []

        while (self.message_count < self.max_messages and
               not self._should_terminate() and
               (datetime.now() - self.start_time).seconds < 90):

            try:
                # Determine next agent based on conversation flow
                next_agent = self._get_next_agent()

                if next_agent:
                    # Build context from recent messages
                    context = self._build_agent_context(next_agent, conversation_history)

                    # Get agent response
                    response = await self._get_agent_response(next_agent, context)

                    if response:
                        conversation_history.append(response)
                        await self._send_message(websocket, response)

                        # Check for conversation completion
                        if self._is_consensus_reached(conversation_history):
                            break

                await asyncio.sleep(1)  # Brief pause between messages

            except Exception as e:
                logger.error(f"Conversation loop error: {e}")
                break

        # Generate final consensus
        await self._generate_consensus(websocket, conversation_history)

    def _get_next_agent(self) -> Optional[str]:
        """Determine which agent should speak next"""
        if self.message_count == 0:
            return "financial_analyst"
        elif self.message_count == 1:
            return "market_context"
        elif self.message_count == 2:
            return "risk_challenger"
        elif self.message_count < 10:
            # Rotate based on last speakers to ensure participation
            recent_speakers = [msg.agent_id for msg in self.messages[-3:]]
            for agent_id in ["financial_analyst", "market_context", "risk_challenger"]:
                if recent_speakers.count(agent_id) == 0:
                    return agent_id
            # If all have spoken recently, pick randomly
            return ["financial_analyst", "market_context", "risk_challenger"][self.message_count % 3]
        else:
            # Final rounds - look for consensus
            return "financial_analyst"  # Let analyst wrap up

    def _build_agent_context(self, agent_id: str, conversation_history: List[AgentMessage]) -> str:
        """Build context for the next agent based on conversation history"""
        if not conversation_history:
            return f"Please provide your initial analysis of: {self.content_source.title}"

        recent_messages = conversation_history[-3:]  # Last 3 messages
        context_parts = [f"Previous discussion:"]

        for msg in recent_messages:
            context_parts.append(f"{msg.agent_name}: {msg.content}")

        context_parts.append(f"\nPlease respond as the {agent_id.replace('_', ' ').title()}, building on or challenging the above points.")

        return "\n".join(context_parts)

    async def _get_agent_response(self, agent_id: str, prompt: str) -> Optional[AgentMessage]:
        """Get response from specific AutoGen agent"""
        try:
            agent = self.agents.get(agent_id)
            if not agent:
                return None

            # Use AutoGen agent to generate response
            # Note: This is a simplified version - in practice you'd use AutoGen's conversation flow
            response = await agent.agenerate_reply(prompt)

            if response and response.content:
                message = AgentMessage(
                    id=str(uuid.uuid4()),
                    agent_id=agent_id,
                    agent_name=agent_id.replace('_', ' ').title(),
                    content=response.content,
                    message_type="analysis",
                    confidence=self._extract_confidence(response.content),
                    timestamp=datetime.now(),
                    metadata={}
                )

                self.messages.append(message)
                self.message_count += 1

                # Persist message to database
                await self._save_message_to_db(message)

                return message

        except Exception as e:
            logger.error(f"Agent {agent_id} response failed: {e}")
            return None

    async def _save_message_to_db(self, message: AgentMessage):
        """Save agent message to database"""
        if not self.db_session or not self.db_conversation:
            return

        try:
            db_message = DBConversationMessage(
                id=uuid.UUID(message.id),
                session_id=uuid.UUID(self.session_id),
                agent_id=message.agent_id,
                agent_name=message.agent_name,
                content=message.content,
                message_type=message.message_type,
                confidence=message.confidence,
                message_order=self.message_count,
                cited_sources=[],  # Could be extracted from metadata
                signal_references=[],  # Could be extracted from metadata
                message_metadata=message.metadata
            )

            self.db_session.add(db_message)
            await self.db_session.commit()

        except Exception as e:
            logger.error(f"Failed to save message to database: {e}")
            await self.db_session.rollback()

    def _extract_confidence(self, content: str) -> int:
        """Extract confidence percentage from agent response"""
        import re
        confidence_match = re.search(r'(\d+)%?\s*confidence', content.lower())
        if confidence_match:
            return int(confidence_match.group(1))
        return 70  # Default confidence

    def _should_terminate(self) -> bool:
        """Check if conversation should terminate"""
        if len(self.messages) < 6:  # Need minimum messages
            return False

        # Check for consensus keywords in recent messages
        recent_content = " ".join([msg.content.lower() for msg in self.messages[-3:]])
        consensus_keywords = ["consensus", "agree", "conclusion", "final", "recommend"]

        return any(keyword in recent_content for keyword in consensus_keywords)

    def _is_consensus_reached(self, conversation_history: List[AgentMessage]) -> bool:
        """Check if agents have reached consensus"""
        if len(conversation_history) < 6:
            return False

        # Look for agreement indicators in recent messages
        recent_messages = conversation_history[-6:]
        agreement_count = 0

        for msg in recent_messages:
            content = msg.content.lower()
            if any(word in content for word in ["agree", "consensus", "support", "concur"]):
                agreement_count += 1

        return agreement_count >= 2  # At least 2 agents agreeing

    async def _generate_consensus(self, websocket: WebSocket, conversation_history: List[AgentMessage]):
        """Generate final consensus from conversation"""
        try:
            # Analyze conversation for consensus
            agent_positions = {}
            total_confidence = 0

            for msg in conversation_history[-9:]:  # Last 3 rounds
                content = msg.content.lower()
                confidence = msg.confidence

                # Simple position analysis
                if "risk-off" in content or "defensive" in content:
                    position = "risk-off"
                elif "risk-on" in content or "bullish" in content:
                    position = "risk-on"
                else:
                    position = "mixed"

                agent_positions[msg.agent_id] = {
                    "position": position,
                    "confidence": confidence
                }
                total_confidence += confidence

            # Determine consensus
            positions = [pos["position"] for pos in agent_positions.values()]
            majority_position = max(set(positions), key=positions.count)

            consensus = {
                "decision": majority_position,
                "confidence": round(total_confidence / len(agent_positions)),
                "reasoning": f"Consensus based on {len(conversation_history)} agent exchanges",
                "key_points": self._extract_key_points(conversation_history),
                "agent_agreement": agent_positions,
                "timestamp": datetime.now().isoformat()
            }

            await websocket.send_text(json.dumps({
                "type": "consensus_ready",
                "session_id": self.session_id,
                "data": {"consensus": consensus}
            }))

            self.status = ConversationStatus.COMPLETED

            # Save consensus to database
            await self._save_consensus_to_db(consensus)
            await self._update_db_status()

        except Exception as e:
            logger.error(f"Consensus generation failed: {e}")
            await self._send_error(websocket, f"Consensus generation failed: {e}")

    async def _save_consensus_to_db(self, consensus: dict):
        """Save final consensus to database"""
        if not self.db_session or not self.db_conversation:
            return

        try:
            self.db_conversation.consensus_reached = True
            self.db_conversation.final_recommendation = consensus.get("reasoning", "")
            self.db_conversation.confidence_score = consensus.get("confidence", 70)

            await self.db_session.commit()

        except Exception as e:
            logger.error(f"Failed to save consensus to database: {e}")
            await self.db_session.rollback()

    def _extract_key_points(self, conversation_history: List[AgentMessage]) -> List[str]:
        """Extract key points from conversation"""
        key_points = []

        for msg in conversation_history:
            # Simple extraction - look for sentences with confidence markers
            sentences = msg.content.split('.')
            for sentence in sentences:
                if any(marker in sentence.lower() for marker in ['%', 'likely', 'expect', 'recommend']):
                    key_points.append(sentence.strip())

        return key_points[:5]  # Top 5 key points

    async def _send_message(self, websocket: WebSocket, message: AgentMessage):
        """Send agent message via WebSocket"""
        try:
            await websocket.send_text(json.dumps({
                "type": "agent_message",
                "session_id": self.session_id,
                "timestamp": message.timestamp.isoformat(),
                "data": {
                    "id": message.id,
                    "agent_id": message.agent_id,
                    "agent_name": message.agent_name,
                    "content": message.content,
                    "message_type": message.message_type,
                    "confidence": message.confidence,
                    "metadata": message.metadata
                }
            }))
        except Exception as e:
            logger.error(f"Failed to send message: {e}")

    async def _send_error(self, websocket: WebSocket, error_message: str):
        """Send error message via WebSocket"""
        try:
            await websocket.send_text(json.dumps({
                "type": "error",
                "session_id": self.session_id,
                "data": {"error": error_message}
            }))
        except Exception as e:
            logger.error(f"Failed to send error: {e}")

@router.post("/", response_model=ConversationResponse)
async def create_conversation(
    request: ConversationRequest,
    current_user=Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """Create a new AutoGen conversation session"""
    try:
        # Validate request
        if not request.content_source.content.strip():
            raise HTTPException(status_code=400, detail="Content cannot be empty")

        # Extract user ID if available
        user_id = getattr(current_user, 'id', None) if current_user else None

        # Create conversation manager with database session
        manager = AutoGenConversationManager(
            session_id=request.session_id,
            content_source=request.content_source,
            signal_context=request.signal_context,
            db_session=db,
            user_id=str(user_id) if user_id else None
        )

        # Store active session
        active_sessions[request.session_id] = manager

        # Return WebSocket connection info
        return ConversationResponse(
            session_id=request.session_id,
            status="initialized",
            websocket_url=f"/ws/conversation/{request.session_id}",
            estimated_duration_seconds=90
        )

    except Exception as e:
        logger.error(f"Failed to create conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.websocket("/ws/{session_id}")
async def conversation_websocket(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time conversation updates"""
    await websocket.accept()
    active_connections[session_id] = websocket

    try:
        # Get conversation manager
        manager = active_sessions.get(session_id)
        if not manager:
            await websocket.send_text(json.dumps({
                "type": "error",
                "data": {"error": f"Session {session_id} not found"}
            }))
            return

        # Start conversation
        await manager.start_conversation(websocket)

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error for session {session_id}: {e}")
        await websocket.send_text(json.dumps({
            "type": "error",
            "data": {"error": str(e)}
        }))
    finally:
        # Cleanup
        if session_id in active_connections:
            del active_connections[session_id]
        if session_id in active_sessions:
            del active_sessions[session_id]

@router.post("/{session_id}/consensus")
async def generate_consensus(session_id: str):
    """Generate consensus for a completed conversation"""
    manager = active_sessions.get(session_id)
    if not manager:
        raise HTTPException(status_code=404, detail="Session not found")

    # Return basic consensus (would be enhanced with more sophisticated analysis)
    return {
        "decision": "mixed",
        "confidence": 70,
        "reasoning": "Conversation completed with balanced perspectives",
        "key_points": ["Market analysis provided", "Risk factors considered"],
        "agent_agreement": {}
    }

@router.get("/{session_id}")
async def get_conversation(session_id: str):
    """Get conversation details and history"""
    manager = active_sessions.get(session_id)
    if not manager:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "session_id": session_id,
        "status": manager.status.value,
        "message_count": len(manager.messages),
        "messages": [
            {
                "id": msg.id,
                "agent_id": msg.agent_id,
                "agent_name": msg.agent_name,
                "content": msg.content,
                "confidence": msg.confidence,
                "timestamp": msg.timestamp.isoformat()
            }
            for msg in manager.messages
        ]
    }

@router.get("/")
async def list_conversations():
    """List active conversations"""
    return {
        "active_sessions": len(active_sessions),
        "sessions": [
            {
                "session_id": session_id,
                "status": manager.status.value,
                "message_count": len(manager.messages),
                "start_time": manager.start_time.isoformat()
            }
            for session_id, manager in active_sessions.items()
        ]
    }