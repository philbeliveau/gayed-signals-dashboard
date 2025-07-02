"""
YouTube video processing service using yt-dlp for audio extraction.
Optimized for memory efficiency and performance.
"""

import os
import re
import asyncio
import hashlib
from typing import Dict, Optional, Any, Tuple
from datetime import datetime, timedelta
import yt_dlp
from pathlib import Path
import logging

from core.config import settings

logger = logging.getLogger(__name__)


class YouTubeService:
    """Service for downloading and processing YouTube videos."""
    
    def __init__(self):
        self.temp_dir = Path(settings.TEMP_DIR)
        self.temp_dir.mkdir(exist_ok=True)
        
        # Configure yt-dlp with optimized settings and anti-blocking measures
        self.ydl_opts = {
            'format': 'bestaudio[ext=m4a]/bestaudio/best',
            'outtmpl': str(self.temp_dir / '%(id)s.%(ext)s'),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '64',  # Optimize for speech, not music
            }],
            'writeinfojson': False,
            'writethumbnail': False,
            'writesubtitles': False,
            'writeautomaticsub': False,
            'ignoreerrors': False,
            'no_warnings': False,
            'quiet': True,
            'extract_flat': False,
            # Anti-blocking measures to prevent YouTube 403 errors
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
            # Try different extraction methods for better compatibility
            'extractor_args': {
                'youtube': {
                    'player_client': ['android', 'web'],
                    'player_skip': ['webpage', 'configs'],
                    'innertube_host': ['studio.youtube.com', 'youtubei.googleapis.com'],
                }
            }
        }
    
    def is_valid_youtube_url(self, url: str) -> bool:
        """
        Validate if the URL is a valid YouTube URL.
        
        Args:
            url: YouTube URL to validate
            
        Returns:
            True if valid YouTube URL, False otherwise
        """
        youtube_regex = re.compile(
            r'(https?://)?(www\.)?(youtube|youtu|youtube-nocookie)\.(com|be)/'
            r'(watch\?v=|embed/|v/|.+\?v=)?([^&=%\?]{11})'
        )
        return youtube_regex.match(url) is not None
    
    def extract_video_id(self, url: str) -> Optional[str]:
        """
        Extract YouTube video ID from URL.
        
        Args:
            url: YouTube URL
            
        Returns:
            Video ID if found, None otherwise
        """
        patterns = [
            r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([a-zA-Z0-9_-]{11})',
            r'youtube\.com/v/([a-zA-Z0-9_-]{11})',
            r'youtube\.com/watch\?.*v=([a-zA-Z0-9_-]{11})'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None
    
    async def get_video_metadata(self, youtube_url: str) -> Dict[str, Any]:
        """
        Extract video metadata without downloading.
        
        Args:
            youtube_url: YouTube URL
            
        Returns:
            Video metadata dictionary
            
        Raises:
            Exception: If metadata extraction fails
        """
        try:
            # Configure yt-dlp for metadata extraction only with anti-blocking measures
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'extract_flat': False,
                'skip_download': True,
                # Anti-blocking measures for metadata extraction
                'extractor_retries': 3,
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
            
            def run_ydl():
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    return ydl.extract_info(youtube_url, download=False)
            
            # Run in thread pool with timeout to avoid hanging
            loop = asyncio.get_event_loop()
            try:
                info = await asyncio.wait_for(
                    loop.run_in_executor(None, run_ydl),
                    timeout=15.0  # 15 second timeout for metadata extraction
                )
            except asyncio.TimeoutError:
                raise Exception("YouTube metadata extraction timed out. The video may be private, age-restricted, or YouTube is blocking the request.")
            
            if not info:
                raise Exception("Could not extract video information")
            
            # Validate duration
            duration = info.get('duration', 0)
            max_duration = settings.MAX_VIDEO_DURATION_MINUTES * 60
            
            if duration > max_duration:
                raise Exception(f"Video too long: {duration}s (max: {max_duration}s)")
            
            # Extract and format metadata
            metadata = {
                'youtube_id': info.get('id'),
                'title': info.get('title', '').strip(),
                'channel_name': info.get('uploader', '').strip(),
                'channel_id': info.get('uploader_id', ''),
                'description': info.get('description', '').strip(),
                'duration': duration,
                'view_count': info.get('view_count', 0),
                'like_count': info.get('like_count', 0),
                'upload_date': self._parse_upload_date(info.get('upload_date')),
                'thumbnail_url': self._get_best_thumbnail(info.get('thumbnails', [])),
                'available_formats': len(info.get('formats', [])),
                'has_audio': any(f.get('acodec') != 'none' for f in info.get('formats', [])),
            }
            
            # Validate required fields
            if not metadata['youtube_id']:
                raise Exception("Could not extract video ID")
            
            if not metadata['title']:
                raise Exception("Could not extract video title")
            
            if not metadata['has_audio']:
                raise Exception("Video has no audio track")
            
            logger.info(f"Extracted metadata for video: {metadata['title']} ({metadata['duration']}s)")
            return metadata
            
        except Exception as e:
            logger.error(f"Error extracting metadata from {youtube_url}: {e}")
            raise Exception(f"Failed to extract video metadata: {str(e)}")
    
    async def download_audio(self, youtube_url: str, video_id: str) -> str:
        """
        Download audio from YouTube video with memory optimization.
        
        Args:
            youtube_url: YouTube URL
            video_id: Video ID for filename
            
        Returns:
            Path to downloaded audio file
            
        Raises:
            Exception: If download fails
        """
        try:
            # Create unique filename
            audio_path = self.temp_dir / f"{video_id}.mp3"
            
            # Configure yt-dlp for audio download
            ydl_opts = self.ydl_opts.copy()
            ydl_opts['outtmpl'] = str(self.temp_dir / f"{video_id}.%(ext)s")
            
            def run_download():
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.download([youtube_url])
            
            # Run download in thread pool
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, run_download)
            
            # Verify file exists and has reasonable size
            if not audio_path.exists():
                raise Exception("Audio file was not created")
            
            file_size = audio_path.stat().st_size
            if file_size < 1024:  # Less than 1KB
                raise Exception("Audio file is too small")
            
            logger.info(f"Downloaded audio: {audio_path} ({file_size / (1024*1024):.1f}MB)")
            return str(audio_path)
            
        except Exception as e:
            logger.error(f"Error downloading audio from {youtube_url}: {e}")
            # Clean up partial files
            if audio_path.exists():
                audio_path.unlink()
            raise Exception(f"Failed to download audio: {str(e)}")
    
    async def get_audio_duration(self, audio_path: str) -> int:
        """
        Get audio file duration in seconds.
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Duration in seconds
        """
        try:
            import subprocess
            
            cmd = [
                'ffprobe', '-v', 'quiet', '-show_entries', 
                'format=duration', '-of', 'csv=p=0', audio_path
            ]
            
            result = await asyncio.create_subprocess_exec(
                *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await result.communicate()
            
            if result.returncode != 0:
                raise Exception(f"ffprobe failed: {stderr.decode()}")
            
            duration = float(stdout.decode().strip())
            return int(duration)
            
        except Exception as e:
            logger.warning(f"Could not get audio duration: {e}")
            return 0
    
    def cleanup_temp_files(self, *file_paths: str) -> None:
        """
        Clean up temporary files.
        
        Args:
            *file_paths: Paths to files to delete
        """
        for file_path in file_paths:
            try:
                if file_path and os.path.exists(file_path):
                    os.unlink(file_path)
                    logger.debug(f"Cleaned up temp file: {file_path}")
            except Exception as e:
                logger.warning(f"Could not clean up {file_path}: {e}")
    
    def cleanup_old_temp_files(self, max_age_hours: int = 24) -> None:
        """
        Clean up old temporary files.
        
        Args:
            max_age_hours: Maximum age of files to keep in hours
        """
        try:
            cutoff_time = datetime.now() - timedelta(hours=max_age_hours)
            
            for file_path in self.temp_dir.glob("*"):
                if file_path.is_file():
                    file_time = datetime.fromtimestamp(file_path.stat().st_mtime)
                    if file_time < cutoff_time:
                        file_path.unlink()
                        logger.debug(f"Cleaned up old temp file: {file_path}")
            
        except Exception as e:
            logger.warning(f"Error cleaning up old temp files: {e}")
    
    def _parse_upload_date(self, upload_date: Optional[str]) -> Optional[datetime]:
        """Parse upload date from yt-dlp format."""
        if not upload_date:
            return None
        
        try:
            # yt-dlp returns dates in YYYYMMDD format
            return datetime.strptime(upload_date, '%Y%m%d')
        except (ValueError, TypeError):
            return None
    
    def _get_best_thumbnail(self, thumbnails: list) -> Optional[str]:
        """Get the best quality thumbnail URL."""
        if not thumbnails:
            return None
        
        # Sort by resolution (width * height) and prefer jpg
        sorted_thumbs = sorted(
            thumbnails,
            key=lambda x: (
                (x.get('width', 0) * x.get('height', 0)),
                x.get('url', '').endswith('.jpg')
            ),
            reverse=True
        )
        
        return sorted_thumbs[0].get('url') if sorted_thumbs else None


# Global service instance
youtube_service = YouTubeService()