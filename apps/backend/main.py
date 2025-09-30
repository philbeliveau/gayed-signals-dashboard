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
from api.routes import videos, folders, prompts, economic_data, simple_youtube, autogen_agents, conversations
from api.v1 import conversations as conversations_v1
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

app.include_router(
    autogen_agents.router,
    prefix="/api/v1/autogen",
    tags=["autogen-agents"]
)

app.include_router(
    conversations.router,
    prefix="/api/v1",
    tags=["autogen-conversations"]
)

# New v1 conversations API for Story 1.8
app.include_router(
    conversations_v1.router,
    prefix="/api/v1",
    tags=["conversation-orchestrator"]
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