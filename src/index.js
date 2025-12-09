/**
 * Main API Gateway Server
 * Entry point for the gateway
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger, metricsMiddleware, getMetrics, getPrometheusMetrics, resetMetrics } from './logger.js';
import { authenticate, generateToken } from './auth.js';
import { rateLimiter } from './rateLimiter.js';
import { cacheMiddleware, cacheInvalidationMiddleware, invalidateCache, getCacheStats, getCacheDetails } from './cache.js';
import { routeRequest, getRoutingTable, updateRoute, removeRoute } from './router.js';
import { initHealthChecker, getHealthStatus, getHealthSummary, setServiceHealth, performHealthChecks } from './healthChecker.js';
import { getLoadBalancerStats } from './loadBalancer.js';
import { getRateLimiterStats } from './rateLimiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const routesPath = path.join(__dirname, '../config/routes.json');
const routes = JSON.parse(fs.readFileSync(routesPath, 'utf-8'));

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(logger);
app.use(metricsMiddleware);

// Apply rate limiting (100 requests per minute per IP)
app.use(rateLimiter(100, 200, 60000));

// Public routes (no auth required)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// Generate test JWT token
app.post('/auth/token', (req, res) => {
  const { userId, role = 'user' } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  const token = generateToken(userId, role);
  res.json({ token, expiresIn: '1h' });
});

// Apply authentication middleware
app.use(authenticate);

// Apply cache middleware
app.use(cacheMiddleware);

// Apply cache invalidation for write operations
app.use(cacheInvalidationMiddleware);

// === ADMIN ROUTES ===

/**
 * Get gateway metrics
 */
app.get('/admin/metrics', (req, res) => {
  res.json(getMetrics());
});

/**
 * Get Prometheus-compatible metrics
 */
app.get('/metrics', (req, res) => {
  res.type('text/plain');
  res.send(getPrometheusMetrics());
});

/**
 * Get health status of all services
 */
app.get('/admin/health', (req, res) => {
  res.json(getHealthSummary());
});

/**
 * Get detailed health status
 */
app.get('/admin/health/services', (req, res) => {
  res.json(getHealthStatus());
});

/**
 * Manually trigger health check
 */
app.post('/admin/health/check', async (req, res) => {
  await performHealthChecks(routes);
  res.json({ message: 'Health checks completed', status: getHealthSummary() });
});

/**
 * Set service health manually
 */
app.put('/admin/health/:service', (req, res) => {
  const { service } = req.params;
  const { healthy } = req.body;

  if (typeof healthy !== 'boolean') {
    return res.status(400).json({ error: 'healthy field must be boolean' });
  }

  setServiceHealth(service, healthy);
  res.json({ message: `Service ${service} set to ${healthy ? 'healthy' : 'unhealthy'}` });
});

/**
 * Get routing table
 */
app.get('/admin/routes', (req, res) => {
  res.json(getRoutingTable());
});

/**
 * Update route
 */
app.put('/admin/routes/:path', (req, res) => {
  const { path } = req.params;
  const { services } = req.body;

  if (!Array.isArray(services) || services.length === 0) {
    return res.status(400).json({ error: 'services must be a non-empty array' });
  }

  updateRoute(`/${path}`, services);
  res.json({ message: `Route /${path} updated`, services });
});

/**
 * Delete route
 */
app.delete('/admin/routes/:path', (req, res) => {
  const { path } = req.params;
  removeRoute(`/${path}`);
  res.json({ message: `Route /${path} deleted` });
});

/**
 * Get cache statistics
 */
app.get('/admin/cache/stats', (req, res) => {
  res.json(getCacheStats());
});

/**
 * Get cache details
 */
app.get('/admin/cache/details', (req, res) => {
  res.json(getCacheDetails());
});

/**
 * Clear cache
 */
app.post('/admin/cache/clear', (req, res) => {
  const { pattern } = req.body;
  invalidateCache(pattern);
  res.json({ message: pattern ? `Cache cleared for pattern: ${pattern}` : 'All cache cleared' });
});

/**
 * Get load balancer statistics
 */
app.get('/admin/loadbalancer/stats', (req, res) => {
  res.json(getLoadBalancerStats());
});

/**
 * Get rate limiter statistics
 */
app.get('/admin/ratelimiter/stats', (req, res) => {
  res.json(getRateLimiterStats());
});

/**
 * Reset metrics (for testing)
 */
app.post('/admin/reset/metrics', (req, res) => {
  resetMetrics();
  res.json({ message: 'Metrics reset' });
});

/**
 * Gateway status dashboard
 */
app.get('/admin/status', (req, res) => {
  res.json({
    gateway: {
      uptime: process.uptime(),
      timestamp: new Date()
    },
    metrics: getMetrics(),
    health: getHealthSummary(),
    cache: getCacheStats(),
    routes: getRoutingTable()
  });
});

// === MAIN GATEWAY ROUTING ===

/**
 * Catch-all route handler - forwards to backend services
 */
app.all('*', (req, res) => {
  routeRequest(req, res);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║        🚀 API GATEWAY SERVER STARTED 🚀               ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📍 Server running on http://localhost:${PORT}`);
  console.log('');
  console.log('📋 Available Routes:');
  getRoutingTable().forEach(route => {
    console.log(`   ${route.path} -> [${route.services.join(', ')}]`);
  });
  console.log('');
  console.log('🔧 Admin Endpoints:');
  console.log('   GET    /admin/status           - Gateway status dashboard');
  console.log('   GET    /admin/metrics          - Performance metrics');
  console.log('   GET    /admin/health           - Service health summary');
  console.log('   GET    /admin/health/services  - Detailed service health');
  console.log('   POST   /admin/health/check     - Trigger health check');
  console.log('   GET    /admin/routes           - View routing table');
  console.log('   PUT    /admin/routes/:path     - Update route');
  console.log('   DELETE /admin/routes/:path     - Delete route');
  console.log('   GET    /admin/cache/stats      - Cache statistics');
  console.log('   GET    /admin/cache/details    - Cache details');
  console.log('   POST   /admin/cache/clear      - Clear cache');
  console.log('   GET    /admin/loadbalancer/stats - Load balancer stats');
  console.log('   GET    /admin/ratelimiter/stats  - Rate limiter stats');
  console.log('');
  console.log('🔐 Authentication:');
  console.log('   POST   /auth/token             - Generate JWT token');
  console.log('   GET    /metrics                - Prometheus metrics');
  console.log('');
  console.log('📊 Usage Examples:');
  console.log('   # Get JWT token');
  console.log('   curl -X POST http://localhost:8080/auth/token \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"userId": "user123", "role": "admin"}\'');
  console.log('');
  console.log('   # Make authenticated request');
  console.log('   curl -H "Authorization: Bearer <token>" \\');
  console.log('     http://localhost:8080/users');
  console.log('');
});

// Initialize health checker
initHealthChecker(routes);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
