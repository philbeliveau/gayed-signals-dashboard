"""
Transcription service using OpenAI Whisper API with audio chunking for long videos.
Memory-efficient processing with streaming chunks.
"""

import os
import asyncio
import uuid
from typing import List, Dict, Any, AsyncGenerator, Optional
from pathlib import Path
import tempfile
import logging
from datetime import datetime
import openai
from pydantic import BaseModel

from core.config import settings

logger = logging.getLogger(__name__)


class TranscriptChunk(BaseModel):
    """Model for a transcript chunk with timing information."""
    start_time: float
    end_time: float
    text: str
    confidence: Optional[float] = None


class TranscriptionResult(BaseModel):
    """Model for complete transcription result."""
    full_text: str
    chunks: List[TranscriptChunk]
    language: str
    total_duration: float
    processing_time: float
    confidence_score: Optional[float] = None


class TranscriptionService:
    """Service for transcribing audio using OpenAI Whisper API."""
    
    def __init__(self):
        if not settings.OPENAI_API_KEY:
            logger.warning("OpenAI API key not configured - transcription will fail")
        
        openai.api_key = settings.OPENAI_API_KEY
        self.chunk_size_mb = settings.AUDIO_CHUNK_SIZE_MB
        self.temp_dir = Path(settings.TEMP_DIR)
        self.temp_dir.mkdir(exist_ok=True)
    
    async def transcribe_audio(self, audio_path: str) -> TranscriptionResult:
        """
        Transcribe audio file with automatic chunking for large files.
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            TranscriptionResult with full transcript and chunks
            
        Raises:
            Exception: If transcription fails
        """
        start_time = datetime.now()
        
        try:
            # Check if file exists
            if not os.path.exists(audio_path):
                raise Exception(f"Audio file not found: {audio_path}")
            
            # Get audio file info
            duration = await self._get_audio_duration(audio_path)
            file_size_mb = os.path.getsize(audio_path) / (1024 * 1024)
            
            logger.info(f"Transcribing audio: {file_size_mb:.1f}MB, {duration:.1f}s")
            
            # Determine if chunking is needed
            if file_size_mb <= self.chunk_size_mb:
                # Small file - transcribe directly
                result = await self._transcribe_single_file(audio_path)
            else:
                # Large file - chunk and transcribe
                result = await self._transcribe_chunked_file(audio_path, duration)
            
            # Calculate processing time
            processing_time = (datetime.now() - start_time).total_seconds()
            result.processing_time = processing_time
            result.total_duration = duration
            
            logger.info(f"Transcription completed in {processing_time:.1f}s")
            return result
            
        except Exception as e:
            logger.error(f"Transcription failed for {audio_path}: {e}")
            raise Exception(f"Transcription failed: {str(e)}")
    
    async def _transcribe_single_file(self, audio_path: str) -> TranscriptionResult:
        """Transcribe a single audio file."""
        try:
            with open(audio_path, 'rb') as audio_file:
                # Call OpenAI Whisper API
                response = await self._call_whisper_api(audio_file)
                
                # Parse response
                full_text = response.get('text', '').strip()
                
                # Create single chunk (Whisper API doesn't return segment timing by default)
                chunks = [TranscriptChunk(
                    start_time=0.0,
                    end_time=await self._get_audio_duration(audio_path),
                    text=full_text,
                    confidence=None
                )]
                
                return TranscriptionResult(
                    full_text=full_text,
                    chunks=chunks,
                    language=response.get('language', 'en'),
                    total_duration=0.0,  # Will be set by caller
                    processing_time=0.0,  # Will be set by caller
                    confidence_score=None
                )
                
        except Exception as e:
            logger.error(f"Single file transcription failed: {e}")
            raise
    
    async def _transcribe_chunked_file(self, audio_path: str, total_duration: float) -> TranscriptionResult:
        """Transcribe audio file by breaking it into chunks."""
        try:
            chunks = []
            full_text_parts = []
            
            # Generate audio chunks
            async for chunk_path, start_time, end_time in self._generate_audio_chunks(audio_path, total_duration):
                try:
                    # Transcribe chunk
                    with open(chunk_path, 'rb') as chunk_file:
                        response = await self._call_whisper_api(chunk_file)
                        
                        chunk_text = response.get('text', '').strip()
                        if chunk_text:
                            chunks.append(TranscriptChunk(
                                start_time=start_time,
                                end_time=end_time,
                                text=chunk_text,
                                confidence=None
                            ))
                            full_text_parts.append(chunk_text)
                
                finally:
                    # Clean up chunk file immediately
                    if os.path.exists(chunk_path):
                        os.unlink(chunk_path)
            
            # Combine all text
            full_text = ' '.join(full_text_parts)
            
            return TranscriptionResult(
                full_text=full_text,
                chunks=chunks,
                language='en',  # Default, could be detected from first chunk
                total_duration=0.0,  # Will be set by caller
                processing_time=0.0,  # Will be set by caller
                confidence_score=None
            )
            
        except Exception as e:
            logger.error(f"Chunked transcription failed: {e}")
            raise
    
    async def _generate_audio_chunks(self, audio_path: str, total_duration: float) -> AsyncGenerator[tuple, None]:
        """
        Generate audio chunks from a large audio file.
        
        Args:
            audio_path: Path to source audio file
            total_duration: Total duration in seconds
            
        Yields:
            Tuple of (chunk_path, start_time, end_time)
        """
        try:
            # Calculate chunk duration based on file size
            file_size_mb = os.path.getsize(audio_path) / (1024 * 1024)
            num_chunks = max(1, int(file_size_mb / self.chunk_size_mb))
            chunk_duration = total_duration / num_chunks
            
            logger.info(f"Splitting audio into {num_chunks} chunks of {chunk_duration:.1f}s each")
            
            for i in range(num_chunks):
                start_time = i * chunk_duration
                end_time = min((i + 1) * chunk_duration, total_duration)
                
                # Generate unique chunk filename
                chunk_id = str(uuid.uuid4())
                chunk_path = self.temp_dir / f"chunk_{chunk_id}.mp3"
                
                # Extract chunk using ffmpeg
                await self._extract_audio_segment(
                    audio_path, str(chunk_path), start_time, end_time - start_time
                )
                
                yield str(chunk_path), start_time, end_time
        
        except Exception as e:
            logger.error(f"Error generating audio chunks: {e}")
            raise
    
    async def _extract_audio_segment(self, input_path: str, output_path: str, start_time: float, duration: float):
        """Extract audio segment using ffmpeg."""
        try:
            cmd = [
                'ffmpeg', '-i', input_path,
                '-ss', str(start_time),
                '-t', str(duration),
                '-acodec', 'mp3',
                '-ar', '16000',  # Whisper optimal sample rate
                '-ac', '1',      # Mono audio
                '-b:a', '64k',   # Lower bitrate for speech
                '-y',            # Overwrite output
                output_path
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.PIPE
            )
            
            _, stderr = await process.communicate()
            
            if process.returncode != 0:
                raise Exception(f"ffmpeg failed: {stderr.decode()}")
            
            # Verify chunk was created
            if not os.path.exists(output_path):
                raise Exception("Audio chunk was not created")
            
            if os.path.getsize(output_path) < 1024:
                raise Exception("Audio chunk is too small")
                
        except Exception as e:
            logger.error(f"Error extracting audio segment: {e}")
            raise
    
    async def _call_whisper_api(self, audio_file) -> Dict[str, Any]:
        """
        Call OpenAI Whisper API with retry logic.
        
        Args:
            audio_file: Open file object for audio
            
        Returns:
            API response dictionary
        """
        try:
            # Reset file pointer
            audio_file.seek(0)
            
            # Call API with retry logic
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    response = await asyncio.to_thread(
                        openai.Audio.transcribe,
                        model="whisper-1",
                        file=audio_file,
                        response_format="json"
                    )
                    return response
                    
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise
                    logger.warning(f"Whisper API attempt {attempt + 1} failed: {e}")
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
            
        except Exception as e:
            logger.error(f"Whisper API call failed: {e}")
            raise Exception(f"Failed to transcribe audio: {str(e)}")
    
    async def _get_audio_duration(self, audio_path: str) -> float:
        """Get audio file duration using ffprobe."""
        try:
            cmd = [
                'ffprobe', '-v', 'quiet', '-show_entries',
                'format=duration', '-of', 'csv=p=0', audio_path
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                raise Exception(f"ffprobe failed: {stderr.decode()}")
            
            duration = float(stdout.decode().strip())
            return duration
            
        except Exception as e:
            logger.warning(f"Could not get audio duration: {e}")
            return 0.0
    
    def cleanup_temp_files(self, *file_paths: str) -> None:
        """Clean up temporary files."""
        for file_path in file_paths:
            try:
                if file_path and os.path.exists(file_path):
                    os.unlink(file_path)
                    logger.debug(f"Cleaned up temp file: {file_path}")
            except Exception as e:
                logger.warning(f"Could not clean up {file_path}: {e}")


# Global service instance
transcription_service = TranscriptionService()