"""
Folder management API routes for organizing videos.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import List, Optional
from uuid import UUID
import logging
from datetime import datetime

from core.database import get_db
from core.security import get_current_user_optional
from models.database import User, Folder, Video
from services.cache_service import CacheService
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter()
cache_service = CacheService()


# Pydantic models
class FolderCreate(BaseModel):
    """Request model for creating a folder."""
    name: str = Field(..., min_length=1, max_length=255, description="Folder name")
    description: Optional[str] = Field(None, max_length=1000, description="Folder description")
    color: str = Field(default="#3B82F6", pattern="^#[0-9A-Fa-f]{6}$", description="Hex color code")


class FolderUpdate(BaseModel):
    """Request model for updating a folder."""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Folder name")
    description: Optional[str] = Field(None, max_length=1000, description="Folder description")
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$", description="Hex color code")


class FolderResponse(BaseModel):
    """Response model for folder data."""
    id: UUID
    name: str
    description: Optional[str]
    color: str
    created_at: datetime
    updated_at: datetime
    video_count: int = 0
    
    class Config:
        from_attributes = True


class FolderWithVideos(FolderResponse):
    """Folder response with video list."""
    videos: List[dict] = []


@router.post("/", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
async def create_folder(
    folder_data: FolderCreate,
    current_user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new folder for organizing videos.
    
    Args:
        folder_data: Folder creation data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Created folder information
    """
    try:
        # Check if folder name already exists for this user
        existing_folder = await db.execute(
            select(Folder).where(
                and_(
                    Folder.user_id == current_user.id,
                    Folder.name == folder_data.name
                )
            )
        )
        
        if existing_folder.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Folder with this name already exists"
            )
        
        # Create new folder
        folder = Folder(
            user_id=current_user.id,
            name=folder_data.name,
            description=folder_data.description,
            color=folder_data.color
        )
        
        db.add(folder)
        await db.commit()
        await db.refresh(folder)
        
        # Invalidate user cache
        await cache_service.invalidate_user_cache(str(current_user.id))
        
        logger.info(f"Created folder {folder.id} '{folder.name}' for user {current_user.id}")
        
        return FolderResponse(
            id=folder.id,
            name=folder.name,
            description=folder.description,
            color=folder.color,
            created_at=folder.created_at,
            updated_at=folder.updated_at,
            video_count=0
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating folder: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create folder"
        )


