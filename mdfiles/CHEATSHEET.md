# 🎯 API Gateway - Cheat Sheet

## 🚀 Start Commands

```bash
# Install dependencies
npm install

# Terminal 1: Start backend services (ports 3001-3005)
npm run test:services

# Terminal 2: Start gateway (port 8080)
npm run dev

# Terminal 3: Run tests
node tests/integrationTests.js
```

## 🔐 Get JWT Token

```bash
curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "role": "admin"}'

# Save token to variable
TOKEN=$(curl -s -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "role": "admin"}' | jq -r '.token')
```

## 🌐 Test Routes

```bash
# Gateway endpoints (requires token)
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/users
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/orders
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/products
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/stats

# Direct service endpoints (no auth)
curl http://localhost:3001/users
curl http://localhost:3002/users
curl http://localhost:3003/orders
curl http://localhost:3004/products
curl http://localhost:3005/stats
```

## 📊 View Metrics

```bash
# Overall metrics
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/admin/metrics | jq

# Prometheus format
curl http://localhost:8080/metrics

# Service health
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/admin/health | jq

# Gateway status dashboard
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/admin/status | jq

# Load balancer stats
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/admin/loadbalancer/stats | jq

# Rate limiter stats
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/admin/ratelimiter/stats | jq
```

## 🛠️ Admin Operations

### Routes Management
```bash
# View all routes
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/admin/routes | jq

# Add new route
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"services": ["http://localhost:3001", "http://localhost:3002"]}' \
  http://localhost:8080/admin/routes/users

# Delete route
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/admin/routes/users
```

### Cache Management
```bash
# Cache statistics
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/admin/cache/stats | jq

# Detailed cache info
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/admin/cache/details | jq

# Clear all cache
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/admin/cache/clear

# Clear cache for pattern
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pattern": "/users"}' \
  http://localhost:8080/admin/cache/clear
```

### Health Management
```bash
# Health summary
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/admin/health | jq

# Detailed service health
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/admin/health/services | jq

# Trigger health check
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/admin/health/check

# Set service as healthy/unhealthy
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"healthy": false}' \
  http://localhost:8080/admin/health/http://localhost:3001
```

## 🔍 Test Features

### Cache Testing
```bash
# First request (cache miss)
curl -i -H "Authorization: Bearer $TOKEN" http://localhost:8080/products | grep "X-Cache"

# Second request (cache hit)
curl -i -H "Authorization: Bearer $TOKEN" http://localhost:8080/products | grep "X-Cache"
```

### Load Balancing
```bash
# Run 4 times, should alternate between service-1 and service-2
for i in {1..4}; do
  curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/users | jq '.service'
done
```

### Rate Limiting
```bash
# Check rate limit headers
curl -i -H "Authorization: Bearer $TOKEN" http://localhost:8080/users | grep "X-RateLimit"

# Make 100+ rapid requests to trigger limit (returns 429)
for i in {1..150}; do
  curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/users > /dev/null
done
```

### Authentication
```bash
# No token (401)
curl http://localhost:8080/users

# Invalid token (403)
curl -H "Authorization: Bearer invalid" http://localhost:8080/users

# Valid token (200)
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/users
```

## 🐳 Docker Commands

```bash
# Build image
docker build -t api-gateway:latest .

# Run container
docker run -p 8080:8080 api-gateway:latest

# Docker Compose
docker-compose up gateway                    # Gateway only
docker-compose --profile services up         # Gateway + services
docker-compose down                          # Stop all
docker-compose logs -f gateway               # View logs
```

## 📝 Configuration Files

### config/routes.json
```json
{
  "/users": ["http://localhost:3001", "http://localhost:3002"],
  "/orders": ["http://localhost:3003"],
  "/products": ["http://localhost:3004"]
}
```

### .env
```bash
NODE_ENV=development
PORT=8080
JWT_SECRET=your-secret-key
VALID_API_KEYS=test-api-key-123
HEALTH_CHECK_INTERVAL=10000
RATE_LIMIT_IP=100
RATE_LIMIT_USER=200
```

## 🎮 Test Backend Services

Each test service has these endpoints:

```bash
GET  /health                # Service health
GET  /users                 # List users
GET  /users/:id             # Get user
GET  /orders                # List orders
GET  /products              # List products
GET  /stats                 # Get stats
GET  /slow/:delay           # Simulated delay
GET  /echo/headers          # Echo headers
GET  /error/:code           # Simulate error
```

## 🔗 Port Reference

| Service | Port | Purpose |
|---------|------|---------|
| API Gateway | 8080 | Main gateway |
| User Service 1 | 3001 | Microservice |
| User Service 2 | 3002 | Microservice |
| Order Service | 3003 | Microservice |
| Product Service | 3004 | Microservice |
| Stats Service | 3005 | Microservice |

## 🚨 Common Issues

### Gateway won't start
```bash
# Check if port 8080 is in use
lsof -i :8080

# Use different port
PORT=9000 npm start
```

### Services not responding
```bash
# Check if services are running
curl http://localhost:3001/health

# Restart services
npm run test:services
```

### Rate limited
```bash
# Wait 60 seconds or reset metrics
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/admin/reset/metrics
```

### Cache not working
```bash
# Clear cache
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/admin/cache/clear

# Check cache stats
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/admin/cache/stats
```

## 📊 Quick Monitoring

```bash
# Monitor in real-time
watch -n 1 'curl -s -H "Authorization: Bearer '$TOKEN'" http://localhost:8080/admin/status | jq ".metrics"'

# OR with different pattern
while true; do
  clear
  echo "=== API Gateway Status ==="
  curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/admin/status | jq '.'
  sleep 2
done
```

## 🔐 Authentication Types

### JWT Token
```bash
curl -H "Authorization: Bearer <token>" http://localhost:8080/endpoint
```

### API Key
```bash
curl -H "X-Api-Key: test-api-key-123" http://localhost:8080/endpoint
```

## 📈 Performance Testing

### Throughput Test
```bash
# Install Apache Bench
# On macOS: brew install httpd
# On Linux: apt-get install apache2-utils

# Run 10,000 requests with 100 concurrent
ab -n 10000 -c 100 -H "Authorization: Bearer $TOKEN" http://localhost:8080/users
```

### Load Test with Wrk
```bash
# Install: https://github.com/wg/wrk

# 4 threads, 100 connections, 30 seconds
wrk -t4 -c100 -d30s -H "Authorization: Bearer $TOKEN" http://localhost:8080/users
```

## 🎯 Development Workflow

```bash
# 1. Check gateway health
curl http://localhost:8080/health

# 2. Get token
TOKEN=$(curl -s -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{"userId": "dev", "role": "admin"}' | jq -r '.token')

# 3. Test routing
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/users

# 4. Monitor metrics
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/admin/metrics | jq '.totalRequests'

# 5. Check health
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/admin/health
```

## 📚 Documentation Links

| Resource | Location |
|----------|----------|
| Full Docs | README.md |
| Quick Start | QUICK_START.md |
| Architecture | ARCHITECTURE.md |
| Deployment | DEPLOYMENT.md |
| Setup Status | SETUP_COMPLETE.md |

---

**Pro Tip**: Create alias for common commands
```bash
alias gtoken='curl -s -X POST http://localhost:8080/auth/token -H "Content-Type: application/json" -d "{\"userId\": \"dev\", \"role\": \"admin\"}" | jq -r ".token"'
alias gmetrics='curl -s -H "Authorization: Bearer $(gtoken)" http://localhost:8080/admin/metrics | jq'
```

