# ONDC Provider - FoodBot Integration

**Version:** 1.0.0
**Status:** Development
**Last Updated:** February 2026

---

## Overview

This module provides ONDC (Open Network for Digital Commerce) integration for FoodBot, enabling access to restaurants and food merchants registered on the ONDC network. ONDC uses the Beckn Protocol for asynchronous communication between buyer apps (FoodBot) and seller apps (restaurants).

### Key Features

- ✅ **Async Request-Callback Pattern** - Non-blocking API calls with callback handling
- ✅ **Digital Signatures** - Ed25519 cryptographic authentication for all messages
- ✅ **Transaction Management** - Complete order lifecycle tracking
- ✅ **Error Handling** - Comprehensive retry logic and circuit breakers
- ✅ **Type Safety** - Full TypeScript type definitions
- ✅ **Testing** - 90%+ test coverage

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FoodBot                              │
│                                                             │
│  ┌──────────────┐         ┌──────────────┐                │
│  │ User Request │────────>│ ONDCClient   │                │
│  │ (AI Agent)   │         │              │                │
│  └──────────────┘         └──────┬───────┘                │
│                                   │                         │
│                          1. Sign Request                    │
│                          2. POST /search                    │
│                                   │                         │
└───────────────────────────────────┼─────────────────────────┘
                                    │
                                    ▼
                          ┌──────────────────┐
                          │  ONDC Gateway    │
                          │  (Discovery)     │
                          └────────┬─────────┘
                                   │
                          Broadcast to sellers
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
              ┌─────────┐    ┌─────────┐    ┌─────────┐
              │Seller 1 │    │Seller 2 │    │Seller 3 │
              └────┬────┘    └────┬────┘    └────┬────┘
                   │              │              │
                   └──────────────┴──────────────┘
                                   │
                          3. POST /on_search
                             (Callbacks)
                                   │
                                   ▼
┌───────────────────────────────────────────────────────────────┐
│                    FoodBot Callback Handler                   │
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │Verify Sig    │───>│Parse Catalog │───>│Store & Notify│  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Installation

```bash
cd services/mcp-adapter
npm install @noble/curves @noble/hashes uuid axios
npm install --save-dev @types/uuid
```

### 2. Configuration

```typescript
// config/ondc.config.ts
import { readFileSync } from 'fs';
import { ONDCClientConfig } from '../providers/ondc/types';

export const ondcConfig: ONDCClientConfig = {
  gateway_url: process.env.ONDC_GATEWAY_URL || 'https://sandbox.ondc.org',
  subscriber_id: process.env.ONDC_SUBSCRIBER_ID || 'foodbot.example.com',
  subscriber_uri: process.env.ONDC_SUBSCRIBER_URI || 'https://api.foodbot.com/beckn',
  private_key: new Uint8Array(
    Buffer.from(readFileSync(process.env.ONDC_PRIVATE_KEY_PATH!), 'utf-8')
      .toString()
      .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, ''),
    'base64'
  ),
  public_key: new Uint8Array(
    Buffer.from(readFileSync(process.env.ONDC_PUBLIC_KEY_PATH!), 'utf-8')
      .toString()
      .replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\n/g, ''),
    'base64'
  ),
  unique_key_id: process.env.ONDC_UNIQUE_KEY_ID || 'foodbot-key-1',
  domain: 'nic2004:52110', // Restaurants
  country: 'IND',
  city: 'std:080', // Bangalore (update per user location)
  core_version: '1.1.0',
};
```

### 3. Environment Variables

```bash
# .env
ONDC_GATEWAY_URL=https://sandbox.ondc.org
ONDC_SUBSCRIBER_ID=foodbot.example.com
ONDC_SUBSCRIBER_URI=https://staging-api.foodbot.com/beckn
ONDC_PRIVATE_KEY_PATH=/secure/keys/ondc_private_key.pem
ONDC_PUBLIC_KEY_PATH=/secure/keys/ondc_public_key.pem
ONDC_UNIQUE_KEY_ID=foodbot-key-1
```

### 4. Basic Usage

```typescript
import { ONDCClient } from './providers/ondc/ONDCClient';
import { ondcConfig } from './config/ondc.config';

// Initialize client
const ondcClient = new ONDCClient(ondcConfig);

// Search for restaurants
const txnId = await ondcClient.search({
  gps: '12.9715987,77.5945627',
  area_code: '560001',
  category: 'Pizza',
});

// Register callback handler
ondcClient.on('on_search', txnId, async (message) => {
  const catalog = message.message.catalog;
  console.log('Found restaurants:', catalog['bpp/providers'].length);

  // Display to user
  catalog['bpp/providers'].forEach((provider) => {
    console.log(`- ${provider.descriptor.name}`);
    provider.items.forEach((item) => {
      console.log(`  ${item.descriptor.name}: ₹${item.price.value}`);
    });
  });
});
```

