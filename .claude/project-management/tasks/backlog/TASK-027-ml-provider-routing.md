# TASK-027: ML-Based Provider Routing

**Status:** Backlog
**Priority:** P2 (Medium)
**Component:** MCP Aggregation Layer
**Assigned To:** Unassigned
**Estimated Effort:** 4 weeks
**Dependencies:** TASK-025, TASK-026 (Real provider integrations)

## Description

Implement machine learning model to intelligently route requests to the best provider based on historical performance, user preferences, and real-time metrics.

## Context

Currently, provider routing uses simple strategies:
1. Query all providers in parallel (search)
2. Route to specific provider based on restaurant ownership (orders)
3. Round-robin for load balancing

**Problem:** This doesn't account for:
- Provider performance variations (latency, availability)
- User preferences (some users prefer Swiggy over Zomato)
- Time-of-day patterns (Swiggy faster in evenings)
- Cost optimization (cheaper providers for non-critical requests)

## Requirements

- Intelligent routing based on historical data
- Real-time adaptation to provider performance
- User preference learning
- Cost optimization
- A/B testing support

## Implementation Checklist

### Phase 1: Data Collection (Week 1)

- [ ] Design metrics collection schema
- [ ] Collect provider performance metrics
  - [ ] Response time per provider per endpoint
  - [ ] Error rate per provider
  - [ ] Circuit breaker state transitions
  - [ ] Cost per request
- [ ] Collect user preference signals
  - [ ] Provider used for successful orders
  - [ ] Provider switched by user
  - [ ] Provider rating (implicit)
- [ ] Store metrics in TimescaleDB
- [ ] Create data pipeline (Kafka → TimescaleDB)

### Phase 2: Feature Engineering (Week 2)

- [ ] Define features for routing model
  - [ ] Provider avg response time (rolling 1h, 24h, 7d)
  - [ ] Provider error rate (rolling 1h, 24h)
  - [ ] Provider availability score
  - [ ] Time-of-day (hour, day of week)
  - [ ] User-provider affinity score
  - [ ] Request type (search, order, menu)
  - [ ] Cost per request
- [ ] Create feature extraction pipeline
- [ ] Build training dataset
- [ ] Data validation and cleaning

### Phase 3: Model Training (Week 2-3)

- [ ] Select model architecture
  - Option 1: Multi-armed bandit (contextual)
  - Option 2: Reinforcement learning (Q-learning)
  - Option 3: XGBoost classifier
- [ ] Train baseline model
- [ ] Evaluate model performance
  - Metric: Successful request rate
  - Metric: Average response time
  - Metric: Cost per request
  - Metric: User satisfaction
- [ ] Hyperparameter tuning
- [ ] Model validation with hold-out set

### Phase 4: Integration (Week 3-4)

- [ ] Create ML service (Python FastAPI)
- [ ] Implement model serving (TensorFlow Serving / TorchServe)
- [ ] Add routing logic to ProviderOrchestrator
- [ ] Implement fallback to rule-based routing
- [ ] Add A/B testing framework
- [ ] Create model monitoring dashboard

### Phase 5: Testing & Deployment (Week 4)

