"""
Celery tasks for YouTube video processing pipeline.
"""
import os
import logging
import asyncio
from typing import Dict, Any, Optional
from uuid import UUID
import yt_dlp
from celery import Task, current_task
from sqlalchemy.ext.asyncio import AsyncSession

from core.celery_app import celery_app
from core.database import async_session_maker
from services.youtube_service import youtube_service
from services.transcription_service import transcription_service
from services.llm_service import llm_service
from services.cache_service import CacheService
from models.database import Video, Transcript, Summary
from core.config import settings

logger = logging.getLogger(__name__)


class CallbackTask(Task):
    """Custom task class with progress tracking."""
    
    def update_progress(self, current: int, total: int, status: str = "processing"):
        """Update task progress."""
        progress = int((current / total) * 100) if total > 0 else 0
        self.update_state(
            state='PROGRESS',
            meta={
                'current': current,
                'total': total,
                'status': status,
                'progress': progress
            }
        )


@celery_app.task(bind=True, base=CallbackTask, name="process_youtube_video")
def process_youtube_video(
    self,
    video_id: str,
    youtube_url: str,
    user_id: str,
    summary_mode: str = "bullet",
    user_prompt: Optional[str] = None,
    folder_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Main task to process YouTube video: extract audio, transcribe, and summarize.
    
    Args:
        video_id: Database video ID
        youtube_url: YouTube video URL
        user_id: User ID for the request
        summary_mode: Type of summary to generate
        user_prompt: Optional custom prompt
        folder_id: Optional folder ID for organization
        
    Returns:
        Dict containing processing results
    """
    try:
        # Initialize services
        cache_service = CacheService()
        
        logger.info(f"Starting video processing for {youtube_url}")
        
        # Step 1: Extract video metadata (5%)
        self.update_progress(1, 20, "Extracting video metadata")
        
        # Run async operations with timeout  
        try:
            # Add timeout for metadata fetch to prevent hanging
            def get_metadata_sync():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    return loop.run_until_complete(
                        asyncio.wait_for(
                            youtube_service.get_video_metadata(youtube_url),
                            timeout=120.0  # 2 minutes timeout for metadata fetch
                        )
                    )
                finally:
                    loop.close()
            
            metadata = get_metadata_sync()
            
            # Update database with metadata
            asyncio.run(
                update_video_metadata(video_id, metadata)
            )
            
            # Step 2: Extract audio (10%)
            self.update_progress(2, 20, "Extracting audio")
            audio_path = asyncio.run(
                youtube_service.download_audio(youtube_url, metadata['youtube_id'])
            )
            
            if not audio_path or not os.path.exists(audio_path):
                raise Exception("Failed to extract audio from video")
            
            # Step 3: Transcribe audio (60%)
            self.update_progress(4, 20, "Transcribing audio")
            
            transcription_result = asyncio.run(
                transcription_service.transcribe_audio(audio_path)
            )
            
            full_transcript = transcription_result.full_text
            transcript_chunks = [chunk.dict() for chunk in transcription_result.chunks]
            
            # Step 4: Save transcript to database (70%)
            self.update_progress(16, 20, "Saving transcript")
            
            transcript_id = asyncio.run(
                save_transcript(video_id, full_transcript, transcript_chunks)
            )
            
            # Step 5: Generate summary with LLM (85%)
            self.update_progress(17, 20, "Generating summary")
            
            summary_response = asyncio.run(
                llm_service.generate_summary(
                    transcript=full_transcript,
                    metadata=metadata,
                    mode=summary_mode,
                    user_prompt=user_prompt
                )
            )
            
            summary_text = summary_response.summary_text
            
            # Step 6: Save summary to database (95%)
            self.update_progress(19, 20, "Saving summary")
            
            summary_id = asyncio.run(
                save_summary(video_id, summary_text, summary_mode, user_prompt)
            )
            
            # Step 7: Cache results and cleanup (100%)
            self.update_progress(20, 20, "Finalizing")
            
            # Cache transcript chunks for fast retrieval
            asyncio.run(
                cache_service.cache_transcript_chunks(video_id, transcript_chunks)
            )
            
            # Cache video metadata
            asyncio.run(
                cache_service.cache_video_metadata(youtube_url, metadata)
            )
            
            # Update video status to complete
            asyncio.run(
                update_video_status(video_id, "complete")
            )
            
            # Cleanup temporary audio files
            cleanup_temp_files([audio_path])
            
            logger.info(f"Successfully processed video {video_id}")
            
            return {
                'status': 'success',
                'video_id': video_id,
                'transcript_id': transcript_id,
                'summary_id': summary_id,
                'metadata': metadata,
                'processing_time': self.request.time_start
            }
            
        except Exception as e:
            logger.error(f"Error processing video {video_id}: {str(e)}")
            
            # Update video status to error
            try:
                asyncio.run(
                    update_video_status(video_id, "error", error_message=str(e))
                )
            except Exception as db_error:
                logger.error(f"Failed to update error status: {db_error}")
            
            # Cleanup any temp files
            cleanup_temp_files()
            
            raise Exception(f"Video processing failed: {str(e)}")
    
    except Exception as e:
        logger.error(f"Error processing video {video_id}: {str(e)}")
        
        # Update video status to error
        try:
            asyncio.run(
                update_video_status(video_id, "error", error_message=str(e))
            )
        except Exception as db_error:
            logger.error(f"Failed to update error status: {db_error}")
        
        # Cleanup any temp files
        cleanup_temp_files()
        
        raise Exception(f"Video processing failed: {str(e)}")


@celery_app.task(name="batch_process_playlist")
def batch_process_playlist(
    playlist_url: str,
    user_id: str,
    summary_mode: str = "bullet",
    folder_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Process an entire YouTube playlist.
    
    Args:
        playlist_url: YouTube playlist URL
        user_id: User ID for the request
        summary_mode: Type of summary to generate
        folder_id: Optional folder ID for organization
        
    Returns:
        Dict containing processing results
    """
    try:
        # For now, return error as playlist extraction is not implemented
        # This would need yt-dlp playlist extraction functionality
        raise Exception("Playlist processing not yet implemented")
        
    except Exception as e:
        logger.error(f"Error processing playlist {playlist_url}: {str(e)}")
        raise


@celery_app.task(bind=True, base=CallbackTask, name="regenerate_video_summary")
def regenerate_video_summary(
    self,
    video_id: str,
    summary_mode: str = "bullet",
    user_prompt: Optional[str] = None
) -> Dict[str, Any]:
    """
    Regenerate summary for an existing video.
    
    Args:
        video_id: Database video ID
        summary_mode: Type of summary to generate
        user_prompt: Optional custom prompt
        
    Returns:
        Dict containing processing results
    """
    try:
        cache_service = CacheService()
        
        logger.info(f"Starting summary regeneration for video {video_id}")
        
        # Run async operations in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Get video and transcript from database
            async def get_video_data():
                async with async_session_maker() as session:
                    video = await session.get(Video, UUID(video_id))
                    if not video:
                        raise Exception(f"Video {video_id} not found")
                    
                    transcript = await session.execute(
                        select(Transcript).where(Transcript.video_id == UUID(video_id))
                    )
                    transcript = transcript.scalar_one_or_none()
                    
                    if not transcript:
                        raise Exception(f"No transcript found for video {video_id}")
                    
                    return video, transcript
            
            video, transcript = loop.run_until_complete(get_video_data())
            
            # Prepare metadata
            metadata = {
                'title': video.title,
                'channel_name': video.channel_name,
                'description': video.description,
                'duration': video.duration
            }
            
            # Generate new summary
            self.update_progress(1, 3, "Generating summary")
            
            summary_response = loop.run_until_complete(
                llm_service.generate_summary(
                    transcript=transcript.full_text,
                    metadata=metadata,
                    mode=summary_mode,
                    user_prompt=user_prompt
                )
            )
            
            # Save new summary
            self.update_progress(2, 3, "Saving summary")
            
            summary_id = loop.run_until_complete(
                save_summary(video_id, summary_response.summary_text, summary_mode, user_prompt)
            )
            
            self.update_progress(3, 3, "Complete")
            
            logger.info(f"Successfully regenerated summary {summary_id} for video {video_id}")
            
            return {
                'status': 'success',
                'video_id': video_id,
                'summary_id': summary_id,
                'summary_mode': summary_mode
            }
            
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Error regenerating summary for video {video_id}: {str(e)}")
        raise Exception(f"Summary regeneration failed: {str(e)}")


# Helper functions for database operations

async def update_video_metadata(video_id: str, metadata: dict) -> None:
    """Update video with extracted metadata."""
    async with async_session_maker() as session:
        try:
            video = await session.get(Video, UUID(video_id))
            if video:
                video.title = metadata.get('title', '')
                video.channel_name = metadata.get('uploader', '')
                video.duration = metadata.get('duration', 0)
                video.published_at = metadata.get('upload_date', '')
                video.thumbnail_url = metadata.get('thumbnail', '')
                video.description = metadata.get('description', '')
                
                await session.commit()
                logger.info(f"Updated metadata for video {video_id}")
            else:
                logger.error(f"Video {video_id} not found in database")
        except Exception as e:
            await session.rollback()
            logger.error(f"Failed to update video metadata: {e}")
            raise


async def save_transcript(
    video_id: str, 
    full_text: str, 
    chunks: list
) -> str:
    """Save transcript to database."""
    async with async_session_maker() as session:
        try:
            transcript = Transcript(
                video_id=UUID(video_id),
                full_text=full_text,
                chunks=chunks,
                word_count=len(full_text.split()),
                language="en"  # Default to English
            )
            
            session.add(transcript)
            await session.commit()
            await session.refresh(transcript)
            
            logger.info(f"Saved transcript for video {video_id}")
            return str(transcript.id)
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Failed to save transcript: {e}")
            raise


async def save_summary(
    video_id: str,
    summary_text: str,
    mode: str,
    user_prompt: Optional[str] = None
) -> str:
    """Save summary to database."""
    async with async_session_maker() as session:
        try:
            summary = Summary(
                video_id=UUID(video_id),
                summary_text=summary_text,
                mode=mode,
                user_prompt=user_prompt,
                word_count=len(summary_text.split())
            )
            
            session.add(summary)
            await session.commit()
            await session.refresh(summary)
            
            logger.info(f"Saved summary for video {video_id}")
            return str(summary.id)
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Failed to save summary: {e}")
            raise


async def update_video_status(
    video_id: str, 
    status: str, 
    error_message: Optional[str] = None
) -> None:
    """Update video processing status."""
    async with async_session_maker() as session:
        try:
            video = await session.get(Video, UUID(video_id))
            if video:
                video.status = status
                if error_message:
                    video.error_message = error_message
                
                await session.commit()
                logger.info(f"Updated video {video_id} status to {status}")
            else:
                logger.error(f"Video {video_id} not found in database")
        except Exception as e:
            await session.rollback()
            logger.error(f"Failed to update video status: {e}")
            raise


async def create_video_record(
    youtube_url: str,
    user_id: str,
    folder_id: Optional[str] = None
) -> str:
    """Create video record in database."""
    async with async_session_maker() as session:
        try:
            video = Video(
                user_id=UUID(user_id),
                youtube_url=youtube_url,
                folder_id=UUID(folder_id) if folder_id else None,
                status="processing"
            )
            
            session.add(video)
            await session.commit()
            await session.refresh(video)
            
            logger.info(f"Created video record {video.id}")
            return str(video.id)
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Failed to create video record: {e}")
            raise


def cleanup_temp_files(file_paths: Optional[list] = None) -> None:
    """Clean up temporary files."""
    try:
        if file_paths:
            for file_path in file_paths:
                if file_path and os.path.exists(file_path):
                    os.unlink(file_path)
                    logger.info(f"Cleaned up temp file: {file_path}")
        else:
            # Clean up all temp files older than 1 hour
            temp_dir = settings.TEMP_DIR
            if os.path.exists(temp_dir):
                import time
                current_time = time.time()
                for filename in os.listdir(temp_dir):
                    file_path = os.path.join(temp_dir, filename)
                    if os.path.isfile(file_path):
                        file_age = current_time - os.path.getctime(file_path)
                        if file_age > 3600:  # 1 hour
                            os.unlink(file_path)
                            logger.info(f"Cleaned up old temp file: {file_path}")
    except Exception as e:
        logger.error(f"Error cleaning up temp files: {e}")