"""
Redis caching service for video metadata and transcript caching.
"""
import json
import gzip
import hashlib
import logging
from typing import Optional, Dict, List, Any, Union
from datetime import timedelta, datetime
import redis.asyncio as redis
from redis.asyncio import Redis
from redis.exceptions import RedisError, ConnectionError

from core.config import settings

logger = logging.getLogger(__name__)


class CacheService:
    """Advanced Redis caching service with compression, connection pooling, and performance optimizations."""
    
    def __init__(self):
        """Initialize Redis connection with optimized settings."""
        # Parse Redis URL
        redis_url = settings.REDIS_URL
        
        # Connection pool settings for high performance
        connection_pool = redis.ConnectionPool.from_url(
            redis_url,
            decode_responses=False,  # Handle binary data for compression
            max_connections=100,     # Increased for high concurrency
            retry_on_timeout=True,
            retry_on_error=[ConnectionError],
            health_check_interval=30,
            socket_keepalive=True,
            socket_keepalive_options={
                1: 1,  # TCP_KEEPIDLE
                2: 3,  # TCP_KEEPINTVL 
                3: 5,  # TCP_KEEPCNT
            },
            socket_connect_timeout=5,
            socket_timeout=10,
        )
        
        self.redis: Redis = redis.Redis(
            connection_pool=connection_pool
        )
        
        # Create separate Redis instance for pub/sub (cache invalidation)
        self.pubsub_redis = redis.Redis(connection_pool=connection_pool)
        
        # Cache key prefixes
        self.VIDEO_META_PREFIX = "video_meta"
        self.TRANSCRIPT_PREFIX = "transcript"
        self.TRANSCRIPT_CHUNKS_PREFIX = "transcript_chunks"
        self.SUMMARY_PREFIX = "summary"
        self.USER_VIDEOS_PREFIX = "user_videos"
        self.SEARCH_RESULTS_PREFIX = "search_results"
        
        # Cache TTL settings (in seconds) - optimized for video processing
        self.VIDEO_METADATA_TTL = 60 * 60 * 24 * 7  # 7 days
        self.TRANSCRIPT_TTL = 60 * 60 * 24 * 30      # 30 days (transcripts are expensive)
        self.TRANSCRIPT_CHUNKS_TTL = 60 * 60 * 24 * 14  # 14 days for chunks
        self.SEARCH_RESULTS_TTL = 60 * 60 * 2        # 2 hours (longer for expensive searches)
        self.USER_DATA_TTL = 60 * 60 * 4             # 4 hours for user video lists
        self.HOT_DATA_TTL = 60 * 60 * 12             # 12 hours for frequently accessed data
        self.PROCESSING_STATUS_TTL = 60 * 5          # 5 minutes for processing status
        
        # Cache warming settings
        self.CACHE_WARM_BATCH_SIZE = 50
        self.CACHE_WARM_DELAY = 0.1  # Delay between warming operations
        
        # Performance monitoring
        self.cache_hit_count = 0
        self.cache_miss_count = 0
        self.cache_error_count = 0
    
    async def health_check(self) -> dict:
        """Comprehensive Redis connection health check."""
        try:
            # Test basic connectivity
            ping_start = datetime.utcnow()
            await self.redis.ping()
            ping_time = (datetime.utcnow() - ping_start).total_seconds() * 1000
            
            # Get Redis info
            info = await self.redis.info()
            
            return {
                'status': 'healthy',
                'ping_time_ms': round(ping_time, 2),
                'connected_clients': info.get('connected_clients', 0),
                'used_memory': info.get('used_memory_human', '0B'),
                'used_memory_peak': info.get('used_memory_peak_human', '0B'),
                'instantaneous_ops_per_sec': info.get('instantaneous_ops_per_sec', 0),
                'total_commands_processed': info.get('total_commands_processed', 0),
                'keyspace_hits': info.get('keyspace_hits', 0),
                'keyspace_misses': info.get('keyspace_misses', 0),
                'cache_hit_ratio': self._calculate_hit_ratio(),
                'uptime_seconds': info.get('uptime_in_seconds', 0)
            }
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return {
                'status': 'unhealthy',
                'error': str(e),
                'cache_hit_ratio': self._calculate_hit_ratio()
            }
    
    def _calculate_hit_ratio(self) -> float:
        """Calculate cache hit ratio."""
        total_requests = self.cache_hit_count + self.cache_miss_count
        if total_requests == 0:
            return 0.0
        return round((self.cache_hit_count / total_requests) * 100, 2)
    
    def _generate_cache_key(self, prefix: str, identifier: str) -> str:
        """Generate cache key with consistent hashing."""
        if prefix == self.VIDEO_META_PREFIX:
            # Use URL hash for video metadata
            return f"{prefix}:{hashlib.md5(identifier.encode()).hexdigest()}"
        else:
            # Use identifier directly for other keys
            return f"{prefix}:{identifier}"
    
    def _compress_data(self, data: Union[str, bytes], compression_level: int = 6) -> bytes:
        """Compress data using gzip with configurable compression level."""
        if isinstance(data, str):
            data = data.encode('utf-8')
        
        # Use higher compression for large data, faster compression for small data
        if len(data) > 1024 * 100:  # 100KB threshold
            compression_level = 9  # Maximum compression for large data
        elif len(data) < 1024 * 10:  # 10KB threshold
            compression_level = 1  # Fast compression for small data
            
        return gzip.compress(data, compresslevel=compression_level)
    
    def _decompress_data(self, compressed_data: bytes) -> str:
        """Decompress gzipped data with error handling."""
        try:
            return gzip.decompress(compressed_data).decode('utf-8')
        except Exception as e:
            logger.error(f"Decompression failed: {e}")
            raise Exception(f"Cache data corruption detected: {e}")
    
    def _should_compress(self, data: Union[str, bytes]) -> bool:
        """Determine if data should be compressed based on size."""
        data_size = len(data.encode('utf-8') if isinstance(data, str) else data)
        return data_size > 1024  # Compress data larger than 1KB
    
    # Video Metadata Caching
    
    async def cache_video_metadata(self, youtube_url: str, metadata: dict) -> bool:
        """
        Cache video metadata to avoid repeated yt-dlp calls.
        
        Args:
            youtube_url: YouTube video URL
            metadata: Video metadata dictionary
            
        Returns:
            bool: True if cached successfully
        """
        try:
            cache_key = self._generate_cache_key(self.VIDEO_META_PREFIX, youtube_url)
            
            # Add cache timestamp
            metadata_with_timestamp = {
                **metadata,
                'cached_at': datetime.utcnow().isoformat(),
                'cache_version': '1.0'
            }
            
            # Compress and store
            compressed_data = self._compress_data(json.dumps(metadata_with_timestamp))
            
            await self.redis.setex(
                cache_key,
                self.VIDEO_METADATA_TTL,
                compressed_data
            )
            
            # Track cache metrics
            self.cache_hit_count += 1
            
            # Set up cache invalidation trigger
            await self._set_cache_invalidation_trigger(
                cache_key, 
                'video_metadata', 
                {'youtube_url': youtube_url}
            )
            
            logger.info(f"Cached video metadata for {youtube_url}")
            return True
            
        except Exception as e:
            self.cache_error_count += 1
            logger.error(f"Error caching video metadata: {e}")
            return False
    
    async def get_video_metadata(self, youtube_url: str) -> Optional[dict]:
        """
        Retrieve cached video metadata.
        
        Args:
            youtube_url: YouTube video URL
            
        Returns:
            dict or None: Cached metadata if available
        """
        try:
            cache_key = self._generate_cache_key(self.VIDEO_META_PREFIX, youtube_url)
            compressed_data = await self.redis.get(cache_key)
            
            if not compressed_data:
                return None
            
            # Decompress and parse
            decompressed_data = self._decompress_data(compressed_data)
            metadata = json.loads(decompressed_data)
            
            logger.info(f"Retrieved cached video metadata for {youtube_url}")
            return metadata
            
        except Exception as e:
            logger.error(f"Error retrieving video metadata from cache: {e}")
            return None
    
    # Transcript Caching
    
    async def cache_transcript_chunks(self, video_id: str, chunks: List[dict]) -> bool:
        """
        Cache processed transcript chunks with compression.
        
        Args:
            video_id: Video ID
            chunks: List of transcript chunks
            
        Returns:
            bool: True if cached successfully
        """
        try:
            cache_key = self._generate_cache_key(self.TRANSCRIPT_CHUNKS_PREFIX, video_id)
            
            # Add metadata
            transcript_data = {
                'video_id': video_id,
                'chunks': chunks,
                'chunk_count': len(chunks),
                'cached_at': datetime.utcnow().isoformat(),
                'total_duration': sum(chunk.get('end_time', 0) - chunk.get('start_time', 0) for chunk in chunks)
            }
            
            # Compress large transcript data
            compressed_data = self._compress_data(json.dumps(transcript_data))
            
            # Use Redis pipeline for atomic operations
            pipeline = await self.redis.pipeline()
            pipeline.setex(cache_key, self.TRANSCRIPT_TTL, compressed_data)
            
            # Also cache individual chunks for quick access
            for i, chunk in enumerate(chunks):
                chunk_key = f"{cache_key}:chunk:{i}"
                pipeline.setex(
                    chunk_key,
                    self.TRANSCRIPT_TTL,
                    json.dumps(chunk).encode('utf-8')
                )
            
            await pipeline.execute()
            
            logger.info(f"Cached {len(chunks)} transcript chunks for video {video_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error caching transcript chunks: {e}")
            return False
    
    async def get_transcript_chunks(self, video_id: str) -> Optional[List[dict]]:
        """
        Retrieve cached transcript chunks.
        
        Args:
            video_id: Video ID
            
        Returns:
            List[dict] or None: Transcript chunks if available
        """
        try:
            cache_key = self._generate_cache_key(self.TRANSCRIPT_CHUNKS_PREFIX, video_id)
            compressed_data = await self.redis.get(cache_key)
            
            if not compressed_data:
                return None
            
            # Decompress and parse
            decompressed_data = self._decompress_data(compressed_data)
            transcript_data = json.loads(decompressed_data)
            
            logger.info(f"Retrieved cached transcript chunks for video {video_id}")
            return transcript_data.get('chunks', [])
            
        except Exception as e:
            logger.error(f"Error retrieving transcript chunks from cache: {e}")
            return None
    
    async def get_transcript_chunk(self, video_id: str, chunk_index: int) -> Optional[dict]:
        """
        Retrieve specific transcript chunk.
        
        Args:
            video_id: Video ID
            chunk_index: Index of the chunk
            
        Returns:
            dict or None: Transcript chunk if available
        """
        try:
            cache_key = self._generate_cache_key(self.TRANSCRIPT_CHUNKS_PREFIX, video_id)
            chunk_key = f"{cache_key}:chunk:{chunk_index}"
            
            chunk_data = await self.redis.get(chunk_key)
            if not chunk_data:
                return None
            
            return json.loads(chunk_data.decode('utf-8'))
            
        except Exception as e:
            logger.error(f"Error retrieving transcript chunk {chunk_index}: {e}")
            return None
    
    # Summary Caching
    
    async def cache_summary(self, video_id: str, summary_data: dict) -> bool:
        """
        Cache generated summary.
        
        Args:
            video_id: Video ID
            summary_data: Summary data with metadata
            
        Returns:
            bool: True if cached successfully
        """
        try:
            cache_key = self._generate_cache_key(self.SUMMARY_PREFIX, video_id)
            
            # Add cache metadata
            summary_with_metadata = {
                **summary_data,
                'cached_at': datetime.utcnow().isoformat(),
                'cache_version': '1.0'
            }
            
            compressed_data = self._compress_data(json.dumps(summary_with_metadata))
            
            await self.redis.setex(
                cache_key,
                self.TRANSCRIPT_TTL,  # Same TTL as transcript
                compressed_data
            )
            
            logger.info(f"Cached summary for video {video_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error caching summary: {e}")
            return False
    
    async def get_cached_summary(self, video_id: str) -> Optional[dict]:
        """
        Retrieve cached summary.
        
        Args:
            video_id: Video ID
            
        Returns:
            dict or None: Summary data if available
        """
        try:
            cache_key = self._generate_cache_key(self.SUMMARY_PREFIX, video_id)
            compressed_data = await self.redis.get(cache_key)
            
            if not compressed_data:
                return None
            
            decompressed_data = self._decompress_data(compressed_data)
            return json.loads(decompressed_data)
            
        except Exception as e:
            logger.error(f"Error retrieving cached summary: {e}")
            return None
    
    # User Data Caching
    
    async def cache_user_videos(self, user_id: str, videos: List[dict]) -> bool:
        """
        Cache user's video list for quick access.
        
        Args:
            user_id: User ID
            videos: List of user's videos
            
        Returns:
            bool: True if cached successfully
        """
        try:
            cache_key = self._generate_cache_key(self.USER_VIDEOS_PREFIX, user_id)
            
            user_data = {
                'user_id': user_id,
                'videos': videos,
                'video_count': len(videos),
                'cached_at': datetime.utcnow().isoformat()
            }
            
            compressed_data = self._compress_data(json.dumps(user_data))
            
            await self.redis.setex(
                cache_key,
                self.USER_DATA_TTL,
                compressed_data
            )
            
            logger.info(f"Cached {len(videos)} videos for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error caching user videos: {e}")
            return False
    
    async def get_user_videos(self, user_id: str) -> Optional[List[dict]]:
        """
        Retrieve cached user videos.
        
        Args:
            user_id: User ID
            
        Returns:
            List[dict] or None: User's videos if available
        """
        try:
            cache_key = self._generate_cache_key(self.USER_VIDEOS_PREFIX, user_id)
            compressed_data = await self.redis.get(cache_key)
            
            if not compressed_data:
                return None
            
            decompressed_data = self._decompress_data(compressed_data)
            user_data = json.loads(decompressed_data)
            
            return user_data.get('videos', [])
            
        except Exception as e:
            logger.error(f"Error retrieving cached user videos: {e}")
            return None
    
    # Search Results Caching
    
    async def cache_search_results(self, search_query: str, results: List[dict]) -> bool:
        """
        Cache search results.
        
        Args:
            search_query: Search query string
            results: Search results
            
        Returns:
            bool: True if cached successfully
        """
        try:
            search_hash = hashlib.md5(search_query.lower().encode()).hexdigest()
            cache_key = self._generate_cache_key(self.SEARCH_RESULTS_PREFIX, search_hash)
            
            search_data = {
                'query': search_query,
                'results': results,
                'result_count': len(results),
                'cached_at': datetime.utcnow().isoformat()
            }
            
            compressed_data = self._compress_data(json.dumps(search_data))
            
            await self.redis.setex(
                cache_key,
                self.SEARCH_RESULTS_TTL,
                compressed_data
            )
            
            logger.info(f"Cached {len(results)} search results for query: {search_query}")
            return True
            
        except Exception as e:
            logger.error(f"Error caching search results: {e}")
            return False
    
    async def get_search_results(self, search_query: str) -> Optional[List[dict]]:
        """
        Retrieve cached search results.
        
        Args:
            search_query: Search query string
            
        Returns:
            List[dict] or None: Search results if available
        """
        try:
            search_hash = hashlib.md5(search_query.lower().encode()).hexdigest()
            cache_key = self._generate_cache_key(self.SEARCH_RESULTS_PREFIX, search_hash)
            
            compressed_data = await self.redis.get(cache_key)
            if not compressed_data:
                return None
            
            decompressed_data = self._decompress_data(compressed_data)
            search_data = json.loads(decompressed_data)
            
            return search_data.get('results', [])
            
        except Exception as e:
            logger.error(f"Error retrieving cached search results: {e}")
            return None
    
    # Cache Invalidation
    
    async def invalidate_user_cache(self, user_id: str) -> bool:
        """
        Invalidate all cache entries for a user.
        
        Args:
            user_id: User ID
            
        Returns:
            bool: True if invalidated successfully
        """
        try:
            patterns = [
                f"{self.USER_VIDEOS_PREFIX}:{user_id}",
                f"{self.SEARCH_RESULTS_PREFIX}:*"  # Clear search cache as it might contain user data
            ]
            
            deleted_count = 0
            for pattern in patterns:
                if "*" in pattern:
                    # Use scan for pattern matching
                    async for key in self.redis.scan_iter(match=pattern):
                        await self.redis.delete(key)
                        deleted_count += 1
                else:
                    # Direct key deletion
                    if await self.redis.delete(pattern):
                        deleted_count += 1
            
            logger.info(f"Invalidated {deleted_count} cache entries for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error invalidating user cache: {e}")
            return False
    
    async def invalidate_video_cache(self, video_id: str, youtube_url: str) -> bool:
        """
        Invalidate all cache entries for a specific video.
        
        Args:
            video_id: Video ID
            youtube_url: YouTube URL
            
        Returns:
            bool: True if invalidated successfully
        """
        try:
            keys_to_delete = [
                self._generate_cache_key(self.VIDEO_META_PREFIX, youtube_url),
                self._generate_cache_key(self.TRANSCRIPT_CHUNKS_PREFIX, video_id),
                self._generate_cache_key(self.SUMMARY_PREFIX, video_id),
            ]
            
            # Also delete individual chunk keys
            transcript_cache_key = self._generate_cache_key(self.TRANSCRIPT_CHUNKS_PREFIX, video_id)
            chunk_pattern = f"{transcript_cache_key}:chunk:*"
            
            deleted_count = 0
            
            # Delete main keys
            for key in keys_to_delete:
                if await self.redis.delete(key):
                    deleted_count += 1
            
            # Delete chunk keys
            async for key in self.redis.scan_iter(match=chunk_pattern):
                await self.redis.delete(key)
                deleted_count += 1
            
            logger.info(f"Invalidated {deleted_count} cache entries for video {video_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error invalidating video cache: {e}")
            return False
    
    # Cache Statistics
    
    async def get_cache_stats(self) -> dict:
        """
        Get cache statistics and health information.
        
        Returns:
            dict: Cache statistics
        """
        try:
            info = await self.redis.info()
            
            # Count keys by prefix
            key_counts = {}
            prefixes = [
                self.VIDEO_META_PREFIX,
                self.TRANSCRIPT_CHUNKS_PREFIX,
                self.SUMMARY_PREFIX,
                self.USER_VIDEOS_PREFIX,
                self.SEARCH_RESULTS_PREFIX
            ]
            
            for prefix in prefixes:
                pattern = f"{prefix}:*"
                count = 0
                async for _ in self.redis.scan_iter(match=pattern):
                    count += 1
                key_counts[prefix] = count
            
            return {
                'connected_clients': info.get('connected_clients', 0),
                'used_memory': info.get('used_memory_human', '0B'),
                'used_memory_peak': info.get('used_memory_peak_human', '0B'),
                'total_commands_processed': info.get('total_commands_processed', 0),
                'instantaneous_ops_per_sec': info.get('instantaneous_ops_per_sec', 0),
                'keyspace_hits': info.get('keyspace_hits', 0),
                'keyspace_misses': info.get('keyspace_misses', 0),
                'key_counts': key_counts,
                'uptime_in_seconds': info.get('uptime_in_seconds', 0)
            }
            
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {}
    
    async def cleanup_expired_keys(self) -> int:
        """
        Clean up expired keys (manual cleanup for debugging).
        
        Returns:
            int: Number of keys cleaned up
        """
        try:
            # This is mainly for debugging - Redis handles expiration automatically
            cleaned = 0
            
            # Check for keys that should be expired but aren't
            current_time = datetime.utcnow().timestamp()
            
            async for key in self.redis.scan_iter():
                ttl = await self.redis.ttl(key)
                if ttl == -2:  # Key doesn't exist
                    cleaned += 1
                elif ttl == -1:  # Key exists but no TTL
                    # Check if it's a key that should have TTL
                    key_str = key.decode('utf-8') if isinstance(key, bytes) else key
                    if any(prefix in key_str for prefix in [
                        self.VIDEO_META_PREFIX,
                        self.TRANSCRIPT_CHUNKS_PREFIX,
                        self.SEARCH_RESULTS_PREFIX
                    ]):
                        # Set appropriate TTL
                        if self.VIDEO_META_PREFIX in key_str:
                            await self.redis.expire(key, self.VIDEO_METADATA_TTL)
                        elif self.TRANSCRIPT_CHUNKS_PREFIX in key_str:
                            await self.redis.expire(key, self.TRANSCRIPT_TTL)
                        else:
                            await self.redis.expire(key, self.SEARCH_RESULTS_TTL)
                        cleaned += 1
            
            if cleaned > 0:
                logger.info(f"Cleaned up {cleaned} cache keys")
                
            return cleaned
            
        except Exception as e:
            logger.error(f"Error during cache cleanup: {e}")
            return 0
    
    # Cache Warming and Preloading
    
    async def warm_user_cache(self, user_id: str) -> dict:
        """
        Warm cache for a specific user's data.
        
        Args:
            user_id: User ID to warm cache for
            
        Returns:
            dict: Warming results
        """
        try:
            from models.database import Video
            from core.database import async_session_maker
            
            warming_stats = {
                'videos_warmed': 0,
                'transcripts_warmed': 0,
                'summaries_warmed': 0,
                'errors': 0
            }
            
            async with async_session_maker() as session:
                # Get user's recent videos
                from sqlalchemy import select, desc
                from uuid import UUID
                
                query = select(Video).where(
                    Video.user_id == UUID(user_id),
                    Video.status == 'complete'
                ).order_by(desc(Video.created_at)).limit(self.CACHE_WARM_BATCH_SIZE)
                
                result = await session.execute(query)
                videos = result.scalars().all()
                
                for video in videos:
                    try:
                        # Warm video metadata cache
                        await self.cache_video_metadata(
                            video.youtube_url, 
                            {
                                'id': str(video.id),
                                'title': video.title,
                                'channel_name': video.channel_name,
                                'duration': video.duration,
                                'thumbnail_url': video.thumbnail_url
                            }
                        )
                        warming_stats['videos_warmed'] += 1
                        
                        # Warm transcript cache if available
                        if video.transcript:
                            await self.cache_transcript_chunks(
                                str(video.id),
                                video.transcript.chunks
                            )
                            warming_stats['transcripts_warmed'] += 1
                        
                        # Warm summary cache if available
                        if video.summaries:
                            for summary in video.summaries:
                                await self.cache_summary(
                                    str(video.id),
                                    {
                                        'summary_text': summary.summary_text,
                                        'mode': summary.mode,
                                        'created_at': summary.created_at.isoformat()
                                    }
                                )
                            warming_stats['summaries_warmed'] += len(video.summaries)
                        
                        # Small delay to prevent overwhelming Redis
                        await asyncio.sleep(self.CACHE_WARM_DELAY)
                        
                    except Exception as e:
                        warming_stats['errors'] += 1
                        logger.warning(f"Error warming cache for video {video.id}: {e}")
                        continue
                
                logger.info(f"Cache warming completed for user {user_id}: {warming_stats}")
                return warming_stats
                
        except Exception as e:
            logger.error(f"Cache warming failed for user {user_id}: {e}")
            return {'error': str(e)}
    
    async def warm_popular_content(self) -> dict:
        """
        Warm cache for popular/frequently accessed content.
        
        Returns:
            dict: Warming results
        """
        try:
            from models.database import Video
            from core.database import async_session_maker
            from sqlalchemy import select, desc, func
            
            warming_stats = {
                'popular_videos_warmed': 0,
                'errors': 0
            }
            
            async with async_session_maker() as session:
                # Get most viewed videos
                query = select(Video).where(
                    Video.status == 'complete',
                    Video.view_count.isnot(None)
                ).order_by(desc(Video.view_count)).limit(100)
                
                result = await session.execute(query)
                popular_videos = result.scalars().all()
                
                for video in popular_videos:
                    try:
                        # Cache metadata with longer TTL for popular content
                        cache_key = self._generate_cache_key(self.VIDEO_META_PREFIX, video.youtube_url)
                        metadata = {
                            'id': str(video.id),
                            'title': video.title,
                            'channel_name': video.channel_name,
                            'duration': video.duration,
                            'view_count': video.view_count,
                            'thumbnail_url': video.thumbnail_url,
                            'popular': True  # Mark as popular content
                        }
                        
                        compressed_data = self._compress_data(json.dumps(metadata))
                        await self.redis.setex(
                            cache_key,
                            self.HOT_DATA_TTL,  # Longer TTL for popular content
                            compressed_data
                        )
                        
                        warming_stats['popular_videos_warmed'] += 1
                        await asyncio.sleep(self.CACHE_WARM_DELAY)
                        
                    except Exception as e:
                        warming_stats['errors'] += 1
                        logger.warning(f"Error warming popular video {video.id}: {e}")
                        continue
                
                logger.info(f"Popular content warming completed: {warming_stats}")
                return warming_stats
                
        except Exception as e:
            logger.error(f"Popular content warming failed: {e}")
            return {'error': str(e)}
    
    # Cache Invalidation and Pub/Sub
    
    async def _set_cache_invalidation_trigger(self, cache_key: str, data_type: str, metadata: dict):
        """Set up cache invalidation trigger."""
        try:
            trigger_data = {
                'cache_key': cache_key,
                'data_type': data_type,
                'metadata': metadata,
                'created_at': datetime.utcnow().isoformat()
            }
            
            # Store invalidation trigger
            trigger_key = f"cache_trigger:{cache_key}"
            await self.redis.setex(
                trigger_key,
                self.PROCESSING_STATUS_TTL,
                json.dumps(trigger_data)
            )
            
        except Exception as e:
            logger.warning(f"Failed to set cache invalidation trigger: {e}")
    
    async def invalidate_cache_pattern(self, pattern: str) -> int:
        """
        Invalidate cache keys matching a pattern and notify other instances.
        
        Args:
            pattern: Redis key pattern (e.g., "video_meta:*")
            
        Returns:
            int: Number of keys invalidated
        """
        try:
            deleted_count = 0
            
            # Use SCAN for pattern matching to avoid blocking Redis
            async for key in self.redis.scan_iter(match=pattern, count=100):
                await self.redis.delete(key)
                deleted_count += 1
                
                # Publish invalidation event
                await self.pubsub_redis.publish(
                    'cache_invalidation',
                    json.dumps({
                        'pattern': pattern,
                        'key': key.decode('utf-8') if isinstance(key, bytes) else key,
                        'timestamp': datetime.utcnow().isoformat()
                    })
                )
            
            logger.info(f"Invalidated {deleted_count} cache keys matching pattern: {pattern}")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Pattern invalidation failed for {pattern}: {e}")
            return 0
    
    # Batch Operations
    
    async def batch_cache_videos(self, video_data_list: List[tuple]) -> dict:
        """
        Cache multiple videos in a single pipeline operation.
        
        Args:
            video_data_list: List of (youtube_url, metadata) tuples
            
        Returns:
            dict: Batch operation results
        """
        try:
            pipeline = self.redis.pipeline()
            cached_count = 0
            
            for youtube_url, metadata in video_data_list:
                cache_key = self._generate_cache_key(self.VIDEO_META_PREFIX, youtube_url)
                
                metadata_with_timestamp = {
                    **metadata,
                    'cached_at': datetime.utcnow().isoformat(),
                    'batch_cached': True
                }
                
                if self._should_compress(json.dumps(metadata_with_timestamp)):
                    compressed_data = self._compress_data(json.dumps(metadata_with_timestamp))
                else:
                    compressed_data = json.dumps(metadata_with_timestamp).encode('utf-8')
                
                pipeline.setex(cache_key, self.VIDEO_METADATA_TTL, compressed_data)
                cached_count += 1
            
            # Execute all operations atomically
            await pipeline.execute()
            
            logger.info(f"Batch cached {cached_count} videos")
            return {
                'cached_count': cached_count,
                'success': True
            }
            
        except Exception as e:
            logger.error(f"Batch video caching failed: {e}")
            return {
                'cached_count': 0,
                'success': False,
                'error': str(e)
            }
    
    async def batch_get_cached_data(self, keys: List[str]) -> dict:
        """
        Retrieve multiple cache entries in a single operation.
        
        Args:
            keys: List of cache keys to retrieve
            
        Returns:
            dict: Retrieved data keyed by original keys
        """
        try:
            pipeline = self.redis.pipeline()
            
            # Queue all get operations
            for key in keys:
                pipeline.get(key)
            
            # Execute all operations
            results = await pipeline.execute()
            
            # Process results
            cached_data = {}
            hits = 0
            misses = 0
            
            for i, result in enumerate(results):
                key = keys[i]
                if result:
                    try:
                        # Try to decompress first
                        try:
                            data = self._decompress_data(result)
                        except:
                            # If decompression fails, assume it's uncompressed JSON
                            data = result.decode('utf-8')
                        
                        cached_data[key] = json.loads(data)
                        hits += 1
                    except Exception as e:
                        logger.warning(f"Failed to parse cached data for key {key}: {e}")
                        misses += 1
                else:
                    misses += 1
            
            # Update metrics
            self.cache_hit_count += hits
            self.cache_miss_count += misses
            
            logger.info(f"Batch get: {hits} hits, {misses} misses")
            return cached_data
            
        except Exception as e:
            self.cache_error_count += 1
            logger.error(f"Batch get operation failed: {e}")
            return {}
    
    # Performance Monitoring
    
    async def get_performance_metrics(self) -> dict:
        """Get comprehensive cache performance metrics."""
        try:
            redis_info = await self.redis.info()
            
            # Memory usage analysis
            memory_stats = {
                'used_memory': redis_info.get('used_memory', 0),
                'used_memory_human': redis_info.get('used_memory_human', '0B'),
                'used_memory_peak': redis_info.get('used_memory_peak', 0),
                'used_memory_peak_human': redis_info.get('used_memory_peak_human', '0B'),
                'memory_fragmentation_ratio': redis_info.get('mem_fragmentation_ratio', 0),
            }
            
            # Performance metrics
            performance_stats = {
                'instantaneous_ops_per_sec': redis_info.get('instantaneous_ops_per_sec', 0),
                'total_commands_processed': redis_info.get('total_commands_processed', 0),
                'connected_clients': redis_info.get('connected_clients', 0),
                'blocked_clients': redis_info.get('blocked_clients', 0),
            }
            
            # Hit/miss ratios from Redis
            keyspace_hits = redis_info.get('keyspace_hits', 0)
            keyspace_misses = redis_info.get('keyspace_misses', 0)
            total_requests = keyspace_hits + keyspace_misses
            
            cache_stats = {
                'keyspace_hits': keyspace_hits,
                'keyspace_misses': keyspace_misses,
                'hit_ratio_redis': round((keyspace_hits / total_requests) * 100, 2) if total_requests > 0 else 0,
                'hit_ratio_application': self._calculate_hit_ratio(),
                'total_app_hits': self.cache_hit_count,
                'total_app_misses': self.cache_miss_count,
                'total_app_errors': self.cache_error_count,
            }
            
            return {
                'memory_stats': memory_stats,
                'performance_stats': performance_stats,
                'cache_stats': cache_stats,
                'uptime_seconds': redis_info.get('uptime_in_seconds', 0)
            }
            
        except Exception as e:
            logger.error(f"Performance metrics collection failed: {e}")
            return {'error': str(e)}


# Enhanced global service instance with monitoring
cache_service = CacheService()