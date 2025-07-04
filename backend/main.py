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
from core.security import get_current_user_optional
from api.routes import videos, folders, prompts, economic_data, simple_youtube, auth, users
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
    tags=["videos"],
    dependencies=[Depends(get_current_user_optional)]
)

app.include_router(
    folders.router,
    prefix="/api/v1/folders",
    tags=["folders"],
    dependencies=[Depends(get_current_user_optional)]
)

app.include_router(
    prompts.router,
    prefix="/api/v1/prompts",
    tags=["prompts"],
    dependencies=[Depends(get_current_user_optional)]
)

app.include_router(
    economic_data.router,
    prefix="/api/v1/economic",
    tags=["economic-data"]
)

app.include_router(
    simple_youtube.router,
    prefix="/api/v1/youtube",
    tags=["simple-youtube"],
    dependencies=[Depends(get_current_user_optional)]
)

# Authentication routes
app.include_router(
    auth.router,
    prefix="/api/auth",
    tags=["authentication"]
)

# User management routes
app.include_router(
    users.router,
    prefix="/api/users",
    tags=["users"]
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
        # Check database connection
        from core.database import async_session_maker
        async with async_session_maker() as session:
            await session.execute(text("SELECT 1"))
        
        return {
            "status": "healthy",
            "database": "connected",
            "service": "YouTube Video Insights API"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service unhealthy"
        )


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unhandled errors."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"}
    )


if __name__ == "__main__":
    port = int(os.getenv("FASTAPI_PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )