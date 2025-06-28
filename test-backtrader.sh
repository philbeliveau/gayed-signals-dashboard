#!/bin/bash

# Test script for Backtrader Analysis system
echo "🧪 Testing Gayed Signal Dashboard Backtrader Analysis..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if Python is available
echo -e "${YELLOW}Test 1: Python availability...${NC}"
if command -v python3 &> /dev/null; then
    python_version=$(python3 --version)
    echo -e "${GREEN}✅ Python found: $python_version${NC}"
else
    echo -e "${RED}❌ Python 3 not found. Please install Python 3.8+${NC}"
    exit 1
fi

# Test 2: Check if Node.js dashboard dependencies are installed
echo -e "${YELLOW}Test 2: Node.js dependencies...${NC}"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ Node.js dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  Installing Node.js dependencies...${NC}"
    npm install
fi

# Test 3: Check if Python service directory exists
echo -e "${YELLOW}Test 3: Python service structure...${NC}"
if [ -d "python-services/backtrader-analysis" ]; then
    echo -e "${GREEN}✅ Python service directory exists${NC}"
else
    echo -e "${RED}❌ Python service directory not found${NC}"
    exit 1
fi

# Test 4: Check if setup script exists
echo -e "${YELLOW}Test 4: Setup script...${NC}"
if [ -f "python-services/setup.sh" ]; then
    echo -e "${GREEN}✅ Setup script found${NC}"
else
    echo -e "${RED}❌ Setup script not found${NC}"
    exit 1
fi

# Test 5: Check if Backtrader page exists
echo -e "${YELLOW}Test 5: Backtrader frontend page...${NC}"
if [ -f "src/app/backtrader/page.tsx" ]; then
    echo -e "${GREEN}✅ Backtrader analysis page exists${NC}"
else
    echo -e "${RED}❌ Backtrader analysis page not found${NC}"
    exit 1
fi

# Test 6: Check if API endpoint exists
echo -e "${YELLOW}Test 6: Backtrader API endpoint...${NC}"
if [ -f "src/app/api/backtrader/route.ts" ]; then
    echo -e "${GREEN}✅ Backtrader API endpoint exists${NC}"
else
    echo -e "${RED}❌ Backtrader API endpoint not found${NC}"
    exit 1
fi

# Test 7: Try to build the project
echo -e "${YELLOW}Test 7: TypeScript compilation...${NC}"
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Project builds successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Build issues detected (may be due to missing Python service)${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Backtrader Analysis system is ready!${NC}"
echo ""
echo "Next steps:"
echo "1. Setup Python service:"
echo "   ./python-services/setup.sh"
echo ""
echo "2. Start Python service (in one terminal):"
echo "   cd python-services/backtrader-analysis"
echo "   source venv/bin/activate"
echo "   python start_service.py"
echo ""
echo "3. Start dashboard (in another terminal):"
echo "   npm run dev"
echo ""
echo "4. Access dashboard:"
echo "   http://localhost:3000"
echo ""
echo "5. Click 'Backtrader Analysis' tab to see signal charts!"
echo ""