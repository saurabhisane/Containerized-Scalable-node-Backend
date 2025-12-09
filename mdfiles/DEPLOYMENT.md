# 🚀 Deployment Guide - API Gateway

## Development Deployment

### Local Machine (macOS/Linux)

```bash
# Clone or navigate to project
cd api-gateway

# Install dependencies
npm install

# Start in separate terminals
# Terminal 1: Backend Services
npm run test:services

# Terminal 2: Gateway
npm run dev

# Terminal 3: Tests
node tests/integrationTests.js
```

### Local Machine (Windows)

```powershell
# Navigate to project
cd api-gateway

# Install dependencies
npm install

# Start in separate PowerShell windows
# Window 1: Backend Services
npm run test:services

# Window 2: Gateway
npm run dev

# Window 3: Tests (PowerShell)
.\test-gateway.ps1
```

## Docker Deployment

### Single Container (Gateway Only)

```bash
# Build image
docker build -t api-gateway:latest .

# Run container
docker run -d \
  --name api-gateway \
  -p 8080:8080 \
  -e NODE_ENV=production \
  -e JWT_SECRET="your-production-secret-key" \
  -e VALID_API_KEYS="api-key-1,api-key-2" \
  api-gateway:latest

# View logs
docker logs -f api-gateway

# Stop container
docker stop api-gateway
docker rm api-gateway
```

### Docker Compose (Gateway + Services)

```bash
# Build all services
docker-compose build

# Start only gateway
docker-compose up -d gateway

# Start gateway + test services
docker-compose --profile services up -d

# Stop all
docker-compose down

# View logs
docker-compose logs -f gateway
```

## Production Deployment

### Prerequisites
- Node.js 18+ or Docker
- Process manager (PM2 or systemd)
- Reverse proxy (nginx)
- Monitoring tools (Prometheus, Grafana)
- Log aggregation (ELK Stack)

### Step 1: Environment Setup

```bash
# Create .env file
cat > .env << EOF
NODE_ENV=production
PORT=8080
JWT_SECRET=$(openssl rand -hex 32)
VALID_API_KEYS=api-key-1,api-key-2
HEALTH_CHECK_INTERVAL=10000
HEALTH_CHECK_TIMEOUT=5000
EOF

# Protect the file
chmod 600 .env
```

### Step 2: Install Production Dependencies

```bash
# Install only production packages
npm ci --production

# Or if using npm install
npm install --production
```

### Step 3: Process Management with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'api-gateway',
    script: './src/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time_format: 'YYYY-MM-DD HH:mm:ss Z',
    restart_delay: 4000,
    max_memory_restart: '500M',
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 config for system startup
pm2 save
pm2 startup
```

### Step 4: Nginx Reverse Proxy Configuration

```nginx
upstream api_gateway {
    least_conn;
    server localhost:8080;
    server localhost:8081;  # if multiple instances
}

server {
    listen 80;
    server_name api.example.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    # SSL certificates
    ssl_certificate /etc/ssl/certs/api.example.com.crt;
    ssl_certificate_key /etc/ssl/private/api.example.com.key;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json;
    gzip_min_length 1000;

    # Rate limiting at nginx level
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
    limit_req zone=api_limit burst=20 nodelay;

    # Proxy settings
    location / {
        proxy_pass http://api_gateway;
        proxy_http_version 1.1;
        
        # Connection settings
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # Metrics endpoint (internal only)
    location /metrics {
        proxy_pass http://api_gateway;
        # Restrict to internal IPs
        allow 10.0.0.0/8;
        allow 172.16.0.0/12;
        allow 192.168.0.0/16;
        deny all;
    }

    # Admin endpoints (internal only)
    location /admin/ {
        proxy_pass http://api_gateway;
        # Restrict to internal IPs
        allow 10.0.0.0/8;
        allow 172.16.0.0/12;
        allow 192.168.0.0/16;
        deny all;
    }
}
```

### Step 5: Monitoring Setup

#### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'api-gateway'
    static_configs:
      - targets: ['localhost:8080']
    metrics_path: '/metrics'
    scrape_interval: 10s
```

#### Grafana Dashboard

Create dashboard with panels:
- Request Rate (req/sec)
- Error Rate (%)
- P95 Latency (ms)
- Active Connections
- Cache Hit Rate (%)
- Service Health Status

### Step 6: Logging Setup

```bash
# Create log rotation configuration
cat > /etc/logrotate.d/api-gateway << 'EOF'
/var/log/api-gateway/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload api-gateway > /dev/null 2>&1 || true
    endscript
}
EOF
```

### Step 7: Systemd Service (Alternative to PM2)

```ini
# /etc/systemd/system/api-gateway.service
[Unit]
Description=API Gateway Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/api-gateway
EnvironmentFile=/opt/api-gateway/.env
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable api-gateway
sudo systemctl start api-gateway
```

## Kubernetes Deployment

### Dockerfile Optimization

```dockerfile
# Multi-stage build for smaller image
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (res) => {if (res.statusCode === 200) process.exit(0); else process.exit(1);})"
CMD ["node", "src/index.js"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: api-gateway:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          value: "production"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: api-gateway-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
spec:
  type: LoadBalancer
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  selector:
    app: api-gateway

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Health Checks & Monitoring

### Status Check
```bash
curl http://api.example.com/health

# Expected output:
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600
}
```

### Performance Monitoring
```bash
# Check metrics
curl http://localhost:8080/admin/metrics | jq '.latencyStats'

# Check service health
curl http://localhost:8080/admin/health | jq '.overallHealth'
```

## Backup & Recovery

### Configuration Backup
```bash
# Backup routes configuration
cp config/routes.json backups/routes.json.$(date +%Y%m%d)

# Backup .env
cp .env backups/.env.$(date +%Y%m%d)
```

### Database Migration (if needed)
```bash
# Migrate routes from file to database
npm run migrate:routes
```

## Performance Tuning

### Enable Keep-Alive
```javascript
// In src/router.js
const proxy = httpProxy.createProxyServer({
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
  freeSocketTimeout: 30000
});
```

### Increase Cache TTL for Static Content
```javascript
// In src/cache.js
const CACHE_DURATIONS = {
  '/products': 15 * 60 * 1000,    // 15 minutes
  '/stats': 30 * 60 * 1000,       // 30 minutes
  '/users': 5 * 60 * 1000         // 5 minutes
};
```

## Rollback Procedure

```bash
# If new version has issues
git revert <commit-hash>
npm install
npm run build
systemctl restart api-gateway

# Or with PM2
pm2 restart ecosystem.config.js
```

## Checklist Before Production

- [ ] Environment variables configured
- [ ] JWT_SECRET changed from default
- [ ] API keys configured
- [ ] Backend services registered in routes
- [ ] SSL certificates installed
- [ ] Nginx reverse proxy configured
- [ ] Monitoring (Prometheus/Grafana) setup
- [ ] Logging configured
- [ ] Rate limits tuned for expected traffic
- [ ] Health checks configured
- [ ] Backup strategy in place
- [ ] Disaster recovery plan documented
- [ ] Load testing completed
- [ ] Security audit performed
- [ ] Team trained on operations

---

**Ready for production deployment!**
