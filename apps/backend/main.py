"""
FastAPI application for YouTube video processing and summarization.

This service provides APIs for:
- Processing YouTube videos with yt-dlp
- Transcribing audio using Whisper API
- Generating summaries with modular LLM integration
- Managing video organization with folders
- User authentication and data isolation
"""

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from fastapi.responses import JSONResponse
import uvicorn
import os
from typing import Dict, Any
import logging
from sqlalchemy import text

from core.config import settings
from core.database import engine, create_db_and_tables
from api.routes import videos, folders, prompts, economic_data, simple_youtube, conversations, content_triggers
# autogen_agents temporarily disabled due to missing autogen dependencies
# Temporarily disabled v1 conversations due to AutoGen dependencies
# from api.v1 import conversations as conversations_v1
from api.websocket import streaming as websocket_streaming, health as websocket_health
from models.database import Base

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title="YouTube Video Insights API",
    description="FastAPI service for processing YouTube videos with AI-powered transcription and summarization",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Security scheme
security = HTTPBearer()

# CORS middleware for Next.js integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Additional WebSocket CORS configuration
@app.middleware("http")
async def websocket_cors_middleware(request, call_next):
    """
    Explicit CORS policy for WebSocket connections.

    Validates WebSocket upgrade requests against allowed origins
    and ensures proper security headers are set.
    """
    # Check if this is a WebSocket upgrade request
    if request.headers.get("upgrade") == "websocket":
        origin = request.headers.get("origin")

        # Validate origin against allowed origins
        if origin and origin not in settings.ALLOWED_ORIGINS:
            # If origin not in allowed list, check for localhost development
            from urllib.parse import urlparse
            parsed_origin = urlparse(origin)

            # Allow localhost for development
            if parsed_origin.hostname not in ["localhost", "127.0.0.1"] and not parsed_origin.hostname.endswith(".vercel.app"):
                logger.warning(f"WebSocket connection denied for origin: {origin}")
                from fastapi.responses import JSONResponse
                return JSONResponse(
                    status_code=403,
                    content={"detail": "WebSocket origin not allowed"}
                )

    response = await call_next(request)

    # Add security headers for WebSocket responses
    if request.headers.get("upgrade") == "websocket":
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    return response

# Include API routers
app.include_router(
    videos.router,
    prefix="/api/v1/videos",
    tags=["videos"]
)

app.include_router(
    folders.router,
    prefix="/api/v1/folders",
    tags=["folders"]
)

app.include_router(
    prompts.router,
    prefix="/api/v1/prompts",
    tags=["prompts"]
)

app.include_router(
    economic_data.router,
    prefix="/api/v1/economic",
    tags=["economic-data"]
)

app.include_router(
    simple_youtube.router,
    prefix="/api/v1/youtube",
    tags=["simple-youtube"]
)

# Temporarily disabled autogen routes due to missing dependencies
# app.include_router(
#     autogen_agents.router,
#     prefix="/api/v1/autogen",
#     tags=["autogen-agents"]
# )

app.include_router(
    conversations.router,
    prefix="/api/v1",
    tags=["autogen-conversations"]
)

# Temporarily disabled v1 conversations API due to AutoGen dependencies
# app.include_router(
#     conversations_v1.router,
#     prefix="/api/v1",
#     tags=["conversation-orchestrator"]
# )

# Content triggers API for Story 2.1
app.include_router(
    content_triggers.router,
    tags=["content-triggers"]
)

# WebSocket streaming API for Story 2.8
app.include_router(
    websocket_streaming.router,
    prefix="/api/v1",
    tags=["websocket-streaming"]
)

# WebSocket health monitoring API for Story 2.8 QA fixes
app.include_router(
    websocket_health.router,
    prefix="/api/v1/websocket",
    tags=["websocket-health"]
)


@app.on_event("startup")
async def startup_event():
    """Initialize database and create tables on startup."""
    logger.info("Starting YouTube Video Insights API...")
    
    # Create database tables
    await create_db_and_tables()
    logger.info("Database tables created successfully")
    
    # Ensure temp directory exists
    os.makedirs("temp", exist_ok=True)
    logger.info("Temporary directory initialized")


@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown."""
    logger.info("Shutting down YouTube Video Insights API...")
    
    # Clean up temporary files
    import shutil
    if os.path.exists("temp"):
        shutil.rmtree("temp")
        logger.info("Temporary files cleaned up")


@app.get("/")
async def root() -> Dict[str, str]:
    """Root endpoint with service information."""
    return {
        "service": "YouTube Video Insights API",
        "version": "1.0.0",
        "status": "healthy",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint for monitoring."""
    try:
        # Optional database check only if DATABASE_URL is provided
        database_status = "not_configured"
        if hasattr(settings, 'DATABASE_URL') and settings.DATABASE_URL and not settings.DATABASE_URL.startswith('postgresql+asyncpg://user:password@localhost'):
            try:
                from core.database import async_session_maker
                async with async_session_maker() as session:
                    await session.execute(text("SELECT 1"))
                database_status = "connected"
            except Exception as db_e:
                logger.warning(f"Database check failed: {db_e}")
                database_status = "unavailable"
        
        return {
            "status": "healthy",
            "database": database_status,
            "service": "Trading Signals API"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "healthy",  # Still return healthy for basic functionality
            "database": "optional",
            "service": "Trading Signals API",
            "note": "Core trading signals work without database"
        }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unhandled errors."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"}
    )


if __name__ == "__main__":
    # Use Railway's PORT variable, fallback to FASTAPI_PORT, then 8000
    port = int(os.getenv("PORT", os.getenv("FASTAPI_PORT", "8000")))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,  # Disable reload in production
        log_level="info"
    )