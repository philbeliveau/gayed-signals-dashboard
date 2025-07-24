#!/bin/bash

# Railway Backend Services Quick Fix Script V2
# This script uses the correct Railway CLI syntax for setting environment variables

echo "🚀 Railway Backend Services Quick Fix V2"
echo "========================================"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Login check
echo "🔐 Checking Railway authentication..."
if ! railway whoami &> /dev/null; then
    echo "Please login to Railway first:"
    railway login
fi

echo "📋 Setting up environment variables for backend services..."

# Get the API keys from .env file if it exists
if [ -f .env ]; then
    echo "✅ Found .env file, extracting API keys..."
    source .env
else
    echo "⚠️  No .env file found. Using default keys from deployment docs."
    TIINGO_API_KEY="36181da7f5290c0544e9cc0b3b5f19249eb69a61"
    ALPHA_VANTAGE_KEY="QM5V895I65W014U0"
    FRED_KEY="6f6919f0f4091f97951da3ae4f23d2b7"
    BUREAU_OF_STATISTIC_KEY="851cb94bc14e4244bd520053ae807ecd"
fi

# Generate secure keys
echo "🔑 Generating secure keys..."
SECRET_KEY=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)

echo "🎯 Setting up FastAPI Backend Service..."
echo "======================================="

# Set environment variables for FastAPI backend using correct Railway CLI syntax
railway variables -s backend --set "DATABASE_URL=\${{Postgres.DATABASE_URL}}"
railway variables -s backend --set "REDIS_URL=\${{Redis.REDIS_URL}}"
railway variables -s backend --set "SECRET_KEY=$SECRET_KEY"
railway variables -s backend --set "JWT_SECRET=$JWT_SECRET"
railway variables -s backend --set "TIINGO_API_KEY=$TIINGO_API_KEY"
railway variables -s backend --set "ALPHA_VANTAGE_KEY=$ALPHA_VANTAGE_KEY"
railway variables -s backend --set "FRED_KEY=$FRED_KEY"
railway variables -s backend --set "BUREAU_OF_STATISTIC_KEY=$BUREAU_OF_STATISTIC_KEY"
railway variables -s backend --set "ENVIRONMENT=production"
railway variables -s backend --set "NODE_ENV=production"
railway variables -s backend --set "PORT=\$PORT"
railway variables -s backend --set "ALLOWED_ORIGINS=https://gayed-signals-dashboard-alpirwn5h-philippe-beliveaus-projects.vercel.app"

# Optional API keys if available
if [ ! -z "$OPENAI_API_KEY" ]; then
    railway variables -s backend --set "OPENAI_API_KEY=$OPENAI_API_KEY"
fi

if [ ! -z "$ANTHROPIC_API_KEY" ]; then
    railway variables -s backend --set "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY"
fi

echo "✅ FastAPI Backend environment variables set!"

echo "🎯 Setting up Backtrader Service..."
echo "=================================="

# Set environment variables for Backtrader service using correct Railway CLI syntax
railway variables -s backtrader --set "TIINGO_API_KEY=$TIINGO_API_KEY"
railway variables -s backtrader --set "ALPHA_VANTAGE_KEY=$ALPHA_VANTAGE_KEY"
railway variables -s backtrader --set "FRED_KEY=$FRED_KEY"
railway variables -s backtrader --set "BUREAU_OF_STATISTIC_KEY=$BUREAU_OF_STATISTIC_KEY"
railway variables -s backtrader --set "FLASK_ENV=production"
railway variables -s backtrader --set "FLASK_PORT=5000"
railway variables -s backtrader --set "FLASK_HOST=0.0.0.0"
railway variables -s backtrader --set "PORT=\$PORT"
railway variables -s backtrader --set "MAX_ANALYSIS_TIME=600"
railway variables -s backtrader --set "INITIAL_CAPITAL=100000"
railway variables -s backtrader --set "LOG_LEVEL=INFO"

echo "✅ Backtrader Service environment variables set!"

echo "🔄 Triggering service restarts..."
echo "================================"

# Restart services to pick up new environment variables
echo "Restarting FastAPI Backend..."
railway service backend
railway up --detach

echo "Restarting Backtrader Service..."
railway service backtrader  
railway up --detach

echo "⏳ Waiting for services to restart (30 seconds)..."
sleep 30

echo "🧪 Testing service health..."
echo "============================"

# Test the health endpoints
echo "Testing FastAPI Backend health..."
BACKEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://backend-production-0a4c.up.railway.app/health)
if [ "$BACKEND_RESPONSE" = "200" ]; then
    echo "✅ FastAPI Backend is healthy!"
else
    echo "❌ FastAPI Backend returned HTTP $BACKEND_RESPONSE"
fi

echo "Testing Backtrader Service health..."
BACKTRADER_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://backtrader-production.up.railway.app/health)
if [ "$BACKTRADER_RESPONSE" = "200" ]; then
    echo "✅ Backtrader Service is healthy!"
else
    echo "❌ Backtrader Service returned HTTP $BACKTRADER_RESPONSE"
fi

echo ""
echo "🎉 Railway Setup Complete!"
echo "=========================="
echo ""
echo "🌐 Your services should now be available at:"
echo "   Frontend:  https://gayed-signals-dashboard-alpirwn5h-philippe-beliveaus-projects.vercel.app"
echo "   Backend:   https://backend-production-0a4c.up.railway.app"
echo "   Backtrader: https://backtrader-production.up.railway.app"
echo ""
echo "📊 To check logs if there are still issues:"
echo "   railway logs -s backend"
echo "   railway logs -s backtrader"
echo ""
echo "🔍 To check service status:"
echo "   railway status"
echo ""

if [ "$BACKEND_RESPONSE" = "200" ] && [ "$BACKTRADER_RESPONSE" = "200" ]; then
    echo "🚀 SUCCESS: All services are now healthy and ready for production!"
else
    echo "⚠️  Some services may need additional debugging. Check logs with 'railway logs -s [service-name]'"
fi