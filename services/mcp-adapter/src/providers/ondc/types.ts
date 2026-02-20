/**
 * ONDC/Beckn Protocol TypeScript Type Definitions
 *
 * Based on Beckn Protocol 1.1.0 specification
 * Last Updated: February 2026
 * Knowledge Base: January 2025
 *
 * ⚠️ IMPORTANT: Verify types with latest ONDC specification at https://docs.ondc.org
 */

// ============================================================================
// Core Beckn Types
// ============================================================================

/**
 * Beckn Context - Metadata for every API call
 */
export interface BecknContext {
  /** Domain classification (NIC code) */
  domain: string;
  /** ISO 3166-1 alpha-3 country code */
  country: string;
  /** City code with std: prefix (e.g., "std:080") */
  city: string;
  /** API action name */
  action: BecknAction;
  /** Beckn protocol version */
  core_version: string;
  /** Buyer App Participant ID */
  bap_id: string;
  /** Buyer App callback base URL */
  bap_uri: string;
  /** Seller App Participant ID (optional in search) */
  bpp_id?: string;
  /** Seller App API URL (optional in search) */
  bpp_uri?: string;
  /** Unique transaction identifier (UUID) */
  transaction_id: string;
  /** Unique message identifier (UUID) */
  message_id: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Time to live (ISO 8601 duration, e.g., "PT30S") */
  ttl?: string;
}

/**
 * Beckn API Actions
 */
export type BecknAction =
  | 'search'
  | 'on_search'
  | 'select'
  | 'on_select'
  | 'init'
  | 'on_init'
  | 'confirm'
  | 'on_confirm'
  | 'status'
  | 'on_status'
  | 'track'
  | 'on_track'
  | 'cancel'
  | 'on_cancel'
  | 'support'
  | 'on_support'
  | 'rating'
  | 'on_rating';

/**
 * Base Beckn Message Structure
 */
export interface BecknMessage<T = any> {
  context: BecknContext;
  message?: T;
  error?: BecknError;
}

/**
 * Beckn Error Object
 */
export interface BecknError {
  /** Error type */
  type: ErrorType;
  /** Error code */
  code: string;
  /** JSON path to error field */
  path?: string;
  /** Human-readable error message */
  message: string;
}

export type ErrorType =
  | 'CONTEXT-ERROR'
  | 'CORE-ERROR'
  | 'DOMAIN-ERROR'
  | 'POLICY-ERROR'
  | 'JSON-SCHEMA-ERROR';

/**
 * ACK/NACK Response
 */
export interface AckResponse {
  message: {
    ack: {
      status: 'ACK' | 'NACK';
    };
  };
  error?: BecknError;
}

// ============================================================================
// Discovery Types
// ============================================================================

/**
 * Search Request
 */
export interface SearchRequest {
  context: BecknContext & { action: 'search' };
  message: {
    intent: SearchIntent;
  };
}

export interface SearchIntent {
  fulfillment?: {
    type?: 'Delivery' | 'Pickup';
    end?: {
      location?: {
        gps?: string;
        address?: {
          area_code?: string;
        };
      };
    };
  };
  payment?: {
    type?: 'PRE-FULFILLMENT' | 'ON-FULFILLMENT' | 'POST-FULFILLMENT';
  };
  category?: {
    descriptor?: {
      name?: string;
    };
  };
  item?: {
    descriptor?: {
      name?: string;
    };
  };
  provider?: {
    descriptor?: {
      name?: string;
    };
  };
}

/**
 * On_Search Response
 */
export interface OnSearchResponse {
  context: BecknContext & {
    action: 'on_search';
    bpp_id: string;
    bpp_uri: string;
  };
  message: {
    catalog: Catalog;
  };
}

export interface Catalog {
  'bpp/descriptor': Descriptor;
  'bpp/providers': Provider[];
}

export interface Descriptor {
  name: string;
  symbol?: string;
  short_desc?: string;
  long_desc?: string;
  images?: string[];
}

export interface Provider {
  id: string;
  descriptor: Descriptor;
  locations: Location[];
  categories: Category[];
  items: Item[];
  fulfillments: Fulfillment[];
  payments: Payment[];
  time?: Time;
}

export interface Location {
  id: string;
  gps: string;
  address: Address;
  time?: Time;
}

export interface Address {
  door?: string;
  name?: string;
  building?: string;
  street?: string;
  locality?: string;
  ward?: string;
  city?: string;
  state?: string;
  country?: string;
  area_code: string;
}

export interface Category {
  id: string;
  descriptor: {
    name: string;
  };
}

