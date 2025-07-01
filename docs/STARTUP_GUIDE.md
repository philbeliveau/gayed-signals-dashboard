# 🚀 Gayed Signals Dashboard - Complete Startup Guide

## Quick Start (What You Need)

### Option 1: Docker (Recommended)
```bash
# Start the core video insights system
docker-compose up -d postgres redis video-insights-api

# Check status (all should be 'healthy')
docker-compose ps

# Test the API
curl http://localhost:8002/health
```

### Option 2: Development Mode
```bash
# Frontend only (if Docker has issues)
npm run dev  # Runs on http://localhost:3000
```

## 🎯 Access Points

- **Frontend Dashboard**: http://localhost:3001 (or 3000 in dev mode)
- **Video Insights Page**: http://localhost:3001/video-insights
- **API Health**: http://localhost:8002/health
- **API Documentation**: http://localhost:8002/docs

## 🔑 Adding API Keys

Create `.env.local` in the project root:

```bash
# Required for video analysis
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here

# Optional for economic data
FRED_API_KEY=your_fred_key_here
TIINGO_API_KEY=your_tiingo_key_here
ALPHA_VANTAGE_KEY=your_alpha_vantage_key_here
```

## 🎬 Video Insights Features

✅ **YouTube Video Processing**
- Paste any YouTube URL
- Automatic audio extraction
- AI transcription with Whisper
- Multiple summary modes

✅ **AI Summarization**
- Bullet Points
- Executive Summary  
- Action Items
- Timeline
- Custom Prompts

✅ **Organization**
- Folder management
- Search functionality
- Video history

🎉 **Your YouTube Video Insights system is ready to use\!**
EOF < /dev/null