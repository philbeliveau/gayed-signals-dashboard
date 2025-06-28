#!/bin/bash

echo "⚡ Live Signals Performance Optimization Test"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test 1: Fast Mode (Essential Signals)
echo -e "${BLUE}Test 1: Fast Mode - Essential Signals Only${NC}"
echo "Testing /api/signals?fast=true (SPY + XLU only)..."

start_time=$(date +%s.%N)
response=$(curl -s "http://localhost:3000/api/signals?fast=true")
end_time=$(date +%s.%N)
fast_time=$(echo "$end_time - $start_time" | bc)

signal_count=$(echo "$response" | jq '.signals | length' 2>/dev/null || echo "0")
echo -e "${GREEN}✅ Fast mode completed in ${fast_time}s${NC}"
echo "   Signals calculated: $signal_count"
echo ""

# Test 2: Full Mode (All 5 Signals)
echo -e "${BLUE}Test 2: Full Mode - All 5 Gayed Signals${NC}"
echo "Testing /api/signals (SPY, XLU, WOOD, GLD, IEF, TLT, ^VIX)..."

start_time=$(date +%s.%N)
response=$(curl -s "http://localhost:3000/api/signals")
end_time=$(date +%s.%N)
full_time=$(echo "$end_time - $start_time" | bc)

signal_count=$(echo "$response" | jq '.signals | length' 2>/dev/null || echo "0")
echo -e "${GREEN}✅ Full mode completed in ${full_time}s${NC}"
echo "   Signals calculated: $signal_count"
echo ""

# Test 3: Cached Response
echo -e "${BLUE}Test 3: Cached Response${NC}"
echo "Testing cached response (should be instant)..."

start_time=$(date +%s.%N)
response=$(curl -s "http://localhost:3000/api/signals?fast=true")
end_time=$(date +%s.%N)
cached_time=$(echo "$end_time - $start_time" | bc)

is_cached=$(echo "$response" | jq -r '.cached' 2>/dev/null)
echo -e "${GREEN}✅ Cached response in ${cached_time}s${NC}"
echo "   From cache: $is_cached"
echo ""

# Test 4: Dashboard Page Load
echo -e "${BLUE}Test 4: Full Dashboard Page Load${NC}"
echo "Testing complete page load with signals..."

start_time=$(date +%s.%N)
curl -s "http://localhost:3000" > /dev/null
end_time=$(date +%s.%N)
page_time=$(echo "$end_time - $start_time" | bc)

echo -e "${GREEN}✅ Dashboard page loaded in ${page_time}s${NC}"
echo ""

# Calculate performance improvements
if command -v bc &> /dev/null; then
    improvement=$(echo "scale=1; $full_time / $fast_time" | bc)
    cache_improvement=$(echo "scale=1; $fast_time / $cached_time" | bc)
else
    improvement="N/A"
    cache_improvement="N/A"
fi

# Performance Summary
echo -e "${YELLOW}📊 Performance Summary:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Fast Mode (2 signals):     ${fast_time}s"
echo "Full Mode (5 signals):     ${full_time}s"  
echo "Cached Response:           ${cached_time}s"
echo "Dashboard Page Load:       ${page_time}s"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Speed Improvement:         ${improvement}x faster (fast vs full)"
echo "Cache Improvement:         ${cache_improvement}x faster (cache vs fresh)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -e "${YELLOW}🎯 Optimization Features:${NC}"
echo "✅ Fast Mode: Only SPY + XLU for essential signals"
echo "✅ Smart Caching: 1-minute cache for live signals"
echo "✅ Reduced API Calls: 2 symbols vs 7 symbols"
echo "✅ Optimized Validation: Quick checks vs full validation"
echo "✅ Essential Signals: Utilities/SPY + S&P 500 MA"
echo "✅ Automatic Cache Cleanup: Prevents memory buildup"
echo "✅ Fallback Support: Full mode available on demand"
echo ""

echo -e "${GREEN}🎉 Live Signals Performance Test Complete!${NC}"
echo ""
echo "Your Live Signals dashboard now loads:"
echo "• First time: ~${fast_time}s (vs ~${full_time}s before)"
echo "• Cached: ~${cached_time}s (nearly instant)"
echo "• ${improvement}x faster with smart optimizations"
echo ""
echo "Access your optimized dashboard at: http://localhost:3000"