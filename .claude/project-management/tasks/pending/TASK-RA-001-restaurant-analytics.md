# TASK-RA-001: Restaurant Analytics Platform - Full Production Implementation

**Created:** 2026-02-23
**Status:** Pending
**Priority:** P2 (Medium)
**Estimated Effort:** 20 days
**Component:** Restaurant Agent / Gateway API / Analytics
**Depends On:** TASK-DB-001
**Blocks:** Restaurant insights, menu optimization
**Related Requirements:** FR-RA-ANALYTICS-003, FR-RA-ANALYTICS-004, FR-RA-ANALYTICS-005

---

## Overview

Implement a comprehensive analytics platform for restaurant owners including revenue analytics, customer insights, menu performance optimization, order trends, peak hour analysis, customer segmentation, competitive benchmarking, AI-powered recommendations, and exportable reports.

---

## Requirements

### Functional Requirements

1. **Revenue Analytics**
   - Daily/weekly/monthly/yearly revenue charts
   - Revenue by dish, category, time period
   - Average order value trends
   - Revenue comparison (period over period)
   - Revenue forecasting (ML-based)
   - Revenue by payment method
   - Revenue by order source (internal, Swiggy, Zomato)
   - Tax collected breakdown
   - Discount/promotion impact on revenue
   - Delivery fee revenue

2. **Order Analytics**
   - Order volume trends (hourly, daily, weekly)
   - Peak hour identification
   - Order completion rate
   - Cancellation rate with reasons
   - Average prep time per dish
   - Average delivery time
   - Order fulfillment rate
   - Re-order rate (repeat customers)
   - Order value distribution (histogram)

3. **Customer Insights**
   - Total unique customers
   - New vs returning customers
   - Customer lifetime value (CLV)
   - Customer retention rate
   - Customer segmentation (high-value, frequent, at-risk, churned)
   - Most loyal customers list
   - Customer feedback analysis (sentiment using LLM)
   - Customer preference patterns
   - Demographic insights (area-based)

