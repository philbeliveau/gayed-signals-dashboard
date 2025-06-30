"""
Video management API routes for YouTube video processing.
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from typing import List, Optional, Dict, Any
from uuid import UUID
import logging
from datetime import datetime

from core.database import get_db
from core.security import get_current_user
from models.database import User, Video, Transcript, Summary, Folder
from services.youtube_service import youtube_service
from services.cache_service import CacheService
from tasks.video_tasks import process_youtube_video, batch_process_playlist
from pydantic import BaseModel, HttpUrl, Field

logger = logging.getLogger(__name__)
router = APIRouter()
cache_service = CacheService()


# Pydantic models for request/response
class VideoProcessRequest(BaseModel):
    """Request model for video processing."""
    youtube_url: HttpUrl
    summary_mode: str = Field(default="bullet", regex="^(bullet|executive|action_items|timeline|custom)$")
    user_prompt: Optional[str] = None
    folder_id: Optional[UUID] = None


class PlaylistProcessRequest(BaseModel):
    """Request model for playlist processing."""
    playlist_url: HttpUrl
    summary_mode: str = Field(default="bullet", regex="^(bullet|executive|action_items|timeline|custom)$")
    folder_id: Optional[UUID] = None


class VideoResponse(BaseModel):
    """Response model for video data."""
    id: UUID
    youtube_url: str
    youtube_id: Optional[str]
    title: Optional[str]
    channel_name: Optional[str]
    description: Optional[str]
    duration: Optional[int]
    thumbnail_url: Optional[str]
    status: str
    created_at: datetime
    folder_id: Optional[UUID]
    has_transcript: bool = False
    has_summary: bool = False
    
    class Config:
        from_attributes = True


class VideoDetailResponse(VideoResponse):
    """Detailed video response with transcript and summaries."""
    transcript: Optional[Dict[str, Any]] = None
    summaries: List[Dict[str, Any]] = []
    processing_progress: Optional[Dict[str, Any]] = None


class ProcessingStatusResponse(BaseModel):
    """Processing status response."""
    task_id: str
    status: str
    progress: Optional[Dict[str, Any]] = None
    video_id: Optional[UUID] = None
    error_message: Optional[str] = None


@router.post("/process", response_model=ProcessingStatusResponse)
async def process_video(
    request: VideoProcessRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Process a YouTube video: extract audio, transcribe, and summarize.
    
    Args:
        request: Video processing request
        background_tasks: FastAPI background tasks
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Processing status with task ID
    """
    try:
        # Validate YouTube URL
        if not youtube_service.is_valid_youtube_url(str(request.youtube_url)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid YouTube URL"
            )
        
        # Extract video ID
        youtube_id = youtube_service.extract_video_id(str(request.youtube_url))
        if not youtube_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not extract video ID from URL"
            )
        
        # Check if video already exists for this user
        existing_video = await db.execute(
            select(Video).where(
                and_(
                    Video.user_id == current_user.id,
                    Video.youtube_id == youtube_id
                )
            )
        )
        existing_video = existing_video.scalar_one_or_none()
        
        if existing_video:
            if existing_video.status == "complete":
                return ProcessingStatusResponse(
                    task_id="existing",
                    status="complete",
                    video_id=existing_video.id
                )
            elif existing_video.status == "processing":
                return ProcessingStatusResponse(
                    task_id="processing",
                    status="processing",
                    video_id=existing_video.id
                )
        
        # Validate folder ownership if provided
        if request.folder_id:
            folder = await db.execute(
                select(Folder).where(
                    and_(
                        Folder.id == request.folder_id,
                        Folder.user_id == current_user.id
                    )
                )
            )
            if not folder.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Folder not found"
                )
        
        # Try to get cached metadata to validate video
        try:
            metadata = await youtube_service.get_video_metadata(str(request.youtube_url))
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to access video: {str(e)}"
            )
        
        # Create or update video record
        if existing_video:
            video = existing_video
            video.status = "processing"
            video.error_message = None
            video.processing_started_at = datetime.utcnow()
        else:
            video = Video(
                user_id=current_user.id,
                folder_id=request.folder_id,
                youtube_url=str(request.youtube_url),
                youtube_id=youtube_id,
                title=metadata.get('title', ''),
                channel_name=metadata.get('channel_name', ''),
                description=metadata.get('description', ''),
                duration=metadata.get('duration', 0),
                thumbnail_url=metadata.get('thumbnail_url', ''),
                status="processing",
                processing_started_at=datetime.utcnow()
            )
            db.add(video)
        
        await db.commit()
        await db.refresh(video)
        
        # Start background processing task
        task = process_youtube_video.delay(
            video_id=str(video.id),
            youtube_url=str(request.youtube_url),
            user_id=str(current_user.id),
            summary_mode=request.summary_mode,
            user_prompt=request.user_prompt,
            folder_id=str(request.folder_id) if request.folder_id else None
        )
        
        logger.info(f"Started video processing task {task.id} for video {video.id}")
        
        return ProcessingStatusResponse(
            task_id=task.id,
            status="processing",
            video_id=video.id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing video: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start video processing"
        )


