/**
 * Caching Layer Module
 * Supports: TTL-based cache, selective caching by route, cache invalidation
 */

const cache = new Map();
const cacheMetadata = new Map();

// Configuration for which routes are cacheable
const CACHEABLE_ROUTES = [
  '/products',
  '/stats',
  '/users' // Only for GET requests
];

const CACHE_DURATIONS = {
  '/products': 5 * 60 * 1000, // 5 minutes
  '/stats': 10 * 60 * 1000,   // 10 minutes
  '/users': 2 * 60 * 1000     // 2 minutes
};

/**
 * Cache Middleware
 */
export function cacheMiddleware(req, res, next) {
  // Only cache GET requests
  if (req.method !== 'GET') {
    return next();
  }

  const isCacheable = CACHEABLE_ROUTES.some(route => req.originalUrl.startsWith(route));

  if (!isCacheable) {
    return next();
  }

  const cacheKey = req.originalUrl;
  const cachedData = cache.get(cacheKey);

  // Check if cache exists and hasn't expired
  if (cachedData) {
    const metadata = cacheMetadata.get(cacheKey);
    if (metadata && Date.now() < metadata.expiresAt) {
      res.set('X-Cache-Hit', 'true');
      res.set('X-Cache-Age', Math.floor((Date.now() - metadata.cachedAt) / 1000));
      return res.json(cachedData);
    } else {
      // Cache expired, remove it
      cache.delete(cacheKey);
      cacheMetadata.delete(cacheKey);
    }
  }

  // Intercept the response
  const originalSend = res.send;
  res.send = function(data) {
    try {
      // Try to cache JSON responses
      if (res.get('content-type')?.includes('application/json')) {
        const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
        
        // Get cache duration based on route
        const cacheDuration = CACHE_DURATIONS[
          Object.keys(CACHE_DURATIONS).find(route => req.originalUrl.startsWith(route))
        ] || 5 * 60 * 1000;

        cache.set(cacheKey, jsonData);
        cacheMetadata.set(cacheKey, {
          cachedAt: Date.now(),
          expiresAt: Date.now() + cacheDuration
        });

        res.set('X-Cache-Hit', 'false');
      }
    } catch (err) {
      console.error('Cache error:', err.message);
    }

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Invalidate cache for a specific route or key
 */
export function invalidateCache(pattern) {
  if (!pattern) {
    cache.clear();
    cacheMetadata.clear();
    return;
  }

  for (const [key] of cache.entries()) {
    if (key.includes(pattern)) {
      cache.delete(key);
      cacheMetadata.delete(key);
    }
  }
}

/**
 * Invalidate cache after POST/PUT/DELETE
 */
export function cacheInvalidationMiddleware(req, res, next) {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    // Invalidate related caches
    const baseRoute = req.path.split('/').slice(0, 2).join('/');
    invalidateCache(baseRoute);
  }
  next();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const stats = {
    totalCachedItems: cache.size,
    cachedRoutes: {},
    estimatedSize: 0
  };

  for (const [key, value] of cache.entries()) {
    const route = key.split('?')[0];
    stats.cachedRoutes[route] = (stats.cachedRoutes[route] || 0) + 1;
    stats.estimatedSize += JSON.stringify(value).length;
  }

  return stats;
}

/**
 * Clear all cache
 */
export function clearCache() {
  cache.clear();
  cacheMetadata.clear();
}

/**
 * Get cache details
 */
export function getCacheDetails() {
  const details = [];
  for (const [key, value] of cache.entries()) {
    const metadata = cacheMetadata.get(key);
    details.push({
      key,
      cachedAt: metadata?.cachedAt,
      expiresAt: metadata?.expiresAt,
      expired: metadata && Date.now() >= metadata.expiresAt,
      size: JSON.stringify(value).length
    });
  }
  return details;
}
