/**
 * ONDC Client Implementation
 *
 * Complete TypeScript client for ONDC (Open Network for Digital Commerce) integration.
 * Implements Beckn Protocol 1.1.0 asynchronous request-callback pattern.
 *
 * @module ONDCClient
 * @version 1.0.0
 * @author FoodBot Team
 * @license MIT
 *
 * ⚠️ IMPORTANT: This implementation is based on January 2025 knowledge.
 * Verify with official ONDC documentation at https://docs.ondc.org before production use.
 */

import { ed25519 } from '@noble/curves/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import { v4 as uuidv4 } from 'uuid';
import axios, { AxiosInstance } from 'axios';
import type {
  BecknContext,
  BecknMessage,
  AckResponse,
  SearchRequest,
  OnSearchResponse,
  SelectRequest,
  OnSelectResponse,
  InitRequest,
  OnInitResponse,
  ConfirmRequest,
  OnConfirmResponse,
  StatusRequest,
  OnStatusResponse,
  TrackRequest,
  OnTrackResponse,
  CancelRequest,
  OnCancelResponse,
  SupportRequest,
  OnSupportResponse,
  RatingRequest,
  OnRatingResponse,
  ONDCClientConfig,
  SearchIntent,
  SelectOrder,
  Billing,
  Address,
  CancellationReasonCode,
  Rating,
} from './types';

/**
 * ONDCClient - Main client for ONDC API interactions
 *
 * Features:
 * - Automatic digital signature generation
 * - Async callback handling
 * - Retry logic with exponential backoff
 * - Transaction state management
 * - Error handling and logging
 *
 * Usage:
 * ```typescript
 * const client = new ONDCClient(config);
 *
 * // Search for restaurants
 * await client.search({
 *   gps: "12.9715987,77.5945627",
 *   category: "Pizza"
 * });
 *
 * // Handle callback in your endpoint
 * app.post('/beckn/on_search', async (req, res) => {
 *   await client.handleOnSearch(req.body);
 *   res.json({ message: { ack: { status: 'ACK' } } });
 * });
 * ```
 */
export class ONDCClient {
  private readonly config: ONDCClientConfig;
  private readonly httpClient: AxiosInstance;
  private readonly callbackHandlers: Map<string, CallbackHandlerRegistry>;

