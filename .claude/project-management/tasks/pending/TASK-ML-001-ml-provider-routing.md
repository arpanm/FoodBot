# TASK-ML-001: ML-Based Provider Routing & Intelligence

**Created:** 2026-02-23
**Status:** Pending
**Priority:** P3 (Low)
**Estimated Effort:** 14 days
**Component:** MCP Adapter / ML / Analytics
**Depends On:** TASK-PROVIDER-001 (real providers), TASK-GRAPH-001 (preference data)
**Blocks:** Optimized provider selection, cost reduction
**Related Requirements:** FR-MCP-PROVIDER-001

---

## Overview

Implement ML-based intelligent provider routing that dynamically selects the best food delivery provider (Internal, Swiggy, Zomato, ONDC) for each request based on historical data, user preferences, provider performance, pricing, delivery time predictions, and availability patterns. Includes training pipeline, real-time inference, A/B testing, and continuous model improvement.

---

## Requirements

### Functional Requirements

1. **Feature Engineering**
   - User features: location, order history, provider preferences, time of day, day of week
   - Restaurant features: provider availability, rating per provider, delivery time per provider, price per provider
   - Provider features: current latency, error rate, availability, capacity, promotion availability
   - Context features: weather, holidays, events, peak hours
   - Historical features: past success rate per provider per restaurant, average delivery time, cancellation rate

2. **Routing Models**
   - **Provider Selection Model** (multi-class classification)
     - Input: user + restaurant + context features
     - Output: probability per provider (best provider selection)
     - Algorithm: gradient boosted trees (XGBoost/LightGBM) or neural network
     - Training: historical order data (provider → outcome)
     - Metrics: accuracy, precision, recall per provider

   - **Delivery Time Prediction** (regression)
     - Input: restaurant, time, weather, provider
     - Output: estimated delivery time in minutes
     - Algorithm: gradient boosted regression
     - Training: historical delivery data
     - Metrics: MAE, RMSE, p90 error

   - **Price Optimization** (ranking)
     - Input: same dish across providers
     - Output: ranked by effective price (base + delivery + discounts)
     - Include: coupon/promotion availability prediction
     - Algorithm: learning-to-rank

   - **Availability Prediction** (binary classification)
     - Input: restaurant, time, day
     - Output: probability of being available on each provider
     - Training: historical availability data
     - Useful for pre-emptive provider selection

3. **Training Pipeline**
   - Data collection from order events (Kafka consumer)
   - Feature store (Redis for real-time, PostgreSQL for batch)
   - Training schedule: daily batch retraining
   - Model versioning and artifact storage
   - Hyperparameter tuning (Optuna)
   - Cross-validation
   - Model evaluation and comparison
   - Automated model deployment (champion/challenger)

4. **Real-Time Inference**
   - Model serving via REST API (FastAPI or Node.js with ONNX Runtime)
   - Feature lookup from feature store (< 5ms)
   - Model inference (< 10ms)
   - Ensemble scoring (combine models)
   - Confidence threshold (fallback to rules if confidence < 0.6)
   - Request caching for repeated queries
   - Batch prediction for bulk operations

5. **A/B Testing Framework**
   - Traffic splitting (e.g., 80% ML model, 20% rule-based)
   - Metric tracking per variant (success rate, delivery time, cost)
   - Statistical significance testing
   - Auto-promotion of winning variant
   - Gradual rollout (1% → 5% → 25% → 50% → 100%)
   - Emergency rollback capability

6. **Continuous Improvement**
   - Model monitoring (data drift, prediction drift, performance drift)
   - Automated retraining triggers
   - Feedback loop (order outcome → training data)
   - Feature importance tracking
   - Model explainability (SHAP values)
   - Regular model audits (bias detection)

### Architecture

