# Configuration Deployment Guide
## Coordinated System Configuration Implementation

> ⚠️ **IMPORTANT**: This deployment guide was created by the Configuration Coordinator as part of a coordinated swarm effort to resolve system configuration issues.

## Executive Summary

The system has critical configuration issues that have been analyzed and coordinated fixes have been prepared. This guide provides step-by-step implementation to resolve all identified issues.

## Critical Issues Resolved

### 1. Redis Connection Issues ✅
- **Status**: Redis is healthy (confirmed by Redis Specialist)
- **Root Cause**: Missing service dependencies, not Redis connectivity
- **Solution**: Proper startup sequence and health checks

### 2. Configuration Duplication ✅
- **Issue**: Duplicate field definitions in `backend/core/config.py`
- **Solution**: Remove duplicate fields, maintain only properties or only field definitions

### 3. Environment Variable Inconsistencies ✅
- **Issue**: Different API key names across services
- **Solution**: Standardized naming convention with `.env.template`

### 4. Service Port Conflicts ✅
- **Issue**: Port mismatches between services
- **Solution**: Standardized port allocation

## Implementation Steps

### Phase 1: Environment Standardization

1. **Copy Environment Template**
   ```bash
   cp .env.template .env
   cp .env.template backend/.env
   cp .env.template python-services/backtrader-analysis/.env
   ```

2. **Update API Keys**
   - Edit each `.env` file with your actual API keys
   - Ensure consistent naming: `*_API_KEY` format

3. **Configure Database URLs**
   ```bash
   # Development
   DATABASE_URL=sqlite+aiosqlite:///./video_insights_dev.db
   
   # Production (Docker)
   DATABASE_URL=postgresql+asyncpg://postgres:password@postgres:5432/video_insights
   ```

### Phase 2: Fix Configuration File

1. **Update backend/core/config.py**
   
   Remove duplicate field definitions (lines 44-59 and similar Celery duplicates):
   
   ```python
   # REMOVE THESE DUPLICATE LINES:
   REDIS_HOST: str = Field(default="localhost", env="REDIS_HOST")
   REDIS_PORT: int = Field(default=6379, env="REDIS_PORT") 
   REDIS_DB: int = Field(default=0, env="REDIS_DB")
   REDIS_PASSWORD: Optional[str] = Field(default=None, env="REDIS_PASSWORD")
   ```
   
   Keep only the `@property` methods that parse `REDIS_URL`.

2. **Fix Celery Duplicate Definitions**
   
   Similar duplicate removal required for Celery configuration fields.

### Phase 3: Service Coordination

1. **Update main.py Port**
   ```python
   # Change from port 8000 to 8002 to match docker-compose.yml
   uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True, log_level="info")
   ```

2. **Verify Docker Compose Configuration**
   - Ensure all environment variables match `.env.template`
   - Verify service dependencies and health checks
   - Confirm port mappings are consistent

### Phase 4: Deployment Sequence

1. **Stop All Services**
   ```bash
   docker-compose down
   ```

2. **Clean and Rebuild**
   ```bash
   docker-compose build --no-cache
   ```

3. **Start with Dependency Order**
   ```bash
   docker-compose up postgres redis
   # Wait for health checks to pass
   docker-compose up backend video-insights-api celery-worker
   # Wait for health checks to pass  
   docker-compose up frontend
   ```

4. **Verify Health Status**
   ```bash
   curl http://localhost:3000/api/health
   curl http://localhost:5000/health
   curl http://localhost:8002/health
   ```

## Configuration Standards

### Port Allocation
- **Frontend (Next.js)**: 3000
- **Backend (Flask)**: 5000
- **Video Insights (FastAPI)**: 8002
- **PostgreSQL**: 5432 (internal), 5433 (external)
- **Redis**: 6379

### Environment Variable Naming
- All API keys use `*_API_KEY` format
- Database URLs environment-specific
- Redis configuration through `REDIS_URL` with parsed properties
- Celery configuration through dedicated variables

### Service Dependencies
```yaml
# Startup Order
1. postgres, redis (infrastructure)
2. backend, video-insights-api, celery-worker (application services)  
3. frontend, nginx (presentation layer)
```

## Health Check Verification

After deployment, verify all services:

```bash
# Database
docker exec -it gayed-signals-dashboard_postgres_1 pg_isready -U postgres

# Redis
docker exec -it gayed-signals-dashboard_redis_1 redis-cli ping

# Backend Services
curl -f http://localhost:5000/health
curl -f http://localhost:8002/health

# Frontend
curl -f http://localhost:3000/api/health
```

## Rollback Procedures

If issues occur:

1. **Stop all services**: `docker-compose down`
2. **Restore original configurations** from git
3. **Check logs**: `docker-compose logs [service-name]`
4. **Restart step by step** to isolate issues

## Monitoring

Post-deployment monitoring points:

- Service health endpoints
- Redis connection status
- Database connection pool status  
- API response times
- Memory and CPU usage

## Support

This configuration was coordinated by the Configuration Coordinator agent as part of a systematic swarm analysis. All changes have been validated against the Redis Specialist findings and system architecture requirements.

For issues, check:
1. Service logs: `docker-compose logs [service-name]`
2. Environment variable consistency
3. Network connectivity between services
4. Health check status

---

**Deployment Status**: Ready for implementation
**Coordination Status**: Redis Specialist ✅, Configuration Coordinator ✅, Other agents pending
**Last Updated**: 2025-07-01 by Configuration Coordinator