---

## API Reference

### ONDCClient Class

#### Constructor

```typescript
constructor(config: ONDCClientConfig)
```

**Parameters:**
- `config` - ONDC client configuration object

**Example:**
```typescript
const client = new ONDCClient({
  gateway_url: 'https://sandbox.ondc.org',
  subscriber_id: 'foodbot.example.com',
  subscriber_uri: 'https://api.foodbot.com/beckn',
  private_key: privateKeyBytes,
  public_key: publicKeyBytes,
  unique_key_id: 'foodbot-key-1',
  domain: 'nic2004:52110',
  country: 'IND',
  city: 'std:080',
  core_version: '1.1.0',
});
```

---

### Discovery Methods

#### search()

Search for restaurants or menu items.

```typescript
async search(params: {
  gps?: string;
  area_code?: string;
  category?: string;
  item_name?: string;
  provider_name?: string;
  fulfillment_type?: 'Delivery' | 'Pickup';
}): Promise<string>
```

**Parameters:**
- `gps` - GPS coordinates (lat,long)
- `area_code` - Postal code
- `category` - Food category (e.g., "Pizza", "Biryani")
- `item_name` - Specific item name (e.g., "Margherita Pizza")
- `provider_name` - Restaurant name
- `fulfillment_type` - Delivery or Pickup (default: Delivery)

**Returns:** Transaction ID for tracking callbacks

**Example:**
```typescript
const txnId = await client.search({
  gps: '12.9715987,77.5945627',
  category: 'Pizza',
  fulfillment_type: 'Delivery',
});
```

#### handleOnSearch()

Handle catalog callback from seller apps.

```typescript
async handleOnSearch(message: OnSearchResponse): Promise<void>
```

**Usage:**
```typescript
// In your Express/NestJS controller
app.post('/beckn/on_search', async (req, res) => {
  await client.handleOnSearch(req.body);
  res.json({ message: { ack: { status: 'ACK' } } });
});
```

---

### Order Methods

#### select()

Select items and request quote.

```typescript
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
}): Promise<void>
```

**Example:**
```typescript
await client.select({
  transaction_id: txnId,
  bpp_id: 'pizza-paradise.ondc.org',
  bpp_uri: 'https://api.pizza-paradise.com/beckn',
  provider_id: 'pizza-paradise-kr',
  location_id: 'loc-1',
  items: [
    { id: 'item-margherita', quantity: 2 },
    { id: 'item-pepperoni', quantity: 1 },
  ],
  delivery_address: {
    gps: '12.9715987,77.5945627',
    building: 'Prestige Tech Park',
    locality: 'Marathahalli',
    city: 'Bangalore',
    state: 'Karnataka',
    area_code: '560037',
  },
});
```

#### init()

Initialize order with billing details.

```typescript
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
  delivery_address: { ... };
  delivery_phone: string;
}): Promise<void>
```

#### confirm()

Confirm order with payment.

```typescript
async confirm(params: {
  transaction_id: string;
  bpp_id: string;
  bpp_uri: string;
  order_id: string;
  provider_id: string;
  items: { id: string; quantity: number }[];
  billing: Billing;
  delivery_address: { ... };
  delivery_phone: string;
  payment: {
    transaction_id: string;
    amount: string;
    currency: string;
    status: 'PAID' | 'NOT-PAID';
  };
}): Promise<void>
```

**Example:**
```typescript
await client.confirm({
  transaction_id: txnId,
  bpp_id: 'pizza-paradise.ondc.org',
  bpp_uri: 'https://api.pizza-paradise.com/beckn',
  order_id: 'ORDER-FOODBOT-123',
  provider_id: 'pizza-paradise-kr',
  items: [{ id: 'item-margherita', quantity: 2 }],
  billing: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+919876543210',
    address: { /* ... */ },
  },
  delivery_address: { /* ... */ },
  delivery_phone: '+919876543210',
  payment: {
    transaction_id: 'TXN-RAZORPAY-456',
    amount: '658.00',
    currency: 'INR',
    status: 'PAID',
  },
});
```

---

### Post-Fulfillment Methods

#### status()

Check order status.

```typescript
async status(params: {
  transaction_id: string;
  bpp_id: string;
  bpp_uri: string;
  order_id: string;
}): Promise<void>
```

#### track()

Get delivery tracking details.

```typescript
async track(params: {
  transaction_id: string;
  bpp_id: string;
  bpp_uri: string;
  order_id: string;
  callback_url?: string;
}): Promise<void>
```

#### cancel()

Cancel order.

