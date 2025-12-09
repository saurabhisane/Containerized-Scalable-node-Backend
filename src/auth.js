/**
 * Authentication Layer
 * Supports: JWT, API Key, Optional OAuth2
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const API_KEYS = new Set(process.env.VALID_API_KEYS?.split(',') || ['test-api-key-123']);

// Mock user roles for JWT validation
const USER_ROLES = {
  'admin': ['read', 'write', 'delete'],
  'user': ['read'],
  'moderator': ['read', 'write']
};

/**
 * JWT Authentication Middleware
 */
export function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  // Skip auth for public routes
  if (req.path === '/health' || req.path === '/metrics') {
    return next();
  }

  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Invalid token format' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach user info to request
    req.user = decoded;
    req.user.authenticated = true;
    
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

/**
 * API Key Authentication
 */
export function authenticateAPIKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'No API key provided' });
  }

  if (!API_KEYS.has(apiKey)) {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  req.user = { apiKey, authenticated: true, role: 'api-consumer' };
  next();
}

/**
 * Combined Authentication (JWT or API Key)
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  // Skip auth for public routes
  if (req.path === '/health' || req.path === '/metrics') {
    return next();
  }

  // Try JWT first
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticateJWT(req, res, next);
  }

  // Try API Key
  if (apiKey) {
    return authenticateAPIKey(req, res, next);
  }

  return res.status(401).json({ error: 'Authentication required' });
}

/**
 * Role-based access control
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userRole = req.user.role || 'user';

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

/**
 * Generate JWT Token (for testing)
 */
export function generateToken(userId, role = 'user', expiresIn = '1h') {
  return jwt.sign(
    { userId, role, iat: Math.floor(Date.now() / 1000) },
    JWT_SECRET,
    { expiresIn }
  );
}

/**
 * Validate JWT Token
 */
export function validateToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}
