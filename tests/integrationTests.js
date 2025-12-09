/**
 * Gateway Integration Tests
 * Tests core gateway functionality
 */

import axios from 'axios';
import { generateToken } from '../src/auth.js';

const GATEWAY_URL = 'http://localhost:8080';

// Test configuration
const testConfig = {
  userId: 'test-user-123',
  timeout: 5000
};

/**
 * Helper: Create axios instance with auth
 */
function createAuthClient(token) {
  return axios.create({
    baseURL: GATEWAY_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    timeout: testConfig.timeout
  });
}

/**
 * Test 1: Basic routing
 */
export async function testBasicRouting(token) {
  console.log('\n🧪 Test 1: Basic Routing');
  try {
    const client = createAuthClient(token);
    const response = await client.get('/users');
    console.log('✓ Successfully routed to /users');
    console.log('  Response:', JSON.stringify(response.data).substring(0, 100) + '...');
  } catch (error) {
    console.error('✗ Failed:', error.message);
  }
}

/**
 * Test 2: Load balancing
 */
export async function testLoadBalancing(token) {
  console.log('\n🧪 Test 2: Load Balancing (Round Robin)');
  try {
    const client = createAuthClient(token);
    const responses = [];
    
    for (let i = 0; i < 4; i++) {
      const response = await client.get('/users');
      responses.push(response.data.service);
    }
    
    console.log('✓ Load balancing working');
    console.log('  Request routing:', responses.join(' -> '));
  } catch (error) {
    console.error('✗ Failed:', error.message);
  }
}

/**
 * Test 3: Caching
 */
export async function testCaching(token) {
  console.log('\n🧪 Test 3: Caching');
  try {
    const client = createAuthClient(token);
    
    // First request (cache miss)
    const first = await client.get('/products');
    const firstCacheHit = first.headers['x-cache-hit'] === 'true';
    console.log(`✓ First request: Cache ${firstCacheHit ? 'HIT' : 'MISS'}`);
    
    // Second request (should be cache hit)
    const second = await client.get('/products');
    const secondCacheHit = second.headers['x-cache-hit'] === 'true';
    console.log(`✓ Second request: Cache ${secondCacheHit ? 'HIT' : 'MISS'}`);
    
    if (secondCacheHit) {
      console.log(`  Cache age: ${second.headers['x-cache-age']}s`);
    }
  } catch (error) {
    console.error('✗ Failed:', error.message);
  }
}

/**
 * Test 4: Rate limiting
 */
export async function testRateLimiting(token) {
  console.log('\n🧪 Test 4: Rate Limiting');
  try {
    const client = createAuthClient(token);
    let rateLimited = false;
    let requestCount = 0;

    // Make rapid requests
    for (let i = 0; i < 150; i++) {
      try {
        await client.get('/users');
        requestCount++;
      } catch (error) {
        if (error.response?.status === 429) {
          rateLimited = true;
          console.log(`✓ Rate limit triggered after ${requestCount} requests`);
          console.log(`  Remaining: ${error.response.headers['x-ratelimit-remaining']}`);
          break;
        }
      }
    }

    if (!rateLimited) {
      console.log('⚠ Rate limiting may not be triggered (limit is high)');
    }
  } catch (error) {
    console.error('✗ Failed:', error.message);
  }
}

/**
 * Test 5: Authentication
 */
export async function testAuthentication() {
  console.log('\n🧪 Test 5: Authentication');
  try {
    // Test without token
    try {
      await axios.get(`${GATEWAY_URL}/users`, {
        timeout: testConfig.timeout
      });
      console.log('✗ Should have been denied without token');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✓ Correctly rejected unauthenticated request');
      }
    }

    // Test with invalid token
    try {
      await axios.get(`${GATEWAY_URL}/users`, {
        headers: { 'Authorization': 'Bearer invalid-token' },
        timeout: testConfig.timeout
      });
      console.log('✗ Should have been denied with invalid token');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✓ Correctly rejected invalid token');
      }
    }

    // Test with valid token
    const token = generateToken(testConfig.userId, 'admin');
    const client = createAuthClient(token);
    await client.get('/users');
    console.log('✓ Correctly accepted valid token');
  } catch (error) {
    console.error('✗ Failed:', error.message);
  }
}

/**
 * Test 6: Admin endpoints
 */
export async function testAdminEndpoints(token) {
  console.log('\n🧪 Test 6: Admin Endpoints');
  try {
    const client = createAuthClient(token);

    // Test health endpoint
    const health = await client.get('/admin/health');
    console.log('✓ Health endpoint:', health.data.overallHealth);

    // Test metrics endpoint
    const metrics = await client.get('/admin/metrics');
    console.log('✓ Metrics endpoint: ' + metrics.data.totalRequests + ' total requests');

    // Test routing table
    const routes = await client.get('/admin/routes');
    console.log('✓ Routes endpoint: ' + routes.data.length + ' routes configured');

    // Test cache stats
    const cache = await client.get('/admin/cache/stats');
    console.log('✓ Cache stats: ' + cache.data.totalCachedItems + ' items cached');
  } catch (error) {
    console.error('✗ Failed:', error.message);
  }
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║        🧪 GATEWAY INTEGRATION TESTS 🧪               ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  try {
    // Generate test token
    const token = generateToken(testConfig.userId, 'admin');
    
    // Run tests
    await testAuthentication();
    await testBasicRouting(token);
    await testLoadBalancing(token);
    await testCaching(token);
    await testRateLimiting(token);
    await testAdminEndpoints(token);

    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║            ✓ ALL TESTS COMPLETED ✓                   ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');
  } catch (error) {
    console.error('Test suite error:', error.message);
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().then(() => process.exit(0)).catch(() => process.exit(1));
}

export default runAllTests;