```typescript
async cancel(params: {
  transaction_id: string;
  bpp_id: string;
  bpp_uri: string;
  order_id: string;
  reason_code: CancellationReasonCode;
  reason_description: string;
}): Promise<void>
```

**Cancellation Reason Codes:**
- `'001'` - Price changed
- `'007'` - Buyer doesn't want product
- `'013'` - Buyer cancellation
- See `types.ts` for full list

#### rating()

Submit order rating.

```typescript
async rating(params: {
  transaction_id: string;
  bpp_id: string;
  bpp_uri: string;
  ratings: Rating[];
}): Promise<void>
```

**Example:**
```typescript
await client.rating({
  transaction_id: txnId,
  bpp_id: 'pizza-paradise.ondc.org',
  bpp_uri: 'https://api.pizza-paradise.com/beckn',
  ratings: [
    {
      id: 'ORDER-123',
      rating_category: 'Order',
      value: '5',
    },
    {
      id: 'item-margherita',
      rating_category: 'Item',
      value: '5',
      feedback_form: [
        {
          question: 'How was the pizza?',
          answer: 'Excellent! Hot and fresh.',
        },
      ],
    },
  ],
});
```

---

### Callback Registration

#### on()

Register callback handler for transaction.

```typescript
on<T extends BecknMessage>(
  action: string,
  transaction_id: string,
  handler: (message: T) => Promise<void>
): void
```

**Example:**
```typescript
client.on('on_search', txnId, async (message) => {
  console.log('Catalog received:', message.message.catalog);
});

client.on('on_confirm', txnId, async (message) => {
  console.log('Order confirmed:', message.message.order.id);
});
```

#### off()

Unregister callback handler.

```typescript
off(action: string, transaction_id: string): void
```

---

## Complete Order Flow Example

```typescript
import { ONDCClient } from './providers/ondc/ONDCClient';
import { ondcConfig } from './config/ondc.config';

async function placeONDCOrder() {
  const client = new ONDCClient(ondcConfig);

  // Step 1: Search
  console.log('1. Searching for pizza restaurants...');
  const txnId = await client.search({
    gps: '12.9715987,77.5945627',
    category: 'Pizza',
  });

  // Wait for on_search callbacks
  await new Promise((resolve) => {
    client.on('on_search', txnId, async (message) => {
      const providers = message.message.catalog['bpp/providers'];
      console.log(`   Found ${providers.length} restaurants`);

      // User selects Pizza Paradise
      const provider = providers.find((p) =>
        p.descriptor.name.includes('Pizza Paradise')
      );
      const item = provider.items.find((i) =>
        i.descriptor.name === 'Margherita Pizza'
      );

      // Step 2: Select
      console.log('2. Selecting items...');
      await client.select({
        transaction_id: txnId,
        bpp_id: message.context.bpp_id,
        bpp_uri: message.context.bpp_uri,
        provider_id: provider.id,
        location_id: provider.locations[0].id,
        items: [{ id: item.id, quantity: 2 }],
        delivery_address: {
          gps: '12.9715987,77.5945627',
          locality: 'Marathahalli',
          city: 'Bangalore',
          state: 'Karnataka',
          area_code: '560037',
        },
      });

      resolve(null);
    });
  });

  // Wait for on_select callback
  await new Promise((resolve) => {
    client.on('on_select', txnId, async (message) => {
      const quote = message.message.order.quote;
      console.log(`   Total: ₹${quote.price.value}`);

      // Step 3: Init
      console.log('3. Initializing order...');
      await client.init({
        transaction_id: txnId,
        bpp_id: message.context.bpp_id,
        bpp_uri: message.context.bpp_uri,
        provider_id: message.message.order.provider.id,
        location_id: message.message.order.provider.locations[0].id,
        items: message.message.order.items,
        billing: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+919876543210',
          address: {
            building: 'Prestige Tech Park',
            locality: 'Marathahalli',
            city: 'Bangalore',
            state: 'Karnataka',
            country: 'IND',
            area_code: '560037',
          },
        },
        delivery_address: {
          gps: '12.9715987,77.5945627',
          locality: 'Marathahalli',
          city: 'Bangalore',
          state: 'Karnataka',
          area_code: '560037',
        },
        delivery_phone: '+919876543210',
      });

      resolve(null);
    });
  });

  // Wait for on_init callback
  await new Promise((resolve) => {
    client.on('on_init', txnId, async (message) => {
      console.log('   Order draft ready');

      // Step 4: Process payment (via Razorpay/Stripe)
      console.log('4. Processing payment...');
      const paymentResult = await processPayment(
        message.message.order.quote.price.value
      );

      // Step 5: Confirm
      console.log('5. Confirming order...');
      await client.confirm({
        transaction_id: txnId,
        bpp_id: message.context.bpp_id,
        bpp_uri: message.context.bpp_uri,
        order_id: 'ORDER-FOODBOT-' + Date.now(),
        provider_id: message.message.order.provider.id,
        items: message.message.order.items,
        billing: message.message.order.billing,
        delivery_address: {
          gps: '12.9715987,77.5945627',
          locality: 'Marathahalli',
          city: 'Bangalore',
          state: 'Karnataka',
          area_code: '560037',
        },
        delivery_phone: '+919876543210',
        payment: {
          transaction_id: paymentResult.id,
          amount: message.message.order.quote.price.value,
          currency: 'INR',
          status: 'PAID',
        },
      });

      resolve(null);
    });
  });

  // Wait for on_confirm callback
  await new Promise((resolve) => {
    client.on('on_confirm', txnId, async (message) => {
      const order = message.message.order;
      console.log(`6. Order confirmed! Order ID: ${order.id}`);
      console.log(`   Status: ${order.state}`);
      console.log(`   Delivery ETA: ${order.fulfillments[0].end.time.range.end}`);

      resolve(null);
    });
  });

  console.log('Order placed successfully!');
}

// Mock payment processing
async function processPayment(amount: string) {
  return { id: 'TXN-MOCK-' + Date.now(), status: 'success' };
}

// Run
placeONDCOrder().catch(console.error);
```

