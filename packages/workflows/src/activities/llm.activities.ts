/**
 * LLM Activities
 *
 * Activity implementations for LLM-powered features.
 * Handles intent extraction, context enrichment, workflow generation,
 * and recommendation logic.
 */

import type { UserContext } from '../types';

// ============================================================================
// LLM Service Interface (injected at worker startup)
// ============================================================================

interface LLMService {
  complete(prompt: string, params?: Record<string, unknown>): Promise<LLMResponse>;
}

interface LLMResponse {
  content: string;
  usage: { promptTokens: number; completionTokens: number };
  model: string;
}

interface Intent {
  type: string;
  confidence: number;
  entities: Record<string, unknown>;
  originalQuery: string;
}

interface WorkflowDefinition {
  id: string;
  steps: WorkflowStep[];
  errorHandling: Record<string, unknown>;
  retryPolicy: Record<string, unknown>;
}

interface WorkflowStep {
  id: string;
  type: string;
  activityName: string;
  input: Record<string, unknown>;
  dependencies: string[];
  timeout: string;
}

let llmService: LLMService | null = null;

/**
 * Initialize the LLM service.
 * Called during worker startup with the actual LLM client.
 */
export function initializeLLMService(service: LLMService): void {
  llmService = service;
}

// ============================================================================
// Intent Extraction Activities
// ============================================================================

/**
 * Extract intent from a user query using LLM.
 *
 * @param query - The user's natural language query
 * @param context - User context for personalization
 * @returns Extracted intent with confidence score
 */
export async function extractIntent(
  query: string,
  context: UserContext
): Promise<Intent> {
  if (llmService) {
    const prompt = buildIntentExtractionPrompt(query, context);
    const response = await llmService.complete(prompt);
    return parseIntentResponse(response.content, query);
  }

  // Fallback: simple keyword-based intent detection
  return detectIntentFromKeywords(query);
}

/**
 * Enrich an intent with additional context.
 *
 * @param intent - The extracted intent
 * @param context - User context
 * @returns Enriched intent
 */
export async function enrichWithContext(
  intent: Intent,
  context: UserContext
): Promise<Intent> {
  return {
    ...intent,
    entities: {
      ...intent.entities,
      userPreferences: context.preferences,
      userLocation: context.location,
      previousOrders: context.orderHistory,
    },
  };
}

/**
 * Generate a workflow definition from an intent.
 *
 * @param intent - The intent to convert to a workflow
 * @returns Workflow definition
 */
export async function generateWorkflow(intent: Intent): Promise<WorkflowDefinition> {
  const workflowMap: Record<string, () => WorkflowDefinition> = {
    search_restaurant: () => createSearchWorkflowDef(intent),
    place_order: () => createOrderWorkflowDef(intent),
    track_order: () => createTrackingWorkflowDef(intent),
    get_recommendations: () => createRecommendationWorkflowDef(intent),
  };

  const factory = workflowMap[intent.type];
  if (factory) {
    return factory();
  }

  return {
    id: `workflow_${Date.now()}`,
    steps: [],
    errorHandling: { retryPolicy: { maximumAttempts: 3, initialInterval: '1s' } },
    retryPolicy: { maximumAttempts: 3, initialInterval: '1s', backoffCoefficient: 2 },
  };
}

/**
 * Validate a workflow definition.
 *
 * @param workflow - The workflow to validate
 * @returns Whether the workflow is valid
 */
export async function validateWorkflow(workflow: WorkflowDefinition): Promise<boolean> {
  if (!workflow.id || !workflow.steps) {
    return false;
  }

  // Check for dependency cycles
  const visited = new Set<string>();
  for (const step of workflow.steps) {
    if (hasCyclicDependency(step, workflow.steps, visited)) {
      return false;
    }
  }

  return true;
}

/**
 * Call LLM with a prompt and parameters.
 *
 * @param prompt - The prompt text
 * @param params - Additional parameters
 * @returns LLM response
 */
export async function callLLM(
  prompt: string,
  params: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (llmService) {
    const response = await llmService.complete(prompt, params);
    return { content: response.content, model: response.model };
  }

  return { content: '', model: 'fallback' };
}