@router.post("/process-playlist", response_model=ProcessingStatusResponse)
async def process_playlist(
    request: PlaylistProcessRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Process an entire YouTube playlist.
    
    Args:
        request: Playlist processing request
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Processing status with task ID
    """
    try:
        # Validate folder ownership if provided
        if request.folder_id:
            folder = await db.execute(
                select(Folder).where(
                    and_(
                        Folder.id == request.folder_id,
                        Folder.user_id == current_user.id
                    )
                )
            )
            if not folder.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Folder not found"
                )
        
        # Start background playlist processing
        task = batch_process_playlist.delay(
            playlist_url=str(request.playlist_url),
            user_id=str(current_user.id),
            summary_mode=request.summary_mode,
            folder_id=str(request.folder_id) if request.folder_id else None
        )
        
        logger.info(f"Started playlist processing task {task.id}")
        
        return ProcessingStatusResponse(
            task_id=task.id,
            status="processing"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing playlist: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start playlist processing"
        )


@router.get("/", response_model=List[VideoResponse])
async def list_videos(
    folder_id: Optional[UUID] = Query(None, description="Filter by folder ID"),
    status: Optional[str] = Query(None, description="Filter by processing status"),
    search: Optional[str] = Query(None, description="Search in title and channel name"),
    limit: int = Query(20, ge=1, le=100, description="Number of videos to return"),
    offset: int = Query(0, ge=0, description="Number of videos to skip"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List user's videos with optional filtering and pagination.
    
    Args:
        folder_id: Optional folder filter
        status: Optional status filter
        search: Optional search query
        limit: Maximum number of results
        offset: Number of results to skip
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of user's videos
    """
    try:
        # Check cache first
        cache_key = f"user_videos:{current_user.id}:{folder_id}:{status}:{search}:{limit}:{offset}"
        cached_videos = await cache_service.get_user_videos(cache_key)
        if cached_videos:
            return cached_videos
        
        # Build query
        query = select(Video).where(Video.user_id == current_user.id)
        
        # Apply filters
        if folder_id:
            query = query.where(Video.folder_id == folder_id)
        
        if status:
            query = query.where(Video.status == status)
        
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    Video.title.ilike(search_term),
                    Video.channel_name.ilike(search_term)
                )
            )
        
        # Add ordering and pagination
        query = query.order_by(Video.created_at.desc()).limit(limit).offset(offset)
        
        # Execute query
        result = await db.execute(query)
        videos = result.scalars().all()
        
        # Check for transcripts and summaries
        video_responses = []
        for video in videos:
            # Check if transcript exists
            transcript_exists = await db.execute(
                select(func.count(Transcript.id)).where(Transcript.video_id == video.id)
            )
            has_transcript = transcript_exists.scalar() > 0
            
            # Check if summaries exist
            summary_count = await db.execute(
                select(func.count(Summary.id)).where(Summary.video_id == video.id)
            )
            has_summary = summary_count.scalar() > 0
            
            video_response = VideoResponse(
                id=video.id,
                youtube_url=video.youtube_url,
                youtube_id=video.youtube_id,
                title=video.title,
                channel_name=video.channel_name,
                description=video.description,
                duration=video.duration,
                thumbnail_url=video.thumbnail_url,
                status=video.status,
                created_at=video.created_at,
                folder_id=video.folder_id,
                has_transcript=has_transcript,
                has_summary=has_summary
            )
            video_responses.append(video_response)
        
        # Cache results
        await cache_service.cache_user_videos(cache_key, [v.dict() for v in video_responses])
        
        return video_responses
        
    except Exception as e:
        logger.error(f"Error listing videos: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve videos"
        )