```
ML Routing Architecture:
Request → Feature Extraction → Model Inference → Provider Selection
                                     ↓
                              Confidence Check
                              ↓ High          ↓ Low
                         Use ML Result    Use Rule-Based

Components:
├── FeatureService
│   ├── UserFeatureExtractor
│   ├── RestaurantFeatureExtractor
│   ├── ProviderFeatureExtractor
│   ├── ContextFeatureExtractor
│   └── FeatureStore (Redis + PostgreSQL)
├── ModelService
│   ├── ProviderSelectionModel
│   ├── DeliveryTimePredictionModel
│   ├── PriceOptimizationModel
│   ├── AvailabilityPredictionModel
│   └── EnsembleScorer
├── TrainingPipeline
│   ├── DataCollector (Kafka consumer)
│   ├── FeatureEngineer
│   ├── ModelTrainer (XGBoost/LightGBM)
│   ├── HyperparamTuner (Optuna)
│   ├── ModelEvaluator
│   └── ModelDeployer
├── InferenceService
│   ├── ONNXRuntime (model execution)
│   ├── FeatureLookup
│   ├── CachingLayer
│   └── FallbackHandler
├── ABTestService
│   ├── TrafficSplitter
│   ├── MetricTracker
│   ├── StatisticalTester
│   └── RolloutManager
└── MonitoringService
    ├── DriftDetector
    ├── PerformanceMonitor
    ├── ExplainabilityEngine (SHAP)
    └── BiasAuditor
```

### Acceptance Criteria
- [ ] Feature engineering pipeline extracting 50+ features
- [ ] Provider selection model with > 80% accuracy
- [ ] Delivery time prediction with < 5 min MAE
- [ ] Price optimization ranking working
- [ ] Daily batch retraining pipeline
- [ ] Real-time inference < 15ms p95
- [ ] A/B testing framework with traffic splitting
- [ ] Model monitoring (drift detection)
- [ ] Feature store (Redis real-time + PostgreSQL batch)
- [ ] ONNX Runtime model serving
- [ ] Confidence-based fallback to rules
- [ ] Model explainability (SHAP values)
- [ ] Gradual rollout support
- [ ] 85%+ test coverage
- [ ] Performance: full routing decision < 20ms

---

## SDLC Phases

### Phase 1: Design & Data Modeling (Days 1-2)
- Define feature schema (50+ features)
- Design feature store schema (Redis + PostgreSQL)
- Select ML frameworks (XGBoost/LightGBM, ONNX Runtime)
- Design training pipeline architecture
- Architecture review

### Phase 2: Feature Engineering (Days 3-5)
- User feature extractor
- Restaurant feature extractor
- Provider feature extractor (latency, error rate, capacity)
- Context feature extractor (weather, holidays, peak hours)
- Historical feature computation
- Feature store implementation (Redis for real-time, PostgreSQL for batch)
- Feature validation and data quality checks

### Phase 3: Model Training Pipeline (Days 6-8)
- Data collector (Kafka consumer for order events)
- Feature engineering pipeline (batch)
- Provider selection model training (XGBoost/LightGBM)
- Delivery time prediction model training
- Price optimization ranking model
- Availability prediction model
- Hyperparameter tuning (Optuna)
- Cross-validation and evaluation
- Model versioning and artifact storage

### Phase 4: Inference Service (Days 9-10)
- ONNX model export from trained models
- ONNX Runtime inference engine (Node.js or FastAPI)
- Feature lookup service (< 5ms)
- Ensemble scorer (combine model outputs)
- Confidence threshold with rule-based fallback
- Request caching layer
- Batch prediction endpoint

### Phase 5: A/B Testing & Rollout (Days 11-12)
- Traffic splitter (hash-based consistent splitting)
- Metric tracker per variant
- Statistical significance testing (chi-squared, t-test)
- Auto-promotion logic
- Gradual rollout controller (1% → 5% → 25% → 50% → 100%)
- Emergency rollback mechanism
- Dashboard for A/B test results

