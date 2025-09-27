"""
Simple YouTube processing endpoint that works synchronously like the test script.
This bypasses all the complex async polling and returns results immediately.
Now supports saving to folders and database persistence.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, HttpUrl
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging
import tempfile
import os
import sys
import time
from pathlib import Path
import shutil
from typing import Optional
from uuid import UUID
import uuid
from datetime import datetime

from core.database import get_db
from core.security import get_current_user_optional
from models.database import User, Video, Transcript, Summary, Folder

# Import the same libraries as the working test script
try:
    import yt_dlp
except ImportError:
    print("❌ ERROR: yt-dlp not found. Install with: pip install yt-dlp")
    sys.exit(1)

try:
    from openai import OpenAI
except ImportError:
    print("❌ ERROR: OpenAI library not found. Install with: pip install openai")
    sys.exit(1)

logger = logging.getLogger(__name__)
router = APIRouter()

class SimpleVideoRequest(BaseModel):
    youtube_url: HttpUrl
    summary_mode: str = "bullet"
    custom_context: Optional[str] = None
    folder_id: Optional[UUID] = None
    save_to_database: bool = False

class SimpleVideoResponse(BaseModel):
    success: bool
    url: str
    title: str = ""
    transcript: str = ""
    summary: str = ""
    processing_time: float = 0
    error: str = ""
    video_id: Optional[str] = None
    folder_name: Optional[str] = None

class SimpleYouTubeProcessor:
    """Direct copy of the working test script logic"""
    
    def __init__(self):
        # Initialize OpenAI client
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise ValueError("OPENAI_API_KEY not found")
        
        self.openai_client = OpenAI(api_key=api_key)
        
        # Setup temporary directory
        self.temp_dir = tempfile.mkdtemp(prefix="youtube_simple_")
        
        # yt-dlp configuration (copied from working test script)
        self.ytdl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(self.temp_dir, '%(title)s.%(ext)s'),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'extractor_retries': 3,
            'fragment_retries': 3,
            'retry_sleep_functions': {'http': lambda n: 2**n, 'fragment': lambda n: 2**n},
            'user_agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'referer': 'https://www.youtube.com/',
            'headers': {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-us,en;q=0.5',
                'Sec-Fetch-Mode': 'navigate',
            },
            'extractor_args': {
                'youtube': {
                    'player_client': ['android', 'web'],
                    'player_skip': ['webpage', 'configs'],
                    'innertube_host': ['studio.youtube.com', 'youtubei.googleapis.com'],
                }
            }
        }
    
    def download_audio(self, url):
        """Download audio - copied from working test script"""
        logger.info(f"📥 Starting audio download for: {url}")
        
        # First extract info
        with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
            info = ydl.extract_info(url, download=False)
            title = info.get('title', 'Unknown Title')
            logger.info(f"📺 Video Title: {title}")
        
        # Download audio
        with yt_dlp.YoutubeDL(self.ytdl_opts) as ydl:
            ydl.download([url])
        
        # Find downloaded file
        audio_files = list(Path(self.temp_dir).glob("*.mp3"))
        if not audio_files:
            audio_files = list(Path(self.temp_dir).glob("*.m4a"))
        if not audio_files:
            audio_files = list(Path(self.temp_dir).glob("*.wav"))
        
        if not audio_files:
            raise Exception("No audio file found after download")
        
        audio_file = audio_files[0]
        logger.info(f"✅ Audio downloaded: {audio_file.name}")
        
        return str(audio_file), title
    
    def transcribe_audio(self, audio_file_path):
        """Transcribe audio - copied from working test script"""
        logger.info(f"🎤 Starting transcription for: {os.path.basename(audio_file_path)}")
        
        if not os.path.exists(audio_file_path):
            raise FileNotFoundError(f"Audio file not found: {audio_file_path}")
        
        with open(audio_file_path, 'rb') as audio_file:
            transcript = self.openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="text"
            )
        
        logger.info(f"✅ Transcription completed: {len(transcript)} characters")
        return transcript
    
    def generate_summary(self, transcript, mode="bullet", custom_context=None):
        """Generate summary - now supports custom context"""
        logger.info("🤖 Starting summary generation...")
        
        # Custom context takes precedence
        if custom_context:
            prompt = f"""Please provide a comprehensive summary of the following video transcript based on this specific context: {custom_context}

Transcript:
{transcript}

Summary:"""
        elif mode == "bullet":
            prompt = f"""Please provide a comprehensive summary of the following video transcript in bullet point format.

Structure your summary as follows:
1. Overview: 
Brief overview of what the video is about

2. Key Insights: 
   - Main point 1 with specific details
   - Main point 2 with specific details
   - Main point 3 with specific details
   - Additional important insights

3. Actionable Items: 
   - Specific actions or recommendations mentioned

4. Impact/Relevance: 
Why this information is important or useful

Transcript:
{transcript}

Summary:"""
        else:
            prompt = f"""Please provide a comprehensive summary of the following video transcript.

Structure your summary as follows:
1. **Main Topic**: What is the video primarily about?
2. **Key Points**: List the 3-5 most important points discussed
3. **Details**: Provide important details, facts, or insights mentioned
4. **Conclusion**: What's the main takeaway or conclusion?

