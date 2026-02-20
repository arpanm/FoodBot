# ONDC API Specification - Technical Reference

**Document Version:** 1.0.0
**Beckn Protocol Version:** 1.1.0
**Last Updated:** February 2026
**Knowledge Base:** January 2025

---

## ⚠️ IMPORTANT DISCLAIMER

**This specification is based on Beckn Protocol 1.1.0 and ONDC implementation as of January 2025. API changes may have occurred by February 2026.**

**Required Actions:**
- ✅ Verify current API version at https://docs.ondc.org
- ✅ Check for breaking changes in Beckn protocol
- ✅ Validate message schemas with latest specifications
- ✅ Test against current ONDC sandbox environment

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Message Structure](#message-structure)
4. [Discovery APIs](#discovery-apis)
5. [Order APIs](#order-apis)
6. [Post-Fulfillment APIs](#post-fulfillment-apis)
7. [Error Handling](#error-handling)
8. [Status Codes](#status-codes)
9. [Example Workflows](#example-workflows)

---

## Overview

### Architecture Pattern

ONDC implements an **asynchronous request-callback pattern**:

```
┌─────────────┐                        ┌─────────────┐
│  Buyer App  │                        │  Seller App │
│  (FoodBot)  │                        │(Restaurant) │
└──────┬──────┘                        └──────┬──────┘
       │                                      │
       │ 1. POST /search                     │
       ├─────────────────────────────────────>│
       │                                      │
       │ 2. 200 ACK                          │
       │<─────────────────────────────────────┤
       │                                      │
       │                                      │
       │ 3. POST /on_search (callback)       │
       │<─────────────────────────────────────┤
       │                                      │
       │ 4. 200 ACK                          │
       ├─────────────────────────────────────>│
       │                                      │
```

### Key Principles

1. **Immediate ACK**: All requests return 200 ACK immediately
2. **Callback Response**: Actual response delivered to `/on_*` callback endpoint
3. **Idempotency**: Same `message_id` should return same response
4. **Timeout**: Callbacks expected within 30 seconds (configurable)
5. **Digital Signatures**: All messages must be cryptographically signed

### Base URLs

**Production:**
```
ONDC Gateway: https://gateway.ondc.org
```

**Sandbox:**
```
ONDC Gateway: https://sandbox.ondc.org
```

**FoodBot Callback Base:**
```
Production: https://api.foodbot.com/beckn
Staging: https://staging-api.foodbot.com/beckn
```

### Domain Codes

ONDC uses NIC 2004 (National Industry Classification) codes:

```
52110: Restaurants and mobile food service activities
52210: Event catering and other food service activities
47210: Retail sale of vegetables, fruit in specialized stores
47711: Retail sale of clothing in specialized stores
```

**For FoodBot:** Use `nic2004:52110` (Restaurants)

---

## Authentication

### Digital Signature Algorithm

ONDC uses **Ed25519** (Edwards-curve Digital Signature Algorithm) for message authentication.

#### Key Generation

```bash
# Generate private key
openssl genpkey -algorithm Ed25519 -out private_key.pem

# Extract public key
openssl pkey -in private_key.pem -pubout -out public_key.pem
```

#### Signature Header Format

```http
Authorization: Signature keyId="buyer-app-id|unique-key-id|ed25519",
  algorithm="ed25519",
  created=1679145600,
  expires=1679145900,
  headers="(created) (expires) digest",
  signature="Base64EncodedSignature=="
```

**Components:**
- `keyId`: `{subscriber_id}|{unique_key_id}|{algorithm}`
- `algorithm`: `ed25519`
- `created`: Unix timestamp when signature created
- `expires`: Unix timestamp when signature expires (typically created + 300s)
- `headers`: Space-separated list of headers included in signature
- `signature`: Base64-encoded signature bytes

#### Signing Process

**Step 1: Calculate Body Digest**

```typescript
import { sha256 } from '@noble/hashes/sha256';

function calculateDigest(body: string): string {
  const hash = sha256(Buffer.from(body, 'utf-8'));
  return `SHA-256=${Buffer.from(hash).toString('base64')}`;
}
```

**Step 2: Construct Signing String**

```typescript
function constructSigningString(
  created: number,
  expires: number,
  digest: string
): string {
  return [
    `(created): ${created}`,
    `(expires): ${expires}`,
    `digest: ${digest}`
  ].join('\n');
}
```

**Step 3: Sign with Private Key**

```typescript
import { ed25519 } from '@noble/curves/ed25519';

function generateSignature(
  privateKey: Uint8Array,
  signingString: string
): string {
  const signature = ed25519.sign(
    Buffer.from(signingString, 'utf-8'),
    privateKey
  );
  return Buffer.from(signature).toString('base64');
}
```

**Step 4: Construct Authorization Header**

```typescript
function constructAuthHeader(
  subscriberId: string,
  keyId: string,
  created: number,
  expires: number,
  signature: string
): string {
  return `Signature keyId="${subscriberId}|${keyId}|ed25519",` +
    `algorithm="ed25519",` +
    `created=${created},` +
    `expires=${expires},` +
    `headers="(created) (expires) digest",` +
    `signature="${signature}"`;
}
```

#### Verification Process

**Step 1: Parse Authorization Header**

```typescript
function parseAuthHeader(authHeader: string): AuthComponents {
  const keyIdMatch = authHeader.match(/keyId="([^"]+)"/);
  const createdMatch = authHeader.match(/created=(\d+)/);
  const expiresMatch = authHeader.match(/expires=(\d+)/);
  const signatureMatch = authHeader.match(/signature="([^"]+)"/);

  return {
    keyId: keyIdMatch![1],
    created: parseInt(createdMatch![1]),
    expires: parseInt(expiresMatch![1]),
    signature: signatureMatch![1],
  };
}
```

**Step 2: Validate Timestamp**

```typescript
function validateTimestamp(created: number, expires: number): boolean {
  const now = Math.floor(Date.now() / 1000);

  if (created > now + 60) {
    throw new Error('Signature created in future');
  }

  if (expires < now) {
    throw new Error('Signature expired');
  }

  if (expires - created > 300) {
    throw new Error('Signature validity > 5 minutes');
  }

  return true;
}
```

**Step 3: Verify Signature**

```typescript
function verifySignature(
  publicKey: Uint8Array,
  signingString: string,
  signature: string
): boolean {
  const signatureBytes = Buffer.from(signature, 'base64');
  const messageBytes = Buffer.from(signingString, 'utf-8');

  return ed25519.verify(signatureBytes, messageBytes, publicKey);
}
```

### Complete Implementation Example

```typescript
import { ed25519 } from '@noble/curves/ed25519';
import { sha256 } from '@noble/hashes/sha256';

export class ONDCAuthService {
  constructor(
    private readonly privateKey: Uint8Array,
    private readonly publicKey: Uint8Array,
    private readonly subscriberId: string,
    private readonly uniqueKeyId: string
  ) {}

  /**
   * Sign an outgoing ONDC request
   */
  signRequest(body: string): { authHeader: string; digest: string } {
    const created = Math.floor(Date.now() / 1000);
    const expires = created + 300; // 5 minutes

    // Calculate body digest
    const bodyHash = sha256(Buffer.from(body, 'utf-8'));
    const digest = `SHA-256=${Buffer.from(bodyHash).toString('base64')}`;

    // Construct signing string
    const signingString = [
      `(created): ${created}`,
      `(expires): ${expires}`,
      `digest: ${digest}`
    ].join('\n');

    // Generate signature
    const signatureBytes = ed25519.sign(
      Buffer.from(signingString, 'utf-8'),
      this.privateKey
    );
    const signature = Buffer.from(signatureBytes).toString('base64');

    // Construct authorization header
    const authHeader =
      `Signature keyId="${this.subscriberId}|${this.uniqueKeyId}|ed25519",` +
      `algorithm="ed25519",` +
      `created=${created},` +
      `expires=${expires},` +
      `headers="(created) (expires) digest",` +
      `signature="${signature}"`;

    return { authHeader, digest };
  }

  /**
   * Verify an incoming ONDC callback
   */
  verifyCallback(
    authHeader: string,
    digest: string,
    body: string,
    senderPublicKey: Uint8Array
  ): boolean {
    // Parse auth header
    const keyIdMatch = authHeader.match(/keyId="([^"]+)"/);
    const createdMatch = authHeader.match(/created=(\d+)/);
    const expiresMatch = authHeader.match(/expires=(\d+)/);
    const signatureMatch = authHeader.match(/signature="([^"]+)"/);

    if (!keyIdMatch || !createdMatch || !expiresMatch || !signatureMatch) {
      throw new Error('Invalid auth header format');
    }

    const created = parseInt(createdMatch[1]);
    const expires = parseInt(expiresMatch[1]);
    const signature = signatureMatch[1];

    // Validate timestamp
    const now = Math.floor(Date.now() / 1000);
    if (created > now + 60) throw new Error('Signature created in future');
    if (expires < now) throw new Error('Signature expired');
    if (expires - created > 300) throw new Error('Signature validity too long');

    // Verify body digest
    const bodyHash = sha256(Buffer.from(body, 'utf-8'));
    const calculatedDigest = `SHA-256=${Buffer.from(bodyHash).toString('base64')}`;
    if (digest !== calculatedDigest) {
      throw new Error('Body digest mismatch');
    }

    // Reconstruct signing string
    const signingString = [
      `(created): ${created}`,
      `(expires): ${expires}`,
      `digest: ${digest}`
    ].join('\n');

    // Verify signature
    const signatureBytes = Buffer.from(signature, 'base64');
    const messageBytes = Buffer.from(signingString, 'utf-8');

    return ed25519.verify(signatureBytes, messageBytes, senderPublicKey);
  }
}
```

---

## Message Structure

### Base Message Format

Every ONDC API call follows this structure:

```json
{
  "context": { /* Metadata */ },
  "message": { /* Domain-specific payload */ },
  "error": { /* Optional error object */ }
}
```

### Context Object

```typescript
interface BecknContext {
  domain: string;          // NIC code (e.g., "nic2004:52110")
  country: string;         // ISO 3166-1 alpha-3 code (e.g., "IND")
  city: string;            // City code (e.g., "std:080" for Bangalore)
  action: string;          // API action (e.g., "search", "on_search")
  core_version: string;    // Beckn protocol version (e.g., "1.1.0")
  bap_id: string;          // Buyer app subscriber ID
  bap_uri: string;         // Buyer app callback base URL
  bpp_id?: string;         // Seller app subscriber ID (optional in search)
  bpp_uri?: string;        // Seller app API URL (optional in search)
  transaction_id: string;  // Unique ID for transaction lifecycle
  message_id: string;      // Unique ID for this specific message
  timestamp: string;       // ISO 8601 timestamp (e.g., "2024-03-15T10:30:00.000Z")
  ttl?: string;            // ISO 8601 duration (e.g., "PT30S" for 30 seconds)
}
```

**Field Descriptions:**

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `domain` | Yes | NIC classification code | `"nic2004:52110"` |
| `country` | Yes | ISO country code | `"IND"` |
| `city` | Yes | STD code with prefix | `"std:080"` |
| `action` | Yes | API endpoint name | `"search"`, `"on_search"` |
| `core_version` | Yes | Beckn version | `"1.1.0"` |
| `bap_id` | Yes | Buyer's domain | `"foodbot.example.com"` |
| `bap_uri` | Yes | Buyer's callback URL | `"https://api.foodbot.com/beckn"` |
| `bpp_id` | No* | Seller's domain | `"pizza-co.ondc.org"` |
| `bpp_uri` | No* | Seller's API URL | `"https://api.pizza-co.com/beckn"` |
| `transaction_id` | Yes | UUID for order journey | `"a9aaecca-10b7-4d19-..."` |
| `message_id` | Yes | UUID for this message | `"bb579fb8-cb82-4824-..."` |
| `timestamp` | Yes | Message timestamp | `"2024-03-15T10:30:00.000Z"` |
| `ttl` | No | Message validity | `"PT30S"` |

*Required in targeted requests (select, init, confirm), optional in broadcast (search)

### City Codes

Standard Telephone Dialing (STD) codes with `std:` prefix:

```
Bangalore: std:080
Delhi: std:011
Mumbai: std:022
Chennai: std:044
Kolkata: std:033
Hyderabad: std:040
Pune: std:020
Ahmedabad: std:079
Jaipur: std:0141
```

### Error Object

```typescript
interface BecknError {
  type: string;    // Error type (DOMAIN-ERROR, POLICY-ERROR, etc.)
  code: string;    // Error code (e.g., "30001")
  path?: string;   // JSON path to error field
  message: string; // Human-readable error message
}
```

**Common Error Types:**

| Type | Description | Examples |
|------|-------------|----------|
| `CONTEXT-ERROR` | Invalid context object | Missing required field, invalid format |
| `CORE-ERROR` | Beckn protocol violation | Invalid message structure |
| `DOMAIN-ERROR` | Business logic error | Item out of stock, invalid address |
| `POLICY-ERROR` | Network policy violation | Unsupported domain, unauthorized action |
| `JSON-SCHEMA-ERROR` | Schema validation failed | Type mismatch, missing field |

---

## Discovery APIs

### 1. `/search` - Discover Restaurants/Items

**Purpose:** Broadcast intent to discover restaurants or menu items matching criteria.

**Endpoint:** `POST https://gateway.ondc.org/search`

**Request Schema:**

```typescript
interface SearchRequest {
  context: BecknContext & {
    action: "search";
  };
  message: {
    intent: {
      fulfillment?: {
        type?: "Delivery" | "Pickup";
        end?: {
          location?: {
            gps?: string;         // "lat,long"
            address?: {
              area_code?: string; // Postal code
            };
          };
        };
      };
      payment?: {
        type?: "PRE-FULFILLMENT" | "ON-FULFILLMENT" | "POST-FULFILLMENT";
      };
      category?: {
        descriptor?: {
          name?: string;          // Category name (e.g., "Pizza")
        };
      };
      item?: {
        descriptor?: {
          name?: string;          // Item name (e.g., "Margherita Pizza")
        };
      };
      provider?: {
        descriptor?: {
          name?: string;          // Restaurant name
        };
      };
    };
  };
}
```

**Example Request:**

```json
POST https://gateway.ondc.org/search
Content-Type: application/json
Authorization: Signature keyId="...",signature="..."

{
  "context": {
    "domain": "nic2004:52110",
    "action": "search",
    "country": "IND",
    "city": "std:080",
    "core_version": "1.1.0",
    "bap_id": "foodbot.example.com",
    "bap_uri": "https://api.foodbot.com/beckn",
    "transaction_id": "a9aaecca-10b7-4d19-b640-b047a7c62196",
    "message_id": "bb579fb8-cb82-4824-be12-fcbc405b6608",
    "timestamp": "2024-03-15T10:30:00.000Z",
    "ttl": "PT30S"
  },
  "message": {
    "intent": {
      "fulfillment": {
        "type": "Delivery",
        "end": {
          "location": {
            "gps": "12.9715987,77.5945627",
            "address": {
              "area_code": "560001"
            }
          }
        }
      },
      "category": {
        "descriptor": {
          "name": "Pizza"
        }
      }
    }
  }
}
```

**Response (Immediate ACK):**

```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": {
    "ack": {
      "status": "ACK"
    }
  }
}
```

**Error Response:**

```json
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "message": {
    "ack": {
      "status": "NACK"
    }
  },
  "error": {
    "type": "CONTEXT-ERROR",
    "code": "10001",
    "message": "Invalid city code format"
  }
}
```

### 2. `/on_search` - Catalog Response (Callback)

**Purpose:** Seller apps respond with matching catalog items.

**Endpoint:** `POST https://api.foodbot.com/beckn/on_search`

**Response Schema:**

```typescript
interface OnSearchResponse {
  context: BecknContext & {
    action: "on_search";
    bpp_id: string;
    bpp_uri: string;
  };
  message: {
    catalog: {
      "bpp/descriptor": {
        name: string;
        symbol?: string;      // Logo URL
        short_desc?: string;
        long_desc?: string;
        images?: string[];
      };
      "bpp/providers": Provider[];
    };
  };
}

interface Provider {
  id: string;
  descriptor: {
    name: string;
    short_desc?: string;
    long_desc?: string;
    images?: string[];
  };
  locations: Location[];
  categories: Category[];
  items: Item[];
  fulfillments: Fulfillment[];
  payments: Payment[];
  time?: Time;
}

interface Location {
  id: string;
  gps: string;              // "lat,long"
  address: Address;
  time?: Time;
}

interface Address {
  door?: string;
  name?: string;
  building?: string;
  street?: string;
  locality?: string;
  ward?: string;
  city?: string;
  state?: string;
  country?: string;
  area_code: string;        // Postal code
}

interface Category {
  id: string;
  descriptor: {
    name: string;
  };
}

interface Item {
  id: string;
  descriptor: {
    name: string;
    short_desc?: string;
    long_desc?: string;
    images?: string[];
  };
  category_id: string;
  fulfillment_id: string;
  location_id: string;
  price: {
    currency: string;
    value: string;          // Decimal string
    maximum_value?: string; // MRP
  };
  quantity: {
    available: {
      count: string;        // "99" for unlimited, "5" for limited
    };
    maximum?: {
      count: string;        // Max per order
    };
  };
  tags?: Tag[];
}

interface Tag {
  code: string;
  list: TagItem[];
}

interface TagItem {
  code: string;
  value: string;
}

interface Fulfillment {
  id: string;
  type: "Delivery" | "Pickup";
  contact?: {
    phone: string;
    email?: string;
  };
}

interface Payment {
  id: string;
  type: "ON-ORDER" | "PRE-FULFILLMENT" | "ON-FULFILLMENT" | "POST-FULFILLMENT";
  collected_by: "BAP" | "BPP";
  tags?: Tag[];
}

interface Time {
  label: string;
  timestamp?: string;
  duration?: string;        // ISO 8601 duration
  range?: {
    start: string;
    end: string;
  };
}
```

**Example Response:**

```json
POST https://api.foodbot.com/beckn/on_search
Content-Type: application/json
Authorization: Signature keyId="...",signature="..."

{
  "context": {
    "domain": "nic2004:52110",
    "action": "on_search",
    "country": "IND",
    "city": "std:080",
    "core_version": "1.1.0",
    "bap_id": "foodbot.example.com",
    "bap_uri": "https://api.foodbot.com/beckn",
    "bpp_id": "pizza-paradise.ondc.org",
    "bpp_uri": "https://api.pizza-paradise.com/beckn",
    "transaction_id": "a9aaecca-10b7-4d19-b640-b047a7c62196",
    "message_id": "cc680gb9-dc93-4935-cf13-gd178406c719",
    "timestamp": "2024-03-15T10:30:02.345Z"
  },
  "message": {
    "catalog": {
      "bpp/descriptor": {
        "name": "Pizza Paradise",
        "symbol": "https://pizza-paradise.com/logo.png",
        "short_desc": "Authentic Italian Pizzas",
        "images": ["https://pizza-paradise.com/banner.jpg"]
      },
      "bpp/providers": [
        {
          "id": "pizza-paradise-kr",
          "descriptor": {
            "name": "Pizza Paradise - Koramangala",
            "short_desc": "Wood-fired pizzas",
            "images": ["https://pizza-paradise.com/kr-outlet.jpg"]
          },
          "locations": [
            {
              "id": "loc-1",
              "gps": "12.9352,77.6245",
              "address": {
                "building": "Shop 12",
                "street": "80 Feet Road",
                "locality": "Koramangala 4th Block",
                "city": "Bangalore",
                "state": "Karnataka",
                "country": "IND",
                "area_code": "560034"
              }
            }
          ],
          "categories": [
            {
              "id": "cat-veg",
              "descriptor": { "name": "Vegetarian Pizzas" }
            },
            {
              "id": "cat-non-veg",
              "descriptor": { "name": "Non-Vegetarian Pizzas" }
            }
          ],
          "items": [
            {
              "id": "item-margherita",
              "descriptor": {
                "name": "Margherita Pizza",
                "short_desc": "Classic tomato and mozzarella",
                "images": ["https://pizza-paradise.com/margherita.jpg"]
              },
              "category_id": "cat-veg",
              "fulfillment_id": "f1",
              "location_id": "loc-1",
              "price": {
                "currency": "INR",
                "value": "299.00",
                "maximum_value": "349.00"
              },
              "quantity": {
                "available": { "count": "99" },
                "maximum": { "count": "5" }
              },
              "tags": [
                {
                  "code": "veg_nonveg",
                  "list": [{ "code": "veg", "value": "yes" }]
                },
                {
                  "code": "timing",
                  "list": [
                    { "code": "day_from", "value": "1" },
                    { "code": "day_to", "value": "7" },
                    { "code": "time_from", "value": "1100" },
                    { "code": "time_to", "value": "2300" }
                  ]
                }
              ]
            }
          ],
          "fulfillments": [
            {
              "id": "f1",
              "type": "Delivery",
              "contact": {
                "phone": "+919876543210",
                "email": "support@pizza-paradise.com"
              }
            }
          ],
          "payments": [
            {
              "id": "p1",
              "type": "ON-ORDER",
              "collected_by": "BAP"
            }
          ]
        }
      ]
    }
  }
}
```

---

## Order APIs

### 3. `/select` - Get Quote for Selected Items

**Purpose:** Request quote/pricing for selected menu items.

**Endpoint:** `POST https://api.{bpp_domain}/beckn/select`

**Request Schema:**

```typescript
interface SelectRequest {
  context: BecknContext & {
    action: "select";
    bpp_id: string;
    bpp_uri: string;
  };
  message: {
    order: {
      provider: {
        id: string;
        locations: [{ id: string }];
      };
      items: {
        id: string;
        quantity: {
          count: number;
        };
      }[];
      fulfillments: {
        type: "Delivery" | "Pickup";
        end?: {
          location: {
            gps: string;
            address: Address;
          };
        };
      }[];
    };
  };
}
```

**Example Request:**

```json
POST https://api.pizza-paradise.com/beckn/select

{
  "context": {
    "domain": "nic2004:52110",
    "action": "select",
    "country": "IND",
    "city": "std:080",
    "core_version": "1.1.0",
    "bap_id": "foodbot.example.com",
    "bap_uri": "https://api.foodbot.com/beckn",
    "bpp_id": "pizza-paradise.ondc.org",
    "bpp_uri": "https://api.pizza-paradise.com/beckn",
    "transaction_id": "a9aaecca-10b7-4d19-b640-b047a7c62196",
    "message_id": "dd791hc0-ed04-5046-dg24-he289517d820",
    "timestamp": "2024-03-15T10:32:00.000Z"
  },
  "message": {
    "order": {
      "provider": {
        "id": "pizza-paradise-kr",
        "locations": [{ "id": "loc-1" }]
      },
      "items": [
        {
          "id": "item-margherita",
          "quantity": { "count": 2 }
        }
      ],
      "fulfillments": [
        {
          "type": "Delivery",
          "end": {
            "location": {
              "gps": "12.9715987,77.5945627",
              "address": {
                "building": "Prestige Tech Park",
                "locality": "Marathahalli",
                "city": "Bangalore",
                "state": "Karnataka",
                "country": "IND",
                "area_code": "560037"
              }
            }
          }
        }
      ]
    }
  }
}
```

### 4. `/on_select` - Quote Response (Callback)

**Response Schema:**

```typescript
interface OnSelectResponse {
  context: BecknContext & {
    action: "on_select";
  };
  message: {
    order: {
      provider: {
        id: string;
        locations: [{ id: string }];
      };
      items: {
        id: string;
        quantity: { count: number };
        price: {
          currency: string;
          value: string;
        };
      }[];
      quote: {
        price: {
          currency: string;
          value: string;
        };
        breakup: {
          title: string;
          price: {
            currency: string;
            value: string;
          };
        }[];
        ttl?: string;         // Quote validity duration
      };
      fulfillments: {
        id: string;
        type: string;
        state: {
          descriptor: {
            code: string;     // "Serviceable" or "Non-serviceable"
          };
        };
        tracking: boolean;
        end: {
          location: {
            gps: string;
            address: Address;
          };
          time: {
            range: {
              start: string;
              end: string;
            };
          };
          contact: {
            phone: string;
          };
        };
      }[];
    };
  };
}
```

**Example Response:**

```json
POST https://api.foodbot.com/beckn/on_select

{
  "context": { /* same as request with updated action/message_id/timestamp */ },
  "message": {
    "order": {
      "provider": {
        "id": "pizza-paradise-kr",
        "locations": [{ "id": "loc-1" }]
      },
      "items": [
        {
          "id": "item-margherita",
          "quantity": { "count": 2 },
          "price": {
            "currency": "INR",
            "value": "299.00"
          }
        }
      ],
      "quote": {
        "price": {
          "currency": "INR",
          "value": "658.00"
        },
        "breakup": [
          {
            "title": "Margherita Pizza x2",
            "price": { "currency": "INR", "value": "598.00" }
          },
          {
            "title": "Delivery Charges",
            "price": { "currency": "INR", "value": "40.00" }
          },
          {
            "title": "GST",
            "price": { "currency": "INR", "value": "20.00" }
          }
        ],
        "ttl": "PT15M"
      },
      "fulfillments": [
        {
          "id": "f1",
          "type": "Delivery",
          "state": {
            "descriptor": { "code": "Serviceable" }
          },
          "tracking": false,
          "end": {
            "location": {
              "gps": "12.9715987,77.5945627",
              "address": { /* delivery address */ }
            },
            "time": {
              "range": {
                "start": "2024-03-15T11:15:00.000Z",
                "end": "2024-03-15T11:45:00.000Z"
              }
            },
            "contact": {
              "phone": "+919876543210"
            }
          }
        }
      ]
    }
  }
}
```

### 5. `/init` - Initialize Order

**Purpose:** Provide billing details and finalize order draft.

**Request Schema:**

```typescript
interface InitRequest {
  context: BecknContext & {
    action: "init";
  };
  message: {
    order: {
      provider: {
        id: string;
        locations: [{ id: string }];
      };
      items: {
        id: string;
        quantity: { count: number };
      }[];
      billing: {
        name: string;
        email: string;
        phone: string;
        address: Address;
      };
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
        collected_by: "BAP" | "BPP";
      };
    };
  };
}
```

### 6. `/on_init` - Order Draft (Callback)

Returns complete order draft with payment details for final confirmation.

### 7. `/confirm` - Confirm Order

**Purpose:** Place final order with payment confirmation.

**Request Schema:**

```typescript
interface ConfirmRequest {
  context: BecknContext & {
    action: "confirm";
  };
  message: {
    order: {
      id?: string;          // BAP-generated order ID
      provider: {
        id: string;
      };
      items: {
        id: string;
        quantity: { count: number };
      }[];
      billing: {
        name: string;
        email: string;
        phone: string;
        address: Address;
      };
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
        status: "PAID" | "NOT-PAID";
      };
    };
  };
}
```

### 8. `/on_confirm` - Order Confirmation (Callback)

**Response Schema:**

```typescript
interface OnConfirmResponse {
  context: BecknContext & {
    action: "on_confirm";
  };
  message: {
    order: {
      id: string;           // BPP-assigned order ID
      state: string;        // "Accepted", "Created"
      provider: {
        id: string;
        descriptor: {
          name: string;
        };
        locations: [{ id: string }];
      };
      items: { /* confirmed items */ }[];
      billing: { /* billing details */ };
      fulfillments: {
        id: string;
        type: string;
        state: {
          descriptor: {
            code: string;   // "Pending", "Order-picked-up", etc.
          };
        };
        tracking: boolean;
        start?: {
          time: {
            range: {
              start: string;
              end: string;
            };
          };
        };
        end: {
          time: {
            range: {
              start: string;
              end: string;
            };
          };
          location: { /* delivery location */ };
          contact: {
            phone: string;
          };
        };
      }[];
      quote: { /* final quote */ };
      payment: { /* payment details */ };
      created_at: string;
      updated_at: string;
    };
  };
}
```

---

## Post-Fulfillment APIs

### 9. `/status` - Check Order Status

**Purpose:** Poll for current order status.

**Request:**

```json
{
  "context": {
    "action": "status",
    /* ... */
  },
  "message": {
    "order_id": "ORDER-1234567890"
  }
}
```

### 10. `/on_status` - Status Update (Callback)

**Response:**

```json
{
  "context": {
    "action": "on_status"
  },
  "message": {
    "order": {
      "id": "ORDER-1234567890",
      "state": "In-progress",
      "fulfillments": [
        {
          "id": "f1",
          "state": {
            "descriptor": {
              "code": "Order-picked-up"
            }
          },
          "tracking": true,
          "end": {
            "time": {
              "range": {
                "start": "2024-03-15T11:25:00.000Z",
                "end": "2024-03-15T11:40:00.000Z"
              }
            }
          }
        }
      ]
    }
  }
}
```

**Fulfillment State Codes:**

```
- Pending
- Packed
- Order-picked-up
- Out-for-delivery
- Order-delivered
- Cancelled
- RTO-Initiated
- RTO-Delivered
```

### 11. `/track` - Get Live Tracking

**Purpose:** Request real-time delivery tracking.

**Request:**

```json
{
  "context": {
    "action": "track"
  },
  "message": {
    "order_id": "ORDER-1234567890",
    "callback_url": "https://api.foodbot.com/beckn/tracking-updates"
  }
}
```

### 12. `/on_track` - Tracking Details (Callback)

**Response:**

```json
{
  "context": {
    "action": "on_track"
  },
  "message": {
    "tracking": {
      "url": "https://pizza-paradise.com/track/ORDER-1234567890",
      "location": {
        "gps": "12.9500,77.6000",
        "updated_at": "2024-03-15T11:30:00.000Z"
      }
    }
  }
}
```

### 13. `/cancel` - Cancel Order

**Purpose:** Request order cancellation.

**Request:**

```json
{
  "context": {
    "action": "cancel"
  },
  "message": {
    "order_id": "ORDER-1234567890",
    "cancellation_reason_id": "001",
    "descriptor": {
      "short_desc": "User changed mind"
    }
  }
}
```

**Cancellation Reason Codes:**

```
001: Price of one or more items have changed
002: One or more items in the order not available
003: Product available at lower than order price
004: Merchant not able to fulfill order
005: Order in pending shipment / delivery state for too long
006: Buyer not found or cannot be contacted
007: Buyer does not want product any more
008: Buyer wants to modify address
009: Buyer wants to modify order
010: Expected delivery time too high
011: Merchant does not have serving capacity
012: Order lost in transit
013: Buyer wants to cancel
```

### 14. `/on_cancel` - Cancellation Confirmation (Callback)

**Response:**

```json
{
  "context": {
    "action": "on_cancel"
  },
  "message": {
    "order": {
      "id": "ORDER-1234567890",
      "state": "Cancelled",
      "cancellation": {
        "cancelled_by": "foodbot.example.com",
        "reason": {
          "id": "007",
          "descriptor": {
            "short_desc": "Buyer does not want product any more"
          }
        }
      },
      "refund": {
        "amount": {
          "currency": "INR",
          "value": "658.00"
        },
        "timestamp": "2024-03-15T11:35:00.000Z",
        "status": "Processing"
      }
    }
  }
}
```

### 15. `/support` - Raise Support Request

**Purpose:** Contact customer support for order issues.

**Request:**

```json
{
  "context": {
    "action": "support"
  },
  "message": {
    "ref_id": "ORDER-1234567890"
  }
}
```

### 16. `/on_support` - Support Details (Callback)

**Response:**

```json
{
  "context": {
    "action": "on_support"
  },
  "message": {
    "support": {
      "phone": "+919876543210",
      "email": "support@pizza-paradise.com",
      "url": "https://pizza-paradise.com/support/ticket/TKT-9876"
    }
  }
}
```

### 17. `/rating` - Submit Rating

**Purpose:** Rate order and provide feedback.

**Request:**

```json
{
  "context": {
    "action": "rating"
  },
  "message": {
    "ratings": [
      {
        "id": "ORDER-1234567890",
        "rating_category": "Order",
        "value": "5"
      },
      {
        "id": "item-margherita",
        "rating_category": "Item",
        "value": "4"
      },
      {
        "id": "f1",
        "rating_category": "Fulfillment",
        "value": "5",
        "feedback_form": [
          {
            "question": "How was the delivery experience?",
            "answer": "Excellent! On time and hot pizza."
          }
        ]
      }
    ]
  }
}
```

**Rating Categories:**

```
- Order: Overall order experience
- Item: Product quality
- Fulfillment: Delivery experience
- Provider: Restaurant service
```

### 18. `/on_rating` - Rating Acknowledgment (Callback)

**Response:**

```json
{
  "context": {
    "action": "on_rating"
  },
  "message": {
    "feedback_ack": true,
    "rating_acknowledgement": [
      {
        "id": "ORDER-1234567890",
        "rating_category": "Order",
        "status": "Received"
      }
    ]
  }
}
```

---

## Error Handling

### Error Structure

```typescript
interface BecknError {
  type: string;
  code: string;
  path?: string;
  message: string;
}
```

### Common Error Scenarios

#### 1. Invalid Context

```json
{
  "error": {
    "type": "CONTEXT-ERROR",
    "code": "10001",
    "path": "$.context.city",
    "message": "Invalid city code format. Expected 'std:XXX'"
  }
}
```

#### 2. Item Out of Stock

```json
{
  "error": {
    "type": "DOMAIN-ERROR",
    "code": "30001",
    "path": "$.message.order.items[0]",
    "message": "Item 'item-margherita' is out of stock"
  }
}
```

#### 3. Non-Serviceable Area

```json
{
  "error": {
    "type": "DOMAIN-ERROR",
    "code": "30002",
    "message": "Delivery not available in area code 560001"
  }
}
```

#### 4. Signature Verification Failed

```json
{
  "error": {
    "type": "CORE-ERROR",
    "code": "20001",
    "message": "Digital signature verification failed"
  }
}
```

#### 5. Quote Expired

```json
{
  "error": {
    "type": "DOMAIN-ERROR",
    "code": "30003",
    "message": "Quote expired. Please select items again."
  }
}
```

### Error Handling Best Practices

**1. Retry Logic:**

```typescript
async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      if (!isRetryable(error)) throw error;

      await sleep(delay * attempt); // Exponential backoff
    }
  }
  throw new Error('Max retries exceeded');
}

function isRetryable(error: any): boolean {
  return (
    error.code === 'NETWORK_ERROR' ||
    error.code === 'TIMEOUT' ||
    error.status === 503 ||
    error.status === 504
  );
}
```

**2. Timeout Handling:**

```typescript
async function callWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  return Promise.race([
    fn(),
    sleep(timeoutMs).then(() => {
      throw new Error('Request timeout');
    })
  ]);
}
```

**3. Circuit Breaker:**

```typescript
class CircuitBreaker {
  private failures = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private nextAttempt = Date.now();

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    if (this.failures >= 5) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + 60000; // 1 minute
    }
  }
}
```

---

## Status Codes

### HTTP Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| `200 OK` | Success | ACK for all valid requests |
| `400 Bad Request` | Invalid request | Schema validation failed, invalid context |
| `401 Unauthorized` | Auth failed | Invalid or expired signature |
| `403 Forbidden` | Not allowed | Unsupported domain, policy violation |
| `404 Not Found` | Not found | Unknown order ID, invalid endpoint |
| `500 Internal Server Error` | Server error | Unexpected server-side error |
| `503 Service Unavailable` | Unavailable | Server overloaded, maintenance mode |

### ACK Status

```json
{
  "message": {
    "ack": {
      "status": "ACK"    // or "NACK"
    }
  }
}
```

- **ACK**: Request accepted, callback will follow
- **NACK**: Request rejected, check error object

---

## Example Workflows

### Complete Order Flow

```
1. User: "Find pizza near me"
   → FoodBot: POST /search (intent: pizza)
   → Gateway: 200 ACK
   → Sellers: POST /on_search (catalogs)
   → FoodBot: Display restaurants

2. User: "Order 2 Margherita from Pizza Paradise"
   → FoodBot: POST /select (items + delivery address)
   → Seller: 200 ACK
   → Seller: POST /on_select (quote: ₹658)
   → FoodBot: "Total ₹658. Confirm?"

3. User: "Yes, confirm"
   → FoodBot: POST /init (billing details)
   → Seller: 200 ACK
   → Seller: POST /on_init (order draft)
   → FoodBot: Process payment via Razorpay
   → FoodBot: POST /confirm (payment_status: PAID)
   → Seller: 200 ACK
   → Seller: POST /on_confirm (order_id: ORDER-123, state: Accepted)
   → FoodBot: "Order placed! Order ID: ORDER-123"

4. Status Updates (polling every 2 minutes):
   → FoodBot: POST /status (order_id)
   → Seller: 200 ACK
   → Seller: POST /on_status (state: Order-picked-up)
   → FoodBot: "Your order is out for delivery!"

5. Tracking:
   → FoodBot: POST /track (order_id)
   → Seller: 200 ACK
   → Seller: POST /on_track (tracking_url)
   → FoodBot: Display tracking link

6. Delivery Complete:
   → Seller: POST /on_status (state: Order-delivered)
   → FoodBot: "Order delivered! How was your experience?"

7. Rating:
   → FoodBot: POST /rating (value: 5)
   → Seller: 200 ACK
   → Seller: POST /on_rating (ack: true)
   → FoodBot: "Thanks for your feedback!"
```

---

## Appendix: Quick Reference

### Key Endpoints

| API | Type | Purpose |
|-----|------|---------|
| `/search` | Request | Discover restaurants/items |
| `/on_search` | Callback | Catalog response |
| `/select` | Request | Get quote for items |
| `/on_select` | Callback | Quote response |
| `/init` | Request | Initialize order with billing |
| `/on_init` | Callback | Order draft |
| `/confirm` | Request | Place order |
| `/on_confirm` | Callback | Order confirmation |
| `/status` | Request | Check order status |
| `/on_status` | Callback | Status update |
| `/track` | Request | Get tracking details |
| `/on_track` | Callback | Tracking response |
| `/cancel` | Request | Cancel order |
| `/on_cancel` | Callback | Cancellation confirmation |
| `/support` | Request | Raise support request |
| `/on_support` | Callback | Support details |
| `/rating` | Request | Submit rating |
| `/on_rating` | Callback | Rating acknowledgment |

### Required Headers

```http
Content-Type: application/json
Authorization: Signature keyId="...",algorithm="ed25519",created=X,expires=Y,headers="...",signature="..."
```

### Transaction Lifecycle States

```
search → select → init → confirm → status updates → track → delivered → rating
```

---

**Document End**

**For latest updates, always refer to:**
- https://docs.ondc.org
- https://developers.beckn.org
- https://github.com/ONDC-Official/ONDC-Protocol-Specs
