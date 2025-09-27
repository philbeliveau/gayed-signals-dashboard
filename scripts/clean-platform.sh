#!/bin/bash
# 🧹 Gayed Signals Dashboard - Platform Clean Script
# Force cleanup of all platform services and processes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}🧹 FORCE CLEANING Gayed Signals Dashboard Platform${NC}"
echo "======================================================"
echo -e "${YELLOW}⚠️  This will forcefully stop ALL related processes${NC}"
echo ""

# Ask for confirmation
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Operation cancelled.${NC}"
    exit 0
fi

echo -e "\n${BLUE}🔪 Phase 1: Force Stop All Docker Services${NC}"
echo "--------------------------------------------"

# Force stop and remove all Docker services
echo -e "${BLUE}🔄 Force stopping Docker services...${NC}"
docker compose -f docker-compose.backend.yml kill 2>/dev/null || echo -e "${YELLOW}⚠️  No Docker services to kill${NC}"
docker compose -f docker-compose.backend.yml down --remove-orphans --volumes 2>/dev/null || echo -e "${YELLOW}⚠️  Docker compose already down${NC}"

# Remove any dangling containers related to the project
echo -e "${BLUE}🔄 Removing project containers...${NC}"
docker ps -a --filter "name=gayed-signals-dashboard" --format "{{.ID}}" | xargs docker rm -f 2>/dev/null || echo -e "${YELLOW}⚠️  No project containers found${NC}"

echo -e "${GREEN}✅ Docker cleanup complete${NC}"

echo -e "\n${BLUE}🔪 Phase 2: Force Kill All Processes${NC}"
echo "--------------------------------------"

# Kill all Node.js processes related to the project
echo -e "${BLUE}🔄 Killing Node.js processes...${NC}"
pkill -f "next dev" 2>/dev/null || echo -e "${YELLOW}⚠️  No Next.js processes found${NC}"
pkill -f "npm run dev" 2>/dev/null || echo -e "${YELLOW}⚠️  No npm dev processes found${NC}"
pkill -f "node.*3000" 2>/dev/null || echo -e "${YELLOW}⚠️  No Node.js on port 3000${NC}"

# Kill all Python processes related to the project
echo -e "${BLUE}🔄 Killing Python processes...${NC}"
pkill -f "simple_service" 2>/dev/null || echo -e "${YELLOW}⚠️  No simple_service processes found${NC}"
pkill -f "python.*5001" 2>/dev/null || echo -e "${YELLOW}⚠️  No Python on port 5001${NC}"

# Force kill processes on specific ports
ports_to_clean=(3000 8002 5001)
for port in "${ports_to_clean[@]}"; do
    if lsof -ti :$port >/dev/null 2>&1; then
        echo -e "${BLUE}🔄 Force killing process on port $port...${NC}"
        lsof -ti :$port | xargs kill -9 2>/dev/null || echo -e "${YELLOW}⚠️  Failed to kill process on port $port${NC}"
    fi
done

echo -e "${GREEN}✅ Process cleanup complete${NC}"

echo -e "\n${BLUE}🧹 Phase 3: Clean Project Files${NC}"
echo "---------------------------------"

# Clean up runtime files
echo -e "${BLUE}🔄 Cleaning runtime files...${NC}"
rm -rf .pids 2>/dev/null || true
rm -f .platform-status 2>/dev/null || true
rm -rf logs/*.log 2>/dev/null || true

# Clean up Next.js build files
echo -e "${BLUE}🔄 Cleaning Next.js cache...${NC}"
rm -rf .next 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true

# Clean up Python cache files
echo -e "${BLUE}🔄 Cleaning Python cache...${NC}"
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true

# Clean up chart files older than 1 hour
echo -e "${BLUE}🔄 Cleaning old chart files...${NC}"
find python-services/backtrader-analysis/static/charts -name "*.png" -mmin +60 -delete 2>/dev/null || echo -e "${YELLOW}⚠️  No old charts to clean${NC}"

echo -e "${GREEN}✅ File cleanup complete${NC}"

echo -e "\n${BLUE}🔍 Phase 4: Verification${NC}"
echo "-------------------------"

# Verify all target ports are free
ports_to_verify=(3000 8002 5001 5433 6379)
still_occupied=()

for port in "${ports_to_verify[@]}"; do
    if lsof -i :$port >/dev/null 2>&1; then
        process_info=$(lsof -i :$port | tail -n 1 | awk '{print $1 " (PID: " $2 ")"}')
        still_occupied+=("$port: $process_info")
    fi
done

if [[ ${#still_occupied[@]} -gt 0 ]]; then
    echo -e "${YELLOW}⚠️  Warning: Some ports are still occupied:${NC}"
    for occupied in "${still_occupied[@]}"; do
        echo "   $occupied"
    done
    echo ""
    echo -e "${BLUE}💡 You may need to manually stop these processes or restart your system${NC}"
else
    echo -e "${GREEN}✅ All target ports are now free${NC}"
fi

# Check Docker status
docker_running=$(docker compose -f docker-compose.backend.yml ps --services --filter "status=running" 2>/dev/null | wc -l)
if [[ $docker_running -eq 0 ]]; then
    echo -e "${GREEN}✅ No project Docker containers running${NC}"
else
    echo -e "${YELLOW}⚠️  Some Docker containers may still be running${NC}"
fi

echo -e "\n${BLUE}📊 Final Status${NC}"
echo "==============="

# Count remaining processes
remaining_node=$(pgrep -f "(next|npm)" 2>/dev/null | wc -l)
remaining_python=$(pgrep -f "(simple_service|python.*5001)" 2>/dev/null | wc -l)
remaining_docker=$(docker compose -f docker-compose.backend.yml ps --services --filter "status=running" 2>/dev/null | wc -l)

total_remaining=$((remaining_node + remaining_python + remaining_docker))

if [[ $total_remaining -eq 0 ]]; then
    echo -e "${GREEN}🎉 PLATFORM COMPLETELY CLEANED!${NC}"
    echo ""
    echo -e "${BLUE}💡 Platform is ready for a fresh start:${NC}"
    echo "   npm run start-platform"
    echo ""
else
    echo -e "${YELLOW}⚠️  Some processes may still be running:${NC}"
    echo "   Node.js processes: $remaining_node"
    echo "   Python processes: $remaining_python" 
    echo "   Docker containers: $remaining_docker"
    echo ""
    echo -e "${BLUE}💡 If issues persist, try:${NC}"
    echo "   1. Restart your terminal"
    echo "   2. Restart Docker Desktop"
    echo "   3. Reboot your system"
fi

echo -e "${GREEN}✨ Platform cleanup complete!${NC}"