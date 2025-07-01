# 🚀 Platform Management Guide

## Single Command Platform Control

You now have **one command** to start the entire Gayed Signals Dashboard platform with all services on their correct ports.

## 🎯 Quick Start

### Start Everything
```bash
npm run start-platform
```
This single command will:
- ✅ Start Docker services (PostgreSQL, Redis, Video Insights API)
- ✅ Start Python Economic Data API on port 8000
- ✅ Start Next.js frontend on port 3000
- ✅ Validate all services are healthy
- ✅ Ensure correct port configuration

### Stop Everything
```bash
npm run stop-platform
```

### Complete Cleanup (if needed)
```bash
npm run clean-platform
```

### Restart Everything
```bash
npm run restart-platform
```

## 🛠️ All Available Commands

| Command | Purpose |
|---------|---------|
| `npm run start-platform` | **Main command** - Start entire platform |
| `npm run stop-platform` | Gracefully stop all services |
| `npm run clean-platform` | Force cleanup all processes |
| `npm run restart-platform` | Stop and restart everything |
| `npm run platform-status` | Check platform status |
| `npm run health-check` | Validate configuration |
| `npm run check-services` | Discover services |

## 📊 Service Port Map

| Service | Port | URL | Status Check |
|---------|------|-----|--------------|
| **Frontend** | 3000 | http://localhost:3000 | Main dashboard |
| **Video Insights** | 8002 | http://localhost:8002 | Docker service |
| **Economic Data** | 8000 | http://localhost:8000 | Python service |
| **PostgreSQL** | 5433 | localhost:5433 | Database |
| **Redis** | 6379 | localhost:6379 | Cache |

## 🔍 What Happens During Startup

### Phase 1: Environment Validation ✅
- Checks `.env.local` exists
- Validates API keys are not placeholders
- Ensures required environment variables are set

### Phase 2: Cleanup Existing Services 🧹
- Stops any existing services on required ports
- Prevents port conflicts

### Phase 3: Docker Services 🐳
- Starts PostgreSQL, Redis, Video Insights API
- Waits for all services to be healthy
- Validates Docker containers are running

### Phase 4: Python Backend Services 🐍
- Starts Economic Data API on port 8000
- Sets environment variables
- Validates service health

### Phase 5: Frontend Service ⚛️
- Starts Next.js on port 3000
- Waits for frontend to be ready
- Validates frontend health

### Phase 6: Service Validation 🔍
- Tests all service endpoints
- Validates Video Insights authentication
- Confirms platform is ready

## 🔧 Troubleshooting

### If Startup Fails

1. **Check the logs:**
   ```bash
   tail -f logs/frontend.log
   tail -f logs/economic-api.log
   docker compose logs
   ```

2. **Clean and retry:**
   ```bash
   npm run clean-platform
   npm run start-platform
   ```

3. **Check configuration:**
   ```bash
   npm run validate-config
   ```

### Common Issues

#### ❌ "Port already in use"
**Solution:** The script automatically handles this, but if issues persist:
```bash
npm run clean-platform
npm run start-platform
```

#### ❌ "Docker is not running"
**Solution:** Start Docker Desktop and retry

#### ❌ "API keys missing"
**Solution:** Update `.env.local` with real API keys (not placeholders)

#### ❌ "Service not responding"
**Solution:** Check the specific service logs in `logs/` directory

### Emergency Reset

If everything is broken:
```bash
# 1. Force cleanup everything
npm run clean-platform

# 2. Restart Docker Desktop

# 3. Fresh start
npm run start-platform
```

## 📝 Logs and Monitoring

### Log Files
- `logs/frontend.log` - Next.js frontend logs
- `logs/economic-api.log` - Python Economic Data API logs
- `docker compose logs` - All Docker service logs

### Real-time Monitoring
```bash
# Watch frontend logs
tail -f logs/frontend.log

# Watch economic API logs  
tail -f logs/economic-api.log

# Watch Docker logs
docker compose logs -f

# Check platform status
npm run platform-status
```

## 🎉 Success Indicators

When `npm run start-platform` completes successfully, you'll see:

```
🎉 ALL SERVICES STARTED SUCCESSFULLY!

🌐 Service URLs:
   Frontend:         http://localhost:3000
   Video Insights:   http://localhost:8002  
   Economic Data:    http://localhost:8000
   PostgreSQL:       localhost:5433
   Redis:           localhost:6379

✨ Platform is ready for development!
```

## 🔄 Development Workflow

### Daily Development
```bash
# Start everything
npm run start-platform

# Do your development work...

# Stop everything when done
npm run stop-platform
```

### Quick Restart During Development
```bash
npm run restart-platform
```

### Check Platform Health
```bash
npm run platform-status
npm run health-check
```

## 🛡️ Safety Features

- ✅ **Port Conflict Prevention** - Automatically stops conflicting services
- ✅ **Health Validation** - Ensures all services are actually working
- ✅ **Error Recovery** - Clean rollback on startup failure
- ✅ **Graceful Shutdown** - Proper service termination
- ✅ **Force Cleanup** - Emergency cleanup if needed

## 📦 Environment Requirements

The platform will automatically validate you have:
- ✅ Real API keys (not placeholders) in `.env.local`
- ✅ Docker Desktop running
- ✅ Required ports available (3000, 8000, 8002, 5433, 6379)
- ✅ All project dependencies installed

## 🚀 Ready to Go!

Your platform is now completely automated. Just run:

```bash
npm run start-platform
```

And everything will start on the correct ports with full validation!