"""
Optimized transcription service with memory-efficient audio chunking and streaming processing.
Designed for high-performance video processing with minimal memory footprint.
"""

import os
import asyncio
import uuid
import gc
import psutil
from typing import List, Dict, Any, AsyncGenerator, Optional, Union
from pathlib import Path
import tempfile
import logging
from datetime import datetime
import openai
from pydantic import BaseModel
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager

from core.config import settings

logger = logging.getLogger(__name__)


class OptimizedTranscriptChunk(BaseModel):
    """Enhanced model for transcript chunk with performance metadata."""
    start_time: float
    end_time: float
    text: str
    confidence: Optional[float] = None
    processing_time: Optional[float] = None
    chunk_size_mb: Optional[float] = None


class TranscriptionResult(BaseModel):
    """Enhanced model for complete transcription result."""
    full_text: str
    chunks: List[OptimizedTranscriptChunk]
    language: str
    total_duration: float
    processing_time: float
    confidence_score: Optional[float] = None
    memory_peak_mb: Optional[float] = None
    total_chunks: Optional[int] = None


class OptimizedTranscriptionService:
    """Memory-efficient transcription service with advanced chunking and streaming."""
    
    def __init__(self):
        if not settings.OPENAI_API_KEY:
            logger.warning("OpenAI API key not configured - transcription will fail")
        
        openai.api_key = settings.OPENAI_API_KEY
        self.base_chunk_size_mb = settings.AUDIO_CHUNK_SIZE_MB
        self.temp_dir = Path(settings.TEMP_DIR)
        self.temp_dir.mkdir(exist_ok=True)
        
        # Memory management settings
        self.max_memory_usage_mb = 1024  # 1GB max memory usage
        self.memory_check_interval = 5   # Check memory every 5 chunks
        self.chunk_processing_delay = 0.1  # Small delay between chunks
        self.max_concurrent_chunks = 3   # Limit concurrent processing
        
        # Thread pool for CPU-intensive operations
        self.thread_pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="transcription")
        
        # Performance monitoring
        self.processing_stats = {
            'total_chunks_processed': 0,
            'total_processing_time': 0,
            'average_chunk_time': 0,
            'memory_peak_mb': 0,
            'cache_hits': 0,
            'errors': 0
        }
        
        # Cleanup tracking
        self._temp_files = set()
    
    async def transcribe_audio_streaming(
        self, 
        audio_path: str, 
        progress_callback=None,
        memory_limit_mb: Optional[int] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Transcribe audio file with memory-efficient streaming chunks.
        
        Args:
            audio_path: Path to audio file
            progress_callback: Optional callback for progress updates
            memory_limit_mb: Override default memory limit
            
        Yields:
            Dict containing chunk results as they're processed
            
        Raises:
            Exception: If transcription fails
        """
        start_time = datetime.now()
        
        # Override memory limit if specified
        if memory_limit_mb:
            original_limit = self.max_memory_usage_mb
            self.max_memory_usage_mb = memory_limit_mb
        
        try:
            # Validate audio file
            if not os.path.exists(audio_path):
                raise Exception(f"Audio file not found: {audio_path}")
            
            # Get audio file info
            duration = await self._get_audio_duration(audio_path)
            file_size_mb = os.path.getsize(audio_path) / (1024 * 1024)
            
            logger.info(f"Starting optimized transcription: {file_size_mb:.1f}MB, {duration:.1f}s")
            
            # Calculate optimal chunking strategy
            chunk_strategy = await self._calculate_chunk_strategy(file_size_mb, duration)
            
            chunk_count = 0
            total_chunks = chunk_strategy['total_chunks']
            
            # Process chunks with memory monitoring
            async for chunk_result in self._process_chunks_streaming(
                audio_path, 
                duration, 
                chunk_strategy
            ):
                chunk_count += 1
                
                # Update progress
                if progress_callback:
                    progress_callback(chunk_count, total_chunks)
                
                # Add processing metadata
                chunk_result.update({
                    'chunk_number': chunk_count,
                    'total_chunks': total_chunks,
                    'file_size_mb': file_size_mb,
                    'duration': duration,
                    'strategy': chunk_strategy['name']
                })
                
                yield chunk_result
                
                # Memory management
                if chunk_count % self.memory_check_interval == 0:
                    await self._manage_memory()
                
                # Adaptive delay based on memory usage
                current_memory = psutil.Process().memory_info().rss / (1024 * 1024)
                delay = self.chunk_processing_delay * (1 + (current_memory / self.max_memory_usage_mb))
                await asyncio.sleep(min(delay, 1.0))  # Cap delay at 1 second
            
            # Update processing statistics
            processing_time = (datetime.now() - start_time).total_seconds()
            self.processing_stats['total_chunks_processed'] += chunk_count
            self.processing_stats['total_processing_time'] += processing_time
            if self.processing_stats['total_chunks_processed'] > 0:
                self.processing_stats['average_chunk_time'] = (
                    self.processing_stats['total_processing_time'] / 
                    self.processing_stats['total_chunks_processed']
                )
            
            logger.info(f"Optimized transcription completed: {chunk_count} chunks in {processing_time:.1f}s")
            
        except Exception as e:
            self.processing_stats['errors'] += 1
            logger.error(f"Optimized transcription failed for {audio_path}: {e}")
            raise Exception(f"Transcription failed: {str(e)}")
        
        finally:
            # Restore original memory limit
            if memory_limit_mb:
                self.max_memory_usage_mb = original_limit
            
            # Cleanup any remaining temp files
            await self._cleanup_temp_files()
    
    async def _calculate_chunk_strategy(self, file_size_mb: float, duration: float) -> Dict[str, Any]:
        """Calculate optimal chunking strategy based on file size and available resources."""
        available_memory_mb = psutil.virtual_memory().available / (1024 * 1024)
        
        # Adaptive chunk sizing based on available memory and file size
        if available_memory_mb > 2048:  # > 2GB available
            if file_size_mb > 500:  # Large file
                chunk_size_mb = min(50, self.base_chunk_size_mb * 2)
                strategy_name = "large_memory_large_file"
            else:
                chunk_size_mb = min(30, self.base_chunk_size_mb * 1.5)
                strategy_name = "large_memory_small_file"
        elif available_memory_mb > 1024:  # > 1GB available
            chunk_size_mb = self.base_chunk_size_mb
            strategy_name = "medium_memory"
        else:  # Limited memory
            chunk_size_mb = max(5, self.base_chunk_size_mb * 0.5)
            strategy_name = "limited_memory"
        
        num_chunks = max(1, int(file_size_mb / chunk_size_mb))
        chunk_duration = duration / num_chunks
        
        return {
            'name': strategy_name,
            'chunk_size_mb': chunk_size_mb,
            'chunk_duration': chunk_duration,
            'total_chunks': num_chunks,
            'available_memory_mb': available_memory_mb
        }
    
    async def _process_chunks_streaming(
        self, 
        audio_path: str, 
        total_duration: float, 
        strategy: Dict[str, Any]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Process audio chunks with streaming and memory optimization."""
        try:
            chunk_count = 0
            semaphore = asyncio.Semaphore(self.max_concurrent_chunks)
            
            async for chunk_path, start_time, end_time in self._generate_optimized_chunks(
                audio_path, total_duration, strategy
            ):
                async with semaphore:  # Limit concurrent processing
                    try:
                        chunk_start = datetime.now()
                        
                        # Process chunk with memory monitoring
                        async with self._memory_monitor():
                            chunk_result = await self._transcribe_chunk_optimized(
                                chunk_path, start_time, end_time
                            )
                            
                            chunk_processing_time = (datetime.now() - chunk_start).total_seconds()
                            
                            if chunk_result:
                                yield {
                                    'chunks': [chunk_result],
                                    'chunk_info': {
                                        'start_time': start_time,
                                        'end_time': end_time,
                                        'duration': end_time - start_time,
                                        'processing_time': chunk_processing_time,
                                        'file_size_mb': os.path.getsize(chunk_path) / (1024 * 1024)
                                    }
                                }
                        
                    finally:
                        # Immediate cleanup
                        await self._safe_delete_file(chunk_path)
                        
                        chunk_count += 1
                        
                        # Force garbage collection periodically
                        if chunk_count % 3 == 0:
                            gc.collect()
            
        except Exception as e:
            logger.error(f"Error in chunk streaming processing: {e}")
            raise
    
    async def _generate_optimized_chunks(
        self, 
        audio_path: str, 
        total_duration: float, 
        strategy: Dict[str, Any]
    ) -> AsyncGenerator[tuple, None]:
        """Generate audio chunks using optimized strategy."""
        try:
            num_chunks = strategy['total_chunks']
            chunk_duration = strategy['chunk_duration']
            
            logger.info(f"Using {strategy['name']} strategy: {num_chunks} chunks of {chunk_duration:.1f}s each")
            
            for i in range(num_chunks):
                start_time = i * chunk_duration
                end_time = min((i + 1) * chunk_duration, total_duration)
                
                # Generate unique chunk filename
                chunk_id = f"{uuid.uuid4()}_{i}"
                chunk_path = self.temp_dir / f"opt_chunk_{chunk_id}.mp3"
                
                # Track temp file for cleanup
                self._temp_files.add(str(chunk_path))
                
                try:
                    # Extract chunk with optimized settings
                    await self._extract_audio_segment_optimized(
                        audio_path, str(chunk_path), start_time, end_time - start_time
                    )
                    
                    # Verify chunk was created properly
                    if not os.path.exists(chunk_path) or os.path.getsize(chunk_path) < 1024:
                        logger.warning(f"Chunk {i} was not created properly, skipping")
                        continue
                    
                    yield str(chunk_path), start_time, end_time
                    
                except Exception as e:
                    logger.warning(f"Failed to create chunk {i}: {e}")
                    await self._safe_delete_file(str(chunk_path))
                    continue
        
        except Exception as e:
            logger.error(f"Error generating optimized chunks: {e}")
            raise
    
    async def _extract_audio_segment_optimized(
        self, 
        input_path: str, 
        output_path: str, 
        start_time: float, 
        duration: float
    ):
        """Extract audio segment using highly optimized ffmpeg settings."""
        try:
            cmd = [
                'ffmpeg', '-i', input_path,
                '-ss', str(start_time),
                '-t', str(duration),
                '-acodec', 'libmp3lame',
                '-ar', '16000',           # Whisper optimal sample rate
                '-ac', '1',               # Mono audio
                '-b:a', '64k',            # Optimal bitrate for speech
                '-q:a', '2',              # High quality
                '-map_metadata', '-1',    # Remove metadata
                '-threads', '1',          # Single thread for memory efficiency
                '-avoid_negative_ts', 'make_zero',  # Handle timing issues
                '-f', 'mp3',              # Explicit format
                '-y',                     # Overwrite output
                output_path
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                error_msg = stderr.decode() if stderr else "Unknown ffmpeg error"
                raise Exception(f"ffmpeg failed: {error_msg}")
            
            # Verify output
            if not os.path.exists(output_path):
                raise Exception("Audio chunk was not created")
            
            chunk_size = os.path.getsize(output_path)
            if chunk_size < 1024:
                raise Exception("Audio chunk is too small")
            
            logger.debug(f"Created optimized chunk: {chunk_size/1024:.1f}KB, {duration:.1f}s")
                
        except Exception as e:
            logger.error(f"Error extracting optimized audio segment: {e}")
            await self._safe_delete_file(output_path)
            raise
    
    async def _transcribe_chunk_optimized(
        self, 
        chunk_path: str, 
        start_time: float, 
        end_time: float
    ) -> Optional[Dict[str, Any]]:
        """Transcribe a single chunk with optimized error handling."""
        try:
            with open(chunk_path, 'rb') as chunk_file:
                response = await self._call_whisper_api_optimized(chunk_file)
                
                chunk_text = response.get('text', '').strip()
                if chunk_text:
                    return {
                        'start_time': start_time,
                        'end_time': end_time,
                        'text': chunk_text,
                        'confidence': response.get('confidence'),
                        'language': response.get('language', 'en'),
                        'chunk_size_mb': os.path.getsize(chunk_path) / (1024 * 1024)
                    }
                
        except Exception as e:
            logger.warning(f"Failed to transcribe chunk {chunk_path}: {e}")
            
        return None
    
    async def _call_whisper_api_optimized(self, audio_file) -> Dict[str, Any]:
        """Call OpenAI Whisper API with optimized retry logic and error handling."""
        try:
            audio_file.seek(0)
            
            # Optimized retry logic with exponential backoff
            max_retries = 3
            base_delay = 1.0
            
            for attempt in range(max_retries):
                try:
                    response = await asyncio.to_thread(
                        openai.Audio.transcribe,
                        model="whisper-1",
                        file=audio_file,
                        response_format="json",
                        language="en"  # Optimize for English
                    )
                    return response
                    
                except openai.error.RateLimitError as e:
                    if attempt == max_retries - 1:
                        raise
                    delay = base_delay * (2 ** attempt) + 1  # Extra second for rate limits
                    logger.warning(f"Rate limited, retrying in {delay}s (attempt {attempt + 1})")
                    await asyncio.sleep(delay)
                    
                except openai.error.APIError as e:
                    if attempt == max_retries - 1:
                        raise
                    delay = base_delay * (2 ** attempt)
                    logger.warning(f"API error, retrying in {delay}s: {e}")
                    await asyncio.sleep(delay)
                    
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise
                    logger.warning(f"Whisper API attempt {attempt + 1} failed: {e}")
                    await asyncio.sleep(base_delay * (2 ** attempt))
            
        except Exception as e:
            logger.error(f"Whisper API call failed completely: {e}")
            raise Exception(f"Failed to transcribe audio: {str(e)}")
    
    async def _get_audio_duration(self, audio_path: str) -> float:
        """Get audio file duration using ffprobe with optimized settings."""
        try:
            cmd = [
                'ffprobe', '-v', 'quiet', '-show_entries',
                'format=duration', '-of', 'csv=p=0', audio_path
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd, 
                stdout=asyncio.subprocess.PIPE, 
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                raise Exception(f"ffprobe failed: {stderr.decode()}")
            
            duration = float(stdout.decode().strip())
            return duration
            
        except Exception as e:
            logger.warning(f"Could not get audio duration: {e}")
            return 0.0
    
    @asynccontextmanager
    async def _memory_monitor(self):
        """Context manager for monitoring memory usage during processing."""
        process = psutil.Process()
        initial_memory = process.memory_info().rss / (1024 * 1024)  # MB
        
        try:
            yield
        finally:
            current_memory = process.memory_info().rss / (1024 * 1024)  # MB
            self.processing_stats['memory_peak_mb'] = max(
                self.processing_stats['memory_peak_mb'], 
                current_memory
            )
            
            # Log memory usage if it's concerning
            if current_memory > self.max_memory_usage_mb:
                logger.warning(f"High memory usage detected: {current_memory:.1f}MB")
    
    async def _manage_memory(self):
        """Proactive memory management during processing."""
        process = psutil.Process()
        current_memory = process.memory_info().rss / (1024 * 1024)  # MB
        
        if current_memory > self.max_memory_usage_mb * 0.8:  # 80% threshold
            logger.info(f"Memory usage at {current_memory:.1f}MB, performing cleanup")
            
            # Force garbage collection
            gc.collect()
            
            # Clean up any stale temp files
            await self._cleanup_temp_files()
            
            # Small delay to allow system to free memory
            await asyncio.sleep(0.5)
            
            new_memory = process.memory_info().rss / (1024 * 1024)
            logger.info(f"Memory after cleanup: {new_memory:.1f}MB (freed: {current_memory - new_memory:.1f}MB)")
    
    async def _safe_delete_file(self, file_path: str):
        """Safely delete a file with error handling."""
        try:
            if file_path and os.path.exists(file_path):
                os.unlink(file_path)
                self._temp_files.discard(file_path)
                logger.debug(f"Deleted temp file: {file_path}")
        except Exception as e:
            logger.warning(f"Could not delete {file_path}: {e}")
    
    async def _cleanup_temp_files(self):
        """Clean up all tracked temporary files."""
        temp_files_copy = self._temp_files.copy()
        for file_path in temp_files_copy:
            await self._safe_delete_file(file_path)
    
    def combine_transcript_chunks(self, chunks: List[Dict]) -> str:
        """Combine transcript chunks into full text with intelligent spacing."""
        try:
            if not chunks:
                return ""
            
            # Sort chunks by start time to ensure proper order
            sorted_chunks = sorted(chunks, key=lambda x: x.get('start_time', 0))
            
            # Combine text with intelligent spacing
            text_parts = []
            for chunk in sorted_chunks:
                text = chunk.get('text', '').strip()
                if text:
                    # Add period if the previous chunk doesn't end with punctuation
                    if text_parts and not text_parts[-1].endswith(('.', '!', '?', ':')):
                        if not text[0].isupper():  # Don't add period if next starts with capital
                            text_parts[-1] += '.'
                    text_parts.append(text)
            
            full_text = ' '.join(text_parts)
            return full_text.strip()
            
        except Exception as e:
            logger.error(f"Error combining transcript chunks: {e}")
            return ""
    
    def get_processing_stats(self) -> dict:
        """Get comprehensive processing statistics."""
        process = psutil.Process()
        current_memory = process.memory_info().rss / (1024 * 1024)
        available_memory = psutil.virtual_memory().available / (1024 * 1024)
        
        return {
            **self.processing_stats,
            'memory_current_mb': current_memory,
            'memory_available_mb': available_memory,
            'memory_usage_percent': (current_memory / (current_memory + available_memory)) * 100,
            'temp_files_active': len(self._temp_files),
            'temp_files_on_disk': len(list(self.temp_dir.glob('opt_chunk_*.mp3'))),
            'cpu_percent': process.cpu_percent(),
            'thread_pool_active': self.thread_pool._threads,
        }
    
    def cleanup_all_temp_files(self) -> int:
        """Clean up all temporary files synchronously."""
        cleaned_count = 0
        try:
            # Clean tracked files
            for temp_file in list(self._temp_files):
                try:
                    if os.path.exists(temp_file):
                        os.unlink(temp_file)
                        cleaned_count += 1
                    self._temp_files.discard(temp_file)
                except Exception as e:
                    logger.warning(f"Could not clean up {temp_file}: {e}")
            
            # Clean any orphaned chunk files
            for temp_file in self.temp_dir.glob('opt_chunk_*.mp3'):
                try:
                    temp_file.unlink()
                    cleaned_count += 1
                except Exception as e:
                    logger.warning(f"Could not clean up {temp_file}: {e}")
            
            if cleaned_count > 0:
                logger.info(f"Cleaned up {cleaned_count} temporary files")
                
        except Exception as e:
            logger.error(f"Error during temp file cleanup: {e}")
        
        return cleaned_count
    
    def __del__(self):
        """Cleanup on object destruction."""
        try:
            self.cleanup_all_temp_files()
            if hasattr(self, 'thread_pool'):
                self.thread_pool.shutdown(wait=False)
        except:
            pass


# Enhanced global service instance
optimized_transcription_service = OptimizedTranscriptionService()