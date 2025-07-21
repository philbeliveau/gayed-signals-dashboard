# 🚀 Deployment Guide - Gayed Signals Dashboard

## Overview

This guide covers deploying the Gayed Signals Dashboard across multiple platforms with proper configuration management.

## 📋 Quick Start

### 1. Environment Files Created

- `.env.production` - General production configuration
- `.env.vercel` - Vercel-specific optimizations
- `.env.railway` - Railway-specific configuration
- `.env.example` - Template for developers
- `vercel.json` - Vercel deployment configuration
- `railway.json` - Railway deployment configuration

### 2. Platform-Specific Deployment

## 🔧 Vercel Deployment

### Setup Steps

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Connect Repository**
   ```bash
   vercel link
   ```

3. **Set Environment Variables**
   Go to Vercel Dashboard > Project > Settings > Environment Variables

   **Required Variables:**
   ```
   TIINGO_API_KEY=your_tiingo_key
   ALPHA_VANTAGE_KEY=your_alpha_vantage_key
   FRED_KEY=your_fred_key
   BUREAU_OF_STATISTIC_KEY=your_bls_key
   OPENAI_API_KEY=your_openai_key
   SECRET_KEY=your_secret_key
   DATABASE_URL=your_database_url
   REDIS_URL=your_redis_url
   ```

4. **Deploy**
   ```bash
   vercel --prod
   ```

### Vercel-Specific Configuration

- **Serverless functions** have 30-second timeout limit
- **Chart generation** should use external services
- **Database** should be external (PlanetScale, Supabase)
- **Redis** should be external (Upstash, Redis Cloud)

### Backend Services

Since Vercel only hosts frontend, deploy backends separately:

1. **Python Backend** → Railway/Render
2. **FastAPI Backend** → Railway/Render
3. **Database** → Railway/Supabase/PlanetScale
4. **Redis** → Upstash/Redis Cloud

## 🚄 Railway Deployment

### Setup Steps

1. **Install Railway CLI**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login and Connect**
   ```bash
   railway login
   railway link
   ```

3. **Set Environment Variables**
   ```bash
   railway variables set TIINGO_API_KEY=your_key
   railway variables set DATABASE_URL=postgresql://...
   # ... add all required variables
   ```

4. **Deploy Services**
   ```bash
   # Deploy all services
   railway up
   ```

### Railway Services Architecture

Railway can host all services in one project:

1. **Frontend Service** (Next.js)
2. **Python Backend Service** (Flask/Backtrader)
3. **FastAPI Backend Service** (Video Insights)
4. **PostgreSQL Database** (Managed)
5. **Redis Cache** (Managed)

### Railway Configuration

The `railway.json` configures:
- Multi-service deployment
- Internal networking
- Health checks
- Auto-scaling
- Volume persistence

## 🔑 Environment Variables by Platform

### Financial Data APIs (Required)
```bash
TIINGO_API_KEY=36181da7f5290c0544e9cc0b3b5f19249eb69a61
ALPHA_VANTAGE_KEY=QM5V895I65W014U0
FRED_KEY=6f6919f0f4091f97951da3ae4f23d2b7
BUREAU_OF_STATISTIC_KEY=851cb94bc14e4244bd520053ae807ecd
```

### AI Processing APIs (Required)
```bash
OPENAI_API_KEY=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
ANTHROPIC_API_KEY=your_anthropic_key
GEMINI_API_KEY=AIzaSyDPu9crChQiAy0Kt0IWTgv5Wo5FVhGwTg8
```

### Additional APIs (Optional)
```bash
GNEWS_API_KEY=f3bcc0dbf138d69e9417dd8126593d63
PUBMED_API_KEY=5bbdf2d3c53a2407ba877438d91233b50808
PERPLEXITY_API_KEY=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
REDDIT_API_KEY=QKL31gqJ6m4_tO1gINaI1uPglwMJmA
QDRANT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.lNRZCTMgkA_eECMX_gxQRP-1igK0opqjycleuZeweYk
```

## 🔧 Database Configuration

### Development
```bash
DATABASE_URL=sqlite+aiosqlite:///./video_insights.db
```

### Production (PostgreSQL)
```bash
# Railway
DATABASE_URL=postgresql://username:password@host:port/database

# Supabase
DATABASE_URL=postgresql://postgres:password@host:5432/postgres

# PlanetScale
DATABASE_URL=mysql://username:password@host/database?sslaccept=strict
```

