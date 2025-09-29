"""
Configuration settings for the YouTube Video Insights API.
"""

from pydantic import Field, field_validator, ConfigDict
from pydantic_settings import BaseSettings
from typing import List, Optional, Union
import os
from urllib.parse import urlparse


class Settings(BaseSettings):
    """Application configuration settings."""
    
    # Database settings
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://user:password@localhost:5432/video_insights",
        description="Database connection URL"
    )

    # Redis settings for caching and Celery
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL"
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
    
    # Redis settings now handled by @property methods above that parse REDIS_URL
    
    # Authentication settings
    SECRET_KEY: str = Field(
        default="your-secret-key-change-in-production",
        description="Secret key for JWT token generation"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30,
        description="Access token expiration time in minutes"
    )

    # Frontend API settings
    FRONTEND_API_URL: str = Field(
        default="http://localhost:3000",
        description="Frontend API URL for MCP bridge communication"
    )

    # CORS settings
    ALLOWED_ORIGINS: Union[List[str], str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
        description="Allowed CORS origins"
    )
    
    @field_validator('ALLOWED_ORIGINS', 'CELERY_ACCEPT_CONTENT')
    @classmethod
    def parse_list_fields(cls, v):
        if isinstance(v, str):
            return [item.strip() for item in v.split(',')]
        return v
    
    # API Keys
    OPENAI_API_KEY: Optional[str] = Field(
        default=None,
        description="OpenAI API key for LLM services"
    )
    OPENAI_ORG_ID: Optional[str] = Field(
        default=None,
        description="OpenAI organization ID"
    )
    ANTHROPIC_API_KEY: Optional[str] = Field(
        default=None,
        description="Anthropic API key for Claude services"
    )
    FRED_API_KEY: Optional[str] = Field(
        default=None,
        description="Federal Reserve Economic Data (FRED) API key"
    )
    TIINGO_API_KEY: Optional[str] = Field(
        default=None,
        description="Tiingo financial data API key"
    )
    ALPHA_VANTAGE_KEY: Optional[str] = Field(
        default=None,
        description="Alpha Vantage financial data API key"
    )
    BUREAU_OF_STATISTIC_KEY: Optional[str] = Field(
        default=None,
        description="Bureau of Labor Statistics API key"
    )
    
    # YouTube processing settings
    MAX_VIDEO_DURATION_MINUTES: int = Field(
        default=120,  # 2 hours max
        description="Maximum video duration in minutes"
    )
    AUDIO_CHUNK_SIZE_MB: int = Field(
        default=20,
        description="Environment variable"
    )
    
    # File storage settings
    TEMP_DIR: str = Field(
        default="temp",
        description="Environment variable"
    )
    
    # Celery worker settings
    CELERY_BROKER_URL: str = Field(
        default="redis://localhost:6379/1",
        description="Environment variable"
    )
    CELERY_RESULT_BACKEND: str = Field(
        default="redis://localhost:6379/1",
        description="Environment variable"
    )
    
    # Enhanced Celery configuration
    CELERY_TASK_SERIALIZER: str = Field(
        default="json",
        description="Environment variable"
    )
    CELERY_ACCEPT_CONTENT: Union[List[str], str] = Field(
        default=["json"],
        description="Environment variable"
    )
    CELERY_RESULT_SERIALIZER: str = Field(
        default="json",
        description="Environment variable"
    )
    CELERY_TIMEZONE: str = Field(
        default="UTC",
        description="Environment variable"
    )
    CELERY_ENABLE_UTC: bool = Field(
        default=True,
        description="Environment variable"
    )
    
    # Celery performance settings
    CELERY_WORKER_CONCURRENCY: int = Field(
        default=4,
        description="Environment variable"
    )
    CELERY_WORKER_PREFETCH_MULTIPLIER: int = Field(
        default=1,
        description="Environment variable"
    )
    CELERY_TASK_SOFT_TIME_LIMIT: int = Field(
        default=1740,  # 29 minutes
        description="Environment variable"
    )
    CELERY_TASK_TIME_LIMIT: int = Field(
        default=1800,  # 30 minutes
        description="Environment variable"
    )
    
    # Duplicate Celery configuration removed - using definitions above
    
    # Performance settings
    MAX_CONCURRENT_DOWNLOADS: int = Field(
        default=3,
        description="Environment variable"
    )
    MAX_CONCURRENT_TRANSCRIPTIONS: int = Field(
        default=5,
        description="Environment variable"
    )
    
    # Worker performance settings (consolidated from duplicates)
    MAX_WORKERS: int = Field(
        default=4,
        description="Environment variable"
    )
    WORKER_TIMEOUT: int = Field(
        default=1800,  # 30 minutes (reduced from 1 hour for better resource management)
        description="Environment variable"
    )
    
    # Database connection pool settings
    DB_POOL_SIZE: int = Field(
        default=20,
        description="Environment variable"
    )
    DB_MAX_OVERFLOW: int = Field(
        default=40,
        description="Environment variable"
    )
    DB_POOL_TIMEOUT: int = Field(
        default=45,
        description="Environment variable"
    )
    
    # Redis connection pool settings
    REDIS_POOL_SIZE: int = Field(
        default=100,
        description="Environment variable"
    )
    REDIS_POOL_TIMEOUT: int = Field(
        default=10,
        description="Environment variable"
    )
    
    # Cache optimization settings
    CACHE_COMPRESSION_THRESHOLD: int = Field(
        default=1024,  # Compress data larger than 1KB
        description="Environment variable"
    )
    CACHE_WARM_ON_STARTUP: bool = Field(
        default=True,
        description="Environment variable"
    )
    
    # Memory management settings
    MAX_MEMORY_USAGE_MB: int = Field(
        default=1024,  # 1GB
        description="Environment variable"
    )
    MEMORY_CHECK_INTERVAL: int = Field(
        default=5,
        description="Environment variable"
    )
    
    # AutoGen Configuration
    ENABLE_AUTOGEN_AGENTS: bool = Field(
        default=True,
        description="Environment variable"
    )
    ENABLE_WEBSOCKET_STREAMING: bool = Field(
        default=True,
        description="Environment variable"
    )
    AUTOGEN_MODEL: str = Field(
        default="gpt-4",
        description="Environment variable"
    )
    AUTOGEN_TEMPERATURE: float = Field(
        default=0.1,
        description="Environment variable"
    )
    AUTOGEN_MAX_TOKENS: int = Field(
        default=500,
        description="Environment variable"
    )
    AUTOGEN_TIMEOUT: int = Field(
        default=30,
        description="Environment variable"
    )

    # Environment
    ENVIRONMENT: str = Field(
        default="development",
        description="Environment variable"
    )
    
    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="allow"  # Allow extra environment variables
    )
    
    def get_database_url_sync(self) -> str:
        """Get synchronous database URL for non-async operations."""
        return self.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    
    def get_redis_url_for_db(self, db_number: int) -> str:
        """Get Redis URL for specific database number."""
        parsed = urlparse(self.REDIS_URL)
        return f"redis://{parsed.hostname}:{parsed.port or 6379}/{db_number}"

    def get_autogen_config(self) -> dict:
        """Get AutoGen configuration for agent initialization."""
        # Validate API key exists and is properly formatted (SEC-001 fix)
        if not self.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is required for AutoGen functionality")

        if not self.OPENAI_API_KEY.startswith(("sk-", "sk-proj-")):
            raise ValueError("OPENAI_API_KEY must be a valid OpenAI API key format")

        return {
            "model": self.AUTOGEN_MODEL,
            "api_key": self.OPENAI_API_KEY,
            "organization": self.OPENAI_ORG_ID,
            "temperature": self.AUTOGEN_TEMPERATURE,
            "max_tokens": self.AUTOGEN_MAX_TOKENS,
            "timeout": self.AUTOGEN_TIMEOUT,
        }

    def mask_sensitive_data(self, data: dict) -> dict:
        """
        Mask sensitive information for logging/responses (SEC-001 fix).

        Args:
            data: Dictionary potentially containing sensitive information

        Returns:
            Dictionary with sensitive fields masked
        """
        if not data:
            return {}

        masked_data = data.copy()
        sensitive_fields = [
            'api_key', 'openai_api_key', 'anthropic_api_key',
            'fred_api_key', 'tiingo_api_key', 'alpha_vantage_key',
            'secret_key', 'password', 'token', 'bearer'
        ]

        for key, value in masked_data.items():
            if any(sensitive in key.lower() for sensitive in sensitive_fields):
                if isinstance(value, str) and len(value) > 4:
                    masked_data[key] = f"{value[:4]}***MASKED***"
                else:
                    masked_data[key] = "***MASKED***"

        return masked_data

    def validate_api_keys(self) -> dict:
        """
        Validate that required API keys are present and properly formatted (SEC-001 fix).

        Returns:
            Dictionary with validation results
        """
        validation_results = {
            "openai_api_key": {
                "present": bool(self.OPENAI_API_KEY),
                "valid_format": bool(self.OPENAI_API_KEY and self.OPENAI_API_KEY.startswith(("sk-", "sk-proj-"))),
                "masked_value": f"{self.OPENAI_API_KEY[:4]}***" if self.OPENAI_API_KEY else None
            },
            "fred_api_key": {
                "present": bool(self.FRED_API_KEY),
                "valid_format": bool(self.FRED_API_KEY and len(self.FRED_API_KEY) >= 20),
                "masked_value": f"{self.FRED_API_KEY[:4]}***" if self.FRED_API_KEY else None
            },
            "tiingo_api_key": {
                "present": bool(self.TIINGO_API_KEY),
                "valid_format": bool(self.TIINGO_API_KEY and len(self.TIINGO_API_KEY) >= 20),
                "masked_value": f"{self.TIINGO_API_KEY[:4]}***" if self.TIINGO_API_KEY else None
            }
        }

        # Add overall validation status
        validation_results["overall_status"] = {
            "critical_keys_present": validation_results["openai_api_key"]["present"],
            "all_keys_valid_format": all(
                result["valid_format"] for result in validation_results.values()
                if isinstance(result, dict) and "valid_format" in result and result["present"]
            )
        }

        return validation_results


# Global settings instance
settings = Settings()