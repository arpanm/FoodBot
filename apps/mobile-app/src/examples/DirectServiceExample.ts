/**
 * Example: Direct LLM Service Usage
 * Demonstrates how to use LLMService without React hooks
 * Useful for background tasks, utilities, or non-React contexts
 */

import { getLLMService } from '../services/llm/LLMService';
import { LLMOptions } from '../services/llm/types';

/**
 * Example 1: Simple Completion
 */
export async function simpleCompletionExample() {
  const llmService = getLLMService();

  try {
    const response = await llmService.complete('What is TypeScript?');

    console.log('Response:', response.text);
    console.log('Provider:', response.provider); // 'cloud' or 'ondevice'
    console.log('Latency:', response.latencyMs, 'ms');
    console.log('Tokens:', response.usage.totalTokens);

    return response.text;
  } catch (error) {
    console.error('Completion failed:', error);
    throw error;
  }
}

/**
 * Example 2: Completion with Options
 */
export async function completionWithOptionsExample() {
  const llmService = getLLMService();

  const options: LLMOptions = {
    maxTokens: 500,
    temperature: 0.7,
    preferredProvider: 'cloud', // Force cloud provider
  };

  try {
    const response = await llmService.complete(
      'Explain React Native in detail',
      options
    );

    return response;
  } catch (error) {
    console.error('Failed:', error);
    throw error;
  }
}

/**
 * Example 3: Streaming Completion
 */
export async function streamingCompletionExample() {
  const llmService = getLLMService();

  try {
    let fullResponse = '';

    console.log('Starting stream...');

    for await (const chunk of llmService.streamCompletion(
      'Tell me a short story about AI'
    )) {
      fullResponse += chunk;
      console.log('Chunk:', chunk);

      // Update UI here in real app
      // For example: updateUIWithChunk(chunk);
    }

    console.log('Stream complete. Full response:', fullResponse);
    return fullResponse;
  } catch (error) {
    console.error('Streaming failed:', error);
    throw error;
  }
}

/**
 * Example 4: Chat with Conversation History
 */
export async function chatWithHistoryExample() {
  const llmService = getLLMService();

  const conversationHistory = [
    { role: 'user' as const, content: 'Hello, I need help ordering food' },
    {
      role: 'assistant' as const,
      content: 'Hi! I\'d be happy to help you order food. What cuisine are you interested in?',
    },
    { role: 'user' as const, content: 'I want Italian food' },
  ];

  try {
    const response = await llmService.chat(conversationHistory);

    console.log('Assistant:', response.text);
    return response;
  } catch (error) {
    console.error('Chat failed:', error);
    throw error;
  }
}

/**
 * Example 5: Query Classification
 */
export function queryClassificationExample() {
  const llmService = getLLMService();

  const queries = [
    'Hi',
    'What is the weather today?',
    'Write a function to implement binary search in TypeScript with full error handling',
  ];

  queries.forEach((query) => {
    const complexity = llmService.classifyQuery(query);
    const provider = llmService.getRecommendedProvider(query);

    console.log(`Query: "${query}"`);
    console.log(`  Complexity: ${complexity}`);
    console.log(`  Recommended: ${provider}`);
    console.log('---');
  });
}

/**
 * Example 6: Check Service Availability
 */
export async function checkAvailabilityExample() {
  const llmService = getLLMService();

  const availability = await llmService.isAvailable();

  console.log('Service Availability:');
  console.log('  Cloud:', availability.cloud ? '✅' : '❌');
  console.log('  On-Device:', availability.onDevice ? '✅' : '❌');
  console.log('  Offline Mode:', availability.offline ? '⚠️' : '✅');

  if (!availability.cloud && !availability.onDevice) {
    console.warn('No LLM providers available!');
  }

  return availability;
}

/**
 * Example 7: Get Metrics
 */
export function getMetricsExample() {
  const llmService = getLLMService();

  const metrics = llmService.getMetrics();

  console.log('LLM Service Metrics:');
  console.log('  Total Requests:', metrics.totalRequests);
  console.log('  Cloud Requests:', metrics.cloudRequests);
  console.log('  On-Device Requests:', metrics.onDeviceRequests);
  console.log('  Avg Cloud Latency:', metrics.averageLatency.cloud, 'ms');
  console.log('  Avg On-Device Latency:', metrics.averageLatency.onDevice, 'ms');
  console.log('  Cloud Error Rate:', metrics.errorRate.cloud);
  console.log('  Offline Queue Size:', metrics.offlineQueueSize);

  return metrics;
}

/**
 * Example 8: Offline Queue Management
 */
