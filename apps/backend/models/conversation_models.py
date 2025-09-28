"""
Pydantic models for AutoGen agent conversations.

These models define the data structures for:
- Agent conversation sessions
- Message exchanges between agents
- Content sources for analysis
- Export and presentation formats
"""

from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Dict, List, Optional, Any, Literal, Union
from datetime import datetime
from enum import Enum
import uuid


class ConversationStatus(str, Enum):
    """Status of an agent conversation session."""
    INITIALIZED = "initialized"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    ERROR = "error"
    CANCELLED = "cancelled"


class AgentType(str, Enum):
    """Types of AutoGen agents in the financial analysis system."""
    FINANCIAL_ANALYST = "financial_analyst"
    MARKET_CONTEXT = "market_context"
    RISK_CHALLENGER = "risk_challenger"


class ContentSourceType(str, Enum):
    """Types of content sources for agent analysis."""
    TEXT = "text"
    SUBSTACK_ARTICLE = "substack_article"
    YOUTUBE_VIDEO = "youtube_video"
    MARKET_REPORT = "market_report"
    NEWS_ARTICLE = "news_article"


class ContentSource(BaseModel):
    """Source content for agent analysis."""
    type: ContentSourceType
    title: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., min_length=10)
    url: Optional[str] = Field(None, description="URL of the source content")
    author: Optional[str] = Field(None, max_length=200)
    published_at: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @field_validator('url')
    @classmethod
    def validate_url(cls, v):
        if v and not v.startswith(('http://', 'https://')):
            raise ValueError('URL must start with http:// or https://')
        return v


class AgentMessage(BaseModel):
    """Individual message from an AutoGen agent."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    agent_type: AgentType
    agent_name: str = Field(..., min_length=1, max_length=100)
    content: str = Field(..., min_length=1)
    confidence_level: Optional[float] = Field(None, ge=0, le=1)
    cited_sources: List[str] = Field(default_factory=list)
    signal_references: List[str] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    message_order: int = Field(..., ge=0)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict()


class ConversationSession(BaseModel):
    """AutoGen agent conversation session."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = Field(..., description="UUID of the authenticated user")
    content_source: ContentSource
    status: ConversationStatus = ConversationStatus.INITIALIZED
    messages: List[AgentMessage] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    consensus_reached: bool = False
    final_recommendation: Optional[str] = None
    confidence_score: Optional[float] = Field(None, ge=0, le=1)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @field_validator('user_id')
    @classmethod
    def validate_user_id(cls, v):
        try:
            # Validate UUID format
            uuid.UUID(v)
        except ValueError:
            raise ValueError('user_id must be a valid UUID')
        return v

    model_config = ConfigDict()


class ConversationCreateRequest(BaseModel):
    """Request to create a new agent conversation."""
    content: ContentSource
    user_id: str = Field(..., description="UUID of the authenticated user")
    auto_start: bool = Field(default=False, description="Start debate immediately")
    custom_prompt: Optional[str] = Field(None, max_length=1000)

    @field_validator('user_id')
    @classmethod
    def validate_user_id(cls, v):
        try:
            uuid.UUID(v)
        except ValueError:
            raise ValueError('user_id must be a valid UUID')
        return v


class ConversationResponse(BaseModel):
    """Response after creating a conversation."""
    conversation_id: str
    status: ConversationStatus
    created_at: datetime
    content_source: ContentSource
    message: str

    model_config = ConfigDict()


class AgentDebateState(BaseModel):
    """Current state of the agent debate."""
    conversation_id: str
    status: ConversationStatus
    current_round: int = 0
    max_rounds: int = 5
    agents_participated: List[AgentType] = Field(default_factory=list)
    last_speaker: Optional[AgentType] = None
    next_speaker: Optional[AgentType] = None
    debate_started_at: Optional[datetime] = None
    debate_completed_at: Optional[datetime] = None


class ConversationExport(BaseModel):
    """Exported conversation data for client presentations."""
    conversation_id: str
    title: str
    content_source: ContentSource
    export_format: Literal["markdown", "json", "summary"]
    content: Union[str, Dict[str, Any]]
    agents_summary: Dict[AgentType, str]
    key_insights: List[str]
    final_recommendation: Optional[str]
    confidence_score: Optional[float]
    exported_at: datetime

    model_config = ConfigDict()


class WebSocketMessage(BaseModel):
    """WebSocket message for real-time conversation streaming."""
    type: Literal["agent_message", "status_update", "error", "debate_complete"]
    conversation_id: str
    data: Union[AgentMessage, AgentDebateState, Dict[str, Any]]
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict()


class AgentPerformanceMetrics(BaseModel):
    """Performance metrics for individual agents."""
    agent_type: AgentType
    total_messages: int = 0
    average_response_time: float = 0.0
    confidence_scores: List[float] = Field(default_factory=list)
    error_count: int = 0
    last_active: Optional[datetime] = None

    @property
    def average_confidence(self) -> float:
        """Calculate average confidence score."""
        if not self.confidence_scores:
            return 0.0
        return sum(self.confidence_scores) / len(self.confidence_scores)


class ConversationAnalytics(BaseModel):
    """Analytics data for conversation performance."""
    conversation_id: str
    total_duration_seconds: Optional[float] = None
    total_messages: int = 0
    agent_metrics: Dict[AgentType, AgentPerformanceMetrics] = Field(default_factory=dict)
    consensus_quality: Optional[float] = Field(None, ge=0, le=1)
    client_satisfaction: Optional[float] = Field(None, ge=0, le=1)
    generated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict()


# Error models for API responses
class ConversationError(BaseModel):
    """Error response for conversation operations."""
    error_type: str
    message: str
    conversation_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    details: Optional[Dict[str, Any]] = None

    model_config = ConfigDict()