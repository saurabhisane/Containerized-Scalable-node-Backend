# 🚀 Advanced API Gateway with Load Balancing & Authentication

A production-ready API Gateway built with Node.js/Express that demonstrates enterprise-level patterns for routing, load balancing, authentication, rate limiting, caching, and monitoring.

## 📋 Features

### ✅ Core Gateway Features
- **Reverse Proxy** - Forward requests to multiple backend services
- **Dynamic Routing** - Flexible route configuration and management
- **Load Balancing** - Multiple algorithms (Round Robin, Weighted, Least Connections)
- **Service Health Checks** - Continuous monitoring of backend services
- **Request Forwarding** - Preserve headers and user context

### 🔐 Security & Authentication
- **JWT Authentication** - Token-based access with signature validation
- **API Key Support** - Service-to-service authentication
- **Role-Based Access Control** - Authorize based on user roles
- **Rate Limiting** - Token bucket and sliding window algorithms
- **IP & User-based Limits** - Different thresholds per request source

### ⚡ Performance & Caching
- **Response Caching** - TTL-based caching for GET requests
- **Selective Caching** - Configure which routes to cache
- **Cache Invalidation** - Automatic invalidation on write operations
- **Connection Pooling** - Efficient resource management

### 📊 Observability
- **Request Logging** - Morgan-based logging with custom metrics
- **Performance Metrics** - Latency, throughput, and error tracking
- **Service Metrics** - Per-service request counts and latencies
- **Prometheus Integration** - Metrics endpoint for monitoring systems
- **Health Dashboards** - Real-time gateway status overview

### 🛠️ Admin Features
- **Dynamic Route Management** - Add/update/delete routes without restart
- **Service Health Control** - Manually trigger health checks or override status
- **Metrics & Stats** - View detailed performance and health data
- **Cache Management** - Clear cache and view cached items
- **Load Balancer Stats** - Monitor connection distribution

## 📁 Project Structure

```
/api-gateway
  /config
    routes.json              # Route configuration
  /src
    index.js                 # Main gateway server
    router.js                # Request routing & reverse proxy
    loadBalancer.js          # Load balancing algorithms
    auth.js                  # Authentication & authorization
    rateLimiter.js           # Rate limiting
    cache.js                 # Response caching
    healthChecker.js         # Service health monitoring
    logger.js                # Logging & metrics collection
  /tests
    startBackendServices.js  # Test microservices
    integrationTests.js      # Gateway tests
  package.json
  Dockerfile
  docker-compose.yml
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone or navigate to project directory
cd api-gateway

# Install dependencies
npm install
```

### Local Development

**Terminal 1: Start Backend Services**
```bash
npm run test:services
```

This starts 5 test microservices on ports 3001-3005:
- User Service 1 (3001)
- User Service 2 (3002)
- Order Service (3003)
- Product Service (3004)
- Stats Service (3005)

**Terminal 2: Start Gateway**
```bash
npm run dev
```

Gateway runs on `http://localhost:8080`

**Terminal 3: Run Tests**
```bash
node tests/integrationTests.js
```

## 🔗 API Endpoints

### Authentication
```bash
# Generate JWT Token
curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "role": "admin"
  }'

# Response:
# {
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "expiresIn": "1h"
# }
```

### Protected Routes (Examples)
```bash
# Set your token
TOKEN="your-jwt-token-here"

# Route to Users Service (load balanced)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/users

# Route to Orders Service
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/orders

# Route to Products Service (cached)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/products

# Route to Stats Service
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/stats
```

### Admin Endpoints

**Health & Status**
```bash
# Overall health summary
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/admin/health

# Detailed service health
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/admin/health/services

# Gateway status dashboard
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/admin/status

# Trigger health check
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/admin/health/check
```

**Metrics & Performance**
```bash
# Performance metrics (JSON)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/admin/metrics

# Prometheus metrics (plaintext)
curl http://localhost:8080/metrics

# Load balancer statistics
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/admin/loadbalancer/stats

# Rate limiter statistics
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/admin/ratelimiter/stats
```

