"""
Story 4.0d: Railway Redis Client for Signal Caching
Python implementation of Redis caching utilities for Railway deployment
Uses redis-py (async) for Railway Redis instance connectivity
"""

import os
import logging
from typing import Optional, Any, Dict, List
from datetime import datetime, timedelta
import json

try:
    import redis.asyncio as aioredis
    from redis.asyncio import Redis
except ImportError:
    # Fallback for older redis-py versions
    import redis
    Redis = redis.Redis
    aioredis = None

logger = logging.getLogger(__name__)


class RedisClient:
    """
    Railway Redis client singleton
    Manages connection to Railway Redis instance via REDIS_URL environment variable
    """

    _instance: Optional[Redis] = None

    @classmethod
    async def get_instance(cls) -> Redis:
        """
        Get singleton Redis client instance
        Connects to Railway Redis using REDIS_URL environment variable

        Returns:
            Redis client instance
        """
        if cls._instance is None:
            redis_url = os.getenv('REDIS_URL')

            if not redis_url:
                logger.warning('REDIS_URL not configured - using mock client')
                return cls._create_mock_client()

            try:
                # Create async Redis client for Railway
                if aioredis:
                    cls._instance = await aioredis.from_url(
                        redis_url,
                        encoding='utf-8',
                        decode_responses=True,
                        max_connections=10,
                        socket_connect_timeout=5,
                        socket_keepalive=True,
                    )
                else:
                    # Fallback to sync client
                    cls._instance = redis.from_url(
                        redis_url,
                        encoding='utf-8',
                        decode_responses=True,
                    )

                # Test connection
                await cls._instance.ping()
                logger.info('Railway Redis connected successfully')

            except Exception as error:
                logger.error(f'Railway Redis connection failed: {error}')
                cls._instance = cls._create_mock_client()

        return cls._instance

    @classmethod
    def _create_mock_client(cls) -> Any:
        """
        Create mock Redis client for development/testing
        Returns a simple object with no-op methods

        Returns:
            Mock Redis client
        """
        class MockRedis:
            async def get(self, key: str) -> None:
                return None

            async def set(self, key: str, value: str) -> str:
                return 'OK'

            async def setex(self, key: str, ttl: int, value: str) -> str:
                return 'OK'

            async def delete(self, *keys: str) -> int:
                return len(keys)

            async def exists(self, *keys: str) -> int:
                return 0

            async def expire(self, key: str, seconds: int) -> int:
                return 1

            async def ttl(self, key: str) -> int:
                return -1

            async def keys(self, pattern: str) -> List[str]:
                return []

            async def ping(self) -> str:
                return 'PONG'

            async def close(self) -> None:
                pass

        return MockRedis()

    @classmethod
    async def disconnect(cls) -> None:
        """Close Redis connection (for graceful shutdown)"""
        if cls._instance:
            await cls._instance.close()
            cls._instance = None
            logger.info('Railway Redis disconnected')

    @classmethod
    async def health_check(cls) -> bool:
        """
        Health check - verify Redis connection

        Returns:
            True if Redis is healthy
        """
        try:
            client = await cls.get_instance()
            result = await client.ping()
            return result == 'PONG'
        except Exception as error:
            logger.error(f'Redis health check failed: {error}')
            return False


