# Environment Setup Guide - Gayed Signals Platform

## Overview
Complete guide for setting up environment variables and configurations for both Railway and Vercel deployments.

## Required API Keys & Services

### 🔑 Essential API Keys (Required for Core Functionality)

#### 1. Financial Data APIs
```bash
# Tiingo - Professional financial data
TIINGO_API_KEY=your_tiingo_api_key_here
# Sign up: https://api.tiingo.com/
# Free tier: 1,000 requests/day
# Paid tier: $10/month for 10,000 requests/day

# Alpha Vantage - Real-time and historical data
ALPHA_VANTAGE_KEY=your_alpha_vantage_key_here
# Sign up: https://www.alphavantage.co/support/#api-key
# Free tier: 25 requests/day
# Paid tier: $49.99/month for 1,200 requests/minute

# FRED - Federal Reserve Economic Data
FRED_KEY=your_fred_api_key_here
# Sign up: https://fred.stlouisfed.org/docs/api/api_key.html
# Free tier: Unlimited requests (with reasonable use)

# Bureau of Labor Statistics (Optional but recommended)
BUREAU_OF_STATISTIC_KEY=your_bls_api_key_here
# Register: https://www.bls.gov/developers/api_signature_v2.html
# Free tier: 500 daily queries
```

#### 2. Database Services
```bash
# PostgreSQL Database URL
DATABASE_URL=postgresql+asyncpg://user:password@host:port/database

# Redis Cache URL
REDIS_URL=redis://user:password@host:port/db
```

#### 3. Security Configuration
```bash
# JWT Secret (Generate strong random value)
SECRET_KEY=your-super-secure-secret-key-minimum-32-characters
JWT_SECRET=your-jwt-secret-key-for-token-signing

# Generate secure keys using:
# openssl rand -base64 32
```

### 🤖 AI Processing APIs (Optional)
```bash
# OpenAI - For advanced AI features
OPENAI_API_KEY=your_openai_api_key_here
# Sign up: https://platform.openai.com/api-keys
# Pay-as-you-go pricing

# Anthropic Claude - Alternative AI provider
ANTHROPIC_API_KEY=your_anthropic_api_key_here
# Sign up: https://console.anthropic.com/
# Pay-as-you-go pricing
```

## Environment Configuration by Platform

### 🚄 Railway Environment Setup

#### Method 1: Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Create new project
railway new gayed-signals-platform

# Set environment variables
railway variables set NODE_ENV=production
railway variables set ENVIRONMENT=production
railway variables set SECRET_KEY="$(openssl rand -base64 32)"
railway variables set TIINGO_API_KEY="your_tiingo_key"
railway variables set ALPHA_VANTAGE_KEY="your_alpha_vantage_key"
railway variables set FRED_KEY="your_fred_key"
railway variables set OPENAI_API_KEY="your_openai_key"

# Database and Redis are automatically provided by Railway
```

#### Method 2: Railway Dashboard
1. Navigate to [railway.app](https://railway.app)
2. Create new project
3. Go to Variables tab
4. Add each environment variable:

```
NODE_ENV = production
ENVIRONMENT = production
SECRET_KEY = [generate-secure-32-char-string]
TIINGO_API_KEY = [your-tiingo-key]
ALPHA_VANTAGE_KEY = [your-alpha-vantage-key]
FRED_KEY = [your-fred-key]
BUREAU_OF_STATISTIC_KEY = [your-bls-key]
OPENAI_API_KEY = [your-openai-key]
ANTHROPIC_API_KEY = [your-anthropic-key]
ALLOWED_ORIGINS = https://your-frontend-domain.railway.app
```

### ▲ Vercel Environment Setup

#### Method 1: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Navigate to project and initialize
cd gayed-signals-dashboard
vercel

# Set environment variables for production
vercel env add NODE_ENV production
vercel env add ENVIRONMENT production
vercel env add SECRET_KEY production
vercel env add DATABASE_URL production
vercel env add REDIS_URL production
vercel env add TIINGO_API_KEY production
vercel env add ALPHA_VANTAGE_KEY production
vercel env add FRED_KEY production
vercel env add OPENAI_API_KEY production
```

