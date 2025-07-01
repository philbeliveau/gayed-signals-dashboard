#!/bin/bash
# 🚀 Gayed Signals Dashboard - Platform Startup Script
# Starts all services on their correct ports with validation

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Service configuration
FRONTEND_PORT=3000
ECONOMIC_API_PORT=8000
VIDEO_INSIGHTS_PORT=8002
POSTGRES_PORT=5433
REDIS_PORT=6379
ANALYTICS_PORT=5001

echo -e "${BLUE}🚀 Starting Gayed Signals Dashboard Platform${NC}"
echo "=================================================================="

# Function to check if port is in use
check_port() {
    local port=$1
    local service=$2
    if lsof -i :$port >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Port $port is already in use by $service${NC}"
        return 0
    else
        return 1
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    local service=$2
    echo -e "${YELLOW}🔄 Stopping existing $service on port $port...${NC}"
    lsof -ti :$port | xargs kill -9 2>/dev/null || true
    sleep 2
}

# Function to wait for service to start
wait_for_service() {
    local url=$1
    local service=$2
    local max_attempts=30
    local attempt=0
    
    echo -e "${BLUE}⏳ Waiting for $service to start...${NC}"
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $service is ready!${NC}"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
        printf "."
    done
    
    echo -e "\n${RED}❌ $service failed to start after $((max_attempts * 2)) seconds${NC}"
    return 1
}

# Function to validate service health with retries
validate_service() {
    local url=$1
    local service=$2
    local max_retries=10
    local retry=0
    
    echo -e "${BLUE}🔍 Validating $service...${NC}"
    
    while [ $retry -lt $max_retries ]; do
        response=$(curl -s "$url" 2>/dev/null || echo "ERROR")
        
        if [[ "$response" != "ERROR" ]] && [[ -n "$response" ]]; then
            echo -e "${GREEN}✅ $service is healthy${NC}"
            return 0
        fi
        
        retry=$((retry + 1))
        if [ $retry -lt $max_retries ]; then
            printf "."
            sleep 2
        fi
    done
    
    echo -e "\n${RED}❌ $service validation failed after $((max_retries * 2)) seconds${NC}"
    return 1
}

echo -e "${BLUE}📋 Phase 1: Environment Validation${NC}"
echo "----------------------------------"

# Check if .env.local exists
if [[ ! -f .env.local ]]; then
    echo -e "${RED}❌ .env.local file not found${NC}"
    exit 1
fi

# Load environment variables
source .env.local 2>/dev/null || true

# Validate required environment variables
required_vars=("TIINGO_API_KEY" "FRED_API_KEY" "OPENAI_API_KEY")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]] || [[ "${!var}" == *"your_"* ]] || [[ "${!var}" == *"placeholder"* ]]; then
        missing_vars+=("$var")
    fi
done

if [[ ${#missing_vars[@]} -gt 0 ]]; then
    echo -e "${RED}❌ Missing or placeholder environment variables:${NC}"
    printf '   %s\n' "${missing_vars[@]}"
    echo -e "${YELLOW}💡 Please update .env.local with real API keys${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment validation passed${NC}"

echo -e "\n${BLUE}🧹 Phase 2: Cleanup Existing Services${NC}"
echo "---------------------------------------"

# Stop existing services on required ports
services=(
    "$FRONTEND_PORT:Frontend"
    "$ECONOMIC_API_PORT:Economic API"
    "$ANALYTICS_PORT:Analytics Service"
)

for service in "${services[@]}"; do
    port="${service%%:*}"
    name="${service##*:}"
    if check_port "$port" "$name"; then
        kill_port "$port" "$name"
    fi
done

echo -e "${GREEN}✅ Port cleanup completed${NC}"

echo -e "\n${BLUE}🐳 Phase 3: Docker Services${NC}"
echo "----------------------------"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Start Docker services (backend only)
echo -e "${BLUE}🔄 Starting Docker backend services...${NC}"
docker compose -f docker-compose.backend.yml down >/dev/null 2>&1 || true
docker compose -f docker-compose.backend.yml up -d

# Wait for Docker services
echo -e "${BLUE}⏳ Waiting for Docker services...${NC}"
sleep 5

# Validate Docker services
docker_services=("postgres" "redis" "video-insights-api")
for service in "${docker_services[@]}"; do
    if ! docker compose -f docker-compose.backend.yml ps "$service" | grep -q "running"; then
        echo -e "${RED}❌ Docker service $service is not running${NC}"
        docker compose -f docker-compose.backend.yml logs "$service"
        exit 1
    fi
done

echo -e "${GREEN}✅ All Docker services are running${NC}"

echo -e "\n${BLUE}🐍 Phase 4: Python Backend Services${NC}"
echo "------------------------------------"

# Start Economic Data API (Python service)
echo -e "${BLUE}🔄 Starting Economic Data API on port $ECONOMIC_API_PORT...${NC}"

if [[ -f "python-services/backtrader-analysis/simple_service.py" ]]; then
    cd python-services/backtrader-analysis
    
    # Set environment variables for the Python service
    export TIINGO_API_KEY="$TIINGO_API_KEY"
    export ALPHA_VANTAGE_KEY="$ALPHA_VANTAGE_KEY"
    export FRED_API_KEY="$FRED_API_KEY"
    
    # Start the service in background
    python simple_service.py > ../../logs/economic-api.log 2>&1 &
    ECONOMIC_API_PID=$!
    
    cd ../..
    
    # Wait for Economic API to start
    if wait_for_service "http://localhost:$ECONOMIC_API_PORT/health" "Economic Data API"; then
        echo "Economic API PID: $ECONOMIC_API_PID" > .pids/economic-api.pid
    else
        echo -e "${RED}❌ Failed to start Economic Data API${NC}"
        kill $ECONOMIC_API_PID 2>/dev/null || true
        exit 1
    fi
else
    echo -e "${RED}❌ Economic Data API service file not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Economic Data API started successfully${NC}"

echo -e "\n${BLUE}⚛️  Phase 5: Frontend Service${NC}"
echo "-------------------------------"

# Start Next.js frontend
echo -e "${BLUE}🔄 Starting Next.js frontend on port $FRONTEND_PORT...${NC}"

# Create logs directory
mkdir -p logs
mkdir -p .pids

# Start frontend in background
npm run dev > logs/frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to start
if wait_for_service "http://localhost:$FRONTEND_PORT" "Frontend"; then
    echo "Frontend PID: $FRONTEND_PID" > .pids/frontend.pid
else
    echo -e "${RED}❌ Failed to start Frontend${NC}"
    kill $FRONTEND_PID 2>/dev/null || true
    exit 1
fi

echo -e "${GREEN}✅ Frontend started successfully${NC}"

echo -e "\n${BLUE}🔍 Phase 6: Service Validation${NC}"
echo "-------------------------------"

# Validate all services
services_to_validate=(
    "http://localhost:$FRONTEND_PORT:Frontend"
    "http://localhost:$VIDEO_INSIGHTS_PORT/health:Video Insights API"
    "http://localhost:$ECONOMIC_API_PORT/health:Economic Data API"
)

all_healthy=true
for service in "${services_to_validate[@]}"; do
    url="${service%%:*}"
    name="${service##*:}"
    
    if ! validate_service "$url" "$name"; then
        all_healthy=false
    fi
done

# Test authentication for Video Insights
echo -e "${BLUE}🔐 Testing Video Insights authentication...${NC}"
auth_response=$(curl -s -H "Authorization: dev-token" "http://localhost:$VIDEO_INSIGHTS_PORT/api/v1/folders/" 2>/dev/null || echo "ERROR")

if [[ "$auth_response" == "ERROR" ]]; then
    echo -e "${RED}❌ Video Insights authentication failed${NC}"
    all_healthy=false
elif [[ "$auth_response" == "[]" ]] || [[ "$auth_response" == *"folders"* ]]; then
    echo -e "${GREEN}✅ Video Insights authentication working${NC}"
else
    echo -e "${RED}❌ Video Insights authentication returned unexpected response${NC}"
    all_healthy=false
fi

echo -e "\n${BLUE}📊 Platform Status Summary${NC}"
echo "=================================================="

if [[ "$all_healthy" == true ]]; then
    echo -e "${GREEN}🎉 ALL SERVICES STARTED SUCCESSFULLY!${NC}"
    echo ""
    echo -e "${BLUE}🌐 Service URLs:${NC}"
    echo "   Frontend:         http://localhost:$FRONTEND_PORT"
    echo "   Video Insights:   http://localhost:$VIDEO_INSIGHTS_PORT"
    echo "   Economic Data:    http://localhost:$ECONOMIC_API_PORT"
    echo "   PostgreSQL:       localhost:$POSTGRES_PORT"
    echo "   Redis:           localhost:$REDIS_PORT"
    echo ""
    echo -e "${BLUE}📝 Logs:${NC}"
    echo "   Frontend:         logs/frontend.log"
    echo "   Economic API:     logs/economic-api.log"
    echo "   Docker:           docker compose logs"
    echo ""
    echo -e "${BLUE}🛑 To stop all services:${NC}"
    echo "   npm run stop-platform"
    echo ""
    echo -e "${GREEN}✨ Platform is ready for development!${NC}"
    
    # Save service status
    cat > .platform-status << EOF
PLATFORM_RUNNING=true
FRONTEND_PID=$FRONTEND_PID
ECONOMIC_API_PID=$ECONOMIC_API_PID
STARTED_AT=$(date)
FRONTEND_URL=http://localhost:$FRONTEND_PORT
VIDEO_INSIGHTS_URL=http://localhost:$VIDEO_INSIGHTS_PORT
ECONOMIC_API_URL=http://localhost:$ECONOMIC_API_PORT
EOF
    
else
    echo -e "${RED}❌ PLATFORM STARTUP FAILED${NC}"
    echo ""
    echo -e "${YELLOW}🔧 Troubleshooting:${NC}"
    echo "   1. Check logs: tail -f logs/*.log"
    echo "   2. Check Docker: docker compose logs"
    echo "   3. Validate config: npm run validate-config"
    echo "   4. Clean restart: npm run clean-platform && npm run start-platform"
    
    # Cleanup on failure
    kill $FRONTEND_PID 2>/dev/null || true
    kill $ECONOMIC_API_PID 2>/dev/null || true
    
    exit 1
fi