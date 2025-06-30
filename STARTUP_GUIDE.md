# 🚀 Gayed Signals Dashboard - Comprehensive Startup Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Quick Start (Development)](#quick-start-development)
4. [Production Deployment](#production-deployment)
5. [Service Architecture](#service-architecture)
6. [Troubleshooting](#troubleshooting)
7. [Health Checks](#health-checks)
8. [Common Commands](#common-commands)

---

## 🛠️ Prerequisites

### Required Software
- **Docker Desktop** (latest version)
- **Node.js** (v18+ recommended)
- **npm** or **yarn**
- **Git** (for version control)

### Hardware Requirements
- **RAM**: 8GB minimum (16GB recommended)
- **Storage**: 5GB free space
- **CPU**: Multi-core processor recommended

### Check Prerequisites
```bash
# Verify installations
docker --version
node --version
npm --version
git --version
```

---

## 🔧 Environment Setup

### 1. Clone and Navigate
```bash
git clone <repository-url>
cd gayed-signals-dashboard
```

### 2. Environment Variables
Ensure your `.env.local` file exists in the root directory:

```bash
# Check if .env.local exists
ls -la .env.local

# If missing, create it with your API keys
cp .env.example .env.local  # if you have an example file
```

**Required Environment Variables:**
```env
# API Keys
OPENAI_KEY=your_openai_api_key
TIINGO_API_KEY=your_tiingo_key
ALPHA_VANTAGE_KEY=your_alpha_vantage_key
FRED_KEY=your_fred_key
BUREAU_OF_STATISTIC_KEY=your_bls_key

# Optional (for advanced features)
ANTHROPIC_API_KEY=your_anthropic_key
SECRET_KEY=your_jwt_secret_key

# Development settings
NODE_ENV=development
LOG_LEVEL=info
```
  Alternative: Export environment variables

  If you still get warnings, export the variables from your .env.local:

  # Go to root directory first
  cd ..

  # Export variables from .env.local
  export OPENAI_API_KEY="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"
  export TIINGO_API_KEY="36181da7f5290c0544e9cc0b3b5f19249eb69a61"
  export ALPHA_VANTAGE_KEY="QM5V895I65W014U0"
  export FRED_KEY="6f6919f0f4091f97951da3ae4f23d2b7"
  export BUREAU_OF_STATISTIC_KEY="851cb94bc14e4244bd520053ae807ecd"


### 3. Install Dependencies
```bash
# Install Node.js dependencies
npm install

# Verify installation
npm list --depth=0
```

---

## 🚀 Quick Start (Development)

### Option A: Full Docker Stack (Recommended)
```bash
# 1. Start Docker Desktop first
open -a Docker  # macOS
# Or manually open Docker Desktop app

# 2. Start all services
docker-compose up -d

# 3. Wait for services to initialize (30-60 seconds)
sleep 30

# 4. Verify services are running
docker-compose ps
```

**Access URLs:**
- **Dashboard**: http://localhost:3000
- **Video Insights API**: http://localhost:8000
- **Backtrader API**: http://localhost:5000

### Option B: Hybrid Development (Frontend separate)
```bash
# 1. Start backend services only
docker-compose up -d postgres redis video-insights-api celery-worker backend

# 2. Start Next.js in development mode
npm run dev

# 3. Access dashboard at http://localhost:3000
```

### Option C: Local Development Only
```bash
# 1. Install and start local PostgreSQL and Redis
brew install postgresql redis  # macOS with Homebrew
brew services start postgresql
brew services start redis

# 2. Set up local database
createdb video_insights

# 3. Start Next.js frontend
npm run dev

# 4. Start FastAPI backend (in separate terminal)
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🏭 Production Deployment

### 1. Environment Preparation
```bash
# Set production environment variables
export NODE_ENV=production
export ENVIRONMENT=production

# Build production images
docker-compose build
```

### 2. Start Production Stack
```bash
# Start all services in production mode
docker-compose up -d

# Enable nginx load balancer (optional)
docker-compose up -d nginx
```

### 3. SSL Setup (Optional)
```bash
# Place SSL certificates in ./ssl/ directory
mkdir -p ssl
cp your_certificate.crt ssl/
cp your_private_key.key ssl/

# Update nginx.conf for HTTPS
```

---

## 🏗️ Service Architecture

### Services Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend APIs  │    │   Databases     │
│   (Next.js)     │◄──►│   (FastAPI +    │◄──►│   (PostgreSQL + │
│   Port: 3000    │    │    Flask)       │    │    Redis)       │
│                 │    │   Ports: 8000,  │    │   Ports: 5432,  │
│                 │    │          5000   │    │          6379   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Background     │
                    │  Processing     │
                    │  (Celery)       │
                    └─────────────────┘
```

### Service Descriptions

| Service | Purpose | Port | Dependencies |
|---------|---------|------|--------------|
| **frontend** | Next.js dashboard | 3000 | backend, video-insights-api |
| **backend** | Flask API (Backtrader) | 5000 | redis |
| **video-insights-api** | FastAPI (Video processing) | 8000 | postgres, redis |
| **postgres** | Video insights database | 5432 | none |
| **redis** | Caching + task queue | 6379 | none |
| **celery-worker** | Background tasks | n/a | postgres, redis |
| **nginx** | Load balancer (optional) | 80, 443 | frontend, backend |

---

## 🔍 Troubleshooting

### Common Issues & Solutions

#### 1. Docker Issues
```bash
# Issue: "Cannot connect to Docker daemon"
# Solution: Start Docker Desktop
open -a Docker

# Issue: "Port already in use"
# Solution: Stop conflicting services
docker-compose down
sudo lsof -i :3000  # Check what's using port 3000
kill -9 <PID>       # Kill the process
```

#### 2. Environment Variable Issues
```bash
# Issue: "Variable is not set" warnings
# Solution: Check .env.local location and syntax
pwd  # Should be in root directory
cat .env.local  # Verify file contents

# Export variables manually if needed
source .env.local
```

#### 3. Database Connection Issues
```bash
# Issue: "Connection refused" to database
# Solution: Ensure PostgreSQL is running
docker-compose logs postgres

# Reset database if corrupted
docker-compose down -v  # WARNING: Deletes data
docker-compose up -d postgres
```

#### 4. API Service Unavailable (503 Error)
```bash
# Check if backend services are running
curl http://localhost:8000/health
curl http://localhost:5000/health

# Restart specific service
docker-compose restart video-insights-api

# Check logs for errors
docker-compose logs video-insights-api
```

#### 5. Missing Dependencies
```bash
# Reinstall Node.js dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild Docker images
docker-compose build --no-cache
```

### Log Analysis
```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs frontend
docker-compose logs video-insights-api
docker-compose logs postgres

# Follow logs in real-time
docker-compose logs -f video-insights-api
```

---

## 🩺 Health Checks

### Automated Health Check Script
```bash
#!/bin/bash
# Save as check_health.sh

echo "🔍 Checking Gayed Signals Dashboard Health..."

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running"
    exit 1
fi

# Check services
services=("postgres" "redis" "video-insights-api" "frontend")
for service in "${services[@]}"; do
    if docker-compose ps $service | grep -q "Up"; then
        echo "✅ $service is running"
    else
        echo "❌ $service is not running"
    fi
done

# Check endpoints
echo "\n🌐 Checking API endpoints..."
curl -f http://localhost:3000 > /dev/null 2>&1 && echo "✅ Frontend (3000)" || echo "❌ Frontend (3000)"
curl -f http://localhost:8000/health > /dev/null 2>&1 && echo "✅ Video API (8000)" || echo "❌ Video API (8000)"
curl -f http://localhost:5000/health > /dev/null 2>&1 && echo "✅ Backtrader API (5000)" || echo "❌ Backtrader API (5000)"

echo "\n📊 Resource usage:"
docker stats --no-stream
```

### Manual Health Checks
```bash
# 1. Service Status
docker-compose ps

# 2. API Health Endpoints
curl http://localhost:8000/health
curl http://localhost:5000/health

# 3. Database Connectivity
docker-compose exec postgres psql -U postgres -d video_insights -c "SELECT 1;"

# 4. Redis Connectivity
docker-compose exec redis redis-cli ping

# 5. Frontend Accessibility
curl -I http://localhost:3000
```

---

## 💻 Common Commands

### Development Commands
```bash
# Start development environment
npm run dev                           # Frontend only
docker-compose up -d backend postgres redis video-insights-api  # Backend services

# Code quality
npm run lint                          # Check code style
npm run typecheck                     # TypeScript validation
npm test                             # Run tests

# Database operations
docker-compose exec postgres psql -U postgres -d video_insights  # Access database
docker-compose exec redis redis-cli  # Access Redis
```

### Docker Management
```bash
# Service management
docker-compose up -d                  # Start all services
docker-compose down                   # Stop all services
docker-compose restart <service>     # Restart specific service
docker-compose pull                   # Update images

# Data management
docker-compose down -v                # Stop and remove volumes (⚠️ deletes data)
docker system prune -a               # Clean up unused Docker resources

# Monitoring
docker-compose logs -f                # Follow all logs
docker-compose top                    # Show running processes
docker stats                         # Resource usage
```

### Backup & Restore
```bash
# Backup database
docker-compose exec postgres pg_dump -U postgres video_insights > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres video_insights < backup.sql

# Backup environment
cp .env.local .env.backup
tar -czf dashboard_backup.tar.gz .env.local docker-compose.yml
```

---

## 🎯 Quick Reference

### Start Sequences

**First Time Setup:**
```bash
1. git clone <repo>
2. cd gayed-signals-dashboard
3. cp .env.example .env.local  # Add your API keys
4. docker-compose up -d
5. Wait 60 seconds
6. Open http://localhost:3000
```

**Daily Development:**
```bash
1. docker-compose up -d        # Start backend
2. npm run dev                 # Start frontend
3. Open http://localhost:3000
```

**Production Deployment:**
```bash
1. docker-compose build
2. docker-compose up -d
3. docker-compose ps           # Verify all services
```

### Emergency Shutdown
```bash
# Stop everything immediately
docker-compose down

# Force stop if hanging
docker-compose kill
docker system prune -f
```

---

## 📞 Support

If you encounter issues not covered here:

1. **Check logs**: `docker-compose logs <service-name>`
2. **Verify environment**: Ensure `.env.local` is properly configured
3. **Resource check**: Ensure sufficient RAM/disk space
4. **Clean restart**: `docker-compose down && docker-compose up -d`
5. **Nuclear option**: `docker-compose down -v && docker-compose up -d` (⚠️ deletes data)

---

**Last Updated**: 2024-06-30
**Version**: 2.0.0