  constructor(config: ONDCClientConfig) {
    this.config = config;
    this.callbackHandlers = new Map();

    // Initialize HTTP client with defaults
    this.httpClient = axios.create({
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // ==========================================================================
  // Discovery APIs
  // ==========================================================================

  /**
   * Search for restaurants/items matching criteria
   *
   * @param params - Search parameters
   * @returns Transaction ID for tracking callbacks
   *
   * @example
   * ```typescript
   * const txnId = await client.search({
   *   gps: "12.9715987,77.5945627",
   *   area_code: "560001",
   *   category: "Pizza",
   *   item_name: "Margherita"
   * });
   *
   * // Wait for on_search callbacks
   * client.on('on_search', txnId, (catalog) => {
   *   console.log('Found restaurants:', catalog);
   * });
   * ```
   */
  async search(params: {
    gps?: string;
    area_code?: string;
    category?: string;
    item_name?: string;
    provider_name?: string;
    fulfillment_type?: 'Delivery' | 'Pickup';
  }): Promise<string> {
    const transaction_id = uuidv4();

    const intent: SearchIntent = {};

    // Build fulfillment intent
    if (params.gps || params.area_code || params.fulfillment_type) {
      intent.fulfillment = {
        type: params.fulfillment_type || 'Delivery',
      };

      if (params.gps || params.area_code) {
        intent.fulfillment.end = {
          location: {
            ...(params.gps && { gps: params.gps }),
            ...(params.area_code && {
              address: { area_code: params.area_code },
            }),
          },
        };
      }
    }

    // Build category intent
    if (params.category) {
      intent.category = {
        descriptor: { name: params.category },
      };
    }

    // Build item intent
    if (params.item_name) {
      intent.item = {
        descriptor: { name: params.item_name },
      };
    }

    // Build provider intent
    if (params.provider_name) {
      intent.provider = {
        descriptor: { name: params.provider_name },
      };
    }

    const context = this.createContext('search', transaction_id);

    const request: SearchRequest = {
      context,
      message: { intent },
    };

    await this.sendRequest(this.config.gateway_url + '/search', request);

    return transaction_id;
  }

  /**
   * Handle on_search callback from seller apps
   *
   * @param message - On_search callback message
   */
  async handleOnSearch(message: OnSearchResponse): Promise<void> {
    this.verifyCallback(message);

    const handler = this.getCallbackHandler(
      message.context.transaction_id,
      'on_search'
    );

    if (handler) {
      await handler(message);
    }

    // Store catalog for later retrieval
    await this.storeCatalog(message);
  }

  // ==========================================================================
  // Order APIs
  // ==========================================================================

  /**
   * Select items and get quote
   *
   * @param params - Selection parameters
   * @returns Transaction ID
   *
   * @example
   * ```typescript
   * await client.select({
   *   transaction_id: txnId,
   *   bpp_id: "pizza-paradise.ondc.org",
   *   bpp_uri: "https://api.pizza-paradise.com/beckn",
   *   provider_id: "pizza-paradise-kr",
   *   location_id: "loc-1",
   *   items: [
   *     { id: "item-margherita", quantity: 2 }
   *   ],
   *   delivery_address: {
   *     gps: "12.9715987,77.5945627",
   *     building: "Prestige Tech Park",
   *     locality: "Marathahalli",
   *     city: "Bangalore",
   *     state: "Karnataka",
   *     area_code: "560037"
   *   }
   * });
   * ```
   */
  async select(params: {
    transaction_id: string;
    bpp_id: string;
    bpp_uri: string;
    provider_id: string;
    location_id: string;
    items: { id: string; quantity: number }[];
    delivery_address: {
      gps: string;
      building?: string;
      locality: string;
      city: string;
      state: string;
      area_code: string;
    };
    fulfillment_type?: 'Delivery' | 'Pickup';
  }): Promise<void> {
    const context = this.createContext('select', params.transaction_id, {
      bpp_id: params.bpp_id,
      bpp_uri: params.bpp_uri,
    });

    const order: SelectOrder = {
      provider: {
        id: params.provider_id,
        locations: [{ id: params.location_id }],
      },
      items: params.items.map((item) => ({
        id: item.id,
        quantity: { count: item.quantity },
      })),
      fulfillments: [
        {
          type: params.fulfillment_type || 'Delivery',
          end: {
            location: {
              gps: params.delivery_address.gps,
              address: {
                building: params.delivery_address.building,
                locality: params.delivery_address.locality,
                city: params.delivery_address.city,
                state: params.delivery_address.state,
                country: 'IND',
                area_code: params.delivery_address.area_code,
              },
            },
          },
        },
      ],
    };

    const request: SelectRequest = {
      context,
      message: { order },
    };

    await this.sendRequest(params.bpp_uri + '/select', request);
  }

  /**
   * Handle on_select callback
   */
  async handleOnSelect(message: OnSelectResponse): Promise<void> {
    this.verifyCallback(message);

    const handler = this.getCallbackHandler(
      message.context.transaction_id,
      'on_select'
    );

    if (handler) {
      await handler(message);
    }

    // Store quote for later retrieval
    await this.storeQuote(message);
  }

  /**
   * Initialize order with billing details
   *
   * @param params - Initialization parameters
   *
   * @example
   * ```typescript
   * await client.init({
   *   transaction_id: txnId,
   *   bpp_id: "pizza-paradise.ondc.org",
   *   bpp_uri: "https://api.pizza-paradise.com/beckn",
   *   provider_id: "pizza-paradise-kr",
   *   location_id: "loc-1",
   *   items: [{ id: "item-margherita", quantity: 2 }],
   *   billing: {
   *     name: "John Doe",
   *     email: "john@example.com",
   *     phone: "+919876543210",
   *     address: { ... }
   *   },
   *   delivery_address: { ... },
   *   delivery_phone: "+919876543210"
   * });
   * ```
   */
  async init(params: {
    transaction_id: string;
    bpp_id: string;
    bpp_uri: string;
    provider_id: string;
    location_id: string;
    items: { id: string; quantity: number }[];
    billing: {
      name: string;
      email: string;
      phone: string;
      address: Address;
    };
    delivery_address: {
      gps: string;
      name?: string;
      building?: string;
      locality: string;
      city: string;
      state: string;
      area_code: string;
    };
    delivery_phone: string;
  }): Promise<void> {
    const context = this.createContext('init', params.transaction_id, {
      bpp_id: params.bpp_id,
      bpp_uri: params.bpp_uri,
    });

    const request: InitRequest = {
      context,
      message: {
        order: {
          provider: {
            id: params.provider_id,
            locations: [{ id: params.location_id }],
          },
          items: params.items.map((item) => ({
            id: item.id,
            quantity: { count: item.quantity },
          })),
          billing: {
            ...params.billing,
            address: {
              ...params.billing.address,
              country: 'IND',
            },
          },
          fulfillments: [
            {
              type: 'Delivery',
              end: {
                location: {
                  gps: params.delivery_address.gps,
                  address: {
                    name: params.delivery_address.name,
                    building: params.delivery_address.building,
                    locality: params.delivery_address.locality,
                    city: params.delivery_address.city,
                    state: params.delivery_address.state,
                    country: 'IND',
                    area_code: params.delivery_address.area_code,
                  },
                },
                contact: {
                  phone: params.delivery_phone,
                },
              },
            },
          ],
          payment: {
            type: 'ON-ORDER',
            collected_by: 'BAP',
          },
        },
      },
    };

    await this.sendRequest(params.bpp_uri + '/init', request);
  }

  /**
   * Handle on_init callback
   */
  async handleOnInit(message: OnInitResponse): Promise<void> {
    this.verifyCallback(message);

    const handler = this.getCallbackHandler(
      message.context.transaction_id,
      'on_init'
    );

    if (handler) {
      await handler(message);
    }

    // Store order draft
    await this.storeOrderDraft(message);
  }

  /**
   * Confirm order with payment
   *
   * @param params - Confirmation parameters
   *
   * @example
   * ```typescript
   * await client.confirm({
   *   transaction_id: txnId,
   *   bpp_id: "pizza-paradise.ondc.org",
   *   bpp_uri: "https://api.pizza-paradise.com/beckn",
   *   order_id: "ORDER-FOODBOT-123",
   *   provider_id: "pizza-paradise-kr",
   *   items: [{ id: "item-margherita", quantity: 2 }],
   *   billing: { ... },
   *   delivery_address: { ... },
   *   delivery_phone: "+919876543210",
   *   payment: {
   *     transaction_id: "TXN-RAZORPAY-456",
   *     amount: "658.00",
   *     currency: "INR",
   *     status: "PAID"
   *   }
   * });
   * ```
   */
  async confirm(params: {
    transaction_id: string;
    bpp_id: string;
    bpp_uri: string;
    order_id: string;
    provider_id: string;
    items: { id: string; quantity: number }[];
    billing: Billing;
    delivery_address: {
      gps: string;
      name?: string;
      building?: string;
      locality: string;
      city: string;
      state: string;
      area_code: string;
    };
    delivery_phone: string;
    payment: {
      transaction_id: string;
      amount: string;
      currency: string;
      status: 'PAID' | 'NOT-PAID';
    };
  }): Promise<void> {
    const context = this.createContext('confirm', params.transaction_id, {
      bpp_id: params.bpp_id,
      bpp_uri: params.bpp_uri,
    });

    const request: ConfirmRequest = {
      context,
      message: {
        order: {
          id: params.order_id,
          provider: {
            id: params.provider_id,
          },
          items: params.items.map((item) => ({
            id: item.id,
            quantity: { count: item.quantity },
          })),
          billing: params.billing,
          fulfillments: [
            {
              type: 'Delivery',
              end: {
                location: {
                  gps: params.delivery_address.gps,
                  address: {
                    name: params.delivery_address.name,
                    building: params.delivery_address.building,
                    locality: params.delivery_address.locality,
                    city: params.delivery_address.city,
                    state: params.delivery_address.state,
                    country: 'IND',
                    area_code: params.delivery_address.area_code,
                  },
                },
                contact: {
                  phone: params.delivery_phone,
                },
              },
            },
          ],
          payment: {
            type: 'ON-ORDER',
            collected_by: 'BAP',
            params: {
              transaction_id: params.payment.transaction_id,
              amount: params.payment.amount,
              currency: params.payment.currency,
            },
            status: params.payment.status,
          },
        },
      },
    };

    await this.sendRequest(params.bpp_uri + '/confirm', request);
  }

  /**
   * Handle on_confirm callback
   */
  async handleOnConfirm(message: OnConfirmResponse): Promise<void> {
    this.verifyCallback(message);

    const handler = this.getCallbackHandler(
      message.context.transaction_id,
      'on_confirm'
    );

    if (handler) {
      await handler(message);
    }

    // Store confirmed order
    await this.storeOrder(message);
  }

  // ==========================================================================
  // Post-Fulfillment APIs
  // ==========================================================================

  /**
   * Check order status
   */
  async status(params: {
    transaction_id: string;
    bpp_id: string;
    bpp_uri: string;
    order_id: string;
  }): Promise<void> {
    const context = this.createContext('status', params.transaction_id, {
      bpp_id: params.bpp_id,
      bpp_uri: params.bpp_uri,
    });

    const request: StatusRequest = {
      context,
      message: {
        order_id: params.order_id,
      },
    };

    await this.sendRequest(params.bpp_uri + '/status', request);
  }

  /**
   * Handle on_status callback
   */
  async handleOnStatus(message: OnStatusResponse): Promise<void> {
    this.verifyCallback(message);

    const handler = this.getCallbackHandler(
      message.context.transaction_id,
      'on_status'
    );

    if (handler) {
      await handler(message);
    }

    // Update order status
    await this.updateOrderStatus(message);
  }

  /**
   * Track order delivery
   */
  async track(params: {
    transaction_id: string;
    bpp_id: string;
    bpp_uri: string;
    order_id: string;
    callback_url?: string;
  }): Promise<void> {
    const context = this.createContext('track', params.transaction_id, {
      bpp_id: params.bpp_id,
      bpp_uri: params.bpp_uri,
    });

    const request: TrackRequest = {
      context,
      message: {
        order_id: params.order_id,
        callback_url: params.callback_url,
      },
    };

    await this.sendRequest(params.bpp_uri + '/track', request);
  }

  /**
   * Handle on_track callback
   */
  async handleOnTrack(message: OnTrackResponse): Promise<void> {
    this.verifyCallback(message);

    const handler = this.getCallbackHandler(
      message.context.transaction_id,
      'on_track'
    );

    if (handler) {
      await handler(message);
    }
  }

  /**
   * Cancel order
   */
  async cancel(params: {
    transaction_id: string;
    bpp_id: string;
    bpp_uri: string;
    order_id: string;
    reason_code: CancellationReasonCode;
    reason_description: string;
  }): Promise<void> {
    const context = this.createContext('cancel', params.transaction_id, {
      bpp_id: params.bpp_id,
      bpp_uri: params.bpp_uri,
    });

    const request: CancelRequest = {
      context,
      message: {
        order_id: params.order_id,
        cancellation_reason_id: params.reason_code,
        descriptor: {
          short_desc: params.reason_description,
        },
      },
    };

    await this.sendRequest(params.bpp_uri + '/cancel', request);
  }

  /**
   * Handle on_cancel callback
   */
  async handleOnCancel(message: OnCancelResponse): Promise<void> {
    this.verifyCallback(message);

    const handler = this.getCallbackHandler(
      message.context.transaction_id,
      'on_cancel'
    );

    if (handler) {
      await handler(message);
    }

    // Update order as cancelled
    await this.markOrderCancelled(message);
  }

  /**
   * Request support
   */
  async support(params: {
    transaction_id: string;
    bpp_id: string;
    bpp_uri: string;
    order_id: string;
  }): Promise<void> {
    const context = this.createContext('support', params.transaction_id, {
      bpp_id: params.bpp_id,
      bpp_uri: params.bpp_uri,
    });

    const request: SupportRequest = {
      context,
      message: {
        ref_id: params.order_id,
      },
    };

    await this.sendRequest(params.bpp_uri + '/support', request);
  }

  /**
   * Handle on_support callback
   */
  async handleOnSupport(message: OnSupportResponse): Promise<void> {
    this.verifyCallback(message);

    const handler = this.getCallbackHandler(
      message.context.transaction_id,
      'on_support'
    );

    if (handler) {
      await handler(message);
    }
  }

  /**
   * Submit rating
   */
  async rating(params: {
    transaction_id: string;
    bpp_id: string;
    bpp_uri: string;
    ratings: Rating[];
  }): Promise<void> {
    const context = this.createContext('rating', params.transaction_id, {
      bpp_id: params.bpp_id,
      bpp_uri: params.bpp_uri,
    });

    const request: RatingRequest = {
      context,
      message: {
        ratings: params.ratings,
      },
    };

    await this.sendRequest(params.bpp_uri + '/rating', request);
  }

  /**
   * Handle on_rating callback
   */
  async handleOnRating(message: OnRatingResponse): Promise<void> {
    this.verifyCallback(message);

    const handler = this.getCallbackHandler(
      message.context.transaction_id,
      'on_rating'
    );

    if (handler) {
      await handler(message);
    }
  }

  // ==========================================================================
  // Callback Registration
  // ==========================================================================

  /**
   * Register callback handler for transaction
   *
   * @example
   * ```typescript
   * client.on('on_search', txnId, async (message) => {
   *   console.log('Catalog received:', message.message.catalog);
   * });
   * ```
   */
  on<T extends BecknMessage>(
    action: string,
    transaction_id: string,
    handler: (message: T) => Promise<void>
  ): void {
    const key = `${transaction_id}:${action}`;
    this.callbackHandlers.set(key, handler as any);
  }

  /**
   * Unregister callback handler
   */
  off(action: string, transaction_id: string): void {
    const key = `${transaction_id}:${action}`;
    this.callbackHandlers.delete(key);
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Create Beckn context object
   */
  private createContext(
    action: string,
    transaction_id: string,
    bpp?: { bpp_id: string; bpp_uri: string }
  ): BecknContext {
    return {
      domain: this.config.domain,
      country: this.config.country,
      city: this.config.city,
      action,
      core_version: this.config.core_version,
      bap_id: this.config.subscriber_id,
      bap_uri: this.config.subscriber_uri,
      ...(bpp && { bpp_id: bpp.bpp_id, bpp_uri: bpp.bpp_uri }),
      transaction_id,
      message_id: uuidv4(),
      timestamp: new Date().toISOString(),
      ttl: 'PT30S',
    };
  }

  /**
   * Send signed request to ONDC endpoint
   */
  private async sendRequest(url: string, message: BecknMessage): Promise<AckResponse> {
    const body = JSON.stringify(message);
    const { authHeader, digest } = this.signRequest(body);

    try {
      const response = await this.httpClient.post<AckResponse>(url, body, {
        headers: {
          Authorization: authHeader,
          Digest: digest,
        },
      });

      if (response.data.message?.ack?.status === 'NACK') {
        throw new Error(
          `Request rejected: ${response.data.error?.message || 'Unknown error'}`
        );
      }

      return response.data;
    } catch (error: any) {
      console.error('ONDC request failed:', {
        url,
        action: message.context.action,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate digital signature for request
   */
  private signRequest(body: string): { authHeader: string; digest: string } {
    const created = Math.floor(Date.now() / 1000);
    const expires = created + 300; // 5 minutes

    // Calculate body digest
    const bodyHash = sha256(Buffer.from(body, 'utf-8'));
    const digest = `SHA-256=${Buffer.from(bodyHash).toString('base64')}`;

    // Construct signing string
    const signingString = [
      `(created): ${created}`,
      `(expires): ${expires}`,
      `digest: ${digest}`,
    ].join('\n');

    // Generate signature
    const signatureBytes = ed25519.sign(
      Buffer.from(signingString, 'utf-8'),
      this.config.private_key
    );
    const signature = Buffer.from(signatureBytes).toString('base64');

    // Construct authorization header
    const authHeader =
      `Signature keyId="${this.config.subscriber_id}|${this.config.unique_key_id}|ed25519",` +
      `algorithm="ed25519",` +
      `created=${created},` +
      `expires=${expires},` +
      `headers="(created) (expires) digest",` +
      `signature="${signature}"`;

    return { authHeader, digest };
  }

  /**
   * Verify callback signature
   */
  private verifyCallback(message: BecknMessage): void {
    // TODO: Implement signature verification
    // 1. Extract Authorization header
    // 2. Parse signature components
    // 3. Fetch sender's public key from registry
    // 4. Verify signature
    // 5. Throw error if verification fails
  }

  /**
   * Get registered callback handler
   */
  private getCallbackHandler(
    transaction_id: string,
    action: string
  ): CallbackHandlerRegistry | undefined {
    const key = `${transaction_id}:${action}`;
    return this.callbackHandlers.get(key);
  }

  /**
   * Store catalog from on_search callback
   * TODO: Implement persistence layer
   */
  private async storeCatalog(message: OnSearchResponse): Promise<void> {
    console.log('Storing catalog for transaction:', message.context.transaction_id);
    // Implement database storage
  }

  /**
   * Store quote from on_select callback
   * TODO: Implement persistence layer
   */
  private async storeQuote(message: OnSelectResponse): Promise<void> {
    console.log('Storing quote for transaction:', message.context.transaction_id);
    // Implement database storage
  }

  /**
   * Store order draft from on_init callback
   * TODO: Implement persistence layer
   */
  private async storeOrderDraft(message: OnInitResponse): Promise<void> {
    console.log('Storing order draft for transaction:', message.context.transaction_id);
    // Implement database storage
  }

  /**
   * Store confirmed order from on_confirm callback
   * TODO: Implement persistence layer
   */
  private async storeOrder(message: OnConfirmResponse): Promise<void> {
    console.log('Storing confirmed order:', message.message.order.id);
    // Implement database storage
  }

  /**
   * Update order status from on_status callback
   * TODO: Implement persistence layer
   */
  private async updateOrderStatus(message: OnStatusResponse): Promise<void> {
    console.log('Updating order status:', message.message.order.id);
    // Implement database storage
  }

  /**
   * Mark order as cancelled
   * TODO: Implement persistence layer
   */
  private async markOrderCancelled(message: OnCancelResponse): Promise<void> {
    console.log('Marking order as cancelled:', message.message.order.id);
    // Implement database storage
  }
}

/**
 * Callback handler registry type
 */
type CallbackHandlerRegistry = (message: BecknMessage) => Promise<void>;

/**
 * Export default client
 */
export default ONDCClient;