Transcript:
{transcript}

Summary:"""
        
        response = self.openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that creates comprehensive, well-structured summaries of video content."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.3
        )
        
        summary = response.choices[0].message.content
        logger.info(f"✅ Summary generated: {len(summary)} characters")
        return summary
    
    def cleanup(self):
        """Clean up temporary files"""
        try:
            if os.path.exists(self.temp_dir):
                shutil.rmtree(self.temp_dir)
                logger.info(f"✅ Temporary directory removed")
        except Exception as e:
            logger.warning(f"⚠️  Could not remove temporary directory: {e}")
    
    def process_video(self, url, summary_mode="bullet", custom_context=None):
        """Complete processing pipeline - now supports custom context"""
        logger.info("🚀 Starting YouTube video processing...")
        start_time = time.time()
        url_str = str(url)  # Convert Pydantic URL to string
        
        try:
            # Step 1: Download audio
            audio_file, title = self.download_audio(url_str)
            
            # Step 2: Transcribe
            transcript = self.transcribe_audio(audio_file)
            
            # Step 3: Generate summary
            summary = self.generate_summary(transcript, summary_mode, custom_context)
            
            processing_time = time.time() - start_time
            logger.info(f"✅ Processing completed in {processing_time:.1f} seconds")
            
            return {
                'success': True,
                'url': url_str,
                'title': title,
                'transcript': transcript,
                'summary': summary,
                'processing_time': processing_time,
                'error': ''
            }
            
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"❌ Processing failed: {e}")
            
            return {
                'success': False,
                'url': url_str,
                'title': '',
                'transcript': '',
                'summary': '',
                'processing_time': processing_time,
                'error': str(e)
            }
        
        finally:
            self.cleanup()

async def save_video_to_database(
    db: AsyncSession, 
    user: User,
    url: str, 
    title: str, 
    transcript: str, 
    summary: str, 
    folder_id: Optional[UUID] = None
) -> tuple[str, Optional[str]]:
    """Save processed video to database and return video_id and folder_name"""
    try:
        # Verify folder exists and belongs to user if folder_id provided
        folder_name = None
        if folder_id:
            folder_result = await db.execute(
                select(Folder).where(
                    Folder.id == folder_id,
                    Folder.user_id == user.id
                )
            )
            folder = folder_result.scalar_one_or_none()
            if not folder:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Folder not found or access denied"
                )
            folder_name = folder.name
        
        # Extract YouTube ID from URL
        youtube_id = None
        if "watch?v=" in url:
            youtube_id = url.split("watch?v=")[1].split("&")[0]
        elif "youtu.be/" in url:
            youtube_id = url.split("youtu.be/")[1].split("?")[0]
        
        # Create video record
        video = Video(
            id=uuid.uuid4(),
            user_id=user.id,
            folder_id=folder_id,
            youtube_url=url,
            youtube_id=youtube_id,
            title=title,
            status="completed",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(video)
        await db.flush()  # Get the video ID
        
        # Create transcript record
        transcript_record = Transcript(
            id=uuid.uuid4(),
            video_id=video.id,
            full_text=transcript,
            chunks=[],  # Simple processor doesn't provide chunks
            processing_duration=0,
            created_at=datetime.utcnow()
        )
        db.add(transcript_record)
        
        # Create summary record
        summary_record = Summary(
            id=uuid.uuid4(),
            video_id=video.id,
            content=summary,
            summary_type="bullet",
            llm_model="gpt-3.5-turbo",
            llm_provider="openai",
            created_at=datetime.utcnow()
        )
        db.add(summary_record)
        
        await db.commit()
        
        logger.info(f"✅ Saved video to database: {video.id} in folder: {folder_name or 'Root'}")
        return str(video.id), folder_name
        
    except Exception as e:
        await db.rollback()
        logger.error(f"❌ Failed to save video to database: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save video: {str(e)}"
        )

@router.post("/simple-process", response_model=SimpleVideoResponse)
async def simple_process_video(
    request: SimpleVideoRequest,
    current_user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Simple synchronous YouTube processing that works like the test script.
    Returns complete results immediately - no polling needed!
    Now supports saving to folders and database persistence.
    """
    try:
        processor = SimpleYouTubeProcessor()
        result = processor.process_video(
            request.youtube_url, 
            request.summary_mode, 
            request.custom_context
        )
        
        video_id = None
        folder_name = None
        
        # Save to database if requested and processing was successful
        if request.save_to_database and result['success'] and current_user:
            try:
                video_id, folder_name = await save_video_to_database(
                    db=db,
                    user=current_user,
                    url=result['url'],
                    title=result['title'],
                    transcript=result['transcript'],
                    summary=result['summary'],
                    folder_id=request.folder_id
                )
                logger.info(f"✅ Video saved to database: {video_id}")
            except Exception as save_error:
                logger.error(f"⚠️  Processing succeeded but failed to save to database: {save_error}")
                # Don't fail the request, just log the error
                result['error'] = f"Processing succeeded but saving failed: {str(save_error)}"
        
        # Add database info to response
        result['video_id'] = video_id
        result['folder_name'] = folder_name
        
        return SimpleVideoResponse(**result)
        
    except Exception as e:
        logger.error(f"Simple processing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Processing failed: {str(e)}"
        )