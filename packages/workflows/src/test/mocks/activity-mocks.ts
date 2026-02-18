/**
 * Activity Mocks for Workflow Tests
 *
 * Centralized mock implementations for all Temporal activities
 */

import { createMockActivity } from '../utils/temporal-test-helper';

// ============================================================================
// Search & Discovery Activities
// ============================================================================

export interface UserContext {
  userId: string;
  preferences: {
    cuisine: string[];
    priceRange?: [number, number];
    dietaryRestrictions?: string[];
  };
  location?: {
    latitude: number;
    longitude: number;
  };
  orderHistory?: string[];
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  priceRange: number;
  location: {
    latitude: number;
    longitude: number;
  };
  availability: boolean;
}

export interface Dish {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  availability: boolean;
  dietaryTags: string[];
}

export const mockLoadUserContext = createMockActivity<[string], UserContext>();
export const mockCallMCPSearch = createMockActivity<[any], Restaurant[]>();
export const mockCacheResults = createMockActivity<[any], boolean>();
export const mockSearchDishes = createMockActivity<[any], Dish[]>();
export const mockApplyFilters = createMockActivity<[Restaurant[], any], Restaurant[]>();
export const mockRankResults = createMockActivity<[Restaurant[], UserContext], Restaurant[]>();

// ============================================================================
// Order Management Activities
// ============================================================================

export interface CartItem {
  dishId: string;
  quantity: number;
  price: number;
  customizations?: Record<string, any>;
}

