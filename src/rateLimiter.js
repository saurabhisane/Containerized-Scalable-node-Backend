/**
 * Rate Limiter Module
 * Supports: Token Bucket, Sliding Window, IP-based & User-based limiting
 */

// In-memory storage for rate limit data
const tokenBuckets = {};
const slidingWindows = {};

/**
 * Token Bucket Algorithm
 * @param {number} capacity - Maximum tokens in bucket
 * @param {number} refillRate - Tokens added per second
 */
export function tokenBucketLimiter(capacity = 100, refillRate = 10) {
  return (req, res, next) => {
    const key = req.ip; // Can also use req.user.userId for user-based limiting

    if (!tokenBuckets[key]) {
      tokenBuckets[key] = {
        tokens: capacity,
        lastRefill: Date.now()
      };
    }

    const bucket = tokenBuckets[key];
    const now = Date.now();
    const timePassed = (now - bucket.lastRefill) / 1000;
    
    // Refill tokens based on time passed
    bucket.tokens = Math.min(capacity, bucket.tokens + timePassed * refillRate);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens--;
      res.set('X-RateLimit-Remaining', Math.floor(bucket.tokens));
      return next();
    }

    res.set('X-RateLimit-Limit', capacity);
    res.set('X-RateLimit-Remaining', 0);
    res.set('Retry-After', Math.ceil((1 - bucket.tokens) / refillRate));
    
    return res.status(429).json({ 
      error: 'Too many requests',
      retryAfter: Math.ceil((1 - bucket.tokens) / refillRate)
    });
  };
}

/**
 * Sliding Window Algorithm
 * @param {number} limit - Max requests per window
 * @param {number} windowMs - Window size in milliseconds
 */
export function slidingWindowLimiter(limit = 60, windowMs = 60000) {
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();

    if (!slidingWindows[key]) {
      slidingWindows[key] = [];
    }

    const window = slidingWindows[key];
    
    // Remove old requests outside the window
    while (window.length > 0 && window[0] < now - windowMs) {
      window.shift();
    }

    if (window.length >= limit) {
      res.set('X-RateLimit-Limit', limit);
      res.set('X-RateLimit-Remaining', 0);
      
      return res.status(429).json({ 
        error: 'Too many requests',
        windowMs
      });
    }

    window.push(now);
    res.set('X-RateLimit-Limit', limit);
    res.set('X-RateLimit-Remaining', limit - window.length);
    
    next();
  };
}

/**
 * User-based Rate Limiter
 */
export function userBasedLimiter(limit = 100, windowMs = 60000) {
  return (req, res, next) => {
    if (!req.user || !req.user.userId) {
      return slidingWindowLimiter(limit, windowMs)(req, res, next);
    }

    const key = `user:${req.user.userId}`;
    const now = Date.now();

    if (!slidingWindows[key]) {
      slidingWindows[key] = [];
    }

    const window = slidingWindows[key];
    
    // Remove old requests outside the window
    while (window.length > 0 && window[0] < now - windowMs) {
      window.shift();
    }

    if (window.length >= limit) {
      return res.status(429).json({ 
        error: 'User rate limit exceeded',
        limit,
        windowMs
      });
    }

    window.push(now);
    res.set('X-RateLimit-Limit', limit);
    res.set('X-RateLimit-Remaining', limit - window.length);
    
    next();
  };
}

/**
 * Combined Rate Limiter with IP + User tracking
 */
export function rateLimiter(ipLimit = 100, userLimit = 200, windowMs = 60000) {
  return (req, res, next) => {
    const now = Date.now();

    // IP-based limiting
    const ipKey = `ip:${req.ip}`;
    if (!slidingWindows[ipKey]) {
      slidingWindows[ipKey] = [];
    }

    let ipWindow = slidingWindows[ipKey];
    while (ipWindow.length > 0 && ipWindow[0] < now - windowMs) {
      ipWindow.shift();
    }

    if (ipWindow.length >= ipLimit) {
      return res.status(429).json({ error: 'IP rate limit exceeded' });
    }

    // User-based limiting (if authenticated)
    if (req.user && req.user.userId) {
      const userKey = `user:${req.user.userId}`;
      if (!slidingWindows[userKey]) {
        slidingWindows[userKey] = [];
      }

      let userWindow = slidingWindows[userKey];
      while (userWindow.length > 0 && userWindow[0] < now - windowMs) {
        userWindow.shift();
      }

      if (userWindow.length >= userLimit) {
        return res.status(429).json({ error: 'User rate limit exceeded' });
      }

      userWindow.push(now);
    }

    ipWindow.push(now);
    res.set('X-RateLimit-Limit', ipLimit);
    res.set('X-RateLimit-Remaining', ipLimit - ipWindow.length);
    
    next();
  };
}

/**
 * Get rate limit statistics
 */
export function getRateLimiterStats() {
  return {
    tokenBuckets: Object.keys(tokenBuckets).length,
    slidingWindows: Object.entries(slidingWindows).map(([key, window]) => ({
      key,
      activeRequests: window.length
    }))
  };
}

/**
 * Reset rate limiter (for testing)
 */
export function resetRateLimiter() {
  Object.keys(tokenBuckets).forEach(key => delete tokenBuckets[key]);
  Object.keys(slidingWindows).forEach(key => delete slidingWindows[key]);
}