### Phase 6: Monitoring & Testing (Days 13-14)
- Data drift detector (feature distribution monitoring)
- Prediction drift detector (output distribution monitoring)
- Performance monitor (accuracy, latency, error rate)
- Model explainability (SHAP value computation)
- Bias auditor
- Automated retraining triggers
- Unit tests for all components
- Integration tests (feature store → inference → routing)
- Performance benchmarks

---

## Files to Create/Modify

**ML Service:**
- `services/ml-routing/src/features/user-features.ts`
- `services/ml-routing/src/features/restaurant-features.ts`
- `services/ml-routing/src/features/provider-features.ts`
- `services/ml-routing/src/features/context-features.ts`
- `services/ml-routing/src/features/feature-store.ts`
- `services/ml-routing/src/features/feature-validator.ts`
- `services/ml-routing/src/models/provider-selection.ts`
- `services/ml-routing/src/models/delivery-time.ts`
- `services/ml-routing/src/models/price-optimization.ts`
- `services/ml-routing/src/models/availability.ts`
- `services/ml-routing/src/models/ensemble-scorer.ts`
- `services/ml-routing/src/inference/onnx-runtime.ts`
- `services/ml-routing/src/inference/feature-lookup.ts`
- `services/ml-routing/src/inference/caching-layer.ts`
- `services/ml-routing/src/inference/fallback-handler.ts`
- `services/ml-routing/src/training/data-collector.ts`
- `services/ml-routing/src/training/feature-engineer.ts`
- `services/ml-routing/src/training/trainer.ts`
- `services/ml-routing/src/training/hyperparam-tuner.ts`
- `services/ml-routing/src/training/evaluator.ts`
- `services/ml-routing/src/training/model-deployer.ts`
- `services/ml-routing/src/ab-testing/traffic-splitter.ts`
- `services/ml-routing/src/ab-testing/metric-tracker.ts`
- `services/ml-routing/src/ab-testing/statistical-tester.ts`
- `services/ml-routing/src/ab-testing/rollout-manager.ts`
- `services/ml-routing/src/monitoring/drift-detector.ts`
- `services/ml-routing/src/monitoring/performance-monitor.ts`
- `services/ml-routing/src/monitoring/explainability.ts`
- `services/ml-routing/src/monitoring/bias-auditor.ts`
- `services/ml-routing/Dockerfile`
- `services/ml-routing/package.json`
- `services/ml-routing/tsconfig.json`

**Integration:**
- `services/mcp-adapter/src/routing/ml-router.ts` (integrate with existing provider router)
- `services/mcp-adapter/src/routing/routing-strategy.ts` (extend with ML strategy)

**Tests:**
- `services/ml-routing/src/__tests__/features/user-features.spec.ts`
- `services/ml-routing/src/__tests__/features/restaurant-features.spec.ts`
- `services/ml-routing/src/__tests__/features/provider-features.spec.ts`
- `services/ml-routing/src/__tests__/features/feature-store.spec.ts`
- `services/ml-routing/src/__tests__/models/provider-selection.spec.ts`
- `services/ml-routing/src/__tests__/models/delivery-time.spec.ts`
- `services/ml-routing/src/__tests__/models/price-optimization.spec.ts`
- `services/ml-routing/src/__tests__/models/ensemble-scorer.spec.ts`
- `services/ml-routing/src/__tests__/inference/onnx-runtime.spec.ts`
- `services/ml-routing/src/__tests__/inference/feature-lookup.spec.ts`
- `services/ml-routing/src/__tests__/ab-testing/traffic-splitter.spec.ts`
- `services/ml-routing/src/__tests__/ab-testing/metric-tracker.spec.ts`
- `services/ml-routing/src/__tests__/monitoring/drift-detector.spec.ts`
- `services/ml-routing/src/__tests__/monitoring/explainability.spec.ts`
- `services/ml-routing/src/__tests__/integration/ml-routing.integration.spec.ts`
