"""
SQLAlchemy database models for YouTube video insights application.
"""

from sqlalchemy import (
    Column, String, Text, Integer, DateTime, Boolean, 
    ForeignKey, JSON, UniqueConstraint, Index, Date, Float, Enum
)
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.types import TypeDecorator, CHAR
# Removed unused import: uuid as uuid_module
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import uuid

from core.database import Base


class SQLiteUUID(TypeDecorator):
    """
    Platform-independent UUID type that stores UUIDs as strings in SQLite
    and as native UUID types in PostgreSQL.
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        """Choose the appropriate implementation based on database dialect."""
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PostgresUUID(as_uuid=True))
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        """Convert UUID to appropriate format for storage."""
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return value if isinstance(value, uuid.UUID) else uuid.UUID(value)
        else:
            return str(value) if isinstance(value, uuid.UUID) else value

    def process_result_value(self, value, dialect):
        """Convert stored value back to UUID object."""
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return value if isinstance(value, uuid.UUID) else uuid.UUID(value)
        else:
            return uuid.UUID(value) if isinstance(value, str) else value




class User(Base):
    """User model for authentication and authorization."""
    
    __tablename__ = "users"
    
    id = Column(SQLiteUUID(), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    
    # Relationships
    videos = relationship("Video", back_populates="user", cascade="all, delete-orphan")
    folders = relationship("Folder", back_populates="user", cascade="all, delete-orphan")
    prompt_templates = relationship("PromptTemplate", back_populates="user", cascade="all, delete-orphan")


class Folder(Base):
    """Folder model for organizing videos."""
    
    __tablename__ = "folders"
    
    id = Column(SQLiteUUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(SQLiteUUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    color = Column(String(7), default="#3B82F6")  # Hex color code
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="folders")
    videos = relationship("Video", back_populates="folder")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="unique_folder_per_user"),
        Index("idx_folders_user_id", "user_id"),
    )


class Video(Base):
    """Video model for storing YouTube video metadata and processing status."""
    
    __tablename__ = "videos"
    
    id = Column(SQLiteUUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(SQLiteUUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    folder_id = Column(SQLiteUUID(), ForeignKey("folders.id", ondelete="SET NULL"), nullable=True)
    
    # YouTube metadata
    youtube_url = Column(String(500), nullable=False)
    youtube_id = Column(String(100), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    channel_name = Column(String(200))
    channel_id = Column(String(100))
    description = Column(Text)
    duration = Column(Integer)  # Duration in seconds
    published_at = Column(DateTime(timezone=True))
    view_count = Column(Integer)
    like_count = Column(Integer)
    thumbnail_url = Column(String(500))
    
    # Processing status
    status = Column(String(20), default="processing", nullable=False)  # processing, complete, error
    error_message = Column(Text)
    processing_started_at = Column(DateTime(timezone=True))
    processing_completed_at = Column(DateTime(timezone=True))
    
    # File paths
    audio_file_path = Column(String(500))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="videos")
    folder = relationship("Folder", back_populates="videos")
    transcript = relationship("Transcript", back_populates="video", uselist=False, cascade="all, delete-orphan")
    summaries = relationship("Summary", back_populates="video", cascade="all, delete-orphan")
    
    # Constraints and indexes
    __table_args__ = (
        UniqueConstraint("user_id", "youtube_id", name="unique_video_per_user"),
        Index("idx_videos_user_status", "user_id", "status"),
        Index("idx_videos_folder_created", "user_id", "folder_id", "created_at"),
        Index("idx_videos_created_at", "created_at"),
        Index("idx_videos_title_channel", "title", "channel_name"),
    )


class Transcript(Base):
    """Transcript model for storing video transcriptions."""
    
    __tablename__ = "transcripts"
    
    id = Column(SQLiteUUID(), primary_key=True, default=uuid.uuid4)
    video_id = Column(SQLiteUUID(), ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Transcript data
    full_text = Column(Text, nullable=False)
    chunks = Column(JSON, nullable=False)  # Array of transcript chunks with timestamps
    language = Column(String(10), default="en")
    confidence_score = Column(Integer)  # Average confidence score (0-100)
    
    # Processing metadata
    processing_duration = Column(Integer)  # Processing time in seconds
    chunk_count = Column(Integer)
    total_audio_duration = Column(Integer)  # Original audio duration in seconds
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    
    # Relationships
    video = relationship("Video", back_populates="transcript")
    
    # Performance indexes
    __table_args__ = (
        # Note: Full-text search index disabled - requires pg_trgm extension
        # Index("idx_transcripts_search", "full_text", postgresql_using="gin", 
        #       postgresql_ops={"full_text": "gin_trgm_ops"}),
        # Index("idx_transcripts_chunks_jsonb", "chunks", postgresql_using="gin", 
        #       postgresql_ops={"chunks": "jsonb_ops"}),  # Disabled for SQLite compatibility
        Index("idx_transcripts_duration_confidence", "total_audio_duration", "confidence_score"),
    )


class Summary(Base):
    """Summary model for storing AI-generated video summaries."""
    
    __tablename__ = "summaries"
    
    id = Column(SQLiteUUID(), primary_key=True, default=uuid.uuid4)
    video_id = Column(SQLiteUUID(), ForeignKey("videos.id", ondelete="CASCADE"), nullable=False)
    prompt_template_id = Column(SQLiteUUID(), ForeignKey("prompt_templates.id", ondelete="SET NULL"), nullable=True)
    
    # Summary content
    summary_text = Column(Text, nullable=False)
    mode = Column(String(50), nullable=False)  # bullet, executive, action_items, timeline, custom
    user_prompt = Column(Text)  # Custom prompt used for generation
    
    # LLM metadata
    llm_provider = Column(String(50))  # openai, anthropic, etc.
    llm_model = Column(String(100))  # gpt-4, claude-3, etc.
    token_count = Column(Integer)
    processing_cost = Column(Integer)  # Cost in cents
    processing_duration = Column(Integer)  # Processing time in seconds
    
    # Quality metrics
    relevance_score = Column(Integer)  # User rating 1-5
    feedback = Column(Text)  # User feedback
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    
    # Relationships
    video = relationship("Video", back_populates="summaries")
    prompt_template = relationship("PromptTemplate")
    
    # Constraints and indexes
    __table_args__ = (
        Index("idx_summaries_video_mode", "video_id", "mode"),
        # Index("idx_summaries_search", "summary_text", postgresql_using="gin",
        #       postgresql_ops={"summary_text": "gin_trgm_ops"}),  # Requires pg_trgm extension
        Index("idx_summaries_created", "created_at"),
        Index("idx_summaries_token_cost", "token_count", "processing_cost"),
        Index("idx_summaries_provider_model", "llm_provider", "llm_model"),
    )


class PromptTemplate(Base):
    """Prompt template model for reusable summarization prompts."""
    
    __tablename__ = "prompt_templates"
    
    id = Column(SQLiteUUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(SQLiteUUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Template metadata
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100), default="custom")  # financial, technical, meeting, custom
    
    # Template content
    prompt_text = Column(Text, nullable=False)
    variables = Column(JSON, default=list)  # List of variable names used in template
    
    # Usage and sharing
    is_public = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    usage_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="prompt_templates")
    
    # Constraints and indexes
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="unique_template_per_user"),
        Index("idx_prompt_templates_category", "category"),
        Index("idx_prompt_templates_public", "is_public", "is_featured"),
        Index("idx_prompt_templates_usage", "usage_count"),
    )


class ProcessingJob(Base):
    """Model for tracking background processing jobs."""
    
    __tablename__ = "processing_jobs"
    
    id = Column(SQLiteUUID(), primary_key=True, default=uuid.uuid4)
    video_id = Column(SQLiteUUID(), ForeignKey("videos.id", ondelete="CASCADE"), nullable=False)
    
    # Job metadata
    job_type = Column(String(50), nullable=False)  # download, transcribe, summarize
    celery_task_id = Column(String(255), unique=True, index=True)
    status = Column(String(20), default="pending")  # pending, running, completed, failed
    
    # Progress tracking
    progress_percentage = Column(Integer, default=0)
    current_step = Column(String(100))
    total_steps = Column(Integer)
    
    # Error handling
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=func.now())
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    
    # Constraints and indexes
    __table_args__ = (
        Index("idx_jobs_status_created", "status", "created_at"),
        Index("idx_jobs_video_type", "video_id", "job_type"),
    )


class EconomicSeries(Base):
    """Model for economic data series metadata."""
    
    __tablename__ = "economic_series"
    
    id = Column(SQLiteUUID(), primary_key=True, default=uuid.uuid4)
    series_id = Column(String(50), unique=True, nullable=False, index=True)  # FRED series ID (e.g., 'ICSA', 'CSUSHPINSA')
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100), nullable=False)  # 'labor_market' or 'housing'
    frequency = Column(String(20), nullable=False)  # 'weekly', 'monthly', 'quarterly'
    units = Column(String(100))
    seasonal_adjustment = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    
    # Relationships
    data_points = relationship("EconomicDataPoint", back_populates="series", cascade="all, delete-orphan")
    
    # Constraints and indexes
    __table_args__ = (
        Index("idx_economic_series_category", "category"),
        Index("idx_economic_series_frequency", "frequency"),
        Index("idx_economic_series_category_frequency", "category", "frequency"),
    )


class EconomicDataPoint(Base):
    """Model for individual economic data observations."""
    
    __tablename__ = "economic_data_points"
    
    id = Column(SQLiteUUID(), primary_key=True, default=uuid.uuid4)
    series_id = Column(SQLiteUUID(), ForeignKey("economic_series.id", ondelete="CASCADE"), nullable=False)
    observation_date = Column(DateTime(timezone=True), nullable=False)
    value = Column(String(50))  # Store as string to handle FRED's '.' for missing values
    numeric_value = Column(Integer)  # Parsed numeric value for calculations
    is_preliminary = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=func.now())
    
    # Relationships
    series = relationship("EconomicSeries", back_populates="data_points")
    
    # Constraints and indexes
    __table_args__ = (
        UniqueConstraint("series_id", "observation_date", name="unique_series_observation"),
        Index("idx_economic_data_series_date", "series_id", "observation_date"),
        Index("idx_economic_data_observation_date", "observation_date"),
        Index("idx_economic_data_numeric_value", "numeric_value"),
        Index("idx_economic_data_series_date_desc", "series_id", "observation_date"),
    )


# Create search indexes for full-text search
def create_search_indexes():
    """
    Create comprehensive database indexes for maximum performance optimization.
    This function should be called after table creation.
    """
    return [
        # Core performance indexes
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_user_status ON videos(user_id, status) WHERE status != 'error';",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_folder_created ON videos(user_id, folder_id, created_at DESC);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folders_user_id ON folders(user_id);",
        
        # Full-text search indexes with trigram support
        # "CREATE EXTENSION IF NOT EXISTS pg_trgm;",  # Requires superuser privileges
        # "CREATE EXTENSION IF NOT EXISTS btree_gin;",  # Requires superuser privileges
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transcripts_fulltext ON transcripts USING gin(to_tsvector('english', full_text));",
        # "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transcripts_trigram ON transcripts USING gin(full_text gin_trgm_ops);",  # Requires pg_trgm extension
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_summaries_fulltext ON summaries USING gin(to_tsvector('english', summary_text));",
        # "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_summaries_trigram ON summaries USING gin(summary_text gin_trgm_ops);",  # Requires pg_trgm extension
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_title_channel_fulltext ON videos USING gin(to_tsvector('english', title || ' ' || coalesce(channel_name, '')));",
        # "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_title_trigram ON videos USING gin(title gin_trgm_ops);",  # Requires pg_trgm extension
        # "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_channel_trigram ON videos USING gin(channel_name gin_trgm_ops);",  # Requires pg_trgm extension
        
        # Performance indexes for video processing
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_youtube_id ON videos(youtube_id);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_processing_status ON videos(status, processing_started_at) WHERE status IN ('processing', 'error');",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_duration_views ON videos(duration, view_count) WHERE duration > 0;",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_published_at ON videos(published_at DESC) WHERE published_at IS NOT NULL;",
        
        # Transcript performance indexes
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transcripts_video_id ON transcripts(video_id);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transcripts_language ON transcripts(language);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transcripts_confidence ON transcripts(confidence_score) WHERE confidence_score IS NOT NULL;",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transcripts_chunks_gin ON transcripts USING gin(chunks jsonb_ops);",
        
        # Summary performance indexes
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_summaries_video_mode ON summaries(video_id, mode);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_summaries_created_mode ON summaries(created_at DESC, mode);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_summaries_relevance ON summaries(relevance_score) WHERE relevance_score IS NOT NULL;",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_summaries_cost ON summaries(processing_cost) WHERE processing_cost IS NOT NULL;",
        
        # Folder and organization indexes
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folders_user_created ON folders(user_id, created_at DESC);",
        # "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folders_name_trigram ON folders USING gin(name gin_trgm_ops);",  # Requires pg_trgm extension
        
        # Processing job indexes
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_status_created ON processing_jobs(status, created_at DESC);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_video_type ON processing_jobs(video_id, job_type);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_celery_task ON processing_jobs(celery_task_id) WHERE celery_task_id IS NOT NULL;",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_retry_count ON processing_jobs(retry_count, max_retries) WHERE retry_count < max_retries;",
        
        # User activity indexes
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active ON users(email) WHERE is_active = true;",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at DESC);",
        
        # Prompt template indexes
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prompt_templates_category_public ON prompt_templates(category, is_public, is_featured);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prompt_templates_usage_desc ON prompt_templates(usage_count DESC);",
        # "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prompt_templates_name_trigram ON prompt_templates USING gin(name gin_trgm_ops);",  # Requires pg_trgm extension
        
        # Composite indexes for common queries
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_user_folder_status ON videos(user_id, folder_id, status, created_at DESC);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_channel_published ON videos(channel_name, published_at DESC) WHERE published_at IS NOT NULL;",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_summaries_user_mode_created ON summaries(video_id, mode, created_at DESC);",
        
        # Economic data performance indexes
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_economic_series_category ON economic_series(category);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_economic_series_frequency ON economic_series(frequency);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_economic_series_category_frequency ON economic_series(category, frequency);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_economic_series_series_id ON economic_series(series_id);",
        
        # Economic data points performance indexes
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_economic_data_series_date ON economic_data_points(series_id, observation_date DESC);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_economic_data_observation_date ON economic_data_points(observation_date DESC);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_economic_data_numeric_value ON economic_data_points(numeric_value) WHERE numeric_value IS NOT NULL;",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_economic_data_series_recent ON economic_data_points(series_id, observation_date DESC) WHERE observation_date >= CURRENT_DATE - INTERVAL '5 years';",
        
        # Economic data composite indexes for common queries
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_economic_data_series_value_date ON economic_data_points(series_id, numeric_value, observation_date DESC) WHERE numeric_value IS NOT NULL;",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_economic_series_latest_data ON economic_data_points(series_id, observation_date DESC, created_at DESC);",

        # Conversation system performance indexes
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_user_status ON conversation_sessions(user_id, status);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_created_at ON conversation_sessions(created_at DESC);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_content_type ON conversation_sessions(content_type);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_status_created ON conversation_sessions(status, created_at DESC);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_consensus ON conversation_sessions(consensus_reached, confidence_score);",

        # Conversation message performance indexes
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_messages_session_order ON conversation_messages(session_id, message_order);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_messages_agent_created ON conversation_messages(agent_id, created_at DESC);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_messages_session_created ON conversation_messages(session_id, created_at DESC);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_messages_agent_confidence ON conversation_messages(agent_id, confidence);",

        # Conversation full-text search
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_content_fulltext ON conversation_sessions USING gin(to_tsvector('english', content_title || ' ' || content_text));",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_messages_content_fulltext ON conversation_messages USING gin(to_tsvector('english', content));"
    ]


# Conversation system database models for persistence
class ConversationSession(Base):
    """SQLAlchemy model for persisting AutoGen conversation sessions."""

    __tablename__ = "conversation_sessions"

    id = Column(SQLiteUUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(SQLiteUUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)

    # Content source information
    content_title = Column(String(500), nullable=False)
    content_type = Column(String(50), nullable=False)  # text, youtube, substack, etc.
    content_text = Column(Text, nullable=False)
    content_url = Column(String(500))
    content_author = Column(String(200))
    content_published_at = Column(DateTime(timezone=True))
    content_metadata = Column(JSON, default=dict)

    # Conversation status and control
    status = Column(String(20), default="initializing", nullable=False)
    consensus_reached = Column(Boolean, default=False)
    final_recommendation = Column(Text)
    confidence_score = Column(Integer)  # 0-100

    # Signal context from trading system
    signal_context = Column(JSON, default=dict)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True))

    # Relationships
    user = relationship("User", backref="conversation_sessions")
    messages = relationship("ConversationMessage", back_populates="session", cascade="all, delete-orphan")

    # Constraints and indexes
    __table_args__ = (
        Index("idx_conversations_user_status", "user_id", "status"),
        Index("idx_conversations_created_at", "created_at"),
        Index("idx_conversations_content_type", "content_type"),
        Index("idx_conversations_status_created", "status", "created_at"),
    )


class ConversationMessage(Base):
    """SQLAlchemy model for individual agent messages in conversations."""

    __tablename__ = "conversation_messages"

    id = Column(SQLiteUUID(), primary_key=True, default=uuid.uuid4)
    session_id = Column(SQLiteUUID(), ForeignKey("conversation_sessions.id", ondelete="CASCADE"), nullable=False)

    # Agent information
    agent_id = Column(String(100), nullable=False)  # financial_analyst, market_context, risk_challenger
    agent_name = Column(String(100), nullable=False)

    # Message content
    content = Column(Text, nullable=False)
    message_type = Column(String(50), default="analysis")  # analysis, context, challenge, consensus
    confidence = Column(Integer, default=70)  # 0-100
    message_order = Column(Integer, nullable=False)

    # Message metadata
    cited_sources = Column(JSON, default=list)
    signal_references = Column(JSON, default=list)
    message_metadata = Column(JSON, default=dict)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=func.now())

    # Relationships
    session = relationship("ConversationSession", back_populates="messages")

    # Constraints and indexes
    __table_args__ = (
        Index("idx_conversation_messages_session_order", "session_id", "message_order"),
        Index("idx_conversation_messages_agent_created", "agent_id", "created_at"),
        Index("idx_conversation_messages_session_created", "session_id", "created_at"),
        UniqueConstraint("session_id", "message_order", name="unique_message_order_per_session"),
    )