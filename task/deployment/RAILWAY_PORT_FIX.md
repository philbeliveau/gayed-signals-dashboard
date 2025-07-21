# 🚨 Railway PORT Error Fix

## The Issue:
```
PORT variable must be integer between 0 and 65535
```

## Root Cause:
Railway is finding a PORT environment variable that's not a valid integer.

## ✅ CRITICAL FIX STEPS:

### 1. Check Railway Dashboard Environment Variables

**IMPORTANT**: In Railway dashboard, check if you have a PORT environment variable set.

**❌ REMOVE THIS if it exists:**
```
PORT = $PORT
PORT = ${PORT}  
PORT = any non-integer value
```

**✅ CORRECT**: Railway manages PORT automatically - DO NOT set it manually!

### 2. Correct Railway Configuration:

**For FastAPI Backend Service:**
- **Root Directory:** `.` (just a period)
- **Custom Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Healthcheck Path:** `/health`

**For Backtrader Service:**  
- **Root Directory:** `python-services/backtrader-analysis`
- **Custom Start Command:** `python start_service.py --production --port $PORT`
- **Healthcheck Path:** `/health`

### 3. Environment Variables to Set:

**For BOTH services, add these (but NOT PORT):**

```bash
# Core System
NODE_ENV=production
ENVIRONMENT=production

# Railway Managed Services (Railway provides these)
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# Financial APIs
TIINGO_API_KEY=36181da7f5290c0544e9cc0b3b5f19249eb69a61
ALPHA_VANTAGE_KEY=QM5V895I65W014U0
FRED_KEY=6f6919f0f4091f97951da3ae4f23d2b7
BUREAU_OF_STATISTIC_KEY=851cb94bc14e4244bd520053ae807ecd

# AI APIs
OPENAI_API_KEY=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

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

**For Backtrader service, also add:**
```bash
FLASK_ENV=production
FLASK_HOST=0.0.0.0
```

### 4. What Railway Does Automatically:

- Railway automatically sets `PORT` to a valid integer (like 3000, 8080, etc.)
- Railway uses this PORT in your start command: `$PORT` becomes the actual number
- You should NEVER manually set PORT in environment variables

### 🚨 Double-Check:

1. **Remove any PORT environment variable** from Railway dashboard
2. **Use the exact start commands** listed above
3. **Set the correct root directories**
4. **Add all environment variables EXCEPT PORT**

After these changes, Railway will deploy successfully!