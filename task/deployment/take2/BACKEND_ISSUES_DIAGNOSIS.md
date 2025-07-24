# Backend Deployment Issues - Diagnosis & Fix

## 🚨 Current Problem

Your Railway backend services are deployed but returning **502 Bad Gateway** errors:

- **FastAPI Backend**: https://backend-production-0a4c.up.railway.app/health → 502 Error
- **Backtrader Service**: https://backtrader-production.up.railway.app/health → 502 Error

## 🔍 Root Cause Analysis

Based on the configuration files and deployment status, the most likely issues are:

### 1. **Missing Environment Variables**
The Railway services are likely failing to start due to missing required environment variables:

#### FastAPI Backend Missing:
```bash
DATABASE_URL=postgresql://...     # Required for database connection
REDIS_URL=redis://...            # Required for caching
SECRET_KEY=...                   # Required for JWT
TIINGO_API_KEY=...              # Required for market data
ALPHA_VANTAGE_KEY=...           # Required for market data
FRED_KEY=...                    # Required for economic data
```

#### Backtrader Service Missing:
```bash
TIINGO_API_KEY=...              # Required for market data
ALPHA_VANTAGE_KEY=...           # Required for market data
FRED_KEY=...                    # Required for economic data
FLASK_ENV=production            # Required for proper startup
```

### 2. **Database Connection Issues**
The FastAPI service requires PostgreSQL but may not have:
- Database service properly connected
- Database URL environment variable set
- Database schema initialized

### 3. **Port Configuration Issues**
Railway expects services to bind to `$PORT` but the services might be:
- Hardcoded to specific ports
- Not reading the PORT environment variable correctly

## 🛠️ Immediate Fix Strategy

### Step 1: Add Missing Environment Variables to Railway

1. **Access Railway Dashboard**: https://railway.app/dashboard
2. **Find your project** (likely named after your repo)
3. **For each service** (backend and backtrader), add these variables:

#### FastAPI Backend Service Variables:
```bash
# Database & Cache
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# Security
SECRET_KEY=your-super-secure-32-char-random-string
JWT_SECRET=your-jwt-secret-key

# API Keys (from your .env file)
TIINGO_API_KEY=36181da7f5290c0544e9cc0b3b5f19249eb69a61
ALPHA_VANTAGE_KEY=QM5V895I65W014U0
FRED_KEY=6f6919f0f4091f97951da3ae4f23d2b7
BUREAU_OF_STATISTIC_KEY=851cb94bc14e4244bd520053ae807ecd
OPENAI_API_KEY=your-openai-key-here

# Environment
ENVIRONMENT=production
NODE_ENV=production
PORT=$PORT

# CORS
ALLOWED_ORIGINS=https://gayed-signals-dashboard-alpirwn5h-philippe-beliveaus-projects.vercel.app
```

#### Backtrader Service Variables:
```bash
# API Keys (same as above)
TIINGO_API_KEY=36181da7f5290c0544e9cc0b3b5f19249eb69a61
ALPHA_VANTAGE_KEY=QM5V895I65W014U0
FRED_KEY=6f6919f0f4091f97951da3ae4f23d2b7
BUREAU_OF_STATISTIC_KEY=851cb94bc14e4244bd520053ae807ecd

# Flask Configuration
FLASK_ENV=production
FLASK_PORT=5000
FLASK_HOST=0.0.0.0
PORT=$PORT

# Performance
MAX_ANALYSIS_TIME=600
INITIAL_CAPITAL=100000
LOG_LEVEL=INFO
```

### Step 2: Verify Dockerfile Configuration

Both services need to ensure they're using the `$PORT` environment variable:

#### FastAPI Backend (backend/Dockerfile):
```dockerfile
# Should have this at the end:
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT"]
```

#### Backtrader Service:
```dockerfile
# Should bind to PORT environment variable
CMD ["sh", "-c", "python simple_service.py --port $PORT"]
```

### Step 3: Database Setup

If not already done, you need:

1. **Add PostgreSQL service to Railway**:
   ```bash
   railway add postgresql
   ```

2. **Add Redis service to Railway**:
   ```bash
   railway add redis
   ```

3. **Initialize database schema** (after env vars are set):
   - The FastAPI service should auto-create tables on startup
   - If not, you may need to run migrations manually

## 🚀 Quick Fix Commands

If you have Railway CLI installed:

```bash
# Navigate to your project
cd gayed-signals-dashboard

# Set environment variables for FastAPI backend
railway service backend
railway variables set DATABASE_URL='${{Postgres.DATABASE_URL}}'
railway variables set REDIS_URL='${{Redis.REDIS_URL}}'
railway variables set SECRET_KEY="$(openssl rand -base64 32)"
railway variables set TIINGO_API_KEY="36181da7f5290c0544e9cc0b3b5f19249eb69a61"
railway variables set ALPHA_VANTAGE_KEY="QM5V895I65W014U0"
railway variables set FRED_KEY="6f6919f0f4091f97951da3ae4f23d2b7"
railway variables set ENVIRONMENT="production"
railway variables set ALLOWED_ORIGINS="https://gayed-signals-dashboard-alpirwn5h-philippe-beliveaus-projects.vercel.app"

# Set environment variables for Backtrader service
railway service backtrader
railway variables set TIINGO_API_KEY="36181da7f5290c0544e9cc0b3b5f19249eb69a61"
railway variables set ALPHA_VANTAGE_KEY="QM5V895I65W014U0"
railway variables set FRED_KEY="6f6919f0f4091f97951da3ae4f23d2b7"
railway variables set FLASK_ENV="production"
railway variables set PORT='$PORT'

# Redeploy both services
railway up --service backend
railway up --service backtrader
```

## 🧪 Testing After Fix

Once environment variables are added, test the endpoints:

```bash
# Should return 200 OK with health status
curl https://backend-production-0a4c.up.railway.app/health

# Should return 200 OK with service info
curl https://backtrader-production.up.railway.app/health

# Test a functional endpoint
curl https://backend-production-0a4c.up.railway.app/
```

## 📊 Expected Results After Fix

### Healthy Backend Response:
```json
{
  "status": "healthy",
  "database": "connected",
  "service": "YouTube Video Insights API"
}
```

### Healthy Backtrader Response:
```json
{
  "status": "healthy",
  "service": "Backtrader Analysis Service",
  "version": "1.0.0"
}
```

## 🔧 Alternative: Local Debugging

If you want to debug locally first:

```bash
# Test FastAPI backend locally
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000

# Test Backtrader service locally
cd python-services/backtrader-analysis
python simple_service.py
```

## 📝 Next Steps After Fix

1. **Verify health endpoints return 200 OK**
2. **Test frontend connectivity to backends**
3. **Check that real market data is flowing**
4. **Validate signal calculations are working**
5. **Monitor logs for any remaining issues**

The 502 errors are almost certainly due to missing environment variables preventing the services from starting properly. Once these are added, your backends should come online immediately.