@router.get("/{video_id}", response_model=VideoDetailResponse)
async def get_video(
    video_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed video information including transcript and summaries.
    
    Args:
        video_id: Video ID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Detailed video information
    """
    try:
        # Get video with user ownership check
        video_result = await db.execute(
            select(Video).where(
                and_(
                    Video.id == video_id,
                    Video.user_id == current_user.id
                )
            )
        )
        video = video_result.scalar_one_or_none()
        
        if not video:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Video not found"
            )
        
        # Get transcript
        transcript_result = await db.execute(
            select(Transcript).where(Transcript.video_id == video_id)
        )
        transcript = transcript_result.scalar_one_or_none()
        
        # Get summaries
        summaries_result = await db.execute(
            select(Summary).where(Summary.video_id == video_id).order_by(Summary.created_at.desc())
        )
        summaries = summaries_result.scalars().all()
        
        # Get processing progress if video is still processing
        processing_progress = None
        if video.status == "processing":
            # Try to get from cache or Celery task status
            processing_progress = {
                "status": "processing",
                "progress": 0,
                "current_step": "Initializing..."
            }
        
        return VideoDetailResponse(
            id=video.id,
            youtube_url=video.youtube_url,
            youtube_id=video.youtube_id,
            title=video.title,
            channel_name=video.channel_name,
            description=video.description,
            duration=video.duration,
            thumbnail_url=video.thumbnail_url,
            status=video.status,
            created_at=video.created_at,
            folder_id=video.folder_id,
            has_transcript=transcript is not None,
            has_summary=len(summaries) > 0,
            transcript={
                "id": str(transcript.id),
                "full_text": transcript.full_text,
                "chunks": transcript.chunks,
                "language": transcript.language,
                "created_at": transcript.created_at.isoformat()
            } if transcript else None,
            summaries=[
                {
                    "id": str(summary.id),
                    "summary_text": summary.summary_text,
                    "mode": summary.mode,
                    "user_prompt": summary.user_prompt,
                    "llm_provider": summary.llm_provider,
                    "llm_model": summary.llm_model,
                    "created_at": summary.created_at.isoformat()
                }
                for summary in summaries
            ],
            processing_progress=processing_progress
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting video {video_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve video"
        )


@router.delete("/{video_id}")
async def delete_video(
    video_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a video and all associated data.
    
    Args:
        video_id: Video ID to delete
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Success response
    """
    try:
        # Get video with user ownership check
        video_result = await db.execute(
            select(Video).where(
                and_(
                    Video.id == video_id,
                    Video.user_id == current_user.id
                )
            )
        )
        video = video_result.scalar_one_or_none()
        
        if not video:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Video not found"
            )
        
        # Clean up any temporary files
        if video.audio_file_path:
            youtube_service.cleanup_temp_files(video.audio_file_path)
        
        # Invalidate cache
        await cache_service.invalidate_video_cache(str(video_id), video.youtube_url)
        await cache_service.invalidate_user_cache(str(current_user.id))
        
        # Delete video (cascade will handle related records)
        await db.delete(video)
        await db.commit()
        
        logger.info(f"Deleted video {video_id} for user {current_user.id}")
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Video deleted successfully"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting video {video_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete video"
        )


@router.get("/status/{task_id}", response_model=ProcessingStatusResponse)
async def get_processing_status(
    task_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get processing status for a video processing task.
    
    Args:
        task_id: Celery task ID
        current_user: Current authenticated user
        
    Returns:
        Processing status information
    """
    try:
        from core.celery_app import get_task_info
        
        task_info = get_task_info(task_id)
        
        return ProcessingStatusResponse(
            task_id=task_id,
            status=task_info['state'].lower(),
            progress=task_info.get('info', {}),
            error_message=task_info.get('traceback') if task_info['failed'] else None
        )
        
    except Exception as e:
        logger.error(f"Error getting task status {task_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve task status"
        )


@router.post("/{video_id}/regenerate-summary")
async def regenerate_summary(
    video_id: UUID,
    summary_mode: str = "bullet",
    user_prompt: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Regenerate summary for an existing video.
    
    Args:
        video_id: Video ID
        summary_mode: Type of summary to generate
        user_prompt: Optional custom prompt
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Processing status with task ID
    """
    try:
        # Verify video exists and user owns it
        video_result = await db.execute(
            select(Video).where(
                and_(
                    Video.id == video_id,
                    Video.user_id == current_user.id
                )
            )
        )
        video = video_result.scalar_one_or_none()
        
        if not video:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Video not found"
            )
        
        if video.status != "complete":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Video must be fully processed before regenerating summary"
            )
        
        # Check if transcript exists
        transcript_result = await db.execute(
            select(Transcript).where(Transcript.video_id == video_id)
        )
        transcript = transcript_result.scalar_one_or_none()
        
        if not transcript:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No transcript found for this video"
            )
        
        # Start summary regeneration task
        from tasks.video_tasks import regenerate_video_summary
        
        task = regenerate_video_summary.delay(
            video_id=str(video_id),
            summary_mode=summary_mode,
            user_prompt=user_prompt
        )
        
        logger.info(f"Started summary regeneration task {task.id} for video {video_id}")
        
        return ProcessingStatusResponse(
            task_id=task.id,
            status="processing",
            video_id=video_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error regenerating summary for video {video_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start summary regeneration"
        )