#### Method 2: Vercel Dashboard
1. Navigate to [vercel.com](https://vercel.com)
2. Import your project from GitHub
3. Go to Settings → Environment Variables
4. Add each variable for Production environment:

```
NODE_ENV = production
ENVIRONMENT = production
SECRET_KEY = [generate-secure-32-char-string]
DATABASE_URL = [your-postgresql-connection-string]
REDIS_URL = [your-redis-connection-string]
TIINGO_API_KEY = [your-tiingo-key]
ALPHA_VANTAGE_KEY = [your-alpha-vantage-key]
FRED_KEY = [your-fred-key]
BUREAU_OF_STATISTIC_KEY = [your-bls-key]
OPENAI_API_KEY = [your-openai-key]
ANTHROPIC_API_KEY = [your-anthropic-key]
PYTHON_SERVICE_URL = [your-backend-service-url]
FASTAPI_BASE_URL = [your-fastapi-service-url]
ALLOWED_ORIGINS = https://your-domain.vercel.app
```

## Database Setup Options

### Option 1: Railway PostgreSQL (Recommended for Railway deployment)
```bash
# Add PostgreSQL to Railway project
railway add postgresql

# Railway automatically provides:
# DATABASE_URL=postgresql://postgres:password@host:port/railway
```

### Option 2: Supabase (Recommended for Vercel deployment)
```bash
# 1. Sign up at supabase.com
# 2. Create new project: gayed-signals-db
# 3. Get connection string from Settings → Database
# 4. Connection string format:
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres?sslmode=require
```

### Option 3: Neon (Alternative for Vercel)
```bash
# 1. Sign up at neon.tech
# 2. Create database: gayed-signals
# 3. Get connection string from dashboard
# 4. Connection string format:
DATABASE_URL=postgresql://[user]:[password]@[host]/[dbname]?sslmode=require
```

## Redis Setup Options

### Option 1: Railway Redis (For Railway deployment)
```bash
# Add Redis to Railway project
railway add redis

# Railway automatically provides:
# REDIS_URL=redis://default:password@host:port
```

### Option 2: Upstash (Recommended for Vercel)
```bash
# 1. Sign up at upstash.com
# 2. Create Redis database
# 3. Get connection details from dashboard
# 4. Connection string format:
REDIS_URL=rediss://default:[password]@[host]:6379
```

## Security Best Practices

### 1. Secret Key Generation
```bash
# Generate secure SECRET_KEY (minimum 32 characters)
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Or use Python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 2. Environment Variable Validation
```typescript
// lib/env-validation.ts
const requiredEnvVars = [
  'SECRET_KEY',
  'DATABASE_URL',
  'REDIS_URL',
  'TIINGO_API_KEY',
  'ALPHA_VANTAGE_KEY',
  'FRED_KEY'
];

export function validateEnvironment() {
  const missing = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
```

### 3. CORS Configuration
```bash
# Development
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Production Railway
ALLOWED_ORIGINS=https://your-app.railway.app

# Production Vercel
ALLOWED_ORIGINS=https://your-app.vercel.app

# Multiple domains
ALLOWED_ORIGINS=https://app.yourdomain.com,https://admin.yourdomain.com
```

## Environment Templates

### .env.production (Template)
```bash
# Copy to .env.production and fill in actual values
NODE_ENV=production
ENVIRONMENT=production

# Security
SECRET_KEY=your-super-secure-secret-key-minimum-32-characters
JWT_SECRET=your-jwt-secret-key-for-token-signing

# Database
DATABASE_URL=postgresql+asyncpg://user:password@host:port/database
REDIS_URL=redis://user:password@host:port/db

# API Keys
TIINGO_API_KEY=your_tiingo_api_key_here
ALPHA_VANTAGE_KEY=your_alpha_vantage_key_here
FRED_KEY=your_fred_api_key_here
BUREAU_OF_STATISTIC_KEY=your_bls_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Service URLs (adjust for your deployment)
PYTHON_SERVICE_URL=https://gayed-backtrader.railway.app
FASTAPI_BASE_URL=https://gayed-backend.railway.app

# CORS
ALLOWED_ORIGINS=https://your-frontend-domain.com

# Performance Settings
MAX_ANALYSIS_TIME=600
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=40
REDIS_POOL_SIZE=100
```

### railway.env (Railway-specific)
```bash
# Railway automatically provides DATABASE_URL and REDIS_URL
NODE_ENV=production
ENVIRONMENT=production

# Security (generate these)
SECRET_KEY=your-generated-secret-key
JWT_SECRET=your-generated-jwt-secret

# API Keys
TIINGO_API_KEY=your_tiingo_key
ALPHA_VANTAGE_KEY=your_alpha_vantage_key
FRED_KEY=your_fred_key
BUREAU_OF_STATISTIC_KEY=your_bls_key
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# Railway-specific
RAILWAY_ENVIRONMENT=production
PORT=$PORT
ALLOWED_ORIGINS=$RAILWAY_STATIC_URL
```

### vercel.env (Vercel-specific)
```bash
# Vercel requires external database
NODE_ENV=production
ENVIRONMENT=production
VERCEL=1

# Database (external service required)
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://user:pass@host:6379

# Security
SECRET_KEY=your-generated-secret-key
JWT_SECRET=your-generated-jwt-secret

# API Keys
TIINGO_API_KEY=your_tiingo_key
ALPHA_VANTAGE_KEY=your_alpha_vantage_key
FRED_KEY=your_fred_key
BUREAU_OF_STATISTIC_KEY=your_bls_key
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# External Services
PYTHON_SERVICE_URL=https://backend.railway.app
FASTAPI_BASE_URL=https://api.railway.app

# Vercel-specific
NEXT_RUNTIME=nodejs
ALLOWED_ORIGINS=https://your-app.vercel.app
```

## API Key Acquisition Guide

### Tiingo API Key
1. Visit https://api.tiingo.com/
2. Click "Sign Up" → Create account
3. Verify email
4. Navigate to "Account" → "API Token"
5. Copy your API token

### Alpha Vantage API Key
1. Visit https://www.alphavantage.co/support/#api-key
2. Enter email address
3. Click "GET FREE API KEY"
4. Check email for API key

### FRED API Key
1. Visit https://fred.stlouisfed.org/docs/api/api_key.html
2. Click "Request API Key"
3. Fill out the form
4. API key will be emailed to you

### OpenAI API Key
1. Visit https://platform.openai.com/
2. Sign up or log in
3. Navigate to "API Keys"
4. Click "Create new secret key"
5. Copy and store securely

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors
```bash
# Check DATABASE_URL format
# PostgreSQL: postgresql+asyncpg://user:pass@host:port/db
# Add ?sslmode=require for SSL connections

# Test connection
psql $DATABASE_URL -c "SELECT version();"
```

#### 2. Redis Connection Errors
```bash
# Check REDIS_URL format
# Redis: redis://user:pass@host:port/db
# Upstash: rediss://user:pass@host:port (note the 's' for SSL)

# Test connection
redis-cli -u $REDIS_URL ping
```

#### 3. API Key Validation
```bash
# Test Tiingo API
curl "https://api.tiingo.com/api/test?token=$TIINGO_API_KEY"

# Test Alpha Vantage API
curl "https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=IBM&interval=5min&apikey=$ALPHA_VANTAGE_KEY"

# Test FRED API
curl "https://api.stlouisfed.org/fred/series/observations?series_id=GDPC1&api_key=$FRED_KEY&file_type=json"
```

#### 4. CORS Issues
```bash
# Ensure ALLOWED_ORIGINS matches your frontend domain
# Include protocol (https://) and exact domain
# No trailing slashes
ALLOWED_ORIGINS=https://my-app.vercel.app
```

## Environment Validation Script

Create this script to validate your environment setup:

```bash
#!/bin/bash
# validate-env.sh

echo "🔍 Validating Environment Configuration..."

# Check required variables
required_vars=("SECRET_KEY" "DATABASE_URL" "REDIS_URL" "TIINGO_API_KEY" "ALPHA_VANTAGE_KEY" "FRED_KEY")

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing required variable: $var"
        exit 1
    else
        echo "✅ $var is set"
    fi
done

# Test API connections
echo "🌐 Testing API connections..."

# Test Tiingo
if curl -s "https://api.tiingo.com/api/test?token=$TIINGO_API_KEY" | grep -q "You successfully sent a request"; then
    echo "✅ Tiingo API connection successful"
else
    echo "❌ Tiingo API connection failed"
fi

# Test database
if psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
fi

# Test Redis
if redis-cli -u "$REDIS_URL" ping >/dev/null 2>&1; then
    echo "✅ Redis connection successful"
else
    echo "❌ Redis connection failed"
fi

echo "🎉 Environment validation complete!"
```

This comprehensive environment setup guide ensures your Gayed Signals Trading Platform has all necessary configurations for successful deployment on both Railway and Vercel.