class SignalCache:
    """
    Signal-specific caching utilities
    Provides high-level caching operations for signal calculations
    """

    def __init__(self, redis_client: Optional[Redis] = None):
        """
        Initialize signal cache

        Args:
            redis_client: Optional Redis client (uses singleton if not provided)
        """
        self.redis = redis_client
        self.default_ttl = int(os.getenv('SIGNAL_CACHE_TTL', '3600'))  # 1 hour

    async def _get_redis(self) -> Redis:
        """Get Redis client (lazy initialization)"""
        if not self.redis:
            self.redis = await RedisClient.get_instance()
        return self.redis

    def _get_cache_key(
        self,
        signal_type: str,
        date: datetime,
        params: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate cache key for signal calculation

        Args:
            signal_type: Signal type identifier
            date: Calculation date
            params: Optional signal parameters

        Returns:
            Cache key string
        """
        date_str = date.strftime('%Y-%m-%d')
        params_hash = hash(str(sorted(params.items()))) if params else ''
        return f"signal:{signal_type}:{date_str}:{params_hash}"

    async def get(
        self,
        signal_type: str,
        date: datetime,
        params: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get cached signal result

        Args:
            signal_type: Signal type identifier
            date: Calculation date
            params: Optional signal parameters

        Returns:
            Cached result or None
        """
        try:
            redis = await self._get_redis()
            key = self._get_cache_key(signal_type, date, params)
            cached = await redis.get(key)

            if not cached:
                return None

            # Parse JSON result
            result = json.loads(cached)

            # Increment hit count (fire and forget)
            self._increment_hit_count(key)

            return result

        except Exception as error:
            logger.error(f'Redis get error: {error}')
            return None

    async def set(
        self,
        signal_type: str,
        date: datetime,
        value: Dict[str, Any],
        params: Optional[Dict[str, Any]] = None,
        ttl: Optional[int] = None
    ) -> None:
        """
        Set cached signal result

        Args:
            signal_type: Signal type identifier
            date: Calculation date
            value: Signal result to cache
            params: Optional signal parameters
            ttl: Cache TTL in seconds (uses default if not provided)
        """
        try:
            redis = await self._get_redis()
            key = self._get_cache_key(signal_type, date, params)
            ttl_seconds = ttl or self.default_ttl

            # Store as JSON
            await redis.setex(
                key,
                ttl_seconds,
                json.dumps(value, default=str)  # Handle datetime serialization
            )

            logger.debug(f'Cached signal result with TTL {ttl_seconds}s')

        except Exception as error:
            logger.error(f'Redis set error: {error}')

    async def delete(
        self,
        signal_type: str,
        date: datetime,
        params: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Delete cached signal result

        Args:
            signal_type: Signal type identifier
            date: Calculation date
            params: Optional signal parameters
        """
        try:
            redis = await self._get_redis()
            key = self._get_cache_key(signal_type, date, params)
            await redis.delete(key)
        except Exception as error:
            logger.error(f'Redis delete error: {error}')

    async def exists(
        self,
        signal_type: str,
        date: datetime,
        params: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Check if cache key exists

        Args:
            signal_type: Signal type identifier
            date: Calculation date
            params: Optional signal parameters

        Returns:
            True if key exists
        """
        try:
            redis = await self._get_redis()
            key = self._get_cache_key(signal_type, date, params)
            exists_count = await redis.exists(key)
            return exists_count > 0
        except Exception as error:
            logger.error(f'Redis exists error: {error}')
            return False

    async def get_ttl(
        self,
        signal_type: str,
        date: datetime,
        params: Optional[Dict[str, Any]] = None
    ) -> int:
        """
        Get TTL for cached value

        Args:
            signal_type: Signal type identifier
            date: Calculation date
            params: Optional signal parameters

        Returns:
            TTL in seconds (-1 if no expiration, -2 if doesn't exist)
        """
        try:
            redis = await self._get_redis()
            key = self._get_cache_key(signal_type, date, params)
            return await redis.ttl(key)
        except Exception as error:
            logger.error(f'Redis TTL error: {error}')
            return -2

    async def clear_all(self, signal_type: Optional[str] = None) -> int:
        """
        Clear all cached signals (use with caution!)

        Args:
            signal_type: Optional signal type to clear (clears all if not provided)

        Returns:
            Number of keys deleted
        """
        try:
            redis = await self._get_redis()
            pattern = f"signal:{signal_type}:*" if signal_type else "signal:*"
            keys = await redis.keys(pattern)

            if keys:
                deleted = await redis.delete(*keys)
                logger.info(f'Cleared {deleted} cached signals')
                return deleted

            return 0

        except Exception as error:
            logger.error(f'Redis clearAll error: {error}')
            return 0

    async def get_stats(
        self,
        signal_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get cache statistics

        Args:
            signal_type: Optional signal type to get stats for

        Returns:
            Statistics dictionary
        """
        try:
            redis = await self._get_redis()
            pattern = f"signal:{signal_type}:*" if signal_type else "signal:*"
            keys = await redis.keys(pattern)

            return {
                'total_keys': len(keys),
                'signal_type': signal_type,
                'pattern': pattern,
            }

        except Exception as error:
            logger.error(f'Redis getStats error: {error}')
            return {'total_keys': 0, 'signal_type': signal_type}

    def _increment_hit_count(self, key: str) -> None:
        """
        Increment hit count in PostgreSQL (fire and forget)
        Would integrate with Prisma client to update SignalCache table

        Args:
            key: Cache key that was hit
        """
        # Fire and forget - implement with Prisma when integrated
        # await prisma.signal_cache.update(
        #     where={'cacheKey': key},
        #     data={'hitCount': {'increment': 1}}
        # )
        pass


# Export singleton instance
async def get_signal_cache() -> SignalCache:
    """
    Get SignalCache instance (async factory function)

    Returns:
        SignalCache instance
    """
    redis = await RedisClient.get_instance()
    return SignalCache(redis)
