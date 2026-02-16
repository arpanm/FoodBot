# FoodBot - System Architecture

> **AI-Orchestrated, Spec-Driven Restaurant Commerce Platform**
> Version: 1.0.0 | Last Updated: 2026-02-17

---

## 📋 Table of Contents

- [1. Architecture Overview](#1-architecture-overview)
- [2. System Context](#2-system-context)
- [3. Component Architecture](#3-component-architecture)
- [4. Data Architecture](#4-data-architecture)
- [5. Integration Architecture](#5-integration-architecture)
- [6. Security Architecture](#6-security-architecture)
- [7. Deployment Architecture](#7-deployment-architecture)
- [8. Technology Stack](#8-technology-stack)
- [9. Architecture Decisions](#9-architecture-decisions)
- [10. Scalability & Performance](#10-scalability--performance)

---

## 1. Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────┐              ┌──────────────────────┐         │
│  │  Customer Agent App  │              │ Restaurant Agent App │         │
│  │  (Capacitor+React)   │              │  (Capacitor+React)   │         │
│  │  - iOS               │              │  - iOS               │         │
│  │  - Android           │              │  - Android           │         │
│  │  - Web               │              │  - Web               │         │
│  └──────────┬───────────┘              └──────────┬───────────┘         │
│             │                                     │                      │
└─────────────┼─────────────────────────────────────┼──────────────────────┘
              │                                     │
              │                                     │
┌─────────────┼─────────────────────────────────────┼──────────────────────┐
│             │         API GATEWAY LAYER           │                      │
├─────────────┴─────────────────────────────────────┴──────────────────────┤
│                                                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    API Gateway (NestJS)                           │  │
│  │  - Authentication/Authorization (JWT)                             │  │
│  │  - Rate Limiting                                                  │  │
│  │  - Request Validation                                             │  │
│  │  - Response Transformation                                        │  │
│  │  - API Documentation (Swagger)                                    │  │
│  └───────┬───────────────────────────────────────────────┬───────────┘  │
│          │                                               │              │
└──────────┼───────────────────────────────────────────────┼──────────────┘
           │                                               │
           │                                               │
┌──────────┼───────────────────────────────────────────────┼──────────────┐
│          │        SERVICE LAYER                          │              │
├──────────┴───────────────────────────────────────────────┴──────────────┤
│                                                                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │  LLM Service     │  │  Workflow Service│  │  MCP Orchestrator│      │
│  │  (NestJS)        │  │  (Temporal)      │  │  (Spring Boot)   │      │
│  │                  │  │                  │  │                  │      │
│  │ - LLM Router     │  │ - Workflow Exec  │  │ - Provider Routing│     │
│  │ - Intent Extract │  │ - Error Handling │  │ - Result Aggreg. │      │
│  │ - Workflow Gen   │  │ - Retry Logic    │  │ - Search Service │      │
│  │ - Context Enrich │  │ - State Persist  │  │ - Indexing Mgmt  │      │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘      │
│           │                     │                      │                │
│           │                     │                      │                │
└───────────┼─────────────────────┼──────────────────────┼────────────────┘
            │                     │                      │
            │                     │                      │
┌───────────┼─────────────────────┼──────────────────────┼────────────────┐
│           │         DATA LAYER  │                      │                │
├───────────┴─────────────────────┴──────────────────────┴────────────────┤
│                                                                           │
│  ┌─────────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐ │
│  │ PostgreSQL  │ │  Redis   │ │  Neo4j   │ │Vector DB  │ │Temporal  │ │
│  │ (Primary)   │ │ (Cache)  │ │ (Graph)  │ │(Semantic) │ │   DB     │ │
│  └─────────────┘ └──────────┘ └──────────┘ └───────────┘ └──────────┘ │
│                                                                           │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │  Elasticsearch Cluster  │  │         Kafka Cluster               │  │
│  │  - Restaurants Index    │  │  - restaurant.* topics              │  │
│  │  - Dishes Index         │  │  - dish.* topics                    │  │
│  │  - Search/Filter API    │  │  - order.* topics                   │  │
│  └─────────────────────────┘  └─────────────────────────────────────┘  │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
            │                     │                      │
            │                     │                      │
┌───────────┼─────────────────────┼──────────────────────┼────────────────┐
│           │    EXTERNAL LAYER   │                      │                │
├───────────┴─────────────────────┴──────────────────────┴────────────────┤
│                                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  Mock MCP    │  │  Swiggy MCP  │  │  Zomato MCP  │  │  LLM APIs  │ │
│  │              │  │              │  │              │  │            │ │
│  │ - Restaurant │  │ - Restaurant │  │ - Restaurant │  │ - Claude   │ │
│  │ - Menu       │  │ - Menu       │  │ - Menu       │  │ - OpenAI   │ │
│  │ - Orders     │  │ - Orders     │  │ - Orders     │  │ - Gemini   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Architecture Principles

1. **Microservices Architecture**: Services are loosely coupled and independently deployable
2. **Event-Driven**: Kafka-based asynchronous communication for scalability
3. **API-First**: Well-defined APIs using OpenAPI specification
4. **Cloud-Native**: Containerized services, orchestrated with Kubernetes
5. **Resilient by Design**: Circuit breakers, retries, bulkheads, timeouts
6. **Spec-Driven**: Machine-readable specifications govern behavior
7. **AI-Orchestrated**: LLMs drive intent understanding and workflow generation

### 1.3 Key Architectural Patterns

- **API Gateway Pattern**: Single entry point for all client requests
- **Saga Pattern**: Distributed transactions using Temporal workflows
- **CQRS**: Separate read/write models for performance optimization
- **Event Sourcing**: Kafka-based event log for audit and replay
- **Circuit Breaker**: Prevent cascading failures across services
- **Bulkhead**: Isolate resources to contain failures
- **Cache-Aside**: Redis caching for frequently accessed data
- **Strangler Fig**: Gradual migration from monolith to microservices

---

## 2. System Context

### 2.1 System Context Diagram

```
                  ┌──────────────────────────────────────────┐
                  │          External Systems                │
                  │                                          │
                  │  ┌──────────────┐  ┌─────────────────┐  │
                  │  │ Payment      │  │ Notification    │  │
                  │  │ Gateway      │  │ Services        │  │
                  │  │ (Stripe/     │  │ (FCM, Email,    │  │
                  │  │  Razorpay)   │  │  SMS)           │  │
                  │  └──────────────┘  └─────────────────┘  │
                  │                                          │
                  │  ┌──────────────┐  ┌─────────────────┐  │
                  │  │ LLM APIs     │  │ MCP Providers   │  │
                  │  │ (Claude,     │  │ (Swiggy,        │  │
                  │  │  OpenAI,     │  │  Zomato)        │  │
                  │  │  Gemini)     │  │                 │  │
                  │  └──────────────┘  └─────────────────┘  │
                  └────────────┬────────────┬────────────────┘
                               │            │
                               │            │
         ┌─────────────────────┼────────────┼─────────────────────┐
         │                     │            │                     │
         │              ┌──────▼────────────▼──────┐              │
         │              │                           │              │
         │              │      FoodBot Platform     │              │
         │              │                           │              │
         │              │  - Customer Agent         │              │
         │              │  - Restaurant Agent       │              │
         │              │  - MCP Aggregation Layer  │              │
         │              │  - LLM Orchestration      │              │
         │              │  - Workflow Management    │              │
         │              │                           │              │
         │              └──────┬────────────┬───────┘              │
         │                     │            │                      │
         └─────────────────────┼────────────┼──────────────────────┘
                               │            │
                ┌──────────────┴────────────┴─────────────┐
                │                                          │
                │         Primary Actors                   │
                │                                          │
                │  ┌──────────────┐  ┌─────────────────┐  │
                │  │  Customer    │  │  Restaurant     │  │
                │  │  (Web/Mobile)│  │  Owner          │  │
                │  │              │  │  (Web/Mobile)   │  │
                │  └──────────────┘  └─────────────────┘  │
                │                                          │
                │  ┌──────────────┐                       │
                │  │  Admin       │                       │
                │  │  (Dashboard) │                       │
                │  └──────────────┘                       │
                │                                          │
                └──────────────────────────────────────────┘
```

### 2.2 User Journeys

#### Customer Journey
```
1. Customer opens app
2. Types: "I want pizza for dinner"
3. System creates job, returns jobId
4. LLM detects intent: "search_restaurant"
5. Generates workflow with steps
6. Temporal executes workflow:
   - Enrich with user context (prefers Italian, evening orders)
   - Search restaurants via MCP aggregator
   - Apply filters (cuisine: Italian, available: true)
   - Return top 10 results
7. Customer sees results, selects restaurant
8. Browses menu, adds items to cart
9. Proceeds to checkout
10. Selects delivery address
11. Initiates payment
12. Order placed, tracking begins
13. Receives order updates
14. Order delivered
15. Provides feedback
```

#### Restaurant Owner Journey
```
1. Owner logs into restaurant app
2. Sees list of new orders
3. Accepts order
4. Updates status: "Preparing"
5. Marks dishes as preparing
6. Updates status: "Ready for Pickup"
7. Order picked by delivery partner
8. Updates status: "Out for Delivery"
9. Order delivered
10. Views analytics: "What were my top dishes today?"
11. LLM processes query, shows results
12. Updates menu: Marks item unavailable
13. Changes reflect immediately in customer app
```

---

## 3. Component Architecture

### 3.1 Customer Agent

#### 3.1.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Customer Agent App                          │
│                    (Capacitor + React)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Presentation Layer                      │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │  Chat UI    │  │  Restaurant │  │  Order Tracking │ │  │
│  │  │  Component  │  │  List/Detail│  │  Component      │ │  │
│  │  │             │  │  Components │  │                 │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │  Cart UI    │  │  Checkout   │  │  Profile UI     │ │  │
│  │  │  Component  │  │  Component  │  │  Component      │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  State Management Layer                  │  │
│  │                   (Redux Toolkit)                        │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │  Chat Slice │  │  Restaurant │  │  Cart Slice     │ │  │
│  │  │             │  │  Slice      │  │                 │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │  Order Slice│  │  User Slice │  │  UI Slice       │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Service Layer                           │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │  Chat       │  │  Restaurant │  │  Order Service  │ │  │
│  │  │  Service    │  │  Service    │  │                 │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │  Cart       │  │  Payment    │  │  Auth Service   │ │  │
│  │  │  Service    │  │  Service    │  │                 │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  HTTP Client Layer                       │  │
│  │                   (Axios)                                │  │
│  │                                                          │  │
│  │  - Request/Response Interceptors                        │  │
│  │  - Error Handling                                       │  │
│  │  - Retry Logic                                          │  │
│  │  - Token Management                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             ▼
                    API Gateway (NestJS)
```

#### 3.1.2 Key Features

- **Rich Chat UI**: Cards, buttons, images, dynamic inputs
- **Job-based Async Processing**: Poll for status updates
- **Offline Support**: Cache API responses, sync on reconnection
- **Push Notifications**: Order updates, promotions
- **Multi-platform**: Web, iOS, Android with Capacitor

---

### 3.2 Restaurant Agent

#### 3.2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Restaurant Agent App                         │
│                    (Capacitor + React)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Presentation Layer                      │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │  Dashboard  │  │  Order      │  │  Menu           │ │  │
│  │  │  Component  │  │  Management │  │  Management     │ │  │
│  │  │             │  │  Component  │  │  Component      │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │  Analytics  │  │  AI Query   │  │  Settings       │ │  │
│  │  │  Component  │  │  Component  │  │  Component      │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  State Management Layer                  │  │
│  │                   (Redux Toolkit)                        │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │  Order Slice│  │  Menu Slice │  │  Analytics Slice│ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Service Layer                           │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │  Order      │  │  Menu       │  │  Analytics      │ │  │
│  │  │  Service    │  │  Service    │  │  Service        │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             ▼
                    API Gateway (NestJS)
```

#### 3.2.2 Key Features

- **Order Management**: Accept, reject, update status
- **Menu Management**: CRUD operations, availability toggle
- **Analytics Dashboard**: Revenue, orders, dish performance
- **AI-Powered Insights**: Natural language analytics queries
- **Real-time Notifications**: New orders, customer feedback

---

### 3.3 API Gateway (NestJS)

#### 3.3.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway (NestJS)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Middleware Layer                        │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │  Auth       │  │  Rate       │  │  Request        │ │  │
│  │  │  Middleware │  │  Limiter    │  │  Validator      │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │  CORS       │  │  Logging    │  │  Error Handler  │ │  │
│  │  │  Middleware │  │  Middleware │  │  Middleware     │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Controller Layer                        │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │  Chat       │  │  Restaurant │  │  Order          │ │  │
│  │  │  Controller │  │  Controller │  │  Controller     │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │  Cart       │  │  Payment    │  │  Menu           │ │  │
│  │  │  Controller │  │  Controller │  │  Controller     │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Service Layer                           │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │  LLM        │  │  Workflow   │  │  Restaurant     │ │  │
│  │  │  Service    │  │  Service    │  │  Service        │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │  Order      │  │  Payment    │  │  User Service   │ │  │
│  │  │  Service    │  │  Service    │  │                 │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Repository Layer                        │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │  User       │  │  Restaurant │  │  Order          │ │  │
│  │  │  Repository │  │  Repository │  │  Repository     │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
                ┌────────────┴───────────┐
                │                        │
                ▼                        ▼
          PostgreSQL               External Services
          Redis                    (LLM, Temporal, MCP)
          Neo4j
```

#### 3.3.2 Key Responsibilities

- **Request Routing**: Route requests to appropriate services
- **Authentication**: JWT validation, user session management
- **Authorization**: Role-based access control
- **Rate Limiting**: Prevent abuse, enforce quotas
- **Validation**: Request/response schema validation
- **Error Handling**: Centralized error handling and logging
- **API Documentation**: Swagger/OpenAPI documentation

---

### 3.4 LLM Service (NestJS)

#### 3.4.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      LLM Service (NestJS)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  LLM Router                              │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │  Claude     │  │  OpenAI     │  │  Gemini         │ │  │
│  │  │  Provider   │  │  Provider   │  │  Provider       │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  │                                                          │  │
│  │  - Intelligent Routing Logic                            │  │
│  │  - Fallback Strategy                                    │  │
│  │  - Cost Optimization                                    │  │
│  │  - Load Balancing                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Intent Extractor                        │  │
│  │                                                          │  │
│  │  - Prompt Classification                                │  │
│  │  - Intent Detection                                     │  │
│  │  - Entity Extraction                                    │  │
│  │  - Confidence Scoring                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Context Enricher                        │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │  Redis      │  │  Neo4j      │  │  Vector DB      │ │  │
│  │  │  Context    │  │  Preference │  │  Semantic Cache │ │  │
│  │  │  Loader     │  │  Graph      │  │  Lookup         │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  │                                                          │  │
│  │  - User Context Loading                                 │  │
│  │  - Preference Graph Traversal                           │  │
│  │  - Cache Lookup                                         │  │
│  │  - Prompt Enrichment                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Workflow Generator                      │  │
│  │                                                          │  │
│  │  - Workflow JSON Generation                             │  │
│  │  - Step Dependency Resolution                           │  │
│  │  - Error Handling Strategy                              │  │
│  │  - Retry Configuration                                  │  │
│  │  - Workflow Validation                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Prompt Manager                          │  │
│  │                                                          │  │
│  │  - Template Storage                                     │  │
│  │  - Version Management                                   │  │
│  │  - A/B Testing                                          │  │
│  │  - Performance Analytics                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

#### 3.4.2 LLM Routing Strategy

| Use Case | Primary LLM | Fallback | Rationale |
|----------|-------------|----------|-----------|
| Complex Reasoning | Claude | OpenAI | Best at reasoning, analysis |
| Workflow Generation | Claude | OpenAI | Structured output generation |
| Code Generation | Claude | OpenAI | High-quality code generation |
| Conversational | OpenAI | Gemini | Natural conversation flow |
| Quick Classification | Gemini | OpenAI | Fast, cost-effective |
| Summarization | OpenAI | Claude | Concise, coherent summaries |
| Intent Detection | Gemini | OpenAI | Fast classification |

---

### 3.5 Workflow Service (Temporal)

#### 3.5.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   Workflow Service (Temporal)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Workflow Definitions                    │  │
│  │                                                          │  │
│  │  ┌─────────────────────────────────────────────────────┐│  │
│  │  │  SearchRestaurantWorkflow                           ││  │
│  │  │  - Load user context                                ││  │
│  │  │  - Call MCP search API                              ││  │
│  │  │  - Apply filters                                    ││  │
│  │  │  - Return results                                   ││  │
│  │  └─────────────────────────────────────────────────────┘│  │
│  │                                                          │  │
│  │  ┌─────────────────────────────────────────────────────┐│  │
│  │  │  OrderPlacementWorkflow                             ││  │
│  │  │  - Validate cart                                    ││  │
│  │  │  - Check item availability                          ││  │
│  │  │  - Reserve items                                    ││  │
│  │  │  - Process payment                                  ││  │
│  │  │  - Create order                                     ││  │
│  │  │  - Notify restaurant                                ││  │
│  │  │  - Notify customer                                  ││  │
│  │  └─────────────────────────────────────────────────────┘│  │
│  │                                                          │  │
│  │  ┌─────────────────────────────────────────────────────┐│  │
│  │  │  OrderTrackingWorkflow                              ││  │
│  │  │  - Subscribe to order events                        ││  │
│  │  │  - Update order status                              ││  │
│  │  │  - Send notifications                               ││  │
│  │  │  - Handle cancellations                             ││  │
│  │  └─────────────────────────────────────────────────────┘│  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Activity Definitions                    │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │  Call MCP   │  │  Process    │  │  Send           │ │  │
│  │  │  API        │  │  Payment    │  │  Notification   │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │  Update     │  │  Load       │  │  Cache          │ │  │
│  │  │  Database   │  │  Context    │  │  Results        │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Error Handling                          │  │
│  │                                                          │  │
│  │  - Retry with Exponential Backoff                       │  │
│  │  - Circuit Breaker per MCP Provider                     │  │
│  │  - Bulkhead Pattern for Resource Isolation              │  │
│  │  - Timeout Configuration per Activity                   │  │
│  │  - Compensating Transactions                            │  │
│  │  - Dead Letter Queue                                    │  │
│  │  - Alternative Plan Execution                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Status Tracker                          │  │
│  │                                                          │  │
│  │  - Job Status Updates (Redis)                           │  │
│  │  - Progress Calculation                                 │  │
│  │  - Step Metadata Capture                                │  │
│  │  - Error Detail Logging                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

#### 3.5.2 Workflow Patterns

**Saga Pattern**
```typescript
async orderPlacementWorkflow(orderId: string) {
  try {
    await reserveItems(orderId);
    await processPayment(orderId);
    await createOrder(orderId);
    await notifyRestaurant(orderId);
  } catch (error) {
    // Compensating transactions
    await refundPayment(orderId);
    await releaseItems(orderId);
    await cancelOrder(orderId);
    throw error;
  }
}
```

**Retry with Backoff**
```typescript
const retryPolicy = {
  initialInterval: '1s',
  backoffCoefficient: 2,
  maximumInterval: '60s',
  maximumAttempts: 5,
};
```

**Circuit Breaker**
```typescript
const circuitBreakerConfig = {
  failureThreshold: 5,
  timeoutDuration: '60s',
  resetTimeout: '5m',
};
```

---

### 3.6 MCP Orchestration Layer (Spring Boot)

#### 3.6.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│            MCP Orchestration Layer (Spring Boot)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Provider Router                         │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │  Mock MCP   │  │  Swiggy MCP │  │  Zomato MCP     │ │  │
│  │  │  Client     │  │  Client     │  │  Client         │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  │                                                          │  │
│  │  - Provider Selection Logic                             │  │
│  │  - Load Balancing                                       │  │
│  │  - Failover Handling                                    │  │
│  │  - Health Monitoring                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Result Aggregator                       │  │
│  │                                                          │  │
│  │  - Multi-provider Result Merging                        │  │
│  │  - Deduplication                                        │  │
│  │  - Ranking/Scoring                                      │  │
│  │  - Response Normalization                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Search Service                          │  │
│  │                                                          │  │
│  │  ┌─────────────────────────────────────────────────────┐│  │
│  │  │  Elasticsearch Client                               ││  │
│  │  │  - Full-Text Search                                 ││  │
│  │  │  - Faceted Search                                   ││  │
│  │  │  - Geo-Spatial Search                               ││  │
│  │  │  - Aggregations                                     ││  │
│  │  └─────────────────────────────────────────────────────┘│  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Indexing Service                        │  │
│  │                                                          │  │
│  │  ┌─────────────────────────────────────────────────────┐│  │
│  │  │  Kafka Consumer                                     ││  │
│  │  │  - restaurant.* topics                              ││  │
│  │  │  - dish.* topics                                    ││  │
│  │  │  - Elasticsearch Indexer                            ││  │
│  │  │  - Batch Processing                                 ││  │
│  │  └─────────────────────────────────────────────────────┘│  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Cache Manager                           │  │
│  │                                                          │  │
│  │  - Redis Cache (Response Caching)                       │  │
│  │  - TTL Management                                       │  │
│  │  - Cache Invalidation                                   │  │
│  │  - Cache Warming                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Resiliency Layer                        │  │
│  │                                                          │  │
│  │  - Circuit Breaker (Resilience4j)                       │  │
│  │  - Rate Limiter                                         │  │
│  │  - Bulkhead                                             │  │
│  │  - Retry                                                │  │
│  │  - Timeout                                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

#### 3.6.2 Provider Configuration

```yaml
mcp:
  providers:
    mock:
      enabled: true
      baseUrl: http://localhost:3010
      timeout: 5000ms
      circuitBreaker:
        failureThreshold: 5
        waitDurationInOpenState: 60s
    swiggy:
      enabled: false
      baseUrl: https://api.swiggy.com/mcp
      apiKey: ${SWIGGY_API_KEY}
      timeout: 10000ms
      circuitBreaker:
        failureThreshold: 10
        waitDurationInOpenState: 120s
    zomato:
      enabled: false
      baseUrl: https://api.zomato.com/mcp
      apiKey: ${ZOMATO_API_KEY}
      timeout: 10000ms
      circuitBreaker:
        failureThreshold: 10
        waitDurationInOpenState: 120s
```

---

## 4. Data Architecture

### 4.1 Database Schema Overview

#### 4.1.1 PostgreSQL Schema

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    users     │       │ restaurants  │       │    dishes    │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │       │ id (PK)      │       │ id (PK)      │
│ email        │       │ name         │       │ restaurant_id│
│ phone        │       │ description  │       │ name         │
│ name         │◄──┐   │ owner_id (FK)│───┐   │ description  │
│ role         │   │   │ cuisine      │   │   │ price        │
│ created_at   │   │   │ address      │   │   │ category     │
└──────────────┘   │   │ rating       │   │   │ availability │
                   │   │ created_at   │   │   │ created_at   │
                   │   └──────────────┘   │   └──────────────┘
                   │                      │
                   │                      └───────────┐
┌──────────────┐   │   ┌──────────────┐             │
│   orders     │   │   │  order_items │             │
├──────────────┤   │   ├──────────────┤             │
│ id (PK)      │   │   │ id (PK)      │             │
│ user_id (FK) │───┘   │ order_id (FK)│───┐         │
│restaurant_id │───────│ dish_id (FK) │───┼─────────┘
│ total        │       │ quantity     │   │
│ status       │       │ price        │   │
│ created_at   │       │ subtotal     │   │
└──────────────┘       └──────────────┘   │
                                           │
                       ┌──────────────┐    │
                       │   payments   │    │
                       ├──────────────┤    │
                       │ id (PK)      │    │
                       │ order_id (FK)│────┘
                       │ amount       │
                       │ method       │
                       │ status       │
                       │ created_at   │
                       └──────────────┘
```

#### 4.1.2 Neo4j Preference Graph

```
(User)
  ├── [PREFERS_ON]─(DayOfWeek:Monday)
  │                    ├── [PREFERS_AT]─(Hour:19)
  │                    │                   ├── [PREFERS]─(Category:Italian)
  │                    │                   │                ├── [PREFERS]─(Restaurant:Pizza Palace)
  │                    │                   │                │                ├── [PREFERS]─(Dish:Margherita Pizza)
  │                    │                   │                │                └── [PREFERS]─(Dish:Pasta Carbonara)
  │                    │                   │                └── [PREFERS]─(Restaurant:Mama's Kitchen)
  │                    │                   └── [PREFERS]─(Category:Chinese)
  │                    └── [PREFERS_AT]─(Hour:13)
  │                                        └── [PREFERS]─(Category:Fast Food)
  └── [PREFERS_ON]─(DayOfWeek:Friday)
                       └── [PREFERS_AT]─(Hour:20)
                                          └── [PREFERS]─(Category:Indian)
```

#### 4.1.3 Vector Database Schema

```
{
  "id": "vec_001",
  "embedding": [0.123, -0.456, 0.789, ...], // 1536 dimensions
  "metadata": {
    "prompt": "I want pizza for dinner",
    "intent": "search_restaurant",
    "workflow": "{...}",
    "userId": "user_123",
    "timestamp": "2026-02-17T10:30:00Z",
    "success": true
  }
}
```

#### 4.1.4 Elasticsearch Indexes

**Restaurant Index**
```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "name": { "type": "text", "analyzer": "standard" },
      "description": { "type": "text" },
      "cuisine": { "type": "keyword" },
      "rating": { "type": "float" },
      "location": { "type": "geo_point" },
      "priceRange": { "type": "integer" },
      "availability": { "type": "boolean" },
      "operatingHours": { "type": "nested" }
    }
  }
}
```

**Dish Index**
```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "restaurantId": { "type": "keyword" },
      "name": { "type": "text", "analyzer": "standard" },
      "description": { "type": "text" },
      "category": { "type": "keyword" },
      "price": { "type": "float" },
      "availability": { "type": "boolean" },
      "dietaryTags": { "type": "keyword" },
      "ingredients": { "type": "text" }
    }
  }
}
```

---

## 5. Integration Architecture

### 5.1 Integration Patterns

#### 5.1.1 Synchronous Integration (REST)

```
Customer App ──HTTP──► API Gateway ──HTTP──► Backend Services
                                             ──HTTP──► MCP Orchestrator
                                             ──HTTP──► LLM Service
```

#### 5.1.2 Asynchronous Integration (Kafka)

```
Restaurant Service ──Kafka──► menu.updated ──Kafka──► Indexing Service
                                                     ──Kafka──► Search Service
                                                     ──Kafka──► Cache Invalidator
```

#### 5.1.3 Workflow Orchestration (Temporal)

```
API Gateway ──Temporal Client──► Temporal Server ──Activity──► MCP Orchestrator
                                                 ──Activity──► Payment Service
                                                 ──Activity──► Notification Service
```

### 5.2 API Integration

#### 5.2.1 LLM APIs

**Claude API**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const response = await client.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [{ role: 'user', content: prompt }],
});
```

**OpenAI API**
```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const response = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: prompt }],
});
```

**Gemini API**
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = client.getGenerativeModel({ model: 'gemini-pro' });

const response = await model.generateContent(prompt);
```

#### 5.2.2 MCP Provider APIs

**Mock MCP**
```typescript
// Internal implementation - full control
interface MCPClient {
  searchRestaurants(query: string): Promise<Restaurant[]>;
  getRestaurantDetails(id: string): Promise<Restaurant>;
  searchDishes(query: string): Promise<Dish[]>;
  placeOrder(order: Order): Promise<OrderConfirmation>;
}
```

**Swiggy MCP**
```typescript
// https://github.com/Swiggy/swiggy-mcp-server-manifest
import { SwiggyMCPClient } from '@swiggy/mcp-client';

const client = new SwiggyMCPClient({
  apiKey: process.env.SWIGGY_API_KEY,
  baseUrl: 'https://api.swiggy.com/mcp',
});
```

**Zomato MCP**
```typescript
// https://github.com/Zomato/mcp-server-manifest
import { ZomatoMCPClient } from '@zomato/mcp-client';

const client = new ZomatoMCPClient({
  apiKey: process.env.ZOMATO_API_KEY,
  baseUrl: 'https://api.zomato.com/mcp',
});
```

---

## 6. Security Architecture

### 6.1 Security Layers

```
┌─────────────────────────────────────────────────────────┐
│                   Network Security                      │
│  - WAF (Web Application Firewall)                       │
│  - DDoS Protection                                      │
│  - TLS 1.3 Encryption                                   │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                   API Gateway Security                  │
│  - JWT Authentication                                   │
│  - OAuth 2.0                                            │
│  - Rate Limiting                                        │
│  - IP Whitelisting                                      │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                   Application Security                  │
│  - RBAC (Role-Based Access Control)                     │
│  - Input Validation                                     │
│  - Output Encoding                                      │
│  - CSRF Protection                                      │
│  - XSS Prevention                                       │
│  - SQL Injection Prevention                             │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                   Data Security                         │
│  - Encryption at Rest (AES-256)                         │
│  - Encryption in Transit (TLS 1.3)                      │
│  - PII Data Masking                                     │
│  - Secrets Management (Vault)                           │
│  - Database Access Control                              │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Authentication Flow

```
┌─────────┐                                    ┌───────────────┐
│ Client  │                                    │  Auth Service │
└────┬────┘                                    └───────┬───────┘
     │                                                 │
     │  1. POST /auth/login {email, password}         │
     ├────────────────────────────────────────────────►│
     │                                                 │
     │  2. Validate credentials                        │
     │◄────────────────────────────────────────────────┤
     │                                                 │
     │  3. Return JWT + Refresh Token                  │
     │◄────────────────────────────────────────────────┤
     │                                                 │
     │  4. Store tokens securely                       │
     │                                                 │
     │  5. Subsequent API calls with JWT               │
     ├────────────────────────────────────────────────►│
     │                                                 │
     │  6. Validate JWT                                │
     │◄────────────────────────────────────────────────┤
     │                                                 │
     │  7. API Response                                │
     │◄────────────────────────────────────────────────┤
     │                                                 │
```

---

## 7. Deployment Architecture

### 7.1 Cloud Deployment (Kubernetes)

```
┌─────────────────────────────────────────────────────────────────┐
│                      Kubernetes Cluster                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Ingress Controller                     │  │
│  │  - NGINX Ingress                                         │  │
│  │  - TLS Termination                                       │  │
│  │  - Load Balancing                                        │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                         │
│  ┌────────────────────┼─────────────────────────────────────┐  │
│  │         Namespace: customer-agent                       │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │ Customer    │  │ Customer    │  │ Customer        │ │  │
│  │  │ Agent Pod 1 │  │ Agent Pod 2 │  │ Agent Pod 3     │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  │                                                          │  │
│  │  - HPA (Horizontal Pod Autoscaler)                      │  │
│  │  - Min: 3, Max: 20                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Namespace: restaurant-agent                      │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐                       │  │
│  │  │ Restaurant  │  │ Restaurant  │                       │  │
│  │  │ Agent Pod 1 │  │ Agent Pod 2 │                       │  │
│  │  └─────────────┘  └─────────────┘                       │  │
│  │                                                          │  │
│  │  - HPA: Min: 2, Max: 10                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Namespace: backend-services                      │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │ API Gateway │  │ LLM Service │  │ MCP Orchestrator│ │  │
│  │  │ Deployment  │  │ Deployment  │  │ Deployment      │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐                       │  │
│  │  │ Temporal    │  │ Workflow    │                       │  │
│  │  │ Server      │  │ Workers     │                       │  │
│  │  │ StatefulSet │  │ Deployment  │                       │  │
│  │  └─────────────┘  └─────────────┘                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Namespace: data-services                         │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │ PostgreSQL  │  │ Redis       │  │ Elasticsearch   │ │  │
│  │  │ StatefulSet │  │ StatefulSet │  │ StatefulSet     │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐                       │  │
│  │  │ Neo4j       │  │ Kafka       │                       │  │
│  │  │ StatefulSet │  │ StatefulSet │                       │  │
│  │  └─────────────┘  └─────────────┘                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 7.2 Environment Strategy

| Environment | Purpose | Infrastructure |
|-------------|---------|----------------|
| **Development** | Local development | Docker Compose |
| **Staging** | Pre-production testing | Kubernetes (1 cluster) |
| **Production** | Live system | Kubernetes (Multi-region) |

---

## 8. Technology Stack

### 8.1 Frontend

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | React | 18+ | UI library |
| **Mobile** | Capacitor | 5+ | Native mobile wrapper |
| **State Management** | Redux Toolkit | 2.0+ | Centralized state |
| **UI Library** | Material-UI | 5+ | Component library |
| **HTTP Client** | Axios | 1.6+ | API communication |
| **Build Tool** | Vite | 5+ | Fast build & HMR |
| **Testing** | Jest + RTL | Latest | Unit/integration tests |

### 8.2 Backend

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | NestJS | 10+ | Backend framework |
| **Runtime** | Node.js | 20+ | JavaScript runtime |
| **Language** | TypeScript | 5+ | Type-safe development |
| **Workflow** | Temporal | 1.20+ | Durable workflows |
| **MCP Layer** | Spring Boot | 3+ | Java orchestration |
| **API Docs** | Swagger/OpenAPI | 3.0 | API documentation |
| **Testing** | Jest + Supertest | Latest | Unit/integration tests |

### 8.3 Databases

| Type | Technology | Version | Purpose |
|------|-----------|---------|---------|
| **Relational** | PostgreSQL | 15+ | Primary database |
| **Cache** | Redis | 7+ | Caching & sessions |
| **Graph** | Neo4j | 5+ | User preferences |
| **Vector** | Pinecone/Qdrant | Latest | Semantic cache |
| **Search** | Elasticsearch | 8+ | Full-text search |
| **Workflow** | Temporal DB | 1.20+ | Workflow persistence |

### 8.4 Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Container** | Docker | Containerization |
| **Orchestration** | Kubernetes | Container orchestration |
| **CI/CD** | GitHub Actions | Automation |
| **Monitoring** | Prometheus + Grafana | Metrics & dashboards |
| **Logging** | ELK Stack | Log aggregation |
| **Tracing** | Jaeger | Distributed tracing |
| **Secrets** | Vault | Secrets management |

---

## 9. Architecture Decisions

### 9.1 ADR-001: Multi-LLM Strategy

**Decision**: Use multiple LLM providers (Claude, OpenAI, Gemini) with intelligent routing

**Rationale**:
- Cost optimization: Use cheaper models for simple tasks
- Reliability: Fallback when one provider is down
- Performance: Use fastest model for latency-sensitive operations
- Quality: Use best model for each specific use case

**Consequences**:
- ✅ Reduced costs by 40%
- ✅ Increased availability
- ❌ Added complexity in routing logic
- ❌ Need to maintain multiple API integrations

### 9.2 ADR-002: Temporal for Workflows

**Decision**: Use Temporal for workflow orchestration instead of custom state machines

**Rationale**:
- Durable execution: Workflows survive process restarts
- Built-in retries: Automatic retry with backoff
- Visibility: Workflow history and status tracking
- Developer experience: Write workflows as code

**Consequences**:
- ✅ Reliable workflow execution
- ✅ Reduced boilerplate code
- ✅ Better debugging and monitoring
- ❌ Additional infrastructure component
- ❌ Learning curve for developers

### 9.3 ADR-003: Elasticsearch for Search

**Decision**: Use Elasticsearch for restaurant/dish search instead of database queries

**Rationale**:
- Performance: Sub-second full-text search
- Features: Typo tolerance, faceted search, geo-search
- Scalability: Horizontal scaling for large datasets
- Relevance: Advanced scoring and ranking

**Consequences**:
- ✅ Fast, relevant search results
- ✅ Rich filtering capabilities
- ❌ Data synchronization complexity (Kafka)
- ❌ Additional infrastructure cost

### 9.4 ADR-004: Neo4j for User Preferences

**Decision**: Use Neo4j graph database for user preference storage

**Rationale**:
- Hierarchical data: Natural fit for preference tree
- Traversal performance: Fast graph queries
- Relationship modeling: Complex preference patterns
- Personalization: Rich recommendation engine

**Consequences**:
- ✅ Better personalization accuracy
- ✅ Fast preference lookups
- ❌ Another database to maintain
- ❌ Learning curve for graph queries

---

## 10. Scalability & Performance

### 10.1 Horizontal Scaling Strategy

```
Component             | Min Instances | Max Instances | Scaling Metric
----------------------|---------------|---------------|----------------
API Gateway           | 3             | 20            | CPU > 70%
LLM Service           | 2             | 10            | Queue depth
Workflow Workers      | 3             | 15            | Pending tasks
MCP Orchestrator      | 2             | 10            | CPU > 70%
Indexing Service      | 2             | 5             | Kafka lag
```

### 10.2 Database Scaling

**PostgreSQL**:
- Read replicas: 2-5 replicas for read scaling
- Connection pooling: PgBouncer (max 1000 connections)
- Partitioning: Orders table by date
- Indexing: Critical query paths

**Redis**:
- Cluster mode: 3 masters, 3 replicas
- Memory: 16GB per instance
- Eviction policy: LRU for cache keys

**Elasticsearch**:
- Cluster: 3 master nodes, 6 data nodes
- Shards: 5 primary + 1 replica per index
- Heap size: 8GB per node

**Neo4j**:
- Causal cluster: 3 core nodes
- Read replicas: 2-3 for read scaling

### 10.3 Caching Strategy

```
Layer             | Cache           | TTL      | Hit Rate Target
------------------|-----------------|----------|------------------
API Gateway       | Redis           | 5 min    | 60%
Restaurant Data   | Redis           | 15 min   | 80%
LLM Responses     | Vector DB       | 24 hours | 70%
Search Results    | Redis           | 10 min   | 50%
User Context      | Redis           | 30 min   | 90%
```

### 10.4 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Latency (p95) | < 500ms | APM tools |
| API Latency (p99) | < 1s | APM tools |
| LLM Response | < 5s | Custom metrics |
| Search Query | < 500ms | Elasticsearch metrics |
| Workflow Execution | < 10s | Temporal metrics |
| Page Load Time | < 2s | Lighthouse |
| Time to Interactive | < 3s | Lighthouse |

---

**Document Version**: 1.0.0
**Last Updated**: 2026-02-17
**Next Review**: 2026-03-17
