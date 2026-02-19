/**
 * Artillery processor functions for load testing
 */

module.exports = {
  setAuthHeader,
  generateRandomData,
  validateResponse,
};

/**
 * Set authorization header from captured token
 */
function setAuthHeader(requestParams, context, ee, next) {
  if (context.vars.authToken) {
    requestParams.headers = requestParams.headers || {};
    requestParams.headers['Authorization'] = `Bearer ${context.vars.authToken}`;
  }
  return next();
}

/**
 * Generate random test data
 */
function generateRandomData(requestParams, context, ee, next) {
  context.vars.randomEmail = `loadtest-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
  context.vars.randomName = `User ${Math.floor(Math.random() * 10000)}`;
  context.vars.randomPhone = `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`;

  return next();
}

/**
 * Custom response validation
 */
function validateResponse(requestParams, response, context, ee, next) {
  if (response.statusCode >= 400) {
    ee.emit('counter', 'errors.http_4xx_5xx', 1);
  }

  if (response.timings.phases.firstByte > 1000) {
    ee.emit('counter', 'slow_responses', 1);
  }

  return next();
}
