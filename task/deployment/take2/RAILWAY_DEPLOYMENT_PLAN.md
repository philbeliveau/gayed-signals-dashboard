# Railway Deployment Plan - Gayed Signals Platform

## Overview
Railway deployment strategy for the Gayed Signals Trading Platform using their PostgreSQL and Redis services with Docker-based deployments.

## Architecture on Railway

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   FastAPI       │    │   Backtrader    │
│   (Next.js)     │    │   Backend       │    │   Service       │
│   Port: 3000    │────│   Port: 8000    │────│   Port: 5000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                ┌─────────────────┴─────────────────┐
                │                                   │
        ┌───────▼────────┐                ┌────────▼────────┐
        │   PostgreSQL   │                │     Redis       │
        │  (Railway DB)  │                │ (Railway Redis) │
        └────────────────┘                └─────────────────┘
```

## Service Configuration

### 1. PostgreSQL Database Service
```yaml
Service: gayed-signals-postgres
Type: PostgreSQL
Version: 15
Resources:
  - CPU: 1 vCPU
  - RAM: 1GB
  - Storage: 10GB SSD
Environment:
  - POSTGRES_DB: gayed_signals
  - POSTGRES_USER: postgres
  - CONNECTION_POOLING: enabled
```

### 2. Redis Cache Service
```yaml
Service: gayed-signals-redis
Type: Redis
Version: 7
Resources:
  - CPU: 0.5 vCPU
  - RAM: 512MB
Configuration:
  - maxmemory-policy: allkeys-lru
  - persistence: enabled
```

### 3. FastAPI Backend Service
```yaml
Service: gayed-signals-backend
Build:
  - Context: ./backend
  - Dockerfile: backend/Dockerfile
Environment Variables:
  - PORT: $PORT (Railway managed)
  - DATABASE_URL: $DATABASE_URL (Railway managed)
  - REDIS_URL: $REDIS_URL (Railway managed)
  - SECRET_KEY: [SECURE_RANDOM_VALUE]
  - OPENAI_API_KEY: [YOUR_KEY]
  - TIINGO_API_KEY: [YOUR_KEY]
  - ALPHA_VANTAGE_KEY: [YOUR_KEY]
  - FRED_KEY: [YOUR_KEY]
  - ENVIRONMENT: production
  - ALLOWED_ORIGINS: https://your-frontend-domain.railway.app
```

### 4. Backtrader Service
```yaml
Service: gayed-signals-backtrader
Build:
  - Context: ./python-services/backtrader-analysis
  - Dockerfile: python-services/backtrader-analysis/Dockerfile
Environment Variables:
  - PORT: $PORT (Railway managed)
  - FLASK_ENV: production
  - TIINGO_API_KEY: [YOUR_KEY]
  - ALPHA_VANTAGE_KEY: [YOUR_KEY]
  - FRED_KEY: [YOUR_KEY]
```

### 5. Frontend Service
```yaml
Service: gayed-signals-frontend
Build:
  - Context: .
  - Dockerfile: Dockerfile.frontend
Environment Variables:
  - PORT: $PORT (Railway managed)
  - NODE_ENV: production
  - PYTHON_SERVICE_URL: https://gayed-signals-backtrader.railway.app
  - FASTAPI_BASE_URL: https://gayed-signals-backend.railway.app
  - TIINGO_API_KEY: [YOUR_KEY]
  - ALPHA_VANTAGE_KEY: [YOUR_KEY]
  - FRED_KEY: [YOUR_KEY]
```

## Step-by-Step Deployment Process

### Phase 1: Infrastructure Setup (15 minutes)

1. **Create Railway Project**
   ```bash
   railway login
   railway new gayed-signals-platform
   cd gayed-signals-dashboard
   railway link
   ```

2. **Add PostgreSQL Database**
   ```bash
   railway add postgresql
   # Railway automatically provides DATABASE_URL
   ```

3. **Add Redis Service**
   ```bash
   railway add redis
   # Railway automatically provides REDIS_URL
   ```

### Phase 2: Backend Services Deployment (20 minutes)

4. **Deploy FastAPI Backend**
   ```bash
   # Create service for backend
   railway service create gayed-backend
   
   # Set environment variables
   railway variables set SECRET_KEY="$(openssl rand -base64 32)"
   railway variables set ENVIRONMENT=production
   railway variables set TIINGO_API_KEY="your_tiingo_key"
   railway variables set ALPHA_VANTAGE_KEY="your_alpha_vantage_key"
   railway variables set FRED_KEY="your_fred_key"
   railway variables set OPENAI_API_KEY="your_openai_key"
   
   # Deploy from backend directory
   railway up --service gayed-backend --dockerfile backend/Dockerfile
   ```

5. **Deploy Backtrader Service**
   ```bash
   # Create service for backtrader
   railway service create gayed-backtrader
   
   # Set environment variables
   railway variables set FLASK_ENV=production
   railway variables set TIINGO_API_KEY="your_tiingo_key"
   railway variables set ALPHA_VANTAGE_KEY="your_alpha_vantage_key"
   railway variables set FRED_KEY="your_fred_key"
   
   # Deploy from backtrader directory
   railway up --service gayed-backtrader --dockerfile python-services/backtrader-analysis/Dockerfile
   ```

### Phase 3: Frontend Deployment (10 minutes)

6. **Deploy Next.js Frontend**
   ```bash
   # Create service for frontend
   railway service create gayed-frontend
   
   # Set environment variables
   railway variables set NODE_ENV=production
   railway variables set PYTHON_SERVICE_URL="https://gayed-backtrader.railway.app"
   railway variables set FASTAPI_BASE_URL="https://gayed-backend.railway.app"
   railway variables set TIINGO_API_KEY="your_tiingo_key"
   railway variables set ALPHA_VANTAGE_KEY="your_alpha_vantage_key"
   railway variables set FRED_KEY="your_fred_key"
   
   # Deploy frontend
   railway up --service gayed-frontend --dockerfile Dockerfile.frontend
   ```

### Phase 4: Configuration & Testing (15 minutes)

7. **Update CORS Settings**
   ```bash
   # Update backend CORS to include frontend URL
   railway variables set ALLOWED_ORIGINS="https://gayed-frontend.railway.app"
   ```

8. **Database Migration**
   ```bash
   # Connect to backend service and run migrations
   railway shell gayed-backend
   python -c "
   from core.database import create_db_and_tables
   import asyncio
   asyncio.run(create_db_and_tables())
   "
   ```

9. **Health Checks**
   ```bash
   # Test each service
   curl https://gayed-backend.railway.app/health
   curl https://gayed-backtrader.railway.app/health
   curl https://gayed-frontend.railway.app/api/health
   ```

## Environment Variables Template

Create `.env.railway` with the following:

```bash
# Database (automatically provided by Railway)
DATABASE_URL=${DATABASE_URL}
REDIS_URL=${REDIS_URL}