export interface Item {
  id: string;
  descriptor: Descriptor;
  category_id: string;
  fulfillment_id: string;
  location_id: string;
  price: Price;
  quantity: Quantity;
  tags?: Tag[];
}

export interface Price {
  currency: string;
  value: string;
  maximum_value?: string;
}

export interface Quantity {
  available: {
    count: string;
  };
  maximum?: {
    count: string;
  };
}

export interface Tag {
  code: string;
  list: TagItem[];
}

export interface TagItem {
  code: string;
  value: string;
}

export interface Fulfillment {
  id: string;
  type: 'Delivery' | 'Pickup';
  contact?: Contact;
  state?: State;
  tracking?: boolean;
  start?: FulfillmentEnd;
  end?: FulfillmentEnd;
}

export interface Contact {
  phone: string;
  email?: string;
}

export interface State {
  descriptor: {
    code: FulfillmentState;
  };
}

export type FulfillmentState =
  | 'Serviceable'
  | 'Non-serviceable'
  | 'Pending'
  | 'Packed'
  | 'Order-picked-up'
  | 'Out-for-delivery'
  | 'Order-delivered'
  | 'Cancelled'
  | 'RTO-Initiated'
  | 'RTO-Delivered';

export interface FulfillmentEnd {
  location?: {
    gps: string;
    address: Address;
  };
  time?: {
    range?: {
      start: string;
      end: string;
    };
  };
  contact?: Contact;
}

export interface Payment {
  id: string;
  type: 'ON-ORDER' | 'PRE-FULFILLMENT' | 'ON-FULFILLMENT' | 'POST-FULFILLMENT';
  collected_by: 'BAP' | 'BPP';
  params?: {
    transaction_id?: string;
    amount?: string;
    currency?: string;
  };
  status?: PaymentStatus;
  tags?: Tag[];
}

export type PaymentStatus = 'PAID' | 'NOT-PAID';

export interface Time {
  label: string;
  timestamp?: string;
  duration?: string;
  range?: {
    start: string;
    end: string;
  };
}

// ============================================================================
// Order Types
// ============================================================================

/**
 * Select Request
 */
export interface SelectRequest {
  context: BecknContext & {
    action: 'select';
    bpp_id: string;
    bpp_uri: string;
  };
  message: {
    order: SelectOrder;
  };
}

export interface SelectOrder {
  provider: {
    id: string;
    locations: [{ id: string }];
  };
  items: OrderItem[];
  fulfillments: {
    type: 'Delivery' | 'Pickup';
    end?: {
      location: {
        gps: string;
        address: Address;
      };
    };
  }[];
}

export interface OrderItem {
  id: string;
  quantity: {
    count: number;
  };
  price?: Price;
}

/**
 * On_Select Response
 */
export interface OnSelectResponse {
  context: BecknContext & { action: 'on_select' };
  message: {
    order: {
      provider: {
        id: string;
        locations: [{ id: string }];
      };
      items: OrderItem[];
      quote: Quote;
      fulfillments: Fulfillment[];
    };
  };
}

export interface Quote {
  price: Price;
  breakup: QuoteBreakup[];
  ttl?: string;
}

export interface QuoteBreakup {
  title: string;
  price: Price;
}

/**
 * Init Request
 */
export interface InitRequest {
  context: BecknContext & { action: 'init' };
  message: {
    order: {
      provider: {
        id: string;
        locations: [{ id: string }];
      };
      items: OrderItem[];
      billing: Billing;
      fulfillments: {
        type: string;
        end: {
          location: {
            gps: string;
            address: Address;
          };
          contact: {
            phone: string;
          };
        };
      }[];
      payment: {
        type: string;
        collected_by: 'BAP' | 'BPP';
      };
    };
  };
}

export interface Billing {
  name: string;
  email: string;
  phone: string;
  address: Address;
}

/**
 * On_Init Response
 */
export interface OnInitResponse {
  context: BecknContext & { action: 'on_init' };
  message: {
    order: {
      provider: {
        id: string;
      };
      items: OrderItem[];
      billing: Billing;
      fulfillments: Fulfillment[];
      quote: Quote;
      payment: Payment;
    };
  };
}

/**
 * Confirm Request
 */
export interface ConfirmRequest {
  context: BecknContext & { action: 'confirm' };
  message: {
    order: {
      id?: string;
      provider: {
        id: string;
      };
      items: OrderItem[];
      billing: Billing;
      fulfillments: {
        type: string;
        end: {
          location: {
            gps: string;
            address: Address;
          };
          contact: {
            phone: string;
          };
        };
      }[];
      payment: {
        type: string;
        collected_by: string;
        params: {
          transaction_id: string;
          amount: string;
          currency: string;
        };
        status: PaymentStatus;
      };
    };
  };
}

