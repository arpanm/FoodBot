/**
 * Shared TypeScript types for FoodBot Chrome Extension
 */

// Extension Message Types
export enum MessageType {
  START_ORDER = 'START_ORDER',
  EXTRACT_MENU = 'EXTRACT_MENU',
  ANALYZE_PAGE = 'ANALYZE_PAGE',
  EXECUTE_ACTION = 'EXECUTE_ACTION',
  UPDATE_STATUS = 'UPDATE_STATUS',
  ERROR = 'ERROR',
  GET_CART_CONTENTS = 'GET_CART_CONTENTS',
  CLEAR_CART = 'CLEAR_CART',
  START_CHECKOUT = 'START_CHECKOUT',
  APPLY_COUPON = 'APPLY_COUPON',
  GET_DOM_SNAPSHOT = 'GET_DOM_SNAPSHOT',
  SEARCH_RESTAURANT = 'SEARCH_RESTAURANT',
  SEARCH_DISH = 'SEARCH_DISH',
  ADD_TO_CART = 'ADD_TO_CART',
  REMOVE_FROM_CART = 'REMOVE_FROM_CART',
  UPDATE_CART_QUANTITY = 'UPDATE_CART_QUANTITY',
}

export interface ExtensionMessage {
  type: MessageType;
  payload?: unknown;
  requestId?: string;
}

// Order Related Types
export interface OrderRequest {
  userId: string;
  sessionId: string;
  userMessage: string;
  context?: OrderContext;
}

export interface OrderContext {
  restaurantId?: string;
  restaurantName?: string;
  location?: string;
  previousOrders?: string[];
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  isVeg?: boolean;
  rating?: number;
  imageUrl?: string;
  available?: boolean;
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string[];
  rating: number;
  deliveryTime: string;
  distance?: string;
  priceForTwo?: number;
}

// LLM Related Types
export interface LLMRequest {
  prompt: string;
  context?: Record<string, unknown>;
  sessionId: string;
}

export interface LLMResponse {
  action: BrowserAction;
  reasoning?: string;
  confidence?: number;
}

export enum BrowserAction {
  SEARCH_RESTAURANT = 'SEARCH_RESTAURANT',
  SELECT_RESTAURANT = 'SELECT_RESTAURANT',
  BROWSE_MENU = 'BROWSE_MENU',
  ADD_TO_CART = 'ADD_TO_CART',
  MODIFY_CART = 'MODIFY_CART',
  CHECKOUT = 'CHECKOUT',
  FILL_ADDRESS = 'FILL_ADDRESS',
  CONFIRM_ORDER = 'CONFIRM_ORDER',
  WAIT = 'WAIT',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
}

export interface ActionInstruction {
  action: BrowserAction;
  target?: string;
  value?: unknown;
  selector?: string;
}

// Page Analysis Types
export interface PageAnalysis {
  url: string;
  platform: 'swiggy' | 'zomato';
  pageType: PageType;
  elements: PageElement[];
  restaurants?: Restaurant[];
  menuItems?: MenuItem[];
  cartItems?: CartItem[];
}

export enum PageType {
  HOME = 'HOME',
  RESTAURANT_LIST = 'RESTAURANT_LIST',
  RESTAURANT_DETAIL = 'RESTAURANT_DETAIL',
  CART = 'CART',
  CHECKOUT = 'CHECKOUT',
  ORDER_CONFIRMATION = 'ORDER_CONFIRMATION',
}

export interface PageElement {
  type: string;
  selector: string;
  text?: string;
  value?: string;
  attributes?: Record<string, string>;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  customizations?: string[];
}

// Storage Types
export interface StoredSession {
  sessionId: string;
  userId: string;
  startTime: number;
  lastActivity: number;
  status: SessionStatus;
  currentPage?: string;
  orderData?: Partial<OrderRequest>;
}

export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

// API Types
export interface APIConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

// Job Types
export interface Job {
  id: string;
  userId: string;
  status: JobStatus;
  action: JobAction;
  platform: string;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  currentStep?: string;
  progress: number;
  error?: JobError;
  createdAt: string;
  updatedAt: string;
  retryCount?: number;
  maxRetries?: number;
}

export enum JobStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying',
}

export enum JobAction {
  SEARCH_RESTAURANT = 'search_restaurant',
  SELECT_RESTAURANT = 'select_restaurant',
  BROWSE_MENU = 'browse_menu',
  ADD_TO_CART = 'add_to_cart',
  MODIFY_CART = 'modify_cart',
  CHECKOUT = 'checkout',
  FILL_ADDRESS = 'fill_address',
  CONFIRM_ORDER = 'confirm_order',
  EXTRACT_DATA = 'extract_data',
}

export interface JobError {
  code: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
}

export interface StatusUpdate {
  status: JobStatus;
  progress?: number;
  currentStep?: string;
  error?: JobError;
  result?: Record<string, unknown>;
}

export interface JobResult {
  jobId: string;
  status: JobStatus;
  data?: Record<string, unknown>;
  error?: JobError;
}

// Error Types
export class ExtensionError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ExtensionError';
  }
}
