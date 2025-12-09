/**
 * Load Balancer Module
 * Supports: Round Robin, Weighted Round Robin, Least Connections
 */

const counters = {};
const activeConnections = {};
const weights = {};

/**
 * Round Robin Load Balancing
 */
export function getNextTargetRoundRobin(path, services) {
  if (!counters[path]) counters[path] = 0;

  const target = services[counters[path] % services.length];
  counters[path]++;

  return target;
}

/**
 * Weighted Round Robin
 * @param {string} path - Route path
 * @param {string[]} services - List of service URLs
 * @param {Object} serviceWeights - Object mapping services to weights
 */
export function getNextTargetWeighted(path, services, serviceWeights = {}) {
  if (!weights[path]) {
    weights[path] = services.map(s => serviceWeights[s] || 1);
  }

  let totalWeight = weights[path].reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < weights[path].length; i++) {
    random -= weights[path][i];
    if (random <= 0) {
      return services[i];
    }
  }

  return services[0];
}

/**
 * Least Connections Load Balancing
 */
export function getNextTargetLeastConnections(path, services) {
  if (!activeConnections[path]) {
    activeConnections[path] = {};
    services.forEach(s => {
      activeConnections[path][s] = 0;
    });
  }

  let minConnections = Math.min(...Object.values(activeConnections[path]));
  const leastLoadedServices = services.filter(
    s => activeConnections[path][s] === minConnections
  );

  return leastLoadedServices[Math.floor(Math.random() * leastLoadedServices.length)];
}

/**
 * Track connection increase
 */
export function incrementConnections(path, target) {
  if (!activeConnections[path]) {
    activeConnections[path] = {};
  }
  if (activeConnections[path][target] === undefined) {
    activeConnections[path][target] = 0;
  }
  activeConnections[path][target]++;
}

/**
 * Track connection decrease
 */
export function decrementConnections(path, target) {
  if (activeConnections[path] && activeConnections[path][target] !== undefined) {
    activeConnections[path][target]--;
  }
}

/**
 * Get statistics
 */
export function getLoadBalancerStats() {
  return {
    roundRobinCounters: counters,
    activeConnections,
    weights
  };
}