export async function offlineQueueExample() {
  const llmService = getLLMService();
  const offlineManager = llmService.getOfflineManager();

  // Check network status
  const networkStatus = offlineManager.getNetworkStatus();
  console.log('Network Status:', networkStatus);

  if (!networkStatus.isConnected) {
    console.log('Device is offline. Adding request to queue...');

    // Queue request for later
    const queueId = await offlineManager.addToQueue('What is React Native?');
    console.log('Queued request ID:', queueId);

    // Check queue size
    const queueSize = offlineManager.getQueueSize();
    console.log('Current queue size:', queueSize);
  }

  // Subscribe to network changes
  const unsubscribe = offlineManager.subscribe((status) => {
    if (status.isConnected) {
      console.log('Back online! Queue will be processed automatically.');
    } else {
      console.log('Went offline. Requests will be queued.');
    }
  });

  // Don't forget to unsubscribe when done
  // unsubscribe();

  return offlineManager.getStats();
}

/**
 * Example 9: Error Handling
 */
export async function errorHandlingExample() {
  const llmService = getLLMService();

  try {
    const response = await llmService.complete('Test query');
    console.log('Success:', response.text);
  } catch (error: any) {
    // Check if it's an LLMError
    if (error.code && error.retryable !== undefined) {
      console.error('LLM Error:');
      console.error('  Code:', error.code);
      console.error('  Message:', error.message);
      console.error('  Provider:', error.provider);
      console.error('  Retryable:', error.retryable);

      if (error.retryable) {
        console.log('This error is retryable. Attempting retry...');
        // Retry logic here
      }
    } else {
      console.error('Unknown error:', error);
    }
  }
}

/**
 * Example 10: Background Task
 * Process LLM requests in background (e.g., for notifications)
 */
export async function backgroundTaskExample() {
  const llmService = getLLMService();

  // Set auth token (from secure storage)
  // const token = await getAuthTokenFromStorage();
  // llmService.setAuthToken(token);

  try {
    // Process simple query
    const response = await llmService.complete(
      'Summarize today\'s orders',
      { maxTokens: 100, temperature: 0.5 }
    );

    // Send notification with result
    console.log('Background task result:', response.text);

    // Clean up
    llmService.clearCache();

    return response.text;
  } catch (error) {
    console.error('Background task failed:', error);
    return null;
  }
}

/**
 * Example 11: Caching Demonstration
 */
export async function cachingExample() {
  const llmService = getLLMService();

  const query = 'What is React?';

  // First request (will hit API)
  console.log('First request (no cache)...');
  const start1 = Date.now();
  const response1 = await llmService.complete(query);
  const latency1 = Date.now() - start1;
  console.log('Response 1:', response1.text.substring(0, 50) + '...');
  console.log('Latency 1:', latency1, 'ms');
  console.log('Cached 1:', response1.cached || false);

  // Second request (should hit cache)
  console.log('\nSecond request (from cache)...');
  const start2 = Date.now();
  const response2 = await llmService.complete(query);
  const latency2 = Date.now() - start2;
  console.log('Response 2:', response2.text.substring(0, 50) + '...');
  console.log('Latency 2:', latency2, 'ms');
  console.log('Cached 2:', response2.cached || false);

  console.log('\nCache performance:');
  console.log('  Speed improvement:', Math.round((latency1 / latency2) * 100) / 100 + 'x');

  // Clear cache
  llmService.clearCache();
  console.log('Cache cleared');
}

/**
 * Example 12: Complete Usage in App Initialization
 */
export async function appInitializationExample() {
  console.log('Initializing LLM Service...');

  const llmService = getLLMService();

  // 1. Set auth token
  // const authToken = await getAuthTokenFromSecureStorage();
  // llmService.setAuthToken(authToken);

  // 2. Check availability
  const availability = await llmService.isAvailable();
  console.log('LLM Availability:', availability);

  // 3. Subscribe to network changes
  const offlineManager = llmService.getOfflineManager();
  offlineManager.subscribe((status) => {
    console.log('Network status changed:', status);
  });

  // 4. Initialize on-device model (Phase 2)
  // if (availability.onDevice) {
  //   try {
  //     await llmService.initializeOnDeviceModel();
  //     console.log('On-device model initialized');
  //   } catch (error) {
  //     console.error('Failed to initialize on-device model:', error);
  //   }
  // }

  // 5. Test connectivity
  try {
    const testResponse = await llmService.complete('Hello', {
      maxTokens: 10,
    });
    console.log('LLM Service test successful:', testResponse.text);
  } catch (error) {
    console.error('LLM Service test failed:', error);
  }

  console.log('LLM Service initialization complete');
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('=== LLM Service Examples ===\n');

  try {
    console.log('Example 1: Simple Completion');
    await simpleCompletionExample();
    console.log('\n');

    console.log('Example 5: Query Classification');
    queryClassificationExample();
    console.log('\n');

    console.log('Example 6: Check Availability');
    await checkAvailabilityExample();
    console.log('\n');

    console.log('Example 7: Get Metrics');
    getMetricsExample();
    console.log('\n');

    console.log('Example 8: Offline Queue');
    await offlineQueueExample();
    console.log('\n');

    console.log('=== Examples Complete ===');
  } catch (error) {
    console.error('Example execution failed:', error);
  }
}

/**
 * Usage in your app:
 *
 * import { simpleCompletionExample } from './examples/DirectServiceExample';
 *
 * // In a component or service
 * const result = await simpleCompletionExample();
 */