**Route Management**
```bash
# View all routes
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/admin/routes

# Add/update route
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"services": ["http://localhost:3001", "http://localhost:3002"]}' \
  http://localhost:8080/admin/routes/users

# Delete route
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/admin/routes/users
```

**Cache Management**
```bash
# Cache statistics
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/admin/cache/stats

# Detailed cache info
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/admin/cache/details

# Clear all cache
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/admin/cache/clear

# Clear cache for pattern
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pattern": "/users"}' \
  http://localhost:8080/admin/cache/clear
```

## 🐳 Docker Deployment

### Build & Run with Docker

```bash
# Build image
docker build -t api-gateway:latest .

# Run container
docker run -p 8080:8080 \
  -e JWT_SECRET="your-secret-key" \
  api-gateway:latest
```

### Docker Compose (with test services)

```bash
# Start only gateway
docker-compose up gateway

# Start gateway + all test services
docker-compose --profile services up

# Stop all services
docker-compose down

# View logs
docker-compose logs -f gateway
```

## ⚙️ Configuration

### Environment Variables

```bash
# Gateway
PORT=8080
NODE_ENV=production
JWT_SECRET=your-secret-key-change-in-production

# Authentication
VALID_API_KEYS=api-key-1,api-key-2,api-key-3

# Health Checks
HEALTH_CHECK_INTERVAL=10000      # milliseconds
HEALTH_CHECK_TIMEOUT=5000        # milliseconds
```

### Routes Configuration (config/routes.json)

```json
{
  "/users": [
    "http://localhost:3001",
    "http://localhost:3002"
  ],
  "/orders": [
    "http://localhost:3003"
  ],
  "/products": [
    "http://localhost:3004"
  ]
}
```

### Cache Configuration (in src/cache.js)

```javascript
const CACHEABLE_ROUTES = [
  '/products',
  '/stats',
  '/users'
];

const CACHE_DURATIONS = {
  '/products': 5 * 60 * 1000,  // 5 minutes
  '/stats': 10 * 60 * 1000,    // 10 minutes
  '/users': 2 * 60 * 1000      // 2 minutes
};
```

## 🔄 Load Balancing Strategies

### Round Robin (Default)
Distributes requests evenly across all healthy services.

```javascript
// Each service gets requests in sequence
Service 1 -> Service 2 -> Service 1 -> Service 2 -> ...
```

### Weighted Round Robin
Distributes based on service capacity/weight.

```javascript
const weights = {
  'service1': 1,
  'service2': 2   // Gets 2x more traffic
};
```

### Least Connections
Routes to the service with fewest active connections.

```javascript
// Always routes to service with minimum concurrent requests
```

## 🛡️ Security Features

### JWT Token Example

```bash
# Create token with admin role
TOKEN=$(curl -s -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{"userId": "admin1", "role": "admin"}' | jq -r '.token')

# Use token
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/admin/metrics
```

### Rate Limiting

- **100 requests/minute** per IP address
- **200 requests/minute** per authenticated user
- Sliding window algorithm

### Authentication Flow

```
1. Client requests token via /auth/token
2. Gateway validates credentials
3. Issues JWT with expiration
4. Client includes JWT in Authorization header
5. Gateway validates JWT signature & expiration
6. Injects user context into forwarded request
7. Downstream service receives user info via headers
```

## 📊 Monitoring & Observability

### Access Metrics

```bash
# Real-time metrics
curl http://localhost:8080/admin/metrics | jq

# Sample output:
{
  "totalRequests": 1250,
  "totalErrors": 12,
  "requestsByService": {
    "user-service-1": 450,
    "user-service-2": 400,
    "order-service": 350,
    "product-service": 50
  },
  "latencyStats": {
    "min": 15,
    "max": 2340,
    "avg": 245,
    "count": 1250
  }
}
```

### Prometheus Metrics

Import `http://localhost:8080/metrics` into Prometheus:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'api-gateway'
    static_configs:
      - targets: ['localhost:8080']
```

### Health Check

```bash
# Gateway health
curl http://localhost:8080/health

