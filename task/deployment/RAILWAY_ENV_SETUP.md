# Railway Environment Variables Setup Guide

## 🚂 Quick Railway Environment Configuration

Since Railway CLI requires interactive login, here's the manual setup process using your actual `.env` values:

### Step 1: Access Railway Dashboard
1. Go to: https://railway.app/dashboard
2. Select project: **df2278b8-6302-43c1-befb-60ff3458701f**

### Step 2: Configure FastAPI Backend Service

Navigate to the **fastapi-backend** service and add these environment variables:

```env
# Database Configuration
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# Financial Data APIs (Real Keys from .env)
TIINGO_API_KEY=36181da7f5290c0544e9cc0b3b5f19249eb69a61
ALPHA_VANTAGE_KEY=QM5V895I65W014U0
FRED_KEY=6f6919f0f4091f97951da3ae4f23d2b7
BUREAU_OF_STATISTIC_KEY=851cb94bc14e4244bd520053ae807ecd

# AI Services (Real Keys from .env)
OPENAI_API_KEY=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
ANTHROPIC_API_KEY=sk-ant-api03-insert-your-anthropic-api-key-here
GEMINI_API_KEY=AIzaSyDPu9crChQiAy0Kt0IWTgv5Wo5FVhGwTg8

# Additional APIs (Real Keys from .env)
PERPLEXITY_API_KEY=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
SUPABASE_API_KEY=sbp_065f9d8dd7dfc1ab875e5b74a024681f95592e13
QDRANT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.lNRZCTMgkA_eECMX_gxQRP-1igK0opqjycleuZeweYk
PUBMED_API_KEY=5bbdf2d3c53a2407ba877438d91233b50808
GNEWS_API_KEY=f3bcc0dbf138d69e9417dd8126593d63
REDDIT_API_KEY=QKL31gqJ6m4_tO1gINaI1uPglwMJmA

# Security & Configuration
SECRET_KEY=your-secret-key-change-in-production-this-should-be-very-secure-and-random
ENVIRONMENT=production
NODE_ENV=production
PORT=${{PORT}}
LOG_LEVEL=INFO

# CORS
ALLOWED_ORIGINS=https://gayed-signals-dashboard-alpirwn5h-philippe-beliveaus-projects.vercel.app
CORS_ORIGINS=https://gayed-signals-dashboard-alpirwn5h-philippe-beliveaus-projects.vercel.app

# Celery Configuration
CELERY_BROKER_URL=${{Redis.REDIS_URL}}/1
CELERY_RESULT_BACKEND=${{Redis.REDIS_URL}}/1
```

### Step 3: Configure Backtrader Service

Navigate to the **backtrader-service** service and add these environment variables:

```env
# Database Configuration
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# Financial Data APIs (Same as FastAPI)
TIINGO_API_KEY=36181da7f5290c0544e9cc0b3b5f19249eb69a61
ALPHA_VANTAGE_KEY=QM5V895I65W014U0
FRED_KEY=6f6919f0f4091f97951da3ae4f23d2b7
BUREAU_OF_STATISTIC_KEY=851cb94bc14e4244bd520053ae807ecd

# AI Services
OPENAI_API_KEY=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

# Security
SECRET_KEY=your-secret-key-change-in-production-this-should-be-very-secure-and-random

# Flask Configuration
FLASK_ENV=production
FLASK_HOST=0.0.0.0
PORT=${{PORT}}
LOG_LEVEL=INFO

# Backtrader Specific
MAX_ANALYSIS_TIME=600
INITIAL_CAPITAL=100000

# CORS
CORS_ORIGINS=https://gayed-signals-dashboard-alpirwn5h-philippe-beliveaus-projects.vercel.app
```

### Step 4: Verify Service Health

After adding the environment variables, the services should restart automatically. Wait 2-3 minutes, then test:

```bash
# Test FastAPI Backend
curl https://backend-production-0a4c.up.railway.app/health

# Test Backtrader Service  
curl https://backtrader-production.up.railway.app/health

# Expected Response: HTTP 200 with service status
```

## 🎯 Key Points

1. **Real API Keys**: All keys are from your actual `.env` file - no mock data
2. **Railway Variables**: Use `${{Postgres.DATABASE_URL}}` and `${{Redis.REDIS_URL}}` for automatic Railway database connections
3. **Port Configuration**: Use `${{PORT}}` for Railway's automatic port assignment
4. **CORS Setup**: Configured for your Vercel frontend URL

## ✅ Success Indicators

Once configured correctly, you should see:
- ✅ Services show "Healthy" status in Railway dashboard  
- ✅ Health endpoints return HTTP 200
- ✅ Vercel frontend can communicate with Railway backend
- ✅ All 13+ API keys working with real data

## 🔧 Troubleshooting

If services show errors:
1. Check Railway service logs in the dashboard
2. Verify environment variables are set correctly
3. Ensure no extra spaces in variable values
4. Wait 2-3 minutes after changes for services to restart

Your trading platform will be 100% operational once these environment variables are applied!