- [ ] Unit tests for routing logic
- [ ] Integration tests with mock model
- [ ] Shadow deployment (log predictions, don't use)
- [ ] A/B test: 10% traffic to ML routing
- [ ] Evaluate metrics: response time, error rate, cost
- [ ] Gradual rollout: 10% → 50% → 100%
- [ ] Monitor for degradation
- [ ] Full production deployment

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ProviderOrchestrator                      │
│  ┌────────────────────────────────────────────────────┐     │
│  │              ML Router Service                      │     │
│  │  ┌──────────┐   ┌──────────┐   ┌──────────────┐  │     │
│  │  │ Feature  │ → │  Model   │ → │  Decision    │  │     │
│  │  │ Extractor│   │ Inference│   │  Engine      │  │     │
│  │  └──────────┘   └──────────┘   └──────────────┘  │     │
│  └────────────────────────────────────────────────────┘     │
│                              ↓                               │
│     ┌────────────────────────┼────────────────────────┐    │
│     ↓                        ↓                        ↓     │
│  Internal Provider     Swiggy Provider        Zomato Provider│
└─────────────────────────────────────────────────────────────┘
```

## Model Architecture

**Approach:** Contextual Multi-Armed Bandit

```python
class ProviderRouter:
    def __init__(self):
        self.providers = ['internal', 'swiggy', 'zomato']
        self.model = ContextualBandit(
            n_arms=len(self.providers),
            context_dim=15,  # Feature dimension
            epsilon=0.1      # Exploration rate
        )

    def select_provider(self, context: np.ndarray) -> str:
        # context: [hour, day, user_affinity, provider_latency, ...]
        arm_idx = self.model.select_arm(context)
        return self.providers[arm_idx]

    def update(self, context: np.ndarray, arm: int, reward: float):
        # reward: 1.0 if success, 0.0 if failure
        # penalty: -0.5 * normalized_latency
        self.model.update(context, arm, reward)
```

## Features (15 dimensions)

1. **hour_of_day** (0-23)
2. **day_of_week** (0-6)
3. **provider_1h_latency** (avg latency last 1h)
4. **provider_24h_latency** (avg latency last 24h)
5. **provider_error_rate** (errors/requests last 1h)
6. **provider_availability** (uptime % last 24h)
7. **user_provider_affinity** (historical preference 0-1)
8. **request_type** (0: search, 1: order, 2: menu)
9. **is_peak_hours** (boolean)
10. **provider_cost** (normalized cost per request)
11. **circuit_breaker_state** (0: closed, 1: open)
12. **user_loyalty_segment** (0: new, 1: casual, 2: loyal)
13. **order_value** (normalized)
14. **location_tier** (0: metro, 1: tier-2, 2: tier-3)
15. **is_first_order** (boolean)

## Reward Function

```python
def calculate_reward(
    success: bool,
    latency_ms: float,
    cost: float,
    user_satisfaction: float
) -> float:
    if not success:
        return -1.0  # Failure penalty

    # Success with quality weighting
    reward = 1.0
    reward -= 0.3 * (latency_ms / 5000)  # Latency penalty (0-0.3)
    reward -= 0.1 * (cost / 10)          # Cost penalty (0-0.1)
    reward += 0.2 * user_satisfaction    # Satisfaction bonus (0-0.2)

    return max(-1.0, min(1.0, reward))   # Clip to [-1, 1]
```

## Metrics to Track

### Model Performance

- **Successful Request Rate:** % of requests successfully completed
- **Average Response Time:** p50, p95, p99 across all providers
- **Cost per Request:** Average cost across all providers
- **User Satisfaction:** Implicit (order completion) + Explicit (ratings)

### Business Metrics

- **Revenue Impact:** Revenue per user (before/after ML routing)
- **User Retention:** 7-day, 30-day retention
- **Order Frequency:** Orders per user per week

### A/B Testing

- **Control Group:** Rule-based routing
- **Treatment Group:** ML routing
- **Sample Size:** 10,000 users per group
- **Duration:** 2 weeks
- **Success Metric:** Average response time < Control by >10%

## Risks

- **High:** Model may perform worse than rule-based routing initially
- **Medium:** Cold start problem for new users/providers
- **Medium:** Model drift over time
- **Low:** Increased latency due to ML inference

## Mitigation

- Shadow deployment to validate before production
- Fallback to rule-based routing if model confidence low
- Continuous model retraining (daily)
- Feature importance analysis to identify drift
- Low-latency model inference (<10ms)

## Acceptance Criteria

- [ ] Model deployed and serving predictions
- [ ] A/B test shows >10% improvement in response time
- [ ] No degradation in error rate
- [ ] Cost per request reduced by >5%
- [ ] Model monitoring dashboard operational
- [ ] Automated retraining pipeline working
- [ ] Documentation complete

## Future Enhancements

- Deep reinforcement learning (DQN, PPO)
- Personalized routing per user
- Multi-objective optimization (latency + cost + satisfaction)
- AutoML for model selection
- Real-time model updates (online learning)
