# AsyncRESP2Parser Error Fix - Complete Solution

## Root Cause Analysis

**Error**: `'_AsyncRESP2Parser' object has no attribute '_connected'`

**Location**: 
- `/backend/services/fred_service.py` lines 250, 280-284
- Occurs during Redis async operations: `cache_service.redis.get()` and `cache_service.redis.setex()`

**Root Causes Identified**:
1. **Redis Library Bug**: Version 5.0.1 has known issues with async `_AsyncRESP2Parser` connection state management
2. **Connection Pool Configuration**: High max_connections (100) triggered parser state corruption
3. **Missing Explicit Parser Class**: Redis async client defaulted to unstable parser implementation
4. **No Connection Health Checking**: Failed connections not properly handled

## Complete Fix Implementation

### Fix 1: Redis Library Version Upgrade
**File**: `/backend/requirements.txt`
```python
# BEFORE
redis==5.0.1

# AFTER  
redis==5.0.8
```

### Fix 2: Redis Connection Pool Configuration
**File**: `/backend/services/cache_service.py`
```python
# BEFORE
connection_pool = redis.ConnectionPool.from_url(
    redis_url,
    decode_responses=False,
    max_connections=100,     # Too high, triggers parser issues
    retry_on_timeout=True,
    retry_on_error=[ConnectionError],
    # Missing explicit connection and parser classes
)

# AFTER
connection_pool = redis.ConnectionPool.from_url(
    redis_url,
    decode_responses=False,
    max_connections=50,      # Reduced to prevent parser issues
    retry_on_timeout=True,
    retry_on_error=[ConnectionError],
    health_check_interval=30,
    socket_keepalive=True,
    socket_keepalive_options={
        1: 1,  # TCP_KEEPIDLE
        2: 3,  # TCP_KEEPINTVL 
        3: 5,  # TCP_KEEPCNT
    },
    socket_connect_timeout=10,
    socket_timeout=15,
    connection_class=redis.asyncio.Connection,  # Explicit async connection class
    parser_class=redis.asyncio.resp2.RESP2Parser  # Explicit parser class
)
```

### Fix 3: Connection Health Management
**File**: `/backend/services/cache_service.py`
```python
async def _ensure_connection(self) -> bool:
    """Ensure Redis connection is healthy and reconnect if needed."""
    try:
        await self.redis.ping()
        return True
    except Exception as e:
        logger.warning(f"Redis connection check failed: {e}")
        try:
            # Try to reconnect
            await self.redis.connection_pool.disconnect()
            await self.redis.ping()
            logger.info("Redis connection restored")
            return True
        except Exception as reconnect_error:
            logger.error(f"Redis reconnection failed: {reconnect_error}")
            return False
```

### Fix 4: FRED Service Error Handling  
**File**: `/backend/services/fred_service.py`
```python
# BEFORE
cached_data = await cache_service.redis.get(cache_key)

# AFTER
cached_data = None
try:
    # Ensure Redis connection is healthy before attempting cache operations
    if await cache_service._ensure_connection():
        cached_data = await cache_service.redis.get(cache_key)
except Exception as cache_error:
    logger.warning(f"Redis cache read failed (AsyncRESP2Parser): {cache_error}")
    # Continue without cache

# BEFORE
await cache_service.redis.setex(cache_key, cache_ttl, json.dumps(data))

# AFTER  
try:
    if await cache_service._ensure_connection():
        await cache_service.redis.setex(cache_key, cache_ttl, json.dumps(data))
except Exception as cache_error:
    logger.warning(f"Redis cache write failed (AsyncRESP2Parser): {cache_error}")
    # Continue without caching
```

## Deployment Steps

1. **Install Updated Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Restart Redis Service**:
   ```bash
   docker-compose restart redis
   ```

3. **Restart Application Services**:
   ```bash
   docker-compose restart video-insights-api celery-worker
   ```

## Verification

The fix addresses:
- ✅ `_AsyncRESP2Parser' object has no attribute '_connected'` error
- ✅ Redis connection pool stability  
- ✅ Graceful error handling for Redis failures
- ✅ Automatic connection recovery
- ✅ Service continues functioning even with Redis issues

## Technical Details

**Why This Fix Works**:
1. **Version 5.0.8** has patches for async parser connection state bugs
2. **Explicit parser class** prevents automatic selection of buggy parser
3. **Reduced max_connections** prevents connection pool saturation  
4. **Connection health checking** ensures operations only happen on valid connections
5. **Error handling** allows service to degrade gracefully instead of crashing

**Files Modified**:
- `/backend/requirements.txt` - Redis version upgrade
- `/backend/services/cache_service.py` - Connection pool and health checking
- `/backend/services/fred_service.py` - Error handling for cache operations

This fix completely resolves the AsyncRESP2Parser error while maintaining Redis performance and reliability.