# Response:
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600
}
```

## 🧪 Testing

### Run Integration Tests

```bash
node tests/integrationTests.js
```

Tests cover:
- ✓ Basic routing
- ✓ Load balancing
- ✓ Response caching
- ✓ Rate limiting
- ✓ JWT authentication
- ✓ Admin endpoints

### Manual Testing

```bash
# Test endpoint with different delays
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/users/slow/500

# Echo request headers
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/users/echo/headers

# Simulate error response
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/users/error/503
```

## 🚨 Troubleshooting

### Gateway not starting
```bash
# Check if port 8080 is already in use
netstat -an | grep 8080

# Use different port
PORT=9000 npm start
```

### Services not responding
```bash
# Check service health
curl http://localhost:8080/admin/health

# Verify services are running
curl http://localhost:3001/health
curl http://localhost:3002/health
```

### Rate limiting too strict
```bash
# Adjust limits in src/rateLimiter.js
export function rateLimiter(ipLimit = 1000, userLimit = 5000, windowMs = 60000)
```

### Cache not working
```bash
# Check cache stats
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/admin/cache/stats

# Clear cache manually
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/admin/cache/clear
```

## 📚 Advanced Topics

### Custom Load Balancing Algorithm

```javascript
// In router.js
import { getNextTargetWeighted } from './loadBalancer.js';

const weights = {
  'http://localhost:3001': 2,  // Gets 2x traffic
  'http://localhost:3002': 1
};

const target = getNextTargetWeighted(path, services, weights);
```

### Adding New Routes Dynamically

```bash
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"services": ["http://new-service:3006"]}' \
  http://localhost:8080/admin/routes/newpath
```

### Custom Middleware

Add new middleware in `src/index.js`:

```javascript
app.use((req, res, next) => {
  // Your custom logic
  next();
});
```

## 🔗 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/token` | Generate JWT token |
| GET | `/health` | Gateway health check |
| GET | `/metrics` | Prometheus metrics |
| GET | `/admin/status` | Gateway status dashboard |
| GET | `/admin/metrics` | Performance metrics (JSON) |
| GET | `/admin/health` | Service health summary |
| GET | `/admin/health/services` | Detailed service health |
| POST | `/admin/health/check` | Trigger health checks |
| PUT | `/admin/health/:service` | Manually set service health |
| GET | `/admin/routes` | View routing table |
| PUT | `/admin/routes/:path` | Update route |
| DELETE | `/admin/routes/:path` | Delete route |
| GET | `/admin/cache/stats` | Cache statistics |
| GET | `/admin/cache/details` | Cached items details |
| POST | `/admin/cache/clear` | Clear cache |
| GET | `/admin/loadbalancer/stats` | Load balancer stats |
| GET | `/admin/ratelimiter/stats` | Rate limiter stats |

## 📈 Performance Tuning

### Connection Pooling
The HTTP proxy maintains connection pools. Tune in `src/router.js`:

```javascript
const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  timeout: 10000,
  keepAlive: true  // Enable connection reuse
});
```

### Cache Optimization
Increase TTLs for frequently accessed routes:

```javascript
const CACHE_DURATIONS = {
  '/products': 10 * 60 * 1000,  // Increase to 10 minutes
  '/stats': 15 * 60 * 1000      // Increase to 15 minutes
};
```

### Rate Limit Tuning
Adjust for your traffic patterns:

```javascript
// Higher limits for internal services
app.use('/internal/*', rateLimiter(1000, 5000, 60000));

// Lower limits for public endpoints
app.use('/public/*', rateLimiter(50, 100, 60000));
```

## 🤝 Contributing

Improvements welcome! Areas to enhance:
- Redis support for distributed caching
- OAuth2 token introspection
- Circuit breaker pattern
- Request tracing (OpenTelemetry)
- gRPC support
- Service discovery integration (Consul, Eureka)

## 📄 License

MIT

## 📞 Support

For issues, questions, or feature requests, create an issue in the repository.

---

**Built with ❤️ using Node.js, Express, and modern DevOps practices**
