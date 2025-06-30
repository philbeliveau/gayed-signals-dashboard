"""
Configuration settings for the YouTube Video Insights API.
"""

from pydantic import BaseSettings, Field
from typing import List, Optional
import os
from urllib.parse import urlparse


class Settings(BaseSettings):
    """Application configuration settings."""
    
    # Database settings
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://user:password@localhost:5432/video_insights",
        env="DATABASE_URL"
    )
    
    # Redis settings for caching and Celery
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        env="REDIS_URL"
    )
    
    # Parsed Redis settings for individual components
    @property
    def REDIS_HOST(self) -> str:
        return urlparse(self.REDIS_URL).hostname or "localhost"
    
    @property  
    def REDIS_PORT(self) -> int:
        return urlparse(self.REDIS_URL).port or 6379
    
    @property
    def REDIS_DB(self) -> int:
        path = urlparse(self.REDIS_URL).path
        return int(path[1:]) if path and len(path) > 1 else 0
    
    @property
    def REDIS_PASSWORD(self) -> Optional[str]:
        return urlparse(self.REDIS_URL).password
    REDIS_HOST: str = Field(
        default="localhost",
        env="REDIS_HOST"
    )
    REDIS_PORT: int = Field(
        default=6379,
        env="REDIS_PORT"
    )
    REDIS_DB: int = Field(
        default=0,
        env="REDIS_DB"
    )
    REDIS_PASSWORD: Optional[str] = Field(
        default=None,
        env="REDIS_PASSWORD"
    )
    
    # Authentication settings
    SECRET_KEY: str = Field(
        default="your-secret-key-change-in-production",
        env="SECRET_KEY"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30,
        env="ACCESS_TOKEN_EXPIRE_MINUTES"
    )
    
    # CORS settings
    ALLOWED_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
        env="ALLOWED_ORIGINS"
    )
    
    # API Keys
    OPENAI_API_KEY: Optional[str] = Field(
        default=None,
        env="OPENAI_KEY"
    )
    ANTHROPIC_API_KEY: Optional[str] = Field(
        default=None,
        env="ANTHROPIC_API_KEY"
    )
    FRED_API_KEY: Optional[str] = Field(
        default=None,
        env="FRED_API_KEY",
        description="Federal Reserve Economic Data (FRED) API key"
    )
    
    # YouTube processing settings
    MAX_VIDEO_DURATION_MINUTES: int = Field(
        default=120,  # 2 hours max
        env="MAX_VIDEO_DURATION_MINUTES"
    )
    AUDIO_CHUNK_SIZE_MB: int = Field(
        default=20,
        env="AUDIO_CHUNK_SIZE_MB"
    )
    
    # File storage settings
    TEMP_DIR: str = Field(
        default="temp",
        env="TEMP_DIR"
    )
    
    # Celery worker settings
    CELERY_BROKER_URL: str = Field(
        default="redis://localhost:6379/1",
        env="CELERY_BROKER_URL"
    )
    CELERY_RESULT_BACKEND: str = Field(
        default="redis://localhost:6379/1",
        env="CELERY_RESULT_BACKEND"
    )
    
    # Enhanced Celery configuration
    CELERY_TASK_SERIALIZER: str = Field(
        default="json",
        env="CELERY_TASK_SERIALIZER"
    )
    CELERY_ACCEPT_CONTENT: List[str] = Field(
        default=["json"],
        env="CELERY_ACCEPT_CONTENT"
    )
    CELERY_RESULT_SERIALIZER: str = Field(
        default="json",
        env="CELERY_RESULT_SERIALIZER"
    )
    CELERY_TIMEZONE: str = Field(
        default="UTC",
        env="CELERY_TIMEZONE"
    )
    CELERY_ENABLE_UTC: bool = Field(
        default=True,
        env="CELERY_ENABLE_UTC"
    )
    
    # Celery performance settings
    CELERY_WORKER_CONCURRENCY: int = Field(
        default=4,
        env="CELERY_WORKER_CONCURRENCY"
    )
    CELERY_WORKER_PREFETCH_MULTIPLIER: int = Field(
        default=1,
        env="CELERY_WORKER_PREFETCH_MULTIPLIER"
    )
    CELERY_TASK_SOFT_TIME_LIMIT: int = Field(
        default=1740,  # 29 minutes
        env="CELERY_TASK_SOFT_TIME_LIMIT"
    )
    CELERY_TASK_TIME_LIMIT: int = Field(
        default=1800,  # 30 minutes
        env="CELERY_TASK_TIME_LIMIT"
    )
    CELERY_TASK_SERIALIZER: str = Field(
        default="json",
        env="CELERY_TASK_SERIALIZER"
    )
    CELERY_ACCEPT_CONTENT: List[str] = Field(
        default=["json"],
        env="CELERY_ACCEPT_CONTENT"
    )
    CELERY_RESULT_SERIALIZER: str = Field(
        default="json",
        env="CELERY_RESULT_SERIALIZER"
    )
    CELERY_TIMEZONE: str = Field(
        default="UTC",
        env="CELERY_TIMEZONE"
    )
    CELERY_ENABLE_UTC: bool = Field(
        default=True,
        env="CELERY_ENABLE_UTC"
    )
    MAX_WORKERS: int = Field(
        default=4,
        env="MAX_WORKERS"
    )
    WORKER_TIMEOUT: int = Field(
        default=3600,  # 1 hour
        env="WORKER_TIMEOUT"
    )
    
    # Performance settings
    MAX_CONCURRENT_DOWNLOADS: int = Field(
        default=3,
        env="MAX_CONCURRENT_DOWNLOADS"
    )
    MAX_CONCURRENT_TRANSCRIPTIONS: int = Field(
        default=5,
        env="MAX_CONCURRENT_TRANSCRIPTIONS"
    )
    
    # Enhanced performance settings
    MAX_WORKERS: int = Field(
        default=4,
        env="MAX_WORKERS"
    )
    WORKER_TIMEOUT: int = Field(
        default=1800,  # 30 minutes
        env="WORKER_TIMEOUT"
    )
    
    # Database connection pool settings
    DB_POOL_SIZE: int = Field(
        default=20,
        env="DB_POOL_SIZE"
    )
    DB_MAX_OVERFLOW: int = Field(
        default=40,
        env="DB_MAX_OVERFLOW"
    )
    DB_POOL_TIMEOUT: int = Field(
        default=45,
        env="DB_POOL_TIMEOUT"
    )
    
    # Redis connection pool settings
    REDIS_POOL_SIZE: int = Field(
        default=100,
        env="REDIS_POOL_SIZE"
    )
    REDIS_POOL_TIMEOUT: int = Field(
        default=10,
        env="REDIS_POOL_TIMEOUT"
    )
    
    # Cache optimization settings
    CACHE_COMPRESSION_THRESHOLD: int = Field(
        default=1024,  # Compress data larger than 1KB
        env="CACHE_COMPRESSION_THRESHOLD"
    )
    CACHE_WARM_ON_STARTUP: bool = Field(
        default=True,
        env="CACHE_WARM_ON_STARTUP"
    )
    
    # Memory management settings
    MAX_MEMORY_USAGE_MB: int = Field(
        default=1024,  # 1GB
        env="MAX_MEMORY_USAGE_MB"
    )
    MEMORY_CHECK_INTERVAL: int = Field(
        default=5,
        env="MEMORY_CHECK_INTERVAL"
    )
    
    # Environment
    ENVIRONMENT: str = Field(
        default="development",
        env="ENVIRONMENT"
    )
    
    class Config:
        env_file = ".env"
        case_sensitive = True
    
    def get_database_url_sync(self) -> str:
        """Get synchronous database URL for non-async operations."""
        return self.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    
    def get_redis_url_for_db(self, db_number: int) -> str:
        """Get Redis URL for specific database number."""
        parsed = urlparse(self.REDIS_URL)
        return f"redis://{parsed.hostname}:{parsed.port or 6379}/{db_number}"


# Global settings instance
settings = Settings()