export interface Order {
  id: string;
  userId: string;
  restaurantId: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  paymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentDetails {
  method: 'card' | 'upi' | 'cash' | 'wallet';
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  paymentId: string;
  status: 'success' | 'failed' | 'pending';
  transactionId?: string;
  errorMessage?: string;
}

export const mockValidateCart = createMockActivity<[CartItem[]], boolean>();
export const mockCheckInventory = createMockActivity<[CartItem[]], boolean>();
export const mockReserveItems = createMockActivity<[string, CartItem[]], boolean>();
export const mockReleaseItems = createMockActivity<[string], void>();
export const mockProcessPayment = createMockActivity<[string, PaymentDetails], PaymentResult>();
export const mockRefundPayment = createMockActivity<[string], PaymentResult>();
export const mockCreateOrder = createMockActivity<[any], Order>();
export const mockUpdateOrderStatus = createMockActivity<[string, Order['status']], Order>();
export const mockNotifyRestaurant = createMockActivity<[string], void>();
export const mockNotifyCustomer = createMockActivity<[string, string], void>();
export const mockCancelOrder = createMockActivity<[string], Order>();

// ============================================================================
// Recommendation Activities
// ============================================================================

export interface RecommendationContext {
  userId: string;
  sessionId: string;
  currentLocation?: { latitude: number; longitude: number };
  timeOfDay: string;
  dayOfWeek: string;
  orderHistory: string[];
  preferences: Record<string, any>;
}

export interface Recommendation {
  type: 'restaurant' | 'dish';
  id: string;
  name: string;
  reason: string;
  score: number;
  metadata: Record<string, any>;
}

export const mockLoadPreferenceGraph = createMockActivity<[string], any>();
export const mockGenerateRecommendations = createMockActivity<
  [RecommendationContext],
  Recommendation[]
>();
export const mockUpdatePreferenceGraph = createMockActivity<[string, any], void>();
export const mockDecayOldPreferences = createMockActivity<[string], void>();
export const mockCacheRecommendations = createMockActivity<[string, Recommendation[]], void>();

// ============================================================================
// LLM Activities
// ============================================================================

export interface Intent {
  type: string;
  confidence: number;
  entities: Record<string, any>;
  originalQuery: string;
}

export interface WorkflowDefinition {
  id: string;
  steps: WorkflowStep[];
  errorHandling: Record<string, any>;
  retryPolicy: Record<string, any>;
}

export interface WorkflowStep {
  id: string;
  type: string;
  activityName: string;
  input: Record<string, any>;
  dependencies: string[];
  timeout: string;
}

export const mockExtractIntent = createMockActivity<[string, UserContext], Intent>();
export const mockEnrichWithContext = createMockActivity<[Intent, UserContext], Intent>();
export const mockGenerateWorkflow = createMockActivity<[Intent], WorkflowDefinition>();
export const mockValidateWorkflow = createMockActivity<[WorkflowDefinition], boolean>();
export const mockCallLLM = createMockActivity<[string, any], any>();
export const mockCacheLLMResponse = createMockActivity<[string, any], void>();

// ============================================================================
// Notification Activities
// ============================================================================

export interface Notification {
  userId: string;
  type: 'email' | 'sms' | 'push' | 'in-app';
  title: string;
  body: string;
  data?: Record<string, any>;
}

export const mockSendEmail = createMockActivity<[string, string, string], void>();
export const mockSendSMS = createMockActivity<[string, string], void>();
export const mockSendPushNotification = createMockActivity<[Notification], void>();
export const mockSendInAppNotification = createMockActivity<[string, string], void>();

// ============================================================================
// Database Activities
// ============================================================================

export const mockSaveToDatabase = createMockActivity<[string, any], any>();
export const mockLoadFromDatabase = createMockActivity<[string, string], any>();
export const mockUpdateDatabase = createMockActivity<[string, string, any], any>();
export const mockDeleteFromDatabase = createMockActivity<[string, string], boolean>();

// ============================================================================
// Cache Activities
// ============================================================================

export const mockGetFromCache = createMockActivity<[string], any>();
export const mockSetInCache = createMockActivity<[string, any, number?], void>();
export const mockInvalidateCache = createMockActivity<[string], void>();
export const mockClearCachePattern = createMockActivity<[string], void>();

// ============================================================================
// External Service Activities
// ============================================================================

export const mockCallExternalAPI = createMockActivity<[string, any], any>();
export const mockCallPaymentGateway = createMockActivity<[PaymentDetails], PaymentResult>();
export const mockCallDeliveryService = createMockActivity<[string], any>();
export const mockCallInventoryService = createMockActivity<[string], any>();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Reset all mocks to their initial state
 */
export function resetAllMocks(): void {
  mockLoadUserContext.reset();
  mockCallMCPSearch.reset();
  mockCacheResults.reset();
  mockSearchDishes.reset();
  mockApplyFilters.reset();
  mockRankResults.reset();

  mockValidateCart.reset();
  mockCheckInventory.reset();
  mockReserveItems.reset();
  mockReleaseItems.reset();
  mockProcessPayment.reset();
  mockRefundPayment.reset();
  mockCreateOrder.reset();
  mockUpdateOrderStatus.reset();
  mockNotifyRestaurant.reset();
  mockNotifyCustomer.reset();
  mockCancelOrder.reset();

  mockLoadPreferenceGraph.reset();
  mockGenerateRecommendations.reset();
  mockUpdatePreferenceGraph.reset();
  mockDecayOldPreferences.reset();
  mockCacheRecommendations.reset();

  mockExtractIntent.reset();
  mockEnrichWithContext.reset();
  mockGenerateWorkflow.reset();
  mockValidateWorkflow.reset();
  mockCallLLM.reset();
  mockCacheLLMResponse.reset();

  mockSendEmail.reset();
  mockSendSMS.reset();
  mockSendPushNotification.reset();
  mockSendInAppNotification.reset();

  mockSaveToDatabase.reset();
  mockLoadFromDatabase.reset();
  mockUpdateDatabase.reset();
  mockDeleteFromDatabase.reset();

  mockGetFromCache.reset();
  mockSetInCache.reset();
  mockInvalidateCache.reset();
  mockClearCachePattern.reset();

  mockCallExternalAPI.reset();
  mockCallPaymentGateway.reset();
  mockCallDeliveryService.reset();
  mockCallInventoryService.reset();
}

/**
 * Get all activities as a record for worker configuration
 */
export function getAllMockActivities(): Record<string, any> {
  return {
    loadUserContext: mockLoadUserContext.fn,
    callMCPSearch: mockCallMCPSearch.fn,
    cacheResults: mockCacheResults.fn,
    searchDishes: mockSearchDishes.fn,
    applyFilters: mockApplyFilters.fn,
    rankResults: mockRankResults.fn,

    validateCart: mockValidateCart.fn,
    checkInventory: mockCheckInventory.fn,
    reserveItems: mockReserveItems.fn,
    releaseItems: mockReleaseItems.fn,
    processPayment: mockProcessPayment.fn,
    refundPayment: mockRefundPayment.fn,
    createOrder: mockCreateOrder.fn,
    updateOrderStatus: mockUpdateOrderStatus.fn,
    notifyRestaurant: mockNotifyRestaurant.fn,
    notifyCustomer: mockNotifyCustomer.fn,
    cancelOrder: mockCancelOrder.fn,

    loadPreferenceGraph: mockLoadPreferenceGraph.fn,
    generateRecommendations: mockGenerateRecommendations.fn,
    updatePreferenceGraph: mockUpdatePreferenceGraph.fn,
    decayOldPreferences: mockDecayOldPreferences.fn,
    cacheRecommendations: mockCacheRecommendations.fn,

    extractIntent: mockExtractIntent.fn,
    enrichWithContext: mockEnrichWithContext.fn,
    generateWorkflow: mockGenerateWorkflow.fn,
    validateWorkflow: mockValidateWorkflow.fn,
    callLLM: mockCallLLM.fn,
    cacheLLMResponse: mockCacheLLMResponse.fn,

    sendEmail: mockSendEmail.fn,
    sendSMS: mockSendSMS.fn,
    sendPushNotification: mockSendPushNotification.fn,
    sendInAppNotification: mockSendInAppNotification.fn,

    saveToDatabase: mockSaveToDatabase.fn,
    loadFromDatabase: mockLoadFromDatabase.fn,
    updateDatabase: mockUpdateDatabase.fn,
    deleteFromDatabase: mockDeleteFromDatabase.fn,

    getFromCache: mockGetFromCache.fn,
    setInCache: mockSetInCache.fn,
    invalidateCache: mockInvalidateCache.fn,
    clearCachePattern: mockClearCachePattern.fn,

    callExternalAPI: mockCallExternalAPI.fn,
    callPaymentGateway: mockCallPaymentGateway.fn,
    callDeliveryService: mockCallDeliveryService.fn,
    callInventoryService: mockCallInventoryService.fn,
  };
}
