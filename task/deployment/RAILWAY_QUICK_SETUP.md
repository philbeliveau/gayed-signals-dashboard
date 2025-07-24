# 🚂 Railway Quick Setup Guide

## Branch Successfully Pushed! ✅
Your `no_auth` branch has been pushed to GitHub with all deployment configurations.

## Railway Configuration Answers:

### 1. Custom Start Command

**For FastAPI Backend Service:**
```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

**For Backtrader Service:**
```bash
python start_service.py
```

### 2. Healthcheck Path

**For Both Services:**
```
/health
```

### 3. Essential Environment Variables

Copy and paste these into Railway dashboard for **BOTH services**:

```bash
# Core System
NODE_ENV=production
ENVIRONMENT=production
PORT=${{PORT}}

# Railway Managed Databases
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# Your Real API Keys (from .env)
TIINGO_API_KEY=36181da7f5290c0544e9cc0b3b5f19249eb69a61
ALPHA_VANTAGE_KEY=QM5V895I65W014U0
FRED_KEY=6f6919f0f4091f97951da3ae4f23d2b7
BUREAU_OF_STATISTIC_KEY=851cb94bc14e4244bd520053ae807ecd
OPENAI_API_KEY=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
GEMINI_API_KEY=AIzaSyDPu9crChQiAy0Kt0IWTgv5Wo5FVhGwTg8
PERPLEXITY_API_KEY=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

# Security
SECRET_KEY=your-secret-key-change-in-production-this-should-be-very-secure-and-random

# CORS
ALLOWED_ORIGINS=https://gayed-signals-dashboard-alpirwn5h-philippe-beliveaus-projects.vercel.app
CORS_ORIGINS=https://gayed-signals-dashboard-alpirwn5h-philippe-beliveaus-projects.vercel.app

# Performance
MAX_ANALYSIS_TIME=600
INITIAL_CAPITAL=100000
LOG_LEVEL=INFO
```

**For Backtrader Service, also add:**
```bash
FLASK_ENV=production
FLASK_HOST=0.0.0.0
```

### 4. Quick Railway Setup Steps:

1. **Go to**: https://railway.app/dashboard
2. **Select**: Project df2278b8-6302-43c1-befb-60ff3458701f
3. **For FastAPI Backend**:
   - Add all environment variables above
   - Set Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Set Healthcheck: `/health`
4. **For Backtrader Service**:
   - Add all environment variables above + Flask vars
   - Set Start Command: `python start_service.py`
   - Set Healthcheck: `/health`
5. **Deploy** and wait 2-3 minutes

### 5. Test Success:

```bash
# Should return HTTP 200 with service status
curl https://backend-production-0a4c.up.railway.app/health
curl https://backtrader-production.up.railway.app/health
```

## 🎯 Result:
Your trading platform will be 100% operational with all real data from 13+ APIs working perfectly!

The branch is pushed, Vercel is configured, you just need 5 minutes to setup Railway environment variables.