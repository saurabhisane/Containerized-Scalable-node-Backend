/**
 * Router & Reverse Proxy Module
 * Handles request routing and forwarding to backend services
 */

import httpProxy from 'http-proxy';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getNextTargetRoundRobin, incrementConnections, decrementConnections } from './loadBalancer.js';
import { getHealthyServices } from './healthChecker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const routesPath = path.join(__dirname, '../config/routes.json');
let routes = JSON.parse(fs.readFileSync(routesPath, 'utf-8'));

const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  timeout: 10000
});

// Track active proxies
const activeProxies = new Map();

/**
 * Main routing function
 */
export function routeRequest(req, res) {
  // Find matching route
  const matchedPath = Object.keys(routes).find(r => req.url.startsWith(r));

  if (!matchedPath) {
    return res.status(404).json({ 
      error: 'Route not found',
      path: req.url,
      availableRoutes: Object.keys(routes)
    });
  }

  let services = routes[matchedPath];

  // Filter to only healthy services
  const healthyServices = getHealthyServices(matchedPath, services);

  if (healthyServices.length === 0) {
    console.warn(`No healthy services available for ${matchedPath}`);
    return res.status(503).json({ 
      error: 'Service unavailable',
      path: matchedPath,
      reason: 'No healthy backend services available'
    });
  }

  // Select target using load balancer
  const target = getNextTargetRoundRobin(matchedPath, healthyServices);

  // Track connection
  incrementConnections(matchedPath, target);

  // Set headers for downstream service
  req.headers['x-forwarded-by'] = 'api-gateway';
  req.headers['x-forwarded-to'] = target;
  req.headers['x-original-url'] = req.originalUrl;

  // Inject user info if authenticated
  if (req.user) {
    req.headers['x-user-id'] = req.user.userId || 'unknown';
    req.headers['x-user-role'] = req.user.role || 'unknown';
  }

  // Proxy the request
  proxy.web(req, res, { target }, (err) => {
    decrementConnections(matchedPath, target);

    console.error(`Proxy error for ${target}:`, err.message);

    res.status(502).json({ 
      error: 'Bad gateway',
      message: err.message,
      service: target
    });
  });

  // Handle response end to track connection
  res.on('finish', () => {
    decrementConnections(matchedPath, target);
  });
}

/**
 * Proxy error handler
 */
proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err);

  if (!res.headersSent) {
    res.status(502).json({ 
      error: 'Bad gateway',
      message: err.message
    });
  }
});

/**
 * Proxy response handler
 */
proxy.on('proxyRes', (proxyRes, req, res) => {
  // Add gateway headers
  proxyRes.headers['x-gateway'] = 'true';
  proxyRes.headers['x-forwarded-from'] = req.headers['x-forwarded-to'] || 'unknown';
});

/**
 * Get routing table
 */
export function getRoutingTable() {
  return Object.entries(routes).map(([path, services]) => ({
    path,
    services,
    serviceCount: services.length
  }));
}

/**
 * Dynamically add or update a route
 */
export function updateRoute(path, services) {
  routes[path] = services;
  console.log(`Route updated: ${path} -> ${services.join(', ')}`);
}

/**
 * Remove a route
 */
export function removeRoute(path) {
  delete routes[path];
  console.log(`Route removed: ${path}`);
}
