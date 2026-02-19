/**
 * Intent Detection Service
 * Detects user intents from chat messages and extracts relevant information
 */

import type { JobAction, Platform } from '../types/models';

export interface Intent {
  type: JobAction | 'unknown' | 'greeting' | 'help';
  query?: string;
  platform?: Platform;
  location?: string;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export class IntentDetectionService {
  /**
   * Detect intent from user message
   */
  detectIntent(message: string): Intent {
    const lowerMessage = message.toLowerCase().trim();

    // Greeting patterns
    if (this.isGreeting(lowerMessage)) {
      return {
        type: 'greeting',
        confidence: 0.95,
      };
    }

    // Help patterns
    if (this.isHelpRequest(lowerMessage)) {
      return {
        type: 'help',
        confidence: 0.95,
      };
    }

    // Order food patterns
    if (this.isOrderFood(lowerMessage)) {
      return {
        type: 'search_restaurant',
        query: this.extractQuery(lowerMessage),
        platform: this.extractPlatform(lowerMessage),
        location: this.extractLocation(lowerMessage),
        confidence: 0.85,
      };
    }

    // Search dish patterns
    if (this.isSearchDish(lowerMessage)) {
      return {
        type: 'search_dish',
        query: this.extractDishQuery(lowerMessage),
        platform: this.extractPlatform(lowerMessage),
        confidence: 0.85,
      };
    }

    // Track order patterns
    if (this.isTrackOrder(lowerMessage)) {
      return {
        type: 'track_order',
        confidence: 0.90,
        metadata: {
          orderId: this.extractOrderId(lowerMessage),
        },
      };
    }

    // Order history patterns
    if (this.isOrderHistory(lowerMessage)) {
      return {
        type: 'get_order_history',
        confidence: 0.90,
      };
    }

    return {
      type: 'unknown',
      confidence: 0.0,
    };
  }

  private isGreeting(message: string): boolean {
    const greetingPatterns = [
      /^(hi|hello|hey|good morning|good afternoon|good evening)/,
      /^(what's up|whatsup|sup)/,
    ];
    return greetingPatterns.some((pattern) => pattern.test(message));
  }

  private isHelpRequest(message: string): boolean {
    const helpPatterns = [
      /help/,
      /what can you do/,
      /how do i/,
      /commands/,
      /guide/,
    ];
    return helpPatterns.some((pattern) => pattern.test(message));
  }

  private isOrderFood(message: string): boolean {
    const orderPatterns = [
      /order|get|buy|want/,
      /food|pizza|burger|biryani|chinese|indian|italian/,
      /restaurant|cafe|eatery/,
      /hungry|craving/,
      /find.*restaurant/,
      /search.*food/,
    ];
    return orderPatterns.some((pattern) => pattern.test(message));
  }

  private isSearchDish(message: string): boolean {
    const dishPatterns = [
      /show.*menu/,
      /what.*dishes/,
      /find.*dish/,
      /search.*dish/,
      /vegetarian|vegan|gluten-free/,
    ];
    return dishPatterns.some((pattern) => pattern.test(message));
  }

  private isTrackOrder(message: string): boolean {
    const trackPatterns = [
      /track.*order/,
      /where.*order/,
      /order.*status/,
      /delivery.*status/,
      /when.*arrive/,
    ];
    return trackPatterns.some((pattern) => pattern.test(message));
  }

  private isOrderHistory(message: string): boolean {
    const historyPatterns = [
      /order.*history/,
      /past.*orders/,
      /previous.*orders/,
      /my.*orders/,
      /order.*list/,
    ];
    return historyPatterns.some((pattern) => pattern.test(message));
  }

  private extractQuery(message: string): string {
    // Remove common action words to extract the actual query
    const cleaned = message
      .replace(/^(order|get|buy|want|find|search|i want|i need|looking for)\s+/i, '')
      .replace(/(from|on|via)\s+(swiggy|zomato)/gi, '')
      .replace(/(in|near|at)\s+[a-z\s]+$/i, '')
      .trim();

    return cleaned || 'restaurants';
  }

  private extractDishQuery(message: string): string {
    const cleaned = message
      .replace(/^(show|find|search|get|what)\s+/i, '')
      .replace(/(menu|dishes|dish|items)/gi, '')
      .trim();

    return cleaned || 'dishes';
  }

  private extractPlatform(message: string): Platform | undefined {
    if (/swiggy/i.test(message)) {
      return 'swiggy';
    }
    if (/zomato/i.test(message)) {
      return 'zomato';
    }
    // Default to mock for now
    return 'mock';
  }

  private extractLocation(message: string): string | undefined {
    const locationMatch = message.match(/(in|near|at)\s+([a-z\s]+)$/i);
    if (locationMatch) {
      return locationMatch[2].trim();
    }
    return undefined;
  }

  private extractOrderId(message: string): string | undefined {
    const orderIdMatch = message.match(/order\s+#?([a-z0-9-]+)/i);
    if (orderIdMatch) {
      return orderIdMatch[1];
    }
    return undefined;
  }

  /**
   * Generate a response template based on intent
   */
  getResponseTemplate(intent: Intent): string {
    switch (intent.type) {
      case 'greeting':
        return "Hello! I'm your FoodBot assistant. How can I help you today? You can ask me to search for restaurants, dishes, or track your orders.";

      case 'help':
        return `I can help you with:
- Search for restaurants: "Find pizza restaurants"
- Search for dishes: "Show me vegetarian dishes"
- Track orders: "Track my order"
- View order history: "Show my past orders"

Just tell me what you'd like to do!`;

      case 'search_restaurant':
        return `Searching for "${intent.query}" on ${intent.platform}...`;

      case 'search_dish':
        return `Searching for "${intent.query}" dishes on ${intent.platform}...`;

      case 'track_order':
        return 'Fetching your order status...';

      case 'get_order_history':
        return 'Loading your order history...';

      default:
        return "I'm sorry, I didn't understand that. Can you please rephrase? Try asking me to find restaurants or dishes!";
    }
  }
}

export const intentDetectionService = new IntentDetectionService();
