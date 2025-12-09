# 🏗️ API Gateway Architecture & Design

## System Overview

```
                    ┌─────────────────────────────────────┐
                    │        CLIENT APPLICATIONS          │
                    └──────────────────┬──────────────────┘
                                       │
                                       ▼
                    ┌─────────────────────────────────────┐
                    │   API GATEWAY (Port 8080)           │
                    │  ┌─────────────────────────────────┤
                    │  │ MIDDLEWARE LAYER                │
                    │  │ • Logging & Metrics             │
                    │  │ • CORS & Headers                │
                    │  │ • Rate Limiting                 │
                    │  │ • Authentication (JWT/API Key)  │
                    │  │ • Caching                       │
                    │  └─────────────────────────────────┤
                    │  ┌─────────────────────────────────┤
                    │  │ CORE ROUTING LAYER              │
                    │  │ • Route Matching                │
                    │  │ • Load Balancing                │
                    │  │ • Health Checking               │
                    │  │ • Reverse Proxy                 │
                    │  └─────────────────────────────────┤
                    └──────────────┬──────────────────────┘
                                   │
                ┌──────────────────┼──────────────────┐
                │                  │                  │
                ▼                  ▼                  ▼
        ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
        │ USER SERVICE    │ │ ORDER SERVICE   │ │ PRODUCT SERVICE │
        │ (3001-3002)     │ │ (3003)          │ │ (3004)          │
        └─────────────────┘ └─────────────────┘ └─────────────────┘
                │
                ▼
        ┌─────────────────┐
        │ STATS SERVICE   │
        │ (3005)          │
        └─────────────────┘
```

## Component Architecture

### 1️⃣ Request Flow

```
Request
  ↓
Logger & Metrics Collection
  ↓
Rate Limiter (IP & User-based)
  ↓
Authentication (JWT/API Key)
  ↓
Cache Lookup
  ├─ Cache Hit → Return Cached Response
  └─ Cache Miss → Continue
  ↓
Route Matching
  ↓
Load Balancer (Round Robin/Weighted/Least Connections)
  ↓
Health Check (Verify Service Health)
  ├─ Unhealthy → Try Next Service
  └─ Healthy → Continue
  ↓
Reverse Proxy
  ├─ Track Connection
  ├─ Add Headers
  ├─ Forward Request
  └─ Wait for Response
  ↓
Cache Response (if GET request)
  ↓
Log Response & Metrics
  ↓
Return to Client
```

### 2️⃣ Middleware Stack

```javascript
app.use(cors());
app.use(express.json());
app.use(logger);                    // Morgan logging
app.use(metricsMiddleware);         // Metrics collection
app.use(rateLimiter());             // Rate limiting
app.use(authenticate);              // JWT/API Key auth
app.use(cacheMiddleware);           // Cache lookup
app.use(cacheInvalidationMiddleware); // Cache invalidation for writes
app.use(routeRequest);              // Main routing handler
```

### 3️⃣ Load Balancing Algorithms

#### Round Robin
```
Request 1 → Service A
Request 2 → Service B
Request 3 → Service A
Request 4 → Service B
```

#### Weighted Round Robin
```
Service A (weight: 2) → Gets 2x traffic
Service B (weight: 1) → Gets 1x traffic

Request 1 → Service A
Request 2 → Service A
Request 3 → Service B
Request 4 → Service A
Request 5 → Service A
Request 6 → Service B
```

#### Least Connections
```
Service A (2 active connections)
Service B (5 active connections)

New Request → Service A (fewer connections)
```

### 4️⃣ Authentication Flow

```
Client Request
  ↓
Extract Token from Header
  ├─ Authorization: Bearer <JWT>
  └─ X-API-Key: <key>
  ↓
Validate Token/Key
  ├─ JWT: Check signature, expiration
  └─ API Key: Check against valid keys
  ├─ Invalid → 401/403 Error
  └─ Valid → Continue
  ↓
Decode Token
  ├─ Extract: userId, role, scopes
  └─ Attach to req.user
  ↓
Inject Headers
  ├─ X-User-ID: <userId>
  ├─ X-User-Role: <role>
  └─ X-Authenticated: true
  ↓
Forward to Backend Service
```

### 5️⃣ Caching Strategy

```
GET Request
  ↓
Check Cache Key
  ├─ Not Found → Miss
  └─ Found → Check Expiration
      ├─ Expired → Miss
      └─ Valid → Hit (Return immediately)
  ↓
Intercept Response (Cache Miss)
  ↓
Parse JSON Response
  ↓
Store in Cache with TTL
  ├─ /products: 5 minutes
  ├─ /stats: 10 minutes
  └─ /users: 2 minutes
  ↓
Return Response to Client
  ↓
POST/PUT/DELETE Request
  ↓
Invalidate Related Caches
  ↓
Forward Request
```

### 6️⃣ Health Check System

```
Every 10 seconds
  ↓
For Each Service
  ├─ Send GET /health request
  ├─ Track response time
  └─ Check status code (2xx = healthy)
  ↓
Update Service Status
  ├─ Success → Mark healthy
  │   ├─ Reset consecutive failures
  │   └─ Restart if was unhealthy
  └─ Failure → Increment failure counter
      ├─ 1 failure → Warning
      ├─ 3 failures → Mark unhealthy
      └─ Service excluded from load balancing
  ↓
Remove Unhealthy Services from Load Balancer
  ↓
Retry health checks
```

## Data Structures

### Rate Limiter State