### Redis Configuration
```bash
# Development
REDIS_URL=redis://localhost:6379/0

# Production - Upstash
REDIS_URL=redis://username:password@host:port

# Railway Redis
REDIS_URL=redis://default:password@redis.railway.internal:6379
```

## 🛡️ Security Configuration

### JWT and Secrets
```bash
# Generate strong random keys for production
SECRET_KEY=your-very-secure-secret-key-minimum-32-characters
JWT_SECRET=your-jwt-secret-key-different-from-secret-key
```

### CORS Configuration
```bash
# Development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Production - Vercel
ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-custom-domain.com

# Production - Railway
ALLOWED_ORIGINS=https://your-app.up.railway.app,https://your-custom-domain.com
```

## 📊 Performance Optimization

### Vercel (Serverless)
```bash
MAX_ANALYSIS_TIME=25  # Reduced for serverless limits
DATA_CACHE_SIZE=100   # Memory constraints
MAX_DATA_POINTS=5000  # Faster responses
ENABLE_CHART_GENERATION=false  # Use external service
```

### Railway (Containers)
```bash
MAX_ANALYSIS_TIME=600  # Full analysis time
DATA_CACHE_SIZE=500    # More memory available
MAX_DATA_POINTS=50000  # Full dataset processing
ENABLE_CHART_GENERATION=true  # Full chart support
```

## 🏗️ Service Architecture

### Microservices Setup

1. **Frontend Service** (Next.js)
   - User interface
   - Authentication
   - API routing
   - Static assets

2. **Python Backend** (Flask/Backtrader)
   - Financial analysis
   - Chart generation
   - Signal processing
   - Data validation

3. **FastAPI Backend** (Video Insights)
   - Video processing
   - AI integration
   - Async operations
   - Celery tasks

4. **Database Services**
   - PostgreSQL (primary data)
   - Redis (cache + queues)
   - File storage (charts, videos)

## 🔗 Service Communication

### Internal URLs

**Railway Internal Networking:**
```bash
PYTHON_SERVICE_URL=http://python-backend.railway.internal:5000
FASTAPI_BASE_URL=http://fastapi-backend.railway.internal:8002
```

**External Communication (Vercel):**
```bash
PYTHON_SERVICE_URL=https://your-python-backend.railway.app
FASTAPI_BASE_URL=https://your-fastapi-backend.railway.app
```

## 📈 Monitoring and Health Checks

### Health Check Endpoints
- Frontend: `/api/health`
- Python Backend: `/health`
- FastAPI Backend: `/health`

### Monitoring Configuration
```bash
METRICS_ENABLED=true
HEALTH_CHECK_ENABLED=true
PERFORMANCE_MONITORING_ENABLED=true
RAILWAY_OBSERVABILITY=true  # Railway only
VERCEL_ANALYTICS=true       # Vercel only
```

## 🚨 Troubleshooting

### Common Issues

1. **API Key Errors**
   - Verify all keys are set in platform environment
   - Check key formatting and validity
   - Ensure no quotes around values in platform UI

2. **Database Connection Issues**
   - Verify DATABASE_URL format
   - Check network connectivity
   - Validate credentials

3. **CORS Errors**
   - Update ALLOWED_ORIGINS with correct URLs
   - Include both www and non-www versions
   - Check protocol (http vs https)

4. **Service Communication**
   - Verify internal networking (Railway)
   - Check external URLs (Vercel)
   - Validate port configurations

### Platform-Specific Debugging

**Vercel:**
```bash
vercel logs
vercel env ls
```

**Railway:**
```bash
railway logs
railway variables
railway status
```

## 🔄 CI/CD Configuration

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [PostgreSQL Setup](https://www.postgresql.org/docs/)
- [Redis Configuration](https://redis.io/documentation)

## ✅ Deployment Checklist

- [ ] All API keys configured in platform
- [ ] Database URL set correctly
- [ ] Redis URL configured
- [ ] CORS origins updated for production
- [ ] Secret keys generated and set
- [ ] Health checks working
- [ ] Service communication verified
- [ ] Performance monitoring enabled
- [ ] Error tracking configured
- [ ] Backup strategy implemented

## 🆘 Support

If you encounter issues during deployment:
1. Check the troubleshooting section
2. Verify all environment variables
3. Review platform-specific logs
4. Test individual services
5. Validate API key permissions

Remember: All sensitive data must stay real - no mocking or cutting corners in production!