# Security
SECRET_KEY=your-secure-random-secret-key-here
JWT_SECRET=your-jwt-secret-key-here

# API Keys (required)
TIINGO_API_KEY=your_tiingo_api_key
ALPHA_VANTAGE_KEY=your_alpha_vantage_key
FRED_KEY=your_fred_api_key
BUREAU_OF_STATISTIC_KEY=your_bls_api_key

# AI APIs (optional)
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Environment
NODE_ENV=production
ENVIRONMENT=production
FLASK_ENV=production

# Service URLs (Railway manages these)
FASTAPI_BASE_URL=https://gayed-backend.railway.app
PYTHON_SERVICE_URL=https://gayed-backtrader.railway.app

# CORS
ALLOWED_ORIGINS=https://gayed-frontend.railway.app
```

## Performance Optimizations

### Database Configuration
```sql
-- Optimize PostgreSQL for Railway
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET max_connections = 100;
```

### Redis Configuration
```conf
# Redis optimizations for Railway
maxmemory 512mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### Application Settings
```python
# FastAPI production settings
DB_POOL_SIZE = 10
DB_MAX_OVERFLOW = 20
REDIS_POOL_SIZE = 50
WORKER_CONCURRENCY = 2
```

## Monitoring & Logging

### Railway Metrics
- **Database**: Connection count, query performance
- **Redis**: Memory usage, hit rate
- **Applications**: CPU, memory, response times

### Application Monitoring
```python
# Health check endpoints
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database": await check_db_connection(),
        "redis": await check_redis_connection(),
        "services": await check_external_apis()
    }
```

## Scaling Strategy

### Horizontal Scaling
```yaml
# Railway auto-scaling configuration
Resources:
  Backend:
    min_instances: 1
    max_instances: 3
    cpu_threshold: 70%
  
  Backtrader:
    min_instances: 1
    max_instances: 2
    cpu_threshold: 80%
```

### Database Scaling
- **Read Replicas**: For heavy analytical queries
- **Connection Pooling**: PgBouncer for connection management
- **Query Optimization**: Proper indexing and query analysis

## Security Checklist

✅ **Secrets Management**: Use Railway's environment variables
✅ **Database Security**: SSL connections, proper user roles
✅ **Network Security**: Private networking between services
✅ **API Security**: Rate limiting, authentication, CORS
✅ **Monitoring**: Error tracking, performance monitoring

## Cost Estimation

### Railway Pricing (Monthly)
- **PostgreSQL**: ~$10-20 (depending on usage)
- **Redis**: ~$5-10 (512MB instance)
- **Backend Service**: ~$5-15 (based on compute)
- **Backtrader Service**: ~$5-10 (based on compute)
- **Frontend Service**: ~$5-10 (based on compute)

**Total Estimated Cost**: $30-65/month

## Rollback Strategy

### Quick Rollback
```bash
# Rollback to previous deployment
railway deployment rollback --service gayed-backend
railway deployment rollback --service gayed-frontend
railway deployment rollback --service gayed-backtrader
```

### Database Backup
```bash
# Create backup before major changes
railway backup create --service postgresql
```

## Post-Deployment Testing

### Functional Tests
1. **Authentication**: User registration and login
2. **Signal Generation**: Verify all 5 Gayed signals calculate correctly
3. **Data Sources**: Confirm real market data integration
4. **Chart Generation**: Test backtrader analysis service
5. **Performance**: Load testing with realistic traffic

### Monitoring Setup
1. **Application Performance Monitoring**
2. **Database Query Monitoring**
3. **Error Rate Tracking**
4. **API Response Time Monitoring**

## Success Criteria

✅ **All services healthy and responding**
✅ **Database connections stable**
✅ **Real market data flowing correctly**
✅ **Signal calculations producing accurate results**
✅ **Frontend loading under 3 seconds**
✅ **API responses under 500ms**
✅ **Zero critical security vulnerabilities**

This Railway deployment plan provides a robust, scalable, and secure deployment for your Gayed Signals Trading Platform.