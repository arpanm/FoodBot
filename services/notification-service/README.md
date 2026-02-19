# FoodBot Notification Service

**Package:** `@foodbot/notification-service`
**Version:** 1.0.0
**Last Updated:** 2026-02-19

---

## Overview

The Notification Service is a standalone TypeScript microservice that consumes events from Apache Kafka and dispatches notifications through multiple channels (email, SMS, push notifications, WebSocket). It handles all user-facing notifications for the FoodBot platform, including order confirmations, status updates, payment receipts, and account notifications.

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| TypeScript 5 | Language |
| Pino 9 | Structured JSON logging |
| UUID | Unique notification ID generation |
| Kafka (via consumer interface) | Event consumption |

## Features

- Multi-channel notification dispatch (email, SMS, push, WebSocket)
- Kafka event consumption for order, payment, and user events
- Channel-specific formatting and templates
- Graceful shutdown with SIGINT/SIGTERM handling
- Structured JSON logging
- Dead letter queue (DLQ) for failed notifications

## Project Structure

```
src/
  consumers/
    order-event.consumer.ts    # Handles order.created, order.confirmed,
                                # order.ready, order.delivered, order.cancelled
    payment-event.consumer.ts  # Handles payment.completed, payment.failed,
                                # payment.refunded
    user-event.consumer.ts     # Handles user.registered, user.verified,
                                # user.suspended
  channels/
    email.channel.ts           # Email notification delivery
    sms.channel.ts             # SMS notification delivery
    push.channel.ts            # Push notification delivery
    websocket.channel.ts       # WebSocket real-time delivery
  __tests__/
    order-event.consumer.spec.ts  # Consumer integration tests
  notification.service.ts      # Core service orchestrator
  index.ts                     # Entry point with graceful shutdown
```

## Getting Started

### Prerequisites

- Node.js >= 20
- Running Kafka instance (via Docker Compose)

### Installation

```bash
cd services/notification-service
pnpm install
```

### Running

```bash
# Development mode
pnpm dev

# Production mode
pnpm build
pnpm start
```

### Testing

```bash
pnpm test
```

## Event Consumers

### Order Event Consumer

Consumes from topics: `order.created`, `order.confirmed`, `order.ready`, `order.delivered`, `order.cancelled`

| Event | Notification | Channels |
|-------|-------------|----------|
| `order.created` | "Your order has been placed" | Email, Push, WebSocket |
| `order.confirmed` | "Your order is confirmed" | Push, WebSocket |
| `order.ready` | "Your order is ready for pickup" | Push, SMS, WebSocket |
| `order.delivered` | "Your order has been delivered" | Email, Push |
| `order.cancelled` | "Your order has been cancelled" | Email, Push |

### Payment Event Consumer

Consumes from topics: `payment.completed`, `payment.failed`, `payment.refunded`

| Event | Notification | Channels |
|-------|-------------|----------|
| `payment.completed` | "Payment successful" | Email, Push |
| `payment.failed` | "Payment failed" | Email, Push, SMS |
| `payment.refunded` | "Refund processed" | Email, Push |

### User Event Consumer

Consumes from topics: `user.registered`, `user.verified`, `user.suspended`

| Event | Notification | Channels |
|-------|-------------|----------|
| `user.registered` | "Welcome to FoodBot" | Email |
| `user.verified` | "Email verified" | Email |
| `user.suspended` | "Account suspended" | Email |

## Notification Channels

### Email Channel
- HTML template-based emails
- Supports attachments (receipts, invoices)
- Production: integrates with SendGrid/SES

### SMS Channel
- Text-only notifications
- Used for critical updates (order ready, payment failures)
- Production: integrates with Twilio/SNS

### Push Channel
- Browser and mobile push notifications
- Supports rich notifications with images
- Production: integrates with Firebase Cloud Messaging

### WebSocket Channel
- Real-time in-app notifications
- Connected to the Gateway API WebSocket server
- Immediate delivery for active sessions

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `KAFKA_BROKERS` | Kafka broker addresses | `localhost:9092` |
| `KAFKA_GROUP_ID` | Consumer group ID | `notification-service` |
| `LOG_LEVEL` | Logging level | `info` |
| `EMAIL_PROVIDER` | Email service provider | `mock` |
| `SMS_PROVIDER` | SMS service provider | `mock` |
| `PUSH_PROVIDER` | Push notification provider | `mock` |

## Graceful Shutdown

The service handles `SIGINT` and `SIGTERM` signals for graceful shutdown:

1. Stops consuming new Kafka messages
2. Completes in-flight notification deliveries
3. Closes channel connections
4. Exits cleanly

## Related Documentation

- [Event Streaming Guide](../../docs/EVENT_STREAMING.md)
- [Architecture](../../docs/ARCHITECTURE.md)
- [Deployment](../../docs/DEPLOYMENT.md)
- [Troubleshooting](../../docs/TROUBLESHOOTING.md)
