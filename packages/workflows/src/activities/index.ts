/**
 * Activity Exports
 *
 * Central export point for all Temporal activities.
 * Activities are organized into domain-specific modules.
 */

// Re-export types
export type {
  UserContext,
  Restaurant,
  CartItem,
  PaymentDetails,
  PaymentResult,
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  EmailPayload,
  SMSPayload,
  PushNotificationPayload,
  DeliveryPartner,
  DeliveryAssignment,
  NotificationChannel,
} from '../types';

// ============================================================================
// Database Activities
// ============================================================================
export {
  saveToDatabase,
  loadFromDatabase,
  updateDatabase,
  deleteFromDatabase,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  initializeRepositories,
} from './database.activities';

// ============================================================================
// Payment Activities
// ============================================================================
export {
  processPayment,
  refundPayment,
  callPaymentGateway,
  validateCart,
  checkInventory,
  reserveItems,
  releaseItems,
  initializePaymentGateway,
} from './payment.activities';

// ============================================================================
// Notification Activities
// ============================================================================
export {
  sendEmail,
  sendSMS,
  sendPushNotification,
  sendInAppNotification,
  notifyRestaurant,
  notifyCustomer,
  initializeNotificationServices,
} from './notification.activities';

// ============================================================================
// External Service Activities
// ============================================================================
export {
  callMCPSearch,
  applyFilters,
  rankResults,
  getFromCache,
  setInCache,
  invalidateCache,
  clearCachePattern,
  cacheResults,
  callDeliveryService,
  assignDeliveryPartner,
  trackDelivery,
  callInventoryService,
  callExternalAPI,
  initializeExternalServices,
} from './external.activities';

// ============================================================================
// LLM Activities
// ============================================================================
export {
  extractIntent,
  enrichWithContext,
  generateWorkflow,
  validateWorkflow,
  callLLM,
  cacheLLMResponse,
  loadPreferenceGraph,
  generateRecommendations,
  updatePreferenceGraph,
  decayOldPreferences,
  cacheRecommendations,
  loadUserContext,
  searchDishes,
  initializeLLMService,
} from './llm.activities';

// ============================================================================
// Party Planner Activities
// ============================================================================
export {
  validateRestaurantAvailability,
  placePartyOrder,
  notifyPartyStatus,
  cancelPartyOrder,
  initializePartyServices,
} from './party-activities';

// ============================================================================
// Diet Planner Activities
// ============================================================================
export {
  getMealsForToday,
  validateMealAvailability,
  placeMealOrder,
  updateNutritionLog,
  generateWeeklyMeals,
  notifyMealPlanReady,
} from './diet.activities';
