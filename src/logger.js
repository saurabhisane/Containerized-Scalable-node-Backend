/**
 * Logger & Metrics Module
 * Tracks requests, latency, and service metrics
 */

import morgan from 'morgan';

const metrics = {
  totalRequests: 0,
  totalErrors: 0,
  requestsByService: {},
  requestsByPath: {},
  requestsByStatus: {},
  latencyByService: {},
  latencyStats: {
    min: Infinity,
    max: 0,
    total: 0,
    count: 0
  }
};

/**
 * Morgan logging middleware
 */
export const logger = morgan(':method :url :status :res[content-length] - :response-time ms');

/**
 * Custom metrics collection middleware
 */
export function metricsMiddleware(req, res, next) {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const latency = Date.now() - startTime;
    const service = req.headers['x-forwarded-to'] || 'unknown';
    const path = req.path;
    const status = res.statusCode;

    // Total requests
    metrics.totalRequests++;

    // Requests by service
    metrics.requestsByService[service] = (metrics.requestsByService[service] || 0) + 1;

    // Requests by path
    metrics.requestsByPath[path] = (metrics.requestsByPath[path] || 0) + 1;

    // Requests by status
    metrics.requestsByStatus[status] = (metrics.requestsByStatus[status] || 0) + 1;

    // Latency tracking
    if (!metrics.latencyByService[service]) {
      metrics.latencyByService[service] = {
        min: Infinity,
        max: 0,
        total: 0,
        count: 0,
        avg: 0
      };
    }

    const serviceLatency = metrics.latencyByService[service];
    serviceLatency.min = Math.min(serviceLatency.min, latency);
    serviceLatency.max = Math.max(serviceLatency.max, latency);
    serviceLatency.total += latency;
    serviceLatency.count++;
    serviceLatency.avg = serviceLatency.total / serviceLatency.count;

    // Overall latency stats
    metrics.latencyStats.min = Math.min(metrics.latencyStats.min, latency);
    metrics.latencyStats.max = Math.max(metrics.latencyStats.max, latency);
    metrics.latencyStats.total += latency;
    metrics.latencyStats.count++;

    // Error tracking
    if (status >= 400) {
      metrics.totalErrors++;
    }

    // Log summary
    console.log(`[${new Date().toISOString()}] ${req.method} ${path} -> ${service} | Status: ${status} | Latency: ${latency}ms`);
  });

  next();
}

/**
 * Get metrics
 */
export function getMetrics() {
  return {
    ...metrics,
    latencyStats: {
      ...metrics.latencyStats,
      avg: metrics.latencyStats.count > 0 
        ? Math.round(metrics.latencyStats.total / metrics.latencyStats.count) 
        : 0,
      min: metrics.latencyStats.min === Infinity ? 0 : metrics.latencyStats.min
    },
    errorRate: metrics.totalRequests > 0 
      ? (metrics.totalErrors / metrics.totalRequests * 100).toFixed(2) + '%'
      : '0%'
  };
}

/**
 * Prometheus-style metrics endpoint
 */
export function getPrometheusMetrics() {
  let output = '';

  // Type definitions
  output += '# HELP gateway_requests_total Total number of requests\n';
  output += '# TYPE gateway_requests_total counter\n';
  output += `gateway_requests_total ${metrics.totalRequests}\n\n`;

  output += '# HELP gateway_errors_total Total number of errors\n';
  output += '# TYPE gateway_errors_total counter\n';
  output += `gateway_errors_total ${metrics.totalErrors}\n\n`;

  output += '# HELP gateway_request_latency_ms Request latency in milliseconds\n';
  output += '# TYPE gateway_request_latency_ms gauge\n';
  output += `gateway_request_latency_ms{quantile="0.5"} ${metrics.latencyStats.total / Math.max(metrics.latencyStats.count, 1)}\n`;
  output += `gateway_request_latency_ms{quantile="0.95"} ${metrics.latencyStats.max}\n`;
  output += `gateway_request_latency_ms{quantile="1.0"} ${metrics.latencyStats.max}\n\n`;

  // Requests by service
  output += '# HELP gateway_requests_by_service Requests per service\n';
  output += '# TYPE gateway_requests_by_service gauge\n';
  Object.entries(metrics.requestsByService).forEach(([service, count]) => {
    output += `gateway_requests_by_service{service="${service}"} ${count}\n`;
  });
  output += '\n';

  // Requests by status code
  output += '# HELP gateway_requests_by_status Requests per status code\n';
  output += '# TYPE gateway_requests_by_status gauge\n';
  Object.entries(metrics.requestsByStatus).forEach(([status, count]) => {
    output += `gateway_requests_by_status{status="${status}"} ${count}\n`;
  });

  return output;
}

/**
 * Reset metrics (for testing)
 */
export function resetMetrics() {
  metrics.totalRequests = 0;
  metrics.totalErrors = 0;
  metrics.requestsByService = {};
  metrics.requestsByPath = {};
  metrics.requestsByStatus = {};
  metrics.latencyByService = {};
  metrics.latencyStats = {
    min: Infinity,
    max: 0,
    total: 0,
    count: 0
  };
}