4. **Menu Performance**
   - Dish-level sales analytics
   - Top selling dishes (by volume and revenue)
   - Worst performing dishes
   - Menu item profitability analysis
   - Dish combination analysis (frequently ordered together)
   - Rating analysis per dish
   - Price sensitivity analysis
   - AI-powered pricing suggestions
   - Menu gap analysis (what's trending but not on your menu)
   - Seasonal demand patterns

5. **Operational Insights**
   - Kitchen capacity utilization
   - Order-to-delivery time analysis
   - Staff performance metrics
   - Ingredient demand forecasting
   - Waste prediction
   - Peak hour staffing recommendations
   - Service quality score (composite)

6. **Competitive Benchmarking**
   - Area-level cuisine trends
   - Price comparison with nearby restaurants
   - Rating comparison
   - Popular dishes in area (that you don't serve)
   - Market share estimation

7. **AI-Powered Recommendations**
   - Menu optimization suggestions (add/remove/reprice dishes)
   - Promotion timing recommendations
   - Operating hours optimization
   - Pricing strategy suggestions
   - Customer win-back campaign suggestions

8. **Reports & Exports**
   - Daily/weekly/monthly automated reports (email)
   - PDF report generation
   - CSV data export
   - Custom date range reports
   - Scheduled report delivery
   - White-label report branding

### Architecture

```
Analytics Pipeline:
Orders DB → Kafka Events → Analytics Aggregator → Analytics DB (materialized views)
  → API Layer → Restaurant Dashboard → Charts/Reports

Components:
├── AnalyticsAggregator
│   ├── RevenueAggregator (hourly batch)
│   ├── OrderAggregator
│   ├── CustomerAggregator
│   ├── MenuPerformanceAggregator
│   └── OperationalAggregator
├── AnalyticsQueryService
│   ├── RevenueQueryEngine
│   ├── OrderQueryEngine
│   ├── CustomerQueryEngine
│   ├── MenuQueryEngine
│   └── BenchmarkQueryEngine
├── AIInsightsService
│   ├── MenuOptimizer (LLM + data)
│   ├── PricingAdvisor
│   ├── DemandForecaster
│   ├── SentimentAnalyzer (LLM)
│   └── RecommendationEngine
├── ReportService
│   ├── ReportGenerator (PDF/CSV)
│   ├── ScheduledReportManager
│   ├── EmailDelivery
│   └── TemplateEngine
└── Database
    ├── restaurant_analytics_daily (materialized)
    ├── dish_analytics_daily
    ├── customer_analytics_monthly
    ├── operational_metrics_hourly
    └── benchmark_data_weekly

API Endpoints:
GET    /api/v1/restaurants/:id/analytics/revenue        - Revenue analytics
GET    /api/v1/restaurants/:id/analytics/orders          - Order analytics
GET    /api/v1/restaurants/:id/analytics/customers       - Customer insights
GET    /api/v1/restaurants/:id/analytics/menu            - Menu performance
GET    /api/v1/restaurants/:id/analytics/operations      - Operational metrics
GET    /api/v1/restaurants/:id/analytics/benchmark       - Competitive benchmark
GET    /api/v1/restaurants/:id/analytics/recommendations - AI recommendations
POST   /api/v1/restaurants/:id/analytics/reports         - Generate report
GET    /api/v1/restaurants/:id/analytics/reports/:reportId - Download report
POST   /api/v1/restaurants/:id/analytics/schedule-report  - Schedule reports
```

### Frontend Components (Restaurant App)
```
Analytics/
├── AnalyticsDashboard.tsx (overview with key metrics)
├── RevenueChart.tsx (line/bar charts)
├── OrderTrends.tsx (volume and timing)
├── CustomerInsights.tsx (segmentation, CLV)
├── MenuPerformance.tsx (dish-level analysis)
├── DishComboAnalysis.tsx (frequently ordered together)
├── OperationalMetrics.tsx (kitchen/delivery performance)
├── CompetitiveBenchmark.tsx (area comparison)
├── AIRecommendations.tsx (actionable suggestions)
├── ReportBuilder.tsx (custom report generation)
├── DateRangeSelector.tsx (reusable filter)
└── AnalyticsCard.tsx (reusable metric card)
```

### Acceptance Criteria
- [ ] Revenue analytics with daily/weekly/monthly views
- [ ] Order analytics with peak hour identification
- [ ] Customer segmentation (high-value, frequent, at-risk, churned)
- [ ] Menu performance with top/worst dishes
- [ ] AI-powered menu optimization suggestions
- [ ] Customer sentiment analysis using LLM
- [ ] PDF/CSV report generation
- [ ] Scheduled automated reports
- [ ] Competitive benchmarking
- [ ] Real-time analytics updates via Kafka
- [ ] Performance: dashboard load < 2 seconds
- [ ] 85%+ test coverage
- [ ] E2E: view dashboard → drill down → generate report → download

### SDLC Process
1. **Plan**: API design, database schema (materialized views), Kafka event design, UI wireframes
2. **Code**: Backend aggregators, query engines, AI insights, frontend dashboard, report generator
3. **Test**: Unit tests (aggregators, calculators), integration tests (API), E2E tests (dashboard flow)
4. **Fix**: Address test failures
5. **Code Review**: Architecture review, query performance review, data accuracy review
6. **Fix**: Address review findings
7. **Code Analysis**: Query performance profiling, aggregation efficiency, dependency check
8. **Fix**: Optimize slow queries, add missing indexes
9. **Security Analysis**: Data access authorization, restaurant data isolation, report access control
10. **Fix**: Address security findings

### Files to Create/Modify
**Backend:**
- `apps/gateway-api/src/analytics/analytics.module.ts`
- `apps/gateway-api/src/analytics/analytics.controller.ts`
- `apps/gateway-api/src/analytics/revenue-analytics.service.ts`
- `apps/gateway-api/src/analytics/order-analytics.service.ts`
- `apps/gateway-api/src/analytics/customer-analytics.service.ts`
- `apps/gateway-api/src/analytics/menu-analytics.service.ts`
- `apps/gateway-api/src/analytics/ai-insights.service.ts`
- `apps/gateway-api/src/analytics/report.service.ts`
- `apps/gateway-api/src/analytics/aggregator.service.ts`
- `apps/gateway-api/src/analytics/dto/*.ts`
- `apps/gateway-api/src/entities/analytics-daily.entity.ts`
- `apps/gateway-api/src/entities/dish-analytics.entity.ts`
- `apps/gateway-api/src/entities/customer-analytics.entity.ts`
- `apps/gateway-api/src/entities/operational-metrics.entity.ts`
- `packages/event-streaming/src/consumers/analytics-consumer.ts`

**Frontend:**
- `apps/restaurant-app/src/components/Analytics/*.tsx` (12 files)
- `apps/restaurant-app/src/services/analytics.service.ts`
- `apps/restaurant-app/src/contexts/AnalyticsContext.tsx`

**Tests:**
- `apps/gateway-api/src/analytics/__tests__/*.spec.ts`
- `apps/gateway-api/src/analytics/__tests__/*.e2e-spec.ts`
- `apps/restaurant-app/src/components/Analytics/__tests__/*.spec.tsx`
