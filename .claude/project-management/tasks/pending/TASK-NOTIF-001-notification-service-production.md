# TASK-NOTIF-001: Notification Service - Full Production Implementation

**Created:** 2026-02-23
**Status:** Pending
**Priority:** P1 (High)
**Estimated Effort:** 12 days
**Component:** Notification Service / All Services
**Depends On:** TASK-DB-001, TASK-ES-001 (Kafka events)
**Blocks:** User notifications, real-time updates, marketing
**Related Requirements:** All user-facing features

---

## Overview

Implement a comprehensive notification service that handles push notifications (FCM/APNs), email, SMS, in-app notifications, WebSocket real-time updates, and notification preferences management. The service consumes Kafka events and delivers notifications through the appropriate channels with templating, localization, batching, and delivery tracking.

---

## Requirements

### Functional Requirements

1. **Notification Channels**
   - **Push Notifications**: FCM (Android), APNs (iOS), Web Push
   - **Email**: Transactional emails via SendGrid/SES
   - **SMS**: OTP and critical alerts via Twilio/SNS
   - **In-App**: Real-time notifications in app UI
   - **WebSocket**: Real-time status updates (job status, order tracking)
   - **Webhook**: External system notifications

2. **Notification Types**
   - Order status updates (confirmed, preparing, ready, picked up, delivered)
   - Payment confirmations and receipts
   - Delivery tracking updates
   - Diet plan reminders (meal time approaching)
   - Party plan alerts (scheduled order placement)
   - Promotional offers and discounts
   - Restaurant updates (new menu items, special offers)
   - System alerts (maintenance, outages)
   - Account security (login from new device, password change)
   - Review/feedback requests
   - Re-engagement (haven't ordered in X days)

3. **Template Management**
   - Template engine (Handlebars/Mustache)
   - Per-channel templates (push, email, SMS have different formats)
   - Multi-language support (English, Hindi, regional languages)
   - Template versioning
   - A/B testing for notification content
   - Dynamic content injection (user name, order details, restaurant name)
   - Rich content support (images in push, HTML in email)
   - Template preview and testing tool

4. **Notification Preferences**
   - Per-user preference management
   - Per-channel opt-in/opt-out (push, email, SMS independently)
   - Per-category preferences (order updates: always, promotions: opt-in)
   - Quiet hours (no notifications between 10pm-7am unless critical)
   - Frequency capping (max 5 promotional per day)
   - Unsubscribe links in emails
   - Preference sync across devices

5. **Delivery Management**
   - Kafka consumer for notification events
   - Priority queue (critical > transactional > promotional)
   - Batching for bulk notifications
   - Retry with exponential backoff (3 attempts)
   - Dead letter queue for failed notifications
   - Delivery status tracking (sent, delivered, opened, clicked)
   - Bounce handling (email bounces, invalid tokens)
   - Device token management (refresh, invalidation)

6. **Real-Time Updates (WebSocket)**
   - WebSocket server for real-time connections
   - Room-based subscriptions (per user, per order, per job)
   - Heartbeat and reconnection handling
   - Connection scaling (Redis pub/sub for multi-instance)
   - Binary compression for mobile bandwidth
   - Authentication per WebSocket connection

7. **Analytics & Monitoring**
   - Delivery rate per channel
   - Open rate (push + email)
   - Click-through rate
   - Opt-out rate trends
   - Notification latency (event → delivery)
   - Channel health monitoring
   - Cost tracking per channel

### Architecture

```
Notification Flow:
Kafka Event → Notification Service → Template Engine → Channel Router
  → Push/Email/SMS/WebSocket → Delivery Tracking

Components:
├── EventConsumer (Kafka)
│   ├── OrderEventHandler
│   ├── PaymentEventHandler
│   ├── DeliveryEventHandler
│   ├── PlannerEventHandler
│   └── MarketingEventHandler
├── NotificationOrchestrator
│   ├── PreferenceChecker
│   ├── QuietHourFilter
│   ├── FrequencyCapEnforcer
│   └── PriorityRouter
├── TemplateEngine
│   ├── TemplateResolver
│   ├── ContentRenderer (Handlebars)
│   ├── LocalizationService
│   └── ABTestSelector
├── ChannelProviders
│   ├── PushProvider (FCM + APNs + Web Push)
│   ├── EmailProvider (SendGrid/SES)
│   ├── SMSProvider (Twilio/SNS)
│   ├── InAppProvider (DB insert + WebSocket)
│   └── WebhookProvider (HTTP POST)
├── WebSocketServer
│   ├── ConnectionManager
│   ├── RoomManager
│   ├── MessageBroadcaster
│   ├── AuthMiddleware
│   └── RedisPubSub (scaling)
├── DeliveryTracker
│   ├── StatusRecorder
│   ├── BounceHandler
│   ├── TokenManager
│   └── RetryManager
└── AnalyticsCollector
    ├── DeliveryMetrics
    ├── EngagementMetrics
    └── CostTracker

API Endpoints:
POST   /api/v1/notifications/send           - Send notification (internal)
GET    /api/v1/notifications                 - Get user notifications
PUT    /api/v1/notifications/:id/read        - Mark as read
PUT    /api/v1/notifications/read-all        - Mark all as read
GET    /api/v1/notifications/preferences     - Get preferences
PUT    /api/v1/notifications/preferences     - Update preferences
POST   /api/v1/notifications/register-device - Register push token
DELETE /api/v1/notifications/devices/:id     - Unregister device
GET    /ws/notifications                     - WebSocket connection
```

### Acceptance Criteria
- [ ] Push notifications working (FCM + APNs + Web Push)
- [ ] Email delivery via SendGrid/SES
- [ ] SMS delivery for OTP and critical alerts
- [ ] In-app notification list with read/unread
- [ ] WebSocket real-time updates (order status, job status)
- [ ] Template engine with multi-language support
- [ ] Per-user notification preferences
- [ ] Quiet hours enforcement
- [ ] Frequency capping
- [ ] Priority queue (critical > transactional > promotional)
- [ ] Kafka event consumption for all notification types
- [ ] Retry with DLQ for failures
- [ ] Delivery tracking (sent, delivered, opened)
- [ ] WebSocket scaling with Redis pub/sub
- [ ] Performance: notification delivery < 1 second (push/websocket)
- [ ] 85%+ test coverage
- [ ] Load test: 10,000 notifications/minute

### Files to Create/Modify
**Notification Service:**
- `services/notification-service/src/notification.module.ts`
- `services/notification-service/src/notification.service.ts`
- `services/notification-service/src/consumers/order-event.consumer.ts`
- `services/notification-service/src/consumers/payment-event.consumer.ts`
- `services/notification-service/src/channels/push.provider.ts`
- `services/notification-service/src/channels/email.provider.ts`
- `services/notification-service/src/channels/sms.provider.ts`
- `services/notification-service/src/channels/websocket.provider.ts`
- `services/notification-service/src/templates/template-engine.ts`
- `services/notification-service/src/templates/templates/*.hbs`
- `services/notification-service/src/preferences/preference.service.ts`
- `services/notification-service/src/websocket/websocket-server.ts`
- `services/notification-service/src/websocket/room-manager.ts`
- `services/notification-service/src/tracking/delivery-tracker.ts`
- `services/notification-service/src/tracking/bounce-handler.ts`

**Gateway API Integration:**
- `apps/gateway-api/src/notification/notification.controller.ts`
- `apps/gateway-api/src/notification/notification.module.ts`

**Frontend:**
- `apps/customer-app/src/components/Notifications/*.tsx`
- `apps/customer-app/src/services/websocket.service.ts`
- `apps/customer-app/src/hooks/useNotifications.ts`

**Tests:**
- `services/notification-service/src/__tests__/*.spec.ts`
- `services/notification-service/src/__tests__/channels/*.spec.ts`
- `services/notification-service/src/__tests__/e2e/*.spec.ts`

---

## SDLC Phases

### Phase 1: Planning & Design (2 days)
- Define notification event catalog (all event types and their channels)
- Design notification data model (PostgreSQL schema)
- Design template schema and storage strategy
- Select providers: FCM vs OneSignal, SendGrid vs SES, Twilio vs SNS
- Define WebSocket protocol (message format, room naming conventions)
- Design preference data model and default settings
- Create sequence diagrams for each notification flow
- Define SLAs: delivery latency, throughput, availability

### Phase 2: Core Infrastructure (3 days)
- Implement Kafka consumers for all event types
- Build NotificationOrchestrator with preference checking
- Implement priority queue with batching support
- Build template engine with Handlebars integration
- Create base ChannelProvider interface and abstract class
- Set up notification database schema and migrations
- Implement delivery status tracking

### Phase 3: Channel Implementations (3 days)
- Implement PushProvider (FCM + APNs + Web Push)
- Implement EmailProvider (SendGrid/SES with HTML templates)
- Implement SMSProvider (Twilio/SNS for OTP and alerts)
- Implement InAppProvider (database insert + WebSocket push)
- Implement WebhookProvider (external HTTP POST)
- Build device token registration and management
- Add retry logic with exponential backoff per channel
- Configure dead letter queue for persistent failures

### Phase 4: WebSocket & Real-Time (2 days)
- Implement WebSocket server with Socket.IO or ws
- Build room-based subscription management
- Implement Redis pub/sub for multi-instance scaling
- Add authentication middleware for WebSocket connections
- Implement heartbeat and reconnection handling
- Build frontend WebSocket service and React hooks
- Create notification bell component with unread count

### Phase 5: Preferences & Analytics (1 day)
- Build preference management API (CRUD)
- Implement quiet hours filter
- Implement frequency capping logic
- Build notification analytics collector
- Create delivery metrics dashboard data endpoints
- Implement unsubscribe flow for emails

### Phase 6: Testing & Performance (1 day)
- Unit tests for all services (85%+ coverage)
- Integration tests for Kafka consumer flows
- E2E tests for notification delivery per channel
- Load test: verify 10,000 notifications/minute throughput
- WebSocket stress test: 1,000 concurrent connections
- Verify delivery latency < 1 second for push/websocket
- Test failover and DLQ handling