/**
 * Cache an LLM response for deduplication.
 *
 * @param key - Cache key
 * @param _response - Response to cache
 */
export async function cacheLLMResponse(
  key: string,
  _response: Record<string, unknown>
): Promise<void> {
  // In production, stores in Redis with appropriate TTL
}

// ============================================================================
// Recommendation Activities
// ============================================================================

/**
 * Load user preference graph from Neo4j.
 *
 * @param userId - User ID
 * @returns Preference graph data
 */
export async function loadPreferenceGraph(
  userId: string
): Promise<Record<string, unknown>> {
  // In production, queries Neo4j for the user's preference graph
  return {
    userId,
    nodes: [],
    edges: [],
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Generate personalized recommendations.
 *
 * @param context - Recommendation context
 * @returns List of recommendations
 */
export async function generateRecommendations(
  context: Record<string, unknown>
): Promise<Array<Record<string, unknown>>> {
  // In production, uses collaborative filtering + LLM for recommendations
  return [];
}

/**
 * Update user preference graph after an interaction.
 *
 * @param userId - User ID
 * @param _data - Interaction data to record
 */
export async function updatePreferenceGraph(
  userId: string,
  _data: Record<string, unknown>
): Promise<void> {
  // In production, updates Neo4j graph with new preference edges
}

/**
 * Decay old preference weights over time.
 *
 * @param userId - User ID
 */
export async function decayOldPreferences(userId: string): Promise<void> {
  // In production, applies time-decay to preference graph weights
}

/**
 * Cache recommendation results.
 *
 * @param userId - User ID
 * @param _recommendations - Recommendations to cache
 */
export async function cacheRecommendations(
  userId: string,
  _recommendations: Array<Record<string, unknown>>
): Promise<void> {
  // In production, caches in Redis with short TTL
}

// ============================================================================
// User Context Activities
// ============================================================================

/**
 * Load user context from cache or database.
 *
 * @param userId - The user ID
 * @returns User context with preferences and history
 */
export async function loadUserContext(userId: string): Promise<UserContext> {
  // In production: first check Redis cache, then fall back to Neo4j/PostgreSQL
  return {
    userId,
    preferences: {
      cuisine: ['Italian'],
      priceRange: [10, 50],
    },
    location: {
      latitude: 40.7128,
      longitude: -74.006,
    },
    orderHistory: [],
  };
}

/**
 * Search dishes across restaurants.
 *
 * @param _params - Search parameters
 * @returns List of matching dishes
 */
export async function searchDishes(
  _params: Record<string, unknown>
): Promise<Array<Record<string, unknown>>> {
  // In production, searches Elasticsearch for matching dishes
  return [];
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildIntentExtractionPrompt(query: string, context: UserContext): string {
  return `Extract the user intent from the following query.
User preferences: ${JSON.stringify(context.preferences)}
Query: "${query}"
Return a JSON object with: type, confidence, entities.`;
}

function parseIntentResponse(content: string, originalQuery: string): Intent {
  try {
    const parsed = JSON.parse(content) as Partial<Intent>;
    return {
      type: parsed.type ?? 'unknown',
      confidence: parsed.confidence ?? 0.5,
      entities: parsed.entities ?? {},
      originalQuery,
    };
  } catch {
    return detectIntentFromKeywords(originalQuery);
  }
}

function detectIntentFromKeywords(query: string): Intent {
  const lower = query.toLowerCase();

  if (lower.includes('find') || lower.includes('search') || lower.includes('restaurant')) {
    return { type: 'search_restaurant', confidence: 0.7, entities: {}, originalQuery: query };
  }
  if (lower.includes('order') || lower.includes('buy') || lower.includes('want')) {
    return { type: 'place_order', confidence: 0.7, entities: {}, originalQuery: query };
  }
  if (lower.includes('track') || lower.includes('where') || lower.includes('status')) {
    return { type: 'track_order', confidence: 0.7, entities: {}, originalQuery: query };
  }
  if (lower.includes('recommend') || lower.includes('suggest')) {
    return { type: 'get_recommendations', confidence: 0.7, entities: {}, originalQuery: query };
  }

  return { type: 'search_restaurant', confidence: 0.5, entities: {}, originalQuery: query };
}

function createSearchWorkflowDef(intent: Intent): WorkflowDefinition {
  return {
    id: `search_${Date.now()}`,
    steps: [
      { id: 'load_context', type: 'activity', activityName: 'loadUserContext', input: {}, dependencies: [], timeout: '10s' },
      { id: 'search', type: 'activity', activityName: 'callMCPSearch', input: { query: intent.originalQuery }, dependencies: ['load_context'], timeout: '15s' },
      { id: 'filter', type: 'activity', activityName: 'applyFilters', input: {}, dependencies: ['search'], timeout: '5s' },
      { id: 'rank', type: 'activity', activityName: 'rankResults', input: {}, dependencies: ['filter'], timeout: '5s' },
    ],
    errorHandling: { retryPolicy: { maximumAttempts: 3, initialInterval: '1s' } },
    retryPolicy: { maximumAttempts: 3, initialInterval: '1s', backoffCoefficient: 2 },
  };
}

function createOrderWorkflowDef(intent: Intent): WorkflowDefinition {
  return {
    id: `order_${Date.now()}`,
    steps: [
      { id: 'validate', type: 'activity', activityName: 'validateCart', input: {}, dependencies: [], timeout: '5s' },
      { id: 'inventory', type: 'activity', activityName: 'checkInventory', input: {}, dependencies: ['validate'], timeout: '10s' },
      { id: 'reserve', type: 'activity', activityName: 'reserveItems', input: {}, dependencies: ['inventory'], timeout: '10s' },
      { id: 'payment', type: 'activity', activityName: 'processPayment', input: {}, dependencies: ['reserve'], timeout: '30s' },
      { id: 'create_order', type: 'activity', activityName: 'createOrder', input: {}, dependencies: ['payment'], timeout: '10s' },
    ],
    errorHandling: { retryPolicy: { maximumAttempts: 3, initialInterval: '1s' }, compensationEnabled: true },
    retryPolicy: { maximumAttempts: 3, initialInterval: '1s', backoffCoefficient: 2 },
  };
}

function createTrackingWorkflowDef(_intent: Intent): WorkflowDefinition {
  return {
    id: `track_${Date.now()}`,
    steps: [
      { id: 'load_order', type: 'activity', activityName: 'loadFromDatabase', input: {}, dependencies: [], timeout: '5s' },
      { id: 'track', type: 'activity', activityName: 'trackDelivery', input: {}, dependencies: ['load_order'], timeout: '10s' },
    ],
    errorHandling: { retryPolicy: { maximumAttempts: 3, initialInterval: '1s' } },
    retryPolicy: { maximumAttempts: 3, initialInterval: '1s', backoffCoefficient: 2 },
  };
}

function createRecommendationWorkflowDef(_intent: Intent): WorkflowDefinition {
  return {
    id: `recommend_${Date.now()}`,
    steps: [
      { id: 'load_prefs', type: 'activity', activityName: 'loadPreferenceGraph', input: {}, dependencies: [], timeout: '10s' },
      { id: 'generate', type: 'activity', activityName: 'generateRecommendations', input: {}, dependencies: ['load_prefs'], timeout: '15s' },
      { id: 'cache', type: 'activity', activityName: 'cacheRecommendations', input: {}, dependencies: ['generate'], timeout: '5s' },
    ],
    errorHandling: { retryPolicy: { maximumAttempts: 3, initialInterval: '1s' } },
    retryPolicy: { maximumAttempts: 3, initialInterval: '1s', backoffCoefficient: 2 },
  };
}

function hasCyclicDependency(
  step: WorkflowStep,
  allSteps: WorkflowStep[],
  visited: Set<string>
): boolean {
  if (visited.has(step.id)) return true;
  visited.add(step.id);

  for (const depId of step.dependencies) {
    const depStep = allSteps.find((s) => s.id === depId);
    if (depStep && hasCyclicDependency(depStep, allSteps, visited)) {
      return true;
    }
  }

  visited.delete(step.id);
  return false;
}