/**
 * On_Confirm Response
 */
export interface OnConfirmResponse {
  context: BecknContext & { action: 'on_confirm' };
  message: {
    order: Order;
  };
}

export interface Order {
  id: string;
  state: OrderState;
  provider: {
    id: string;
    descriptor: Descriptor;
    locations: [{ id: string }];
  };
  items: OrderItem[];
  billing: Billing;
  fulfillments: Fulfillment[];
  quote: Quote;
  payment: Payment;
  created_at: string;
  updated_at: string;
}

export type OrderState =
  | 'Created'
  | 'Accepted'
  | 'In-progress'
  | 'Completed'
  | 'Cancelled';

// ============================================================================
// Post-Fulfillment Types
// ============================================================================

/**
 * Status Request
 */
export interface StatusRequest {
  context: BecknContext & { action: 'status' };
  message: {
    order_id: string;
  };
}

/**
 * On_Status Response
 */
export interface OnStatusResponse {
  context: BecknContext & { action: 'on_status' };
  message: {
    order: Order;
  };
}

/**
 * Track Request
 */
export interface TrackRequest {
  context: BecknContext & { action: 'track' };
  message: {
    order_id: string;
    callback_url?: string;
  };
}

/**
 * On_Track Response
 */
export interface OnTrackResponse {
  context: BecknContext & { action: 'on_track' };
  message: {
    tracking: {
      url?: string;
      location?: {
        gps: string;
        updated_at: string;
      };
    };
  };
}

/**
 * Cancel Request
 */
export interface CancelRequest {
  context: BecknContext & { action: 'cancel' };
  message: {
    order_id: string;
    cancellation_reason_id: CancellationReasonCode;
    descriptor?: {
      short_desc: string;
    };
  };
}

export type CancellationReasonCode =
  | '001' // Price changed
  | '002' // Item not available
  | '003' // Available at lower price
  | '004' // Merchant cannot fulfill
  | '005' // Pending too long
  | '006' // Buyer not found
  | '007' // Buyer doesn't want
  | '008' // Modify address
  | '009' // Modify order
  | '010' // Delivery time too high
  | '011' // No capacity
  | '012' // Lost in transit
  | '013'; // Buyer cancellation

/**
 * On_Cancel Response
 */
export interface OnCancelResponse {
  context: BecknContext & { action: 'on_cancel' };
  message: {
    order: {
      id: string;
      state: 'Cancelled';
      cancellation: {
        cancelled_by: string;
        reason: {
          id: CancellationReasonCode;
          descriptor: {
            short_desc: string;
          };
        };
      };
      refund?: {
        amount: Price;
        timestamp: string;
        status: 'Processing' | 'Completed' | 'Failed';
      };
    };
  };
}

/**
 * Support Request
 */
export interface SupportRequest {
  context: BecknContext & { action: 'support' };
  message: {
    ref_id: string;
  };
}

/**
 * On_Support Response
 */
export interface OnSupportResponse {
  context: BecknContext & { action: 'on_support' };
  message: {
    support: {
      phone: string;
      email?: string;
      url?: string;
    };
  };
}

/**
 * Rating Request
 */
export interface RatingRequest {
  context: BecknContext & { action: 'rating' };
  message: {
    ratings: Rating[];
  };
}

export interface Rating {
  id: string;
  rating_category: RatingCategory;
  value: string;
  feedback_form?: FeedbackItem[];
}

export type RatingCategory = 'Order' | 'Item' | 'Fulfillment' | 'Provider';

export interface FeedbackItem {
  question: string;
  answer: string;
}

/**
 * On_Rating Response
 */
export interface OnRatingResponse {
  context: BecknContext & { action: 'on_rating' };
  message: {
    feedback_ack: boolean;
    rating_acknowledgement: {
      id: string;
      rating_category: RatingCategory;
      status: 'Received';
    }[];
  };
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * ONDC Transaction State
 */
export interface ONDCTransaction {
  transaction_id: string;
  bpp_id?: string;
  bpp_uri?: string;
  status: 'searching' | 'selecting' | 'initializing' | 'confirming' | 'confirmed' | 'cancelled';
  created_at: Date;
  updated_at: Date;
}

/**
 * Callback Handler Type
 */
export type CallbackHandler<T extends BecknMessage> = (message: T) => Promise<void>;

/**
 * ONDC Client Configuration
 */
export interface ONDCClientConfig {
  gateway_url: string;
  subscriber_id: string;
  subscriber_uri: string;
  private_key: Uint8Array;
  public_key: Uint8Array;
  unique_key_id: string;
  domain: string;
  country: string;
  city: string;
  core_version: string;
}