```javascript
{
  'ip:192.168.1.1': [timestamp1, timestamp2, timestamp3, ...],
  'user:user123': [timestamp1, timestamp2, ...],
  // Timestamps within sliding window (60 seconds)
}
```

### Service Health State

```javascript
{
  'http://localhost:3001': {
    healthy: true,
    lastChecked: Date,
    consecutiveFailures: 0,
    lastFailureTime: null
  },
  'http://localhost:3002': {
    healthy: false,
    lastChecked: Date,
    consecutiveFailures: 5,
    lastFailureTime: Date
  }
}
```

### Cache State

```javascript
{
  '/users': { users: [...], timestamp: Date },
  '/products': { products: [...], timestamp: Date },
  // Key: URL, Value: Cached response
}

// Metadata
{
  '/users': { cachedAt: Date, expiresAt: Date },
  '/products': { cachedAt: Date, expiresAt: Date }
}
```

### Metrics State

```javascript
{
  totalRequests: 1250,
  totalErrors: 12,
  requestsByService: {
    'http://localhost:3001': 450,
    'http://localhost:3002': 400
  },
  requestsByStatus: {
    '200': 1200,
    '500': 5,
    '429': 7
  },
  latencyStats: {
    min: 15,
    max: 2340,
    total: 306250,
    count: 1250,
    avg: 245
  }
}
```

## Admin API Architecture

### Health Management
```
GET  /admin/health              - Overall health
GET  /admin/health/services     - Service details
POST /admin/health/check        - Trigger check
PUT  /admin/health/:service     - Override status
```

### Metrics & Monitoring
```
GET  /admin/metrics             - JSON metrics
GET  /metrics                   - Prometheus format
GET  /admin/status              - Dashboard
GET  /admin/loadbalancer/stats  - LB stats
GET  /admin/ratelimiter/stats   - Rate limit stats
```

### Route Management
```
GET    /admin/routes            - View all
PUT    /admin/routes/:path      - Update
DELETE /admin/routes/:path      - Delete
```

### Cache Management
```
GET  /admin/cache/stats         - Cache stats
GET  /admin/cache/details       - Cached items
POST /admin/cache/clear         - Clear cache
```

## Performance Characteristics

### Latency Profile
- **Cache Hit**: ~5-10ms (no backend call)
- **Service Response**: ~50-500ms (varies by service)
- **Rate Limit Check**: <1ms
- **Auth Verification**: ~2-5ms
- **Total Overhead**: ~10-20ms per request

### Memory Usage
- **Per Service**: ~1KB (health state)
- **Per Cache Entry**: ~1-10KB (depends on response size)
- **Rate Limiter**: ~100 bytes per unique IP/user
- **Metrics**: ~1-5KB (aggregate stats)

### Throughput (Single Instance)
- **Uncached Requests**: 100-500 req/sec (depends on backend)
- **Cached Requests**: 5000-10000 req/sec (limited by rate limiter)

## Scalability Considerations

### Horizontal Scaling
```
                    ┌──────────────────┐
                    │  Load Balancer   │
                    │   (nginx/HAProxy)│
                    └────┬───────┬─────┘
                         │       │
        ┌────────────────┴─┐   ┌─┴──────────────────┐
        ▼                  ▼   ▼                     ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
    │ Gateway 1  │  │ Gateway 2  │  │ Gateway 3  │  │ Gateway 4  │
    └────────────┘  └────────────┘  └────────────┘  └────────────┘
        │
        └─────→ Distributed Cache (Redis)
        │
        └─────→ Distributed Metrics (Prometheus)
        │
        └─────→ Centralized Logging (ELK Stack)
```

### Recommended Improvements for Production
1. **Distributed Cache** - Replace in-memory with Redis
2. **Distributed Rate Limiter** - Use Redis for shared state
3. **Service Discovery** - Integrate with Consul/Eureka
4. **Circuit Breaker** - Add resilience patterns
5. **Request Tracing** - Implement OpenTelemetry
6. **Config Server** - Externalize configuration
7. **Metrics Export** - Full Prometheus integration

## Security Features

### Authentication Layers
```
Public Routes (no auth required)
  └─ /health
  └─ /metrics

Protected Routes (auth required)
  ├─ JWT with signature verification
  ├─ API Key validation
  └─ Role-based access control
```

### Rate Limiting Layers
```
Network Layer (IP-based)
  └─ 100 requests/minute per IP

Application Layer (User-based)
  └─ 200 requests/minute per user

Endpoint Layer (can be customized)
  └─ Different limits for different routes
```

## Error Handling

### Error Codes
```
401 - Unauthorized (no credentials)
403 - Forbidden (invalid credentials/insufficient permissions)
404 - Route not found
429 - Too many requests (rate limited)
502 - Bad gateway (backend service error)
503 - Service unavailable (no healthy services)
500 - Internal server error
```

### Error Recovery
```
Backend Service Timeout
  ↓
Proxy Error Handler
  ↓
Mark Service as Unhealthy
  ↓
Retry with Next Service
  ↓
If All Fail → 503 Response
```

## Testing Strategy

### Unit Tests
- Load balancer algorithms
- Rate limiter logic
- Auth validation
- Cache operations

### Integration Tests
- End-to-end request flow
- Load balancing distribution
- Cache behavior
- Rate limit enforcement

### Load Tests
- Concurrent requests
- Sustained throughput
- Cache hit rates
- Memory usage under load

---

**This architecture is designed for reliability, performance, and maintainability at scale.**