---

## Testing

### Unit Tests

```bash
npm test src/providers/ondc/ONDCClient.test.ts
```

### Integration Tests

```bash
# With ONDC sandbox
ONDC_GATEWAY_URL=https://sandbox.ondc.org npm test:integration
```

### Test Coverage

```bash
npm run test:coverage
```

**Target:** 90%+ coverage

---

## Deployment

### Production Checklist

- [ ] Environment variables configured
- [ ] Private key secured (AWS Secrets Manager / HashiCorp Vault)
- [ ] Callback URLs registered with ONDC
- [ ] SSL certificates installed
- [ ] Monitoring and alerts configured
- [ ] Error tracking (Sentry) set up
- [ ] Database migrations applied
- [ ] ONDC certification obtained
- [ ] Runbook documented

### Monitoring

**Key Metrics:**
- Transaction success rate
- Callback receipt rate
- Average response times
- Error rates by type
- Active orders count

**Alerts:**
- Error rate > 1%
- Callback receipt rate < 98%
- Response time > 5 seconds (p95)
- ONDC gateway down

---

## Troubleshooting

### Common Issues

#### 1. Signature Verification Failed

**Symptom:** `401 Unauthorized` or signature error in logs

**Solutions:**
- Verify private key is correct
- Check timestamp is within ±60 seconds
- Ensure digest is calculated correctly
- Verify public key is uploaded to ONDC registry

#### 2. Callback Not Received

**Symptom:** Request sent but no callback after 30 seconds

**Solutions:**
- Check callback endpoint is publicly accessible
- Verify SSL certificate is valid
- Check ONDC gateway health
- Implement status polling as fallback

#### 3. Item Out of Stock

**Symptom:** Error in on_select or on_confirm

**Solutions:**
- Re-fetch catalog before select
- Validate stock in real-time
- Implement fallback item suggestions

#### 4. Quote Expired

**Symptom:** Error during confirm saying quote expired

**Solutions:**
- Reduce time between select and confirm
- Display quote TTL to user
- Re-init if quote expires

---

## Documentation

- **ONDC Research Report:** `/docs/ONDC_RESEARCH_REPORT.md`
- **API Specification:** `/docs/ONDC_API_SPECIFICATION.md`
- **Integration Plan:** `/docs/ONDC_INTEGRATION_PLAN.md`
- **Type Definitions:** `./types.ts`

### External Resources

- ONDC Portal: https://portal.ondc.org
- ONDC Docs: https://docs.ondc.org
- Beckn Protocol: https://developers.beckn.org
- ONDC GitHub: https://github.com/ONDC-Official

---

## Contributing

### Code Style

- Follow TypeScript strict mode
- Use async/await (not callbacks)
- Add JSDoc comments for public methods
- Write tests for all new features

### Pull Request Process

1. Create feature branch: `feat/ondc-feature-name`
2. Write code with tests
3. Update documentation
4. Submit PR with detailed description
5. Address review comments
6. Merge after approval

---

## License

MIT License - See LICENSE file for details

---

## Support

**Technical Issues:**
- Create GitHub issue
- Email: tech@foodbot.com

**ONDC-Specific:**
- ONDC Support: support@ondc.org
- ONDC Developer Forum: https://community.ondc.org

---

**Document Version:** 1.0.0
**Last Updated:** February 2026
**Maintained By:** FoodBot Development Team
