# Railway Configuration Settings

## 🚂 Railway Custom Start Commands

### For FastAPI Backend Service:
```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

### For Backtrader Service:
```bash
python start_service.py
```

### For Frontend Service (if deploying to Railway):
```bash
npm run build && npm start
```

## 🏥 Railway Healthcheck Paths

### For FastAPI Backend Service:
```
/health
```

### For Backtrader Service:
```
/health
```

### For Frontend Service:
```
/api/health
```

## ⚙️ Required Environment Variables for Railway

### FastAPI Backend Service:
```bash
# System Configuration
NODE_ENV=production
ENVIRONMENT=production
PORT=${{PORT}}

# Database URLs (Railway Managed)
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# Financial APIs (Real Keys from .env)
TIINGO_API_KEY=36181da7f5290c0544e9cc0b3b5f19249eb69a61
ALPHA_VANTAGE_KEY=QM5V895I65W014U0
FRED_KEY=6f6919f0f4091f97951da3ae4f23d2b7
BUREAU_OF_STATISTIC_KEY=851cb94bc14e4244bd520053ae807ecd

# AI Services
OPENAI_API_KEY=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
ANTHROPIC_API_KEY=sk-ant-api03-insert-your-anthropic-api-key-here
GEMINI_API_KEY=AIzaSyDPu9crChQiAy0Kt0IWTgv5Wo5FVhGwTg8

# Additional APIs
PERPLEXITY_API_KEY=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
SUPABASE_API_KEY=sbp_065f9d8dd7dfc1ab875e5b74a024681f95592e13
QDRANT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.lNRZCTMgkA_eECMX_gxQRP-1igK0opqjycleuZeweYk
PUBMED_API_KEY=5bbdf2d3c53a2407ba877438d91233b50808
GNEWS_API_KEY=f3bcc0dbf138d69e9417dd8126593d63
REDDIT_API_KEY=QKL31gqJ6m4_tO1gINaI1uPglwMJmA

# Security
SECRET_KEY=your-secret-key-change-in-production-this-should-be-very-secure-and-random
JWT_SECRET_KEY=jwt-railway-production-2025

# CORS
ALLOWED_ORIGINS=https://gayed-signals-dashboard-alpirwn5h-philippe-beliveaus-projects.vercel.app
CORS_ORIGINS=https://gayed-signals-dashboard-alpirwn5h-philippe-beliveaus-projects.vercel.app

# Celery
CELERY_BROKER_URL=${{Redis.REDIS_URL}}/1
CELERY_RESULT_BACKEND=${{Redis.REDIS_URL}}/1

# Performance
MAX_ANALYSIS_TIME=600
INITIAL_CAPITAL=100000
LOG_LEVEL=INFO
```

### Backtrader Service:
```bash
# System Configuration
FLASK_ENV=production
FLASK_HOST=0.0.0.0
PORT=${{PORT}}

# Database URLs (Railway Managed)
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# Financial APIs (Same as FastAPI)
TIINGO_API_KEY=36181da7f5290c0544e9cc0b3b5f19249eb69a61
ALPHA_VANTAGE_KEY=QM5V895I65W014U0
FRED_KEY=6f6919f0f4091f97951da3ae4f23d2b7
BUREAU_OF_STATISTIC_KEY=851cb94bc14e4244bd520053ae807ecd

# AI Services
OPENAI_API_KEY=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

# Security
SECRET_KEY=your-secret-key-change-in-production-this-should-be-very-secure-and-random

# Flask Configuration
MAX_ANALYSIS_TIME=600
INITIAL_CAPITAL=100000
LOG_LEVEL=INFO

# CORS
CORS_ORIGINS=https://gayed-signals-dashboard-alpirwn5h-philippe-beliveaus-projects.vercel.app
```

## 🚀 Railway Deployment Configuration

Your `railway.json` file is already configured with:

```json
{
  "version": "1",
  "services": {
    "fastapi-backend": {
      "source": "./backend",
      "builder": "dockerfile",
      "healthcheck": {
        "path": "/health",
        "timeout": 30,
        "interval": 60
      }
    },
    "backtrader-service": {
      "source": "./python-services/backtrader-analysis", 
      "builder": "dockerfile",
      "healthcheck": {
        "path": "/health",
        "timeout": 30,
        "interval": 60
      }
    }
  }
}
```

## 📝 Quick Setup Instructions

1. **Go to Railway Dashboard**: https://railway.app/dashboard
2. **Select Project**: df2278b8-6302-43c1-befb-60ff3458701f
3. **For each service**, add the environment variables above
4. **Set Custom Start Command** (if needed):
   - FastAPI: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Backtrader: `python start_service.py`
5. **Set Healthcheck Path**: `/health` for both services

## ✅ Expected Results

Once configured:
- FastAPI Backend: https://backend-production-0a4c.up.railway.app/health → HTTP 200
- Backtrader Service: https://backtrader-production.up.railway.app/health → HTTP 200

Your trading platform will be 100% operational with all real API keys working!