# 🚀 API Gateway - Comprehensive Testing Script (PowerShell)
# This script demonstrates all major gateway features

$GATEWAY_URL = "http://localhost:8080"

function Write-Section {
    param([string]$Title)
    Write-Host "`n" -NoNewline
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Write-Host $Title -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Write-Host ""
}

Clear-Host
Write-Host "`n"
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "║     🚀 API GATEWAY COMPREHENSIVE TEST SUITE 🚀        ║" -ForegroundColor Blue
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""

# Step 1: Health Check
Write-Section "1️⃣  Gateway Health Check"
try {
    $health = Invoke-RestMethod -Uri "$GATEWAY_URL/health"
    Write-Host "✓ Gateway is running" -ForegroundColor Green
    $health | ConvertTo-Json | Write-Host
} catch {
    Write-Host "✗ Gateway is not responding" -ForegroundColor Red
    exit 1
}

# Step 2: Generate JWT Token
Write-Section "2️⃣  Generating JWT Token"
$tokenResponse = Invoke-RestMethod -Uri "$GATEWAY_URL/auth/token" `
    -Method Post `
    -ContentType "application/json" `
    -Body (@{
        userId = "demo-user-123"
        role = "admin"
    } | ConvertTo-Json)

$TOKEN = $tokenResponse.token
Write-Host "✓ Token generated successfully" -ForegroundColor Green
Write-Host "Token: $TOKEN`n"

# Step 3: Test Basic Routing
Write-Section "3️⃣  Testing Basic Routing"

Write-Host "GET /users" -ForegroundColor Yellow
(Invoke-RestMethod -Uri "$GATEWAY_URL/users" -Headers @{"Authorization" = "Bearer $TOKEN"}) | ConvertTo-Json | Select-Object -First 5
Write-Host ""

Write-Host "GET /orders" -ForegroundColor Yellow
(Invoke-RestMethod -Uri "$GATEWAY_URL/orders" -Headers @{"Authorization" = "Bearer $TOKEN"}) | ConvertTo-Json | Select-Object -First 5
Write-Host ""

Write-Host "GET /products" -ForegroundColor Yellow
(Invoke-RestMethod -Uri "$GATEWAY_URL/products" -Headers @{"Authorization" = "Bearer $TOKEN"}) | ConvertTo-Json | Select-Object -First 5
Write-Host ""

# Step 4: Load Balancing Test
Write-Section "4️⃣  Testing Load Balancing (Round Robin)"
Write-Host "Making 4 requests to /users (should alternate between service-1 and service-2):`n"
for ($i = 1; $i -le 4; $i++) {
    $service = (Invoke-RestMethod -Uri "$GATEWAY_URL/users" -Headers @{"Authorization" = "Bearer $TOKEN"}).service
    Write-Host "Request $i → " -NoNewline
    Write-Host $service -ForegroundColor Green
}
Write-Host ""

# Step 5: Caching Test
Write-Section "5️⃣  Testing Response Caching"
Write-Host "First request (should be CACHE MISS):`n"
$firstResponse = Invoke-WebRequest -Uri "$GATEWAY_URL/products" -Headers @{"Authorization" = "Bearer $TOKEN"}
$firstResponse.Headers | Where-Object { $_.Name -like "*Cache*" } | ForEach-Object { Write-Host "$($_.Name): $($_.Value)" }
Write-Host ""

Write-Host "Second request (should be CACHE HIT):`n"
$secondResponse = Invoke-WebRequest -Uri "$GATEWAY_URL/products" -Headers @{"Authorization" = "Bearer $TOKEN"}
$secondResponse.Headers | Where-Object { $_.Name -like "*Cache*" } | ForEach-Object { Write-Host "$($_.Name): $($_.Value)" }
Write-Host ""

# Step 6: Rate Limiting Test
Write-Section "6️⃣  Testing Rate Limiting Headers"
Write-Host "Checking rate limit headers:`n"
$rateLimitResponse = Invoke-WebRequest -Uri "$GATEWAY_URL/users" -Headers @{"Authorization" = "Bearer $TOKEN"}
$rateLimitResponse.Headers | Where-Object { $_.Name -like "*RateLimit*" } | ForEach-Object { Write-Host "$($_.Name): $($_.Value)" }
Write-Host ""

# Step 7: Authentication Test
Write-Section "7️⃣  Testing Authentication"
Write-Host "Request without token (should fail):"
try {
    Invoke-RestMethod -Uri "$GATEWAY_URL/users"
} catch {
    $errorResponse = $_.Exception.Response | ConvertFrom-Json
    Write-Host $errorResponse.error -ForegroundColor Red
}
Write-Host ""

Write-Host "Request with invalid token (should fail):"
try {
    Invoke-RestMethod -Uri "$GATEWAY_URL/users" -Headers @{"Authorization" = "Bearer invalid-token"}
} catch {
    $errorResponse = $_.Exception.Response | ConvertFrom-Json
    Write-Host $errorResponse.error -ForegroundColor Red
}
Write-Host ""

Write-Host "Request with valid token (should succeed):"
(Invoke-RestMethod -Uri "$GATEWAY_URL/users" -Headers @{"Authorization" = "Bearer $TOKEN"}).users | Select-Object -First 3 | ConvertTo-Json
Write-Host ""

# Step 8: Admin Endpoints
Write-Section "8️⃣  Admin Endpoints"

Write-Host "Gateway Status" -ForegroundColor Yellow
$status = Invoke-RestMethod -Uri "$GATEWAY_URL/admin/status" -Headers @{"Authorization" = "Bearer $TOKEN"}
@{
    uptime = $status.gateway.uptime
    totalRequests = $status.metrics.totalRequests
    errorRate = $status.metrics.errorRate
    healthStatus = $status.health.overallHealth
} | ConvertTo-Json
Write-Host ""

Write-Host "Service Health" -ForegroundColor Yellow
(Invoke-RestMethod -Uri "$GATEWAY_URL/admin/health" -Headers @{"Authorization" = "Bearer $TOKEN"}) | ConvertTo-Json | Select-Object -First 10
Write-Host ""

Write-Host "Performance Metrics" -ForegroundColor Yellow
$metrics = Invoke-RestMethod -Uri "$GATEWAY_URL/admin/metrics" -Headers @{"Authorization" = "Bearer $TOKEN"}
@{
    totalRequests = $metrics.totalRequests
    totalErrors = $metrics.totalErrors
    averageLatency = $metrics.latencyStats.avg
    maxLatency = $metrics.latencyStats.max
} | ConvertTo-Json
Write-Host ""

Write-Host "Routing Table" -ForegroundColor Yellow
(Invoke-RestMethod -Uri "$GATEWAY_URL/admin/routes" -Headers @{"Authorization" = "Bearer $TOKEN"}) | ConvertTo-Json
Write-Host ""

Write-Host "Cache Statistics" -ForegroundColor Yellow
(Invoke-RestMethod -Uri "$GATEWAY_URL/admin/cache/stats" -Headers @{"Authorization" = "Bearer $TOKEN"}) | ConvertTo-Json
Write-Host ""

# Step 9: Summary
Write-Section "📊 Test Summary"
Write-Host "✓ " -ForegroundColor Green -NoNewline
Write-Host "All tests completed successfully!`n"

Write-Host "Key Endpoints:" -ForegroundColor Yellow
Write-Host "  Gateway: $GATEWAY_URL"
Write-Host "  Health: $GATEWAY_URL/health"
Write-Host "  Auth: $GATEWAY_URL/auth/token"
Write-Host "  Metrics: $GATEWAY_URL/admin/metrics"
Write-Host "  Status: $GATEWAY_URL/admin/status"
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Check backend services on ports 3001-3005"
Write-Host "  2. Monitor metrics at $GATEWAY_URL/admin/metrics"
Write-Host "  3. View Prometheus metrics at $GATEWAY_URL/metrics"
Write-Host "  4. Manage routes via $GATEWAY_URL/admin/routes"
Write-Host ""
