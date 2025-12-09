# 🚀 Quick Start Guide - API Gateway

## First Time Setup (5 minutes)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Terminal Setup
Open 3 terminals in your project directory:

**Terminal 1 - Backend Services:**
```bash
npm run test:services
```
Wait for all 5 services to start (ports 3001-3005)

**Terminal 2 - Gateway:**
```bash
npm run dev
```
Gateway will start on http://localhost:8080

**Terminal 3 - Testing:**
```bash
# Get a JWT token
curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user", "role": "admin"}'
```

## Quick Commands

### 1️⃣ Generate Token
```bash
TOKEN=$(curl -s -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "role": "admin"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "Your token: $TOKEN"
```

### 2️⃣ Test Basic Routing
```bash
# Substitute your token above
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/users
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/orders
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/products
```

### 3️⃣ Check Gateway Health
```bash
curl http://localhost:8080/health

curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/admin/health
```

### 4️⃣ View Metrics
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/admin/metrics
```

### 5️⃣ Run Integration Tests
```bash
node tests/integrationTests.js
```

## Key Features Demo

### Load Balancing
Make multiple requests to `/users` - notice it alternates between service-1 and service-2:
```bash
for i in {1..5}; do
  curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/users | grep service
done
```

### Caching
First request (cache miss), second request (cache hit):
```bash
curl -i -H "Authorization: Bearer $TOKEN" http://localhost:8080/products | grep "X-Cache"
curl -i -H "Authorization: Bearer $TOKEN" http://localhost:8080/products | grep "X-Cache"
```

### Rate Limiting
Headers show remaining requests:
```bash
curl -i -H "Authorization: Bearer $TOKEN" http://localhost:8080/users | grep "X-RateLimit"
```

### Authentication
Without token (rejected):
```bash
curl http://localhost:8080/users
# Returns 401 Unauthorized
```

With invalid token (rejected):
```bash
curl -H "Authorization: Bearer invalid" http://localhost:8080/users
# Returns 403 Forbidden
```

## Admin Dashboard

View gateway status:
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/admin/status | jq
```

## Troubleshooting

**Services won't start?**
- Check if ports 3001-3005 are available
- Try: `lsof -i :3001`

**Gateway won't start?**
- Check if port 8080 is available
- Check Node version: `node --version` (should be 18+)

**Token expired?**
- Generate a new one with the command in Step 1

**Rate limited?**
- Reset with: `curl -X POST -H "Authorization: Bearer $TOKEN" http://localhost:8080/admin/reset/metrics`

## Next Steps

1. Read full README.md for all features
2. Check config/routes.json to modify routes
3. Look at src/ files to understand architecture
4. Run `npm run test:services` and `npm run dev` in production with proper env vars

## Production Deployment

```bash
# Set environment variables
export NODE_ENV=production
export PORT=8080
export JWT_SECRET=your-production-secret

# Install production dependencies only
npm install --production

# Start gateway
npm start
```

With Docker:
```bash
docker build -t api-gateway:latest .
docker run -p 8080:8080 \
  -e JWT_SECRET="your-secret" \
  api-gateway:latest
```

---

**Happy coding! 🎉**