@router.get("/", response_model=List[FolderResponse])
async def list_folders(
    include_video_count: bool = Query(True, description="Include video count for each folder"),
    current_user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    List all folders for the current user.
    
    Args:
        include_video_count: Whether to include video count for each folder
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of user's folders
    """
    try:
        # Get user's folders
        folders_result = await db.execute(
            select(Folder).where(
                Folder.user_id == current_user.id
            ).order_by(Folder.created_at.desc())
        )
        folders = folders_result.scalars().all()
        
        folder_responses = []
        
        for folder in folders:
            video_count = 0
            
            if include_video_count:
                # Get video count for this folder
                count_result = await db.execute(
                    select(func.count(Video.id)).where(
                        Video.folder_id == folder.id
                    )
                )
                video_count = count_result.scalar()
            
            folder_response = FolderResponse(
                id=folder.id,
                name=folder.name,
                description=folder.description,
                color=folder.color,
                created_at=folder.created_at,
                updated_at=folder.updated_at,
                video_count=video_count
            )
            folder_responses.append(folder_response)
        
        return folder_responses
        
    except Exception as e:
        logger.error(f"Error listing folders: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve folders"
        )


@router.get("/{folder_id}", response_model=FolderWithVideos)
async def get_folder(
    folder_id: UUID,
    include_videos: bool = Query(True, description="Include videos in the folder"),
    current_user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed folder information with optional video list.
    
    Args:
        folder_id: Folder ID
        include_videos: Whether to include videos in the response
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Detailed folder information
    """
    try:
        # Get folder with user ownership check
        folder_result = await db.execute(
            select(Folder).where(
                and_(
                    Folder.id == folder_id,
                    Folder.user_id == current_user.id
                )
            )
        )
        folder = folder_result.scalar_one_or_none()
        
        if not folder:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Folder not found"
            )
        
        # Get video count
        count_result = await db.execute(
            select(func.count(Video.id)).where(
                Video.folder_id == folder_id
            )
        )
        video_count = count_result.scalar()
        
        videos = []
        if include_videos:
            # Get videos in this folder
            videos_result = await db.execute(
                select(Video).where(
                    Video.folder_id == folder_id
                ).order_by(Video.created_at.desc())
            )
            videos_data = videos_result.scalars().all()
            
            videos = [
                {
                    "id": str(video.id),
                    "youtube_url": video.youtube_url,
                    "youtube_id": video.youtube_id,
                    "title": video.title,
                    "channel_name": video.channel_name,
                    "duration": video.duration,
                    "thumbnail_url": video.thumbnail_url,
                    "status": video.status,
                    "created_at": video.created_at.isoformat()
                }
                for video in videos_data
            ]
        
        return FolderWithVideos(
            id=folder.id,
            name=folder.name,
            description=folder.description,
            color=folder.color,
            created_at=folder.created_at,
            updated_at=folder.updated_at,
            video_count=video_count,
            videos=videos
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting folder {folder_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve folder"
        )


@router.put("/{folder_id}", response_model=FolderResponse)
async def update_folder(
    folder_id: UUID,
    folder_update: FolderUpdate,
    current_user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Update an existing folder.
    
    Args:
        folder_id: Folder ID to update
        folder_update: Folder update data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Updated folder information
    """
    try:
        # Get folder with user ownership check
        folder_result = await db.execute(
            select(Folder).where(
                and_(
                    Folder.id == folder_id,
                    Folder.user_id == current_user.id
                )
            )
        )
        folder = folder_result.scalar_one_or_none()
        
        if not folder:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Folder not found"
            )
        
        # Check for name conflicts if name is being updated
        if folder_update.name and folder_update.name != folder.name:
            existing_folder = await db.execute(
                select(Folder).where(
                    and_(
                        Folder.user_id == current_user.id,
                        Folder.name == folder_update.name,
                        Folder.id != folder_id
                    )
                )
            )
            
            if existing_folder.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Folder with this name already exists"
                )
        
        # Update folder fields
        if folder_update.name is not None:
            folder.name = folder_update.name
        
        if folder_update.description is not None:
            folder.description = folder_update.description
        
        if folder_update.color is not None:
            folder.color = folder_update.color
        
        folder.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(folder)
        
        # Invalidate user cache
        await cache_service.invalidate_user_cache(str(current_user.id))
        
        # Get video count
        count_result = await db.execute(
            select(func.count(Video.id)).where(
                Video.folder_id == folder_id
            )
        )
        video_count = count_result.scalar()
        
        logger.info(f"Updated folder {folder_id} for user {current_user.id}")
        
        return FolderResponse(
            id=folder.id,
            name=folder.name,
            description=folder.description,
            color=folder.color,
            created_at=folder.created_at,
            updated_at=folder.updated_at,
            video_count=video_count
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating folder {folder_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update folder"
        )


@router.delete("/{folder_id}")
async def delete_folder(
    folder_id: UUID,
    force: bool = Query(False, description="Force delete even if folder contains videos"),
    current_user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a folder. Videos in the folder will be moved to no folder unless force is true.
    
    Args:
        folder_id: Folder ID to delete
        force: Whether to force delete folder with videos (videos will be moved to root)
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Success response
    """
    try:
        # Get folder with user ownership check
        folder_result = await db.execute(
            select(Folder).where(
                and_(
                    Folder.id == folder_id,
                    Folder.user_id == current_user.id
                )
            )
        )
        folder = folder_result.scalar_one_or_none()
        
        if not folder:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Folder not found"
            )
        
        # Check if folder has videos
        video_count_result = await db.execute(
            select(func.count(Video.id)).where(
                Video.folder_id == folder_id
            )
        )
        video_count = video_count_result.scalar()
        
        if video_count > 0 and not force:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Folder contains {video_count} videos. Use force=true to delete anyway (videos will be moved to root)."
            )
        
        # Move videos to root folder (folder_id = None) if force delete
        if video_count > 0 and force:
            videos_result = await db.execute(
                select(Video).where(Video.folder_id == folder_id)
            )
            videos = videos_result.scalars().all()
            
            for video in videos:
                video.folder_id = None
            
            logger.info(f"Moved {video_count} videos to root folder before deleting folder {folder_id}")
        
        # Delete folder
        await db.delete(folder)
        await db.commit()
        
        # Invalidate user cache
        await cache_service.invalidate_user_cache(str(current_user.id))
        
        logger.info(f"Deleted folder {folder_id} for user {current_user.id}")
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": "Folder deleted successfully",
                "videos_moved": video_count if force else 0
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting folder {folder_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete folder"
        )


@router.post("/{folder_id}/videos/{video_id}")
async def add_video_to_folder(
    folder_id: UUID,
    video_id: UUID,
    current_user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Add a video to a folder.
    
    Args:
        folder_id: Target folder ID
        video_id: Video ID to add
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Success response
    """
    try:
        # Verify folder exists and user owns it
        folder_result = await db.execute(
            select(Folder).where(
                and_(
                    Folder.id == folder_id,
                    Folder.user_id == current_user.id
                )
            )
        )
        folder = folder_result.scalar_one_or_none()
        
        if not folder:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Folder not found"
            )
        
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
        
        # Update video's folder
        video.folder_id = folder_id
        await db.commit()
        
        # Invalidate user cache
        await cache_service.invalidate_user_cache(str(current_user.id))
        
        logger.info(f"Added video {video_id} to folder {folder_id} for user {current_user.id}")
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Video added to folder successfully"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding video {video_id} to folder {folder_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add video to folder"
        )


@router.delete("/{folder_id}/videos/{video_id}")
async def remove_video_from_folder(
    folder_id: UUID,
    video_id: UUID,
    current_user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Remove a video from a folder (move to root).
    
    Args:
        folder_id: Source folder ID
        video_id: Video ID to remove
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Success response
    """
    try:
        # Verify video exists, user owns it, and it's in the specified folder
        video_result = await db.execute(
            select(Video).where(
                and_(
                    Video.id == video_id,
                    Video.user_id == current_user.id,
                    Video.folder_id == folder_id
                )
            )
        )
        video = video_result.scalar_one_or_none()
        
        if not video:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Video not found in specified folder"
            )
        
        # Remove video from folder (move to root)
        video.folder_id = None
        await db.commit()
        
        # Invalidate user cache
        await cache_service.invalidate_user_cache(str(current_user.id))
        
        logger.info(f"Removed video {video_id} from folder {folder_id} for user {current_user.id}")
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Video removed from folder successfully"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing video {video_id} from folder {folder_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove video from folder"
        )
