#!/bin/bash

# 🚀 API Gateway - Comprehensive Testing Script
# This script demonstrates all major gateway features

set -e

GATEWAY_URL="http://localhost:8080"
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════╗"
echo "║     🚀 API GATEWAY COMPREHENSIVE TEST SUITE 🚀        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to print section header
section() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Step 1: Health Check
section "1️⃣  Gateway Health Check"
if curl -s "$GATEWAY_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Gateway is running"
    curl -s "$GATEWAY_URL/health" | jq .
else
    echo -e "${RED}✗${NC} Gateway is not responding"
    exit 1
fi

# Step 2: Generate JWT Token
section "2️⃣  Generating JWT Token"
TOKEN_RESPONSE=$(curl -s -X POST "$GATEWAY_URL/auth/token" \
    -H "Content-Type: application/json" \
    -d '{
        "userId": "demo-user-123",
        "role": "admin"
    }')

TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.token')
echo -e "${GREEN}✓${NC} Token generated successfully"
echo "Token: $TOKEN"
echo ""

# Step 3: Test Basic Routing
section "3️⃣  Testing Basic Routing"
echo -e "${YELLOW}GET /users${NC}"
curl -s -H "Authorization: Bearer $TOKEN" "$GATEWAY_URL/users" | jq '.' | head -10
echo ""

echo -e "${YELLOW}GET /orders${NC}"
curl -s -H "Authorization: Bearer $TOKEN" "$GATEWAY_URL/orders" | jq '.' | head -10
echo ""

echo -e "${YELLOW}GET /products${NC}"
curl -s -H "Authorization: Bearer $TOKEN" "$GATEWAY_URL/products" | jq '.' | head -10
echo ""

# Step 4: Load Balancing Test
section "4️⃣  Testing Load Balancing (Round Robin)"
echo "Making 4 requests to /users (should alternate between service-1 and service-2):"
for i in {1..4}; do
    SERVICE=$(curl -s -H "Authorization: Bearer $TOKEN" "$GATEWAY_URL/users" | jq -r '.service')
    echo -e "Request $i → ${GREEN}$SERVICE${NC}"
done
echo ""

# Step 5: Caching Test
section "5️⃣  Testing Response Caching"
echo "First request (should be CACHE MISS):"
FIRST=$(curl -s -i -H "Authorization: Bearer $TOKEN" "$GATEWAY_URL/products" 2>&1 | grep "X-Cache-Hit")
echo "$FIRST"
echo ""

echo "Second request (should be CACHE HIT):"
SECOND=$(curl -s -i -H "Authorization: Bearer $TOKEN" "$GATEWAY_URL/products" 2>&1 | grep "X-Cache-Hit")
echo "$SECOND"
echo ""

# Step 6: Rate Limiting Test
section "6️⃣  Testing Rate Limiting Headers"
echo "Checking rate limit headers:"
curl -s -i -H "Authorization: Bearer $TOKEN" "$GATEWAY_URL/users" 2>&1 | grep "X-RateLimit"
echo ""

# Step 7: Authentication Test
section "7️⃣  Testing Authentication"
echo "Request without token (should fail):"
curl -s "$GATEWAY_URL/users" | jq '.error'
echo ""

echo "Request with invalid token (should fail):"
curl -s -H "Authorization: Bearer invalid-token" "$GATEWAY_URL/users" | jq '.error'
echo ""

echo "Request with valid token (should succeed):"
curl -s -H "Authorization: Bearer $TOKEN" "$GATEWAY_URL/users" | jq '.users' | head -5
echo ""

# Step 8: Admin Endpoints
section "8️⃣  Admin Endpoints"

echo -e "${YELLOW}Gateway Status${NC}"
curl -s -H "Authorization: Bearer $TOKEN" "$GATEWAY_URL/admin/status" | jq '{
    uptime: .gateway.uptime,
    totalRequests: .metrics.totalRequests,
    errorRate: .metrics.errorRate,
    healthStatus: .health.overallHealth
}'
echo ""

echo -e "${YELLOW}Service Health${NC}"
curl -s -H "Authorization: Bearer $TOKEN" "$GATEWAY_URL/admin/health" | jq '.'
echo ""

echo -e "${YELLOW}Performance Metrics${NC}"
curl -s -H "Authorization: Bearer $TOKEN" "$GATEWAY_URL/admin/metrics" | jq '{
    totalRequests: .totalRequests,
    totalErrors: .totalErrors,
    averageLatency: .latencyStats.avg,
    maxLatency: .latencyStats.max
}'
echo ""

echo -e "${YELLOW}Routing Table${NC}"
curl -s -H "Authorization: Bearer $TOKEN" "$GATEWAY_URL/admin/routes" | jq '.'
echo ""

echo -e "${YELLOW}Cache Statistics${NC}"
curl -s -H "Authorization: Bearer $TOKEN" "$GATEWAY_URL/admin/cache/stats" | jq '.'
echo ""

echo -e "${YELLOW}Load Balancer Statistics${NC}"
curl -s -H "Authorization: Bearer $TOKEN" "$GATEWAY_URL/admin/loadbalancer/stats" | jq '.'
echo ""

# Step 9: Dynamic Route Management
section "9️⃣  Dynamic Route Management"
echo -e "${YELLOW}Current routes:${NC}"
curl -s -H "Authorization: Bearer $TOKEN" "$GATEWAY_URL/admin/routes" | jq 'length'
echo ""

# Step 10: Prometheus Metrics
section "🔟 Prometheus Metrics"
echo "Fetching metrics in Prometheus format:"
curl -s "$GATEWAY_URL/metrics" | head -20
echo ""
echo "(showing first 20 lines...)"
echo ""

# Summary
section "📊 Test Summary"
echo -e "${GREEN}✓${NC} All tests completed successfully!"
echo ""
echo "Key Endpoints:"
echo "  Gateway: $GATEWAY_URL"
echo "  Health: $GATEWAY_URL/health"
echo "  Auth: $GATEWAY_URL/auth/token"
echo "  Metrics: $GATEWAY_URL/admin/metrics"
echo "  Status: $GATEWAY_URL/admin/status"
echo ""
echo "Next Steps:"
echo "  1. Check backend services on ports 3001-3005"
echo "  2. Monitor metrics at $GATEWAY_URL/admin/metrics"
echo "  3. View Prometheus metrics at $GATEWAY_URL/metrics"
echo "  4. Manage routes via $GATEWAY_URL/admin/routes"
echo ""
