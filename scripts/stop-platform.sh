#!/bin/bash
# 🛑 Gayed Signals Dashboard - Platform Stop Script
# Gracefully stops all platform services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🛑 Stopping Gayed Signals Dashboard Platform${NC}"
echo "=================================================="

# Read platform status if exists
if [[ -f .platform-status ]]; then
    source .platform-status
    echo -e "${BLUE}📊 Platform was started at: $STARTED_AT${NC}"
else
    echo -e "${YELLOW}⚠️  No platform status file found. Attempting to stop all services...${NC}"
fi

echo -e "\n${BLUE}🐳 Phase 1: Stopping Docker Services${NC}"
echo "--------------------------------------"

# Stop Docker services
echo -e "${BLUE}🔄 Stopping Docker services...${NC}"
docker compose -f docker-compose.backend.yml down 2>/dev/null || echo -e "${YELLOW}⚠️  Docker compose not running or already stopped${NC}"

# Verify Docker services are stopped
if docker compose -f docker-compose.backend.yml ps 2>/dev/null | grep -q "running"; then
    echo -e "${RED}❌ Some Docker services are still running${NC}"
    docker compose -f docker-compose.backend.yml ps
else
    echo -e "${GREEN}✅ All Docker services stopped${NC}"
fi

echo -e "\n${BLUE}🐍 Phase 2: Stopping Python Services${NC}"
echo "---------------------------------------"

# Stop Economic Data API if PID exists
if [[ -f .pids/economic-api.pid ]] && [[ -n "$ECONOMIC_API_PID" ]]; then
    echo -e "${BLUE}🔄 Stopping Economic Data API (PID: $ECONOMIC_API_PID)...${NC}"
    kill $ECONOMIC_API_PID 2>/dev/null || echo -e "${YELLOW}⚠️  Process already terminated${NC}"
    rm -f .pids/economic-api.pid
else
    echo -e "${BLUE}🔄 Stopping Economic Data API on port 5001...${NC}"
    lsof -ti :5001 | xargs kill -9 2>/dev/null || echo -e "${YELLOW}⚠️  No process found on port 5001${NC}"
fi

echo -e "${GREEN}✅ Python services stopped${NC}"

echo -e "\n${BLUE}⚛️  Phase 3: Stopping Frontend Service${NC}"
echo "----------------------------------------"

# Stop Next.js frontend if PID exists
if [[ -f .pids/frontend.pid ]] && [[ -n "$FRONTEND_PID" ]]; then
    echo -e "${BLUE}🔄 Stopping Frontend (PID: $FRONTEND_PID)...${NC}"
    kill $FRONTEND_PID 2>/dev/null || echo -e "${YELLOW}⚠️  Process already terminated${NC}"
    rm -f .pids/frontend.pid
else
    echo -e "${BLUE}🔄 Stopping any Node.js services on port 3000...${NC}"
    lsof -ti :3000 | xargs kill -9 2>/dev/null || echo -e "${YELLOW}⚠️  No process found on port 3000${NC}"
fi

# Stop any other Node.js development servers
echo -e "${BLUE}🔄 Stopping other Node.js development servers...${NC}"
pkill -f "next dev" 2>/dev/null || echo -e "${YELLOW}⚠️  No Next.js dev servers found${NC}"
pkill -f "npm run dev" 2>/dev/null || echo -e "${YELLOW}⚠️  No npm dev processes found${NC}"

echo -e "${GREEN}✅ Frontend services stopped${NC}"

echo -e "\n${BLUE}🧹 Phase 4: Cleanup${NC}"
echo "-------------------"

# Clean up PID files
echo -e "${BLUE}🔄 Cleaning up PID files...${NC}"
rm -rf .pids 2>/dev/null || true
rm -f .platform-status 2>/dev/null || true

# Verify all ports are free
ports_to_check=(3000 8000 8002 5001)
still_running=()

for port in "${ports_to_check[@]}"; do
    if lsof -i :$port >/dev/null 2>&1; then
        still_running+=($port)
    fi
done

if [[ ${#still_running[@]} -gt 0 ]]; then
    echo -e "${YELLOW}⚠️  Warning: Some ports still have running processes:${NC}"
    for port in "${still_running[@]}"; do
        echo "   Port $port: $(lsof -ti :$port | head -1)"
    done
    echo ""
    echo -e "${BLUE}💡 Run 'npm run clean-platform' for force cleanup${NC}"
else
    echo -e "${GREEN}✅ All target ports are now free${NC}"
fi

echo -e "\n${BLUE}📊 Final Status${NC}"
echo "==============="

# Check if any services are still running
running_docker=$(docker compose -f docker-compose.backend.yml ps --services --filter "status=running" 2>/dev/null | wc -l)
running_processes=$(pgrep -f "(next dev|simple_service|npm run dev)" | wc -l)

if [[ $running_docker -eq 0 ]] && [[ $running_processes -eq 0 ]]; then
    echo -e "${GREEN}🎉 PLATFORM STOPPED SUCCESSFULLY!${NC}"
    echo ""
    echo -e "${BLUE}💡 To restart the platform:${NC}"
    echo "   npm run start-platform"
    echo ""
else
    echo -e "${YELLOW}⚠️  Platform partially stopped${NC}"
    echo "   Docker services still running: $running_docker"
    echo "   Node/Python processes still running: $running_processes"
    echo ""
    echo -e "${BLUE}💡 For complete cleanup:${NC}"
    echo "   npm run clean-platform"
fi

echo -e "${GREEN}✨ Platform shutdown complete!${NC}"