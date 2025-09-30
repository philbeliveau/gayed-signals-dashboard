"""
AutoGen Conversation Models
Story 1.8: Multi-Agent Conversation Database Models

Pydantic models for AutoGen conversation data
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class ConversationStatus(Enum):
    INITIALIZING = "initializing"
    ACTIVE = "active"
    GENERATING_CONSENSUS = "generating_consensus"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"

class AgentMessageType(Enum):
    ANALYSIS = "analysis"
    CONTEXT = "context"
    CHALLENGE = "challenge"
    CONSENSUS = "consensus"
    QUESTION = "question"
    RESPONSE = "response"

class ContentSource(BaseModel):
    type: str = Field(..., description="Content type: text, youtube, substack, article, manual")
    title: str = Field(..., description="Content title")
    content: str = Field(..., description="Main content to analyze")
    url: Optional[str] = Field(None, description="Source URL if available")
    author: Optional[str] = Field(None, description="Content author")
    publish_date: Optional[datetime] = Field(None, description="Publication date")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")

class AgentMessage(BaseModel):
    id: str = Field(..., description="Unique message identifier")
    agent_id: str = Field(..., description="Agent identifier")
    agent_name: str = Field(..., description="Human-readable agent name")
    content: str = Field(..., description="Message content")
    message_type: AgentMessageType = Field(default=AgentMessageType.ANALYSIS, description="Message type")
    confidence: int = Field(default=70, ge=0, le=100, description="Confidence percentage")
    timestamp: datetime = Field(default_factory=datetime.now, description="Message timestamp")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional message metadata")

class ConversationConsensus(BaseModel):
    decision: str = Field(..., description="Final decision or recommendation")
    confidence: int = Field(..., ge=0, le=100, description="Overall confidence percentage")
    reasoning: str = Field(..., description="Explanation of the decision")
    key_points: List[str] = Field(default_factory=list, description="Main points from the debate")
    agent_agreement: Dict[str, Any] = Field(default_factory=dict, description="Agreement levels per agent")
    timestamp: datetime = Field(default_factory=datetime.now, description="Consensus timestamp")

class ConversationMetrics(BaseModel):
    start_time: datetime = Field(default_factory=datetime.now, description="Conversation start time")
    message_count: int = Field(default=0, description="Total messages exchanged")
    average_response_time: float = Field(default=0.0, description="Average time between messages in seconds")
    consensus_reached: bool = Field(default=False, description="Whether consensus was achieved")
    time_to_consensus: Optional[float] = Field(None, description="Time to reach consensus in seconds")
    agent_participation: Dict[str, int] = Field(default_factory=dict, description="Message count per agent")

class ConversationSession(BaseModel):
    id: str = Field(..., description="Unique session identifier")
    status: ConversationStatus = Field(default=ConversationStatus.INITIALIZING, description="Current session status")
    content_source: ContentSource = Field(..., description="Source content being analyzed")
    signal_context: Optional[Dict[str, Any]] = Field(None, description="Trading signal context for reference")
    agents: List[str] = Field(default_factory=list, description="Participating agent IDs")
    messages: List[AgentMessage] = Field(default_factory=list, description="Conversation messages")
    consensus: Optional[ConversationConsensus] = Field(None, description="Final consensus if reached")
    metrics: ConversationMetrics = Field(default_factory=ConversationMetrics, description="Conversation metrics")
    created_at: datetime = Field(default_factory=datetime.now, description="Session creation time")
    updated_at: datetime = Field(default_factory=datetime.now, description="Last update time")
    user_id: Optional[str] = Field(None, description="User who initiated the conversation")
    error_message: Optional[str] = Field(None, description="Error message if conversation failed")

class ConversationEvent(BaseModel):
    type: str = Field(..., description="Event type: message, status_change, consensus_reached, error")
    session_id: str = Field(..., description="Session identifier")
    timestamp: datetime = Field(default_factory=datetime.now, description="Event timestamp")
    data: Dict[str, Any] = Field(default_factory=dict, description="Event data")

class ConversationExportRequest(BaseModel):
    format: str = Field(..., description="Export format: json, pdf, markdown, csv")
    include_metrics: bool = Field(default=True, description="Include conversation metrics")
    include_signal_context: bool = Field(default=True, description="Include trading signal context")
    anonymize_agents: bool = Field(default=False, description="Anonymize agent identities")

class AgentConfig(BaseModel):
    id: str = Field(..., description="Agent identifier")
    name: str = Field(..., description="Human-readable agent name")
    role: str = Field(..., description="Agent role description")
    system_message: str = Field(..., description="System prompt for the agent")
    model: str = Field(default="gpt-4", description="LLM model to use")
    temperature: float = Field(default=0.1, ge=0.0, le=2.0, description="Response temperature")
    max_tokens: int = Field(default=500, gt=0, description="Maximum response tokens")
    specialization: str = Field(..., description="Agent specialization: financial, context, risk")

class ConversationOrchestrationConfig(BaseModel):
    max_messages: int = Field(default=15, gt=0, description="Maximum messages in conversation")
    timeout_seconds: int = Field(default=90, gt=0, description="Conversation timeout in seconds")
    required_agents: List[str] = Field(
        default=["financial_analyst", "market_context", "risk_challenger"],
        description="Required agent IDs"
    )
    consensus_threshold: float = Field(default=0.7, ge=0.0, le=1.0, description="Consensus agreement threshold")
    enable_interruptions: bool = Field(default=False, description="Allow agents to interrupt each other")
    enable_questions: bool = Field(default=True, description="Allow agents to ask questions")

class ConversationAnalytics(BaseModel):
    total_conversations: int = Field(default=0, description="Total number of conversations")
    average_duration: float = Field(default=0.0, description="Average conversation duration in seconds")
    consensus_success_rate: float = Field(default=0.0, ge=0.0, le=1.0, description="Rate of successful consensus")
    most_active_agent: Optional[str] = Field(None, description="Agent with most messages")
    average_messages_per_conversation: float = Field(default=0.0, description="Average messages per conversation")
    topic_distribution: Dict[str, int] = Field(default_factory=dict, description="Distribution of conversation topics")
    confidence_distribution: Dict[str, int] = Field(
        default_factory=lambda: {"low": 0, "medium": 0, "high": 0},
        description="Distribution of confidence levels"
    )

class ConversationError(BaseModel):
    type: str = Field(..., description="Error type: agent_failure, timeout, connection_error, consensus_failure")
    message: str = Field(..., description="Error message")
    agent_id: Optional[str] = Field(None, description="Agent ID if agent-specific error")
    timestamp: datetime = Field(default_factory=datetime.now, description="Error timestamp")
    recoverable: bool = Field(default=False, description="Whether the error is recoverable")
    stack_trace: Optional[str] = Field(None, description="Stack trace for debugging")

# Request/Response models for API endpoints

class CreateConversationRequest(BaseModel):
    session_id: str = Field(..., description="Unique session identifier")
    content_source: ContentSource = Field(..., description="Content to analyze")
    signal_context: Optional[Dict[str, Any]] = Field(None, description="Trading signal context")
    agents: List[str] = Field(
        default=["financial_analyst", "market_context", "risk_challenger"],
        description="Agent IDs to include"
    )
    config: Optional[ConversationOrchestrationConfig] = Field(None, description="Conversation configuration")

class CreateConversationResponse(BaseModel):
    session_id: str = Field(..., description="Session identifier")
    status: str = Field(..., description="Current status")
    websocket_url: str = Field(..., description="WebSocket URL for real-time updates")
    estimated_duration_seconds: int = Field(default=90, description="Estimated conversation duration")

class WebSocketMessage(BaseModel):
    type: str = Field(..., description="Message type: agent_message, status_update, consensus_ready, error")
    session_id: str = Field(..., description="Session identifier")
    timestamp: str = Field(..., description="ISO timestamp")
    data: Dict[str, Any] = Field(default_factory=dict, description="Message data")

class ConsensusResponse(BaseModel):
    decision: str = Field(..., description="Final decision")
    confidence: int = Field(..., ge=0, le=100, description="Confidence percentage")
    reasoning: str = Field(..., description="Decision reasoning")
    key_points: List[str] = Field(default_factory=list, description="Key discussion points")
    agent_agreement: Dict[str, Any] = Field(default_factory=dict, description="Agent agreement breakdown")
    timestamp: str = Field(..., description="ISO timestamp")

class ConversationSummary(BaseModel):
    session_id: str = Field(..., description="Session identifier")
    status: str = Field(..., description="Current status")
    message_count: int = Field(default=0, description="Total messages")
    start_time: str = Field(..., description="ISO start timestamp")
    duration_seconds: Optional[float] = Field(None, description="Conversation duration")
    consensus_reached: bool = Field(default=False, description="Whether consensus was reached")
    participants: List[str] = Field(default_factory=list, description="Participating agent IDs")