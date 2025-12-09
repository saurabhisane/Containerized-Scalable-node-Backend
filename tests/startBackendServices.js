/**
 * Test Backend Services
 * Simulates multiple microservices for testing the gateway
 */

import express from 'express';

// Service definitions
const services = [
  {
    name: 'User Service 1',
    port: 3001,
    routes: {
      '/users': { service: 'user-service-1', users: ['alice', 'bob', 'charlie'] },
      '/users/:id': { service: 'user-service-1', userId: ':id' }
    }
  },
  {
    name: 'User Service 2',
    port: 3002,
    routes: {
      '/users': { service: 'user-service-2', users: ['diana', 'eve', 'frank'] },
      '/users/:id': { service: 'user-service-2', userId: ':id' }
    }
  },
  {
    name: 'Order Service',
    port: 3003,
    routes: {
      '/orders': { service: 'order-service', orders: [] },
      '/orders/:id': { service: 'order-service', orderId: ':id' }
    }
  },
  {
    name: 'Product Service',
    port: 3004,
    routes: {
      '/products': { service: 'product-service', products: ['laptop', 'phone', 'tablet'] },
      '/products/:id': { service: 'product-service', productId: ':id' }
    }
  },
  {
    name: 'Stats Service',
    port: 3005,
    routes: {
      '/stats': { service: 'stats-service', totalRequests: 0, uptime: 0 }
    }
  }
];

/**
 * Create and start a backend service
 */
function createService(config) {
  const app = express();
  
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: config.name });
  });

  // Service-specific routes
  app.get('/users', (req, res) => {
    res.json({
      service: config.name,
      port: config.port,
      users: ['user1', 'user2', 'user3'],
      timestamp: new Date()
    });
  });

  app.get('/users/:id', (req, res) => {
    res.json({
      service: config.name,
      userId: req.params.id,
      name: 'Test User',
      email: `user${req.params.id}@example.com`
    });
  });

  app.get('/orders', (req, res) => {
    res.json({
      service: config.name,
      orders: [
        { id: 1, status: 'completed' },
        { id: 2, status: 'pending' }
      ],
      timestamp: new Date()
    });
  });

  app.get('/products', (req, res) => {
    res.json({
      service: config.name,
      products: [
        { id: 1, name: 'Laptop', price: 999 },
        { id: 2, name: 'Phone', price: 599 },
        { id: 3, name: 'Tablet', price: 399 }
      ],
      timestamp: new Date()
    });
  });

  app.get('/stats', (req, res) => {
    res.json({
      service: config.name,
      requestCount: Math.floor(Math.random() * 10000),
      averageResponseTime: Math.floor(Math.random() * 500),
      errorRate: (Math.random() * 5).toFixed(2) + '%',
      timestamp: new Date()
    });
  });

  // Delay simulation for testing
  app.get('/slow/:delay', (req, res) => {
    setTimeout(() => {
      res.json({
        service: config.name,
        delayMs: req.params.delay,
        message: `Response after ${req.params.delay}ms delay`
      });
    }, parseInt(req.params.delay));
  });

  // Echo request headers
  app.get('/echo/headers', (req, res) => {
    res.json({
      service: config.name,
      headers: req.headers
    });
  });

  // Simulate errors for testing
  app.get('/error/:code', (req, res) => {
    const code = parseInt(req.params.code);
    res.status(code).json({
      service: config.name,
      error: `Simulated error ${code}`,
      message: `This is a test error response with status code ${code}`
    });
  });

  // Start the service
  const server = app.listen(config.port, () => {
    console.log(`✓ ${config.name} listening on http://localhost:${config.port}`);
  });

  return server;
}

/**
 * Start all backend services
 */
export function startAllServices() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║      🧪 STARTING BACKEND TEST SERVICES 🧪            ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');

  const servers = services.map(service => {
    return createService(service);
  });

  console.log('');
  console.log('📋 Available Endpoints:');
  console.log('   GET  /health           - Health check');
  console.log('   GET  /users            - List users');
  console.log('   GET  /users/:id        - Get user by ID');
  console.log('   GET  /orders           - List orders');
  console.log('   GET  /products         - List products');
  console.log('   GET  /stats            - Get stats');
  console.log('   GET  /slow/:delay      - Simulated delay response');
  console.log('   GET  /echo/headers     - Echo request headers');
  console.log('   GET  /error/:code      - Simulate error response');
  console.log('');
  console.log('🚀 Test Commands:');
  console.log('   # Through Gateway (Port 8080)');
  console.log('   curl http://localhost:8080/users');
  console.log('   curl http://localhost:8080/orders');
  console.log('   curl http://localhost:8080/products');
  console.log('');
  console.log('   # Direct Service Access');
  services.forEach(service => {
    console.log(`   curl http://localhost:${service.port}/users  # ${service.name}`);
  });
  console.log('');
  console.log('Press Ctrl+C to stop all services');
  console.log('');

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down backend services...');
    servers.forEach(server => server.close());
    process.exit(0);
  });
}

// Start services if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startAllServices();
}

export default startAllServices;
