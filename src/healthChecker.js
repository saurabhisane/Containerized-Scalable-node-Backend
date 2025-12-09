/**
 * Health Checker Module
 * Periodically checks downstream service health
 */

import axios from 'axios';

const serviceHealth = {};
const CHECK_INTERVAL = process.env.HEALTH_CHECK_INTERVAL || 10000; // 10 seconds
const TIMEOUT = process.env.HEALTH_CHECK_TIMEOUT || 5000; // 5 seconds

/**
 * Check health of a single service
 */
async function checkServiceHealth(url) {
  try {
    const response = await axios.get(`${url}/health`, {
      timeout: TIMEOUT,
      validateStatus: (status) => status >= 200 && status < 500
    });

    return response.status >= 200 && response.status < 300;
  } catch (error) {
    return false;
  }
}

/**
 * Initialize health checker
 */
export function initHealthChecker(routes) {
  // Initialize all services as healthy
  Object.entries(routes).forEach(([path, services]) => {
    services.forEach(service => {
      serviceHealth[service] = {
        healthy: true,
        lastChecked: null,
        consecutiveFailures: 0,
        lastFailureTime: null
      };
    });
  });

  // Start periodic health checks
  setInterval(async () => {
    await performHealthChecks(routes);
  }, CHECK_INTERVAL);

  console.log('Health checker initialized with interval:', CHECK_INTERVAL, 'ms');
}

/**
 * Perform health checks for all services
 */
export async function performHealthChecks(routes) {
  const checks = [];

  Object.entries(routes).forEach(([path, services]) => {
    services.forEach(service => {
      checks.push(
        checkServiceHealth(service).then(isHealthy => {
          updateServiceHealth(service, isHealthy);
        })
      );
    });
  });

  await Promise.all(checks);
}

/**
 * Update service health status
 */
function updateServiceHealth(service, isHealthy) {
  if (!serviceHealth[service]) {
    serviceHealth[service] = {
      healthy: true,
      lastChecked: null,
      consecutiveFailures: 0,
      lastFailureTime: null
    };
  }

  const health = serviceHealth[service];
  health.lastChecked = new Date();

  if (isHealthy) {
    if (!health.healthy) {
      console.log(`✓ Service recovered: ${service}`);
      health.healthy = true;
      health.consecutiveFailures = 0;
    }
  } else {
    health.consecutiveFailures++;
    health.lastFailureTime = new Date();

    if (health.consecutiveFailures === 1) {
      console.log(`✗ Service unhealthy: ${service}`);
    }

    // Mark unhealthy after 3 consecutive failures
    if (health.consecutiveFailures >= 3) {
      health.healthy = false;
    }
  }
}

/**
 * Get list of healthy services for a path
 */
export function getHealthyServices(path, allServices) {
  return allServices.filter(service => {
    const health = serviceHealth[service];
    return health && health.healthy;
  });
}

/**
 * Get health status of all services
 */
export function getHealthStatus() {
  return Object.entries(serviceHealth).map(([service, health]) => ({
    service,
    healthy: health.healthy,
    lastChecked: health.lastChecked,
    consecutiveFailures: health.consecutiveFailures,
    lastFailureTime: health.lastFailureTime
  }));
}

/**
 * Get health summary
 */
export function getHealthSummary() {
  const status = getHealthStatus();
  const healthy = status.filter(s => s.healthy).length;
  const total = status.length;

  return {
    overallHealth: healthy === total ? 'healthy' : healthy > 0 ? 'degraded' : 'down',
    healthyServices: healthy,
    totalServices: total,
    services: status
  };
}

/**
 * Manually mark service as healthy/unhealthy
 */
export function setServiceHealth(service, healthy) {
  if (!serviceHealth[service]) {
    serviceHealth[service] = {
      healthy: true,
      lastChecked: null,
      consecutiveFailures: 0,
      lastFailureTime: null
    };
  }

  serviceHealth[service].healthy = healthy;
  serviceHealth[service].lastChecked = new Date();

  console.log(`Service ${service} manually set to ${healthy ? 'healthy' : 'unhealthy'}`);
}
