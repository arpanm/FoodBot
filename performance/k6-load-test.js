/**
 * K6 Load Testing Script for FoodBot Gateway API
 *
 * Scenarios:
 * 1. Ramp-up load test - gradual increase to 100 VUs
 * 2. Spike test - sudden spike to 500 VUs
 * 3. Stress test - sustained high load
 * 4. Soak test - sustained moderate load over time
 *
 * Run: k6 run k6-load-test.js
 *
 * Performance Targets:
 * - p95 < 500ms for all endpoints
 * - Error rate < 1%
 * - Throughput > 1000 req/sec
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const API_KEY = __ENV.API_KEY || 'test-api-key';

// Test scenarios
export const options = {
  scenarios: {
    // Scenario 1: Ramp-up load test
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },  // Ramp up to 50 VUs over 2 minutes
        { duration: '5m', target: 100 }, // Ramp up to 100 VUs over 5 minutes
        { duration: '2m', target: 0 },   // Ramp down to 0 VUs
      ],
      gracefulRampDown: '30s',
      tags: { test_type: 'ramp_up' },
    },

    // Scenario 2: Spike test
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 }, // Fast ramp up
        { duration: '1m', target: 100 },  // Stay at 100
        { duration: '10s', target: 500 }, // Spike to 500
        { duration: '3m', target: 500 },  // Stay at 500
        { duration: '10s', target: 100 }, // Drop to 100
        { duration: '3m', target: 100 },  // Stay at 100
        { duration: '10s', target: 0 },   // Ramp down
      ],
      gracefulRampDown: '30s',
      tags: { test_type: 'spike' },
      startTime: '10m', // Start after ramp_up completes
    },

    // Scenario 3: Stress test
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 300 },
        { duration: '5m', target: 400 },
        { duration: '2m', target: 500 },
        { duration: '10m', target: 500 },
        { duration: '5m', target: 0 },
      ],
      gracefulRampDown: '1m',
      tags: { test_type: 'stress' },
      startTime: '20m', // Start after spike completes
    },

    // Scenario 4: Soak test (long duration, moderate load)
    soak: {
      executor: 'constant-vus',
      vus: 100,
      duration: '1h',
      tags: { test_type: 'soak' },
      startTime: '55m', // Start after stress completes
    },
  },

  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    http_req_failed: ['rate<0.01'],                  // Error rate < 1%
    errors: ['rate<0.01'],
    api_duration: ['p(95)<500'],
  },
};

// Test data
const restaurants = [
  'Pizza Palace',
  'Burger Barn',
  'Sushi Station',
  'Taco Town',
  'Pasta Paradise',
];

const dishes = [
  'Margherita Pizza',
  'Classic Burger',
  'California Roll',
  'Chicken Tacos',
  'Spaghetti Carbonara',
];

// Authentication token (shared across VUs)
let authToken = null;

export function setup() {
  // Login and get auth token
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: 'loadtest@example.com',
    password: 'password123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginRes.status === 200) {
    const body = JSON.parse(loginRes.body);
    authToken = body.accessToken;
    console.log('Authentication successful');
  } else {
    console.error('Authentication failed');
  }

  return { authToken };
}

export default function (data) {
  const token = data.authToken;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // Test 1: Health check (10% of requests)
  if (Math.random() < 0.1) {
    const res = http.get(`${BASE_URL}/health`, { headers });
    check(res, {
      'health check status 200': (r) => r.status === 200,
      'health check response time < 100ms': (r) => r.timings.duration < 100,
    });
    apiDuration.add(res.timings.duration);
    errorRate.add(res.status !== 200);
  }

  // Test 2: Search restaurants (30% of requests)
  if (Math.random() < 0.3) {
    const query = restaurants[Math.floor(Math.random() * restaurants.length)];
    const res = http.get(`${BASE_URL}/restaurants/search?q=${query}`, { headers });

    const success = check(res, {
      'search status 200': (r) => r.status === 200,
      'search response time < 500ms': (r) => r.timings.duration < 500,
      'search has results': (r) => JSON.parse(r.body).length > 0,
    });

    apiDuration.add(res.timings.duration);
    errorRate.add(res.status !== 200);

    if (success) {
      successfulRequests.add(1);
    } else {
      failedRequests.add(1);
    }
  }

  // Test 3: Get menu (20% of requests)
  if (Math.random() < 0.2) {
    const restaurantId = `rest-${Math.floor(Math.random() * 10) + 1}`;
    const res = http.get(`${BASE_URL}/restaurants/${restaurantId}/menu`, { headers });

    const success = check(res, {
      'menu status 200 or 404': (r) => r.status === 200 || r.status === 404,
      'menu response time < 500ms': (r) => r.timings.duration < 500,
    });

    apiDuration.add(res.timings.duration);
    errorRate.add(res.status !== 200 && res.status !== 404);

    if (success) {
      successfulRequests.add(1);
    } else {
      failedRequests.add(1);
    }
  }

  // Test 4: Create job (20% of requests)
  if (Math.random() < 0.2) {
    const payload = {
      actionType: 'SEARCH_RESTAURANT',
      platform: 'swiggy',
      metadata: {
        query: restaurants[Math.floor(Math.random() * restaurants.length)],
        location: 'Bangalore',
      },
    };

    const res = http.post(`${BASE_URL}/jobs`, JSON.stringify(payload), { headers });

    const success = check(res, {
      'job creation status 201': (r) => r.status === 201,
      'job creation response time < 300ms': (r) => r.timings.duration < 300,
      'job has id': (r) => JSON.parse(r.body).id !== undefined,
    });

    apiDuration.add(res.timings.duration);
    errorRate.add(res.status !== 201);

    if (success) {
      successfulRequests.add(1);
    } else {
      failedRequests.add(1);
    }
  }

  // Test 5: Get pending jobs (10% of requests)
  if (Math.random() < 0.1) {
    const res = http.get(`${BASE_URL}/jobs/pending`, { headers });

    const success = check(res, {
      'pending jobs status 200': (r) => r.status === 200,
      'pending jobs response time < 200ms': (r) => r.timings.duration < 200,
    });

    apiDuration.add(res.timings.duration);
    errorRate.add(res.status !== 200);

    if (success) {
      successfulRequests.add(1);
    } else {
      failedRequests.add(1);
    }
  }

  // Test 6: Get user orders (10% of requests)
  if (Math.random() < 0.1) {
    const res = http.get(`${BASE_URL}/orders`, { headers });

    const success = check(res, {
      'orders status 200': (r) => r.status === 200,
      'orders response time < 500ms': (r) => r.timings.duration < 500,
    });

    apiDuration.add(res.timings.duration);
    errorRate.add(res.status !== 200);

    if (success) {
      successfulRequests.add(1);
    } else {
      failedRequests.add(1);
    }
  }

  // Random sleep between 1-3 seconds to simulate user think time
  sleep(Math.random() * 2 + 1);
}

export function teardown(data) {
  console.log('Load test completed');
}

export function handleSummary(data) {
  return {
    'performance/results/summary.json': JSON.stringify(data),
    'performance/results/summary.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function htmlReport(data) {
  const passed = data.metrics.http_req_duration['p(95)'] < 500;
  const errorRate = data.metrics.http_req_failed.rate;

  return `
<!DOCTYPE html>
<html>
<head>
  <title>FoodBot Load Test Results</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .header { background: #2196F3; color: white; padding: 20px; border-radius: 8px; }
    .metric { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
    .pass { color: green; font-weight: bold; }
    .fail { color: red; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
  </style>
</head>
<body>
  <div class="header">
    <h1>FoodBot Load Test Results</h1>
    <p>Test completed at: ${new Date().toISOString()}</p>
  </div>

  <div class="metric">
    <h2>Overall Status: <span class="${passed && errorRate < 0.01 ? 'pass' : 'fail'}">${passed && errorRate < 0.01 ? 'PASS' : 'FAIL'}</span></h2>
  </div>

  <h2>Performance Metrics</h2>
  <table>
    <tr>
      <th>Metric</th>
      <th>Value</th>
      <th>Threshold</th>
      <th>Status</th>
    </tr>
    <tr>
      <td>Request Duration (p95)</td>
      <td>${data.metrics.http_req_duration['p(95)'].toFixed(2)} ms</td>
      <td>&lt; 500 ms</td>
      <td class="${data.metrics.http_req_duration['p(95)'] < 500 ? 'pass' : 'fail'}">${data.metrics.http_req_duration['p(95)'] < 500 ? '✓' : '✗'}</td>
    </tr>
    <tr>
      <td>Request Duration (p99)</td>
      <td>${data.metrics.http_req_duration['p(99)'].toFixed(2)} ms</td>
      <td>&lt; 1000 ms</td>
      <td class="${data.metrics.http_req_duration['p(99)'] < 1000 ? 'pass' : 'fail'}">${data.metrics.http_req_duration['p(99)'] < 1000 ? '✓' : '✗'}</td>
    </tr>
    <tr>
      <td>Error Rate</td>
      <td>${(errorRate * 100).toFixed(2)}%</td>
      <td>&lt; 1%</td>
      <td class="${errorRate < 0.01 ? 'pass' : 'fail'}">${errorRate < 0.01 ? '✓' : '✗'}</td>
    </tr>
    <tr>
      <td>Total Requests</td>
      <td>${data.metrics.http_reqs.count}</td>
      <td>-</td>
      <td>-</td>
    </tr>
    <tr>
      <td>Requests/sec</td>
      <td>${data.metrics.http_reqs.rate.toFixed(2)}</td>
      <td>&gt; 1000</td>
      <td class="${data.metrics.http_reqs.rate > 1000 ? 'pass' : 'fail'}">${data.metrics.http_reqs.rate > 1000 ? '✓' : '✗'}</td>
    </tr>
  </table>

  <h2>Scenario Results</h2>
  <table>
    <tr>
      <th>Scenario</th>
      <th>Iterations</th>
      <th>Duration</th>
      <th>VUs (max)</th>
    </tr>
    ${Object.entries(data.root_group.groups).map(([name, group]) => `
    <tr>
      <td>${name}</td>
      <td>${group.checks ? Object.values(group.checks).reduce((a, b) => a + b.passes + b.fails, 0) : 0}</td>
      <td>-</td>
      <td>-</td>
    </tr>
    `).join('')}
  </table>
</body>
</html>
  `;
}

function textSummary(data, opts) {
  const indent = opts.indent || '';
  const enableColors = opts.enableColors !== false;

  const green = enableColors ? '\x1b[32m' : '';
  const red = enableColors ? '\x1b[31m' : '';
  const reset = enableColors ? '\x1b[0m' : '';

  const p95 = data.metrics.http_req_duration['p(95)'];
  const p99 = data.metrics.http_req_duration['p(99)'];
  const errorRate = data.metrics.http_req_failed.rate;

  return `
${indent}FoodBot Load Test Summary
${indent}========================
${indent}
${indent}Performance Metrics:
${indent}  Request Duration (p95): ${p95.toFixed(2)}ms ${p95 < 500 ? green + '✓' + reset : red + '✗' + reset}
${indent}  Request Duration (p99): ${p99.toFixed(2)}ms ${p99 < 1000 ? green + '✓' + reset : red + '✗' + reset}
${indent}  Error Rate: ${(errorRate * 100).toFixed(2)}% ${errorRate < 0.01 ? green + '✓' + reset : red + '✗' + reset}
${indent}  Total Requests: ${data.metrics.http_reqs.count}
${indent}  Requests/sec: ${data.metrics.http_reqs.rate.toFixed(2)}
${indent}
${indent}Status: ${p95 < 500 && errorRate < 0.01 ? green + 'PASS' + reset : red + 'FAIL' + reset}
  `;
}
