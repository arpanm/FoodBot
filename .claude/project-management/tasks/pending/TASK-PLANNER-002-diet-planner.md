# TASK-PLANNER-002: Diet Planner Feature - Full Production Implementation

**Created:** 2026-02-23
**Status:** Pending
**Priority:** P2 (Medium)
**Estimated Effort:** 25 days
**Component:** Customer Agent / Gateway API / Workflows
**Depends On:** TASK-DB-001, TASK-MCP-004, TASK-GRAPH-001
**Blocks:** Health-goal ordering, scheduled recurring orders
**Related Requirements:** FR-CA-PLANNER-002

---

## Overview

Implement a comprehensive AI-powered diet planner that creates personalized weekly meal plans (breakfast, lunch, snacks, dinner) based on health goals, dietary preferences, calorie targets, and food availability. Users can view calendar-based plans, skip/edit individual meals or entire days, set different delivery addresses per meal, and auto-schedule order placement for each meal at the right time.

---

## Requirements

### Functional Requirements

1. **Health Profile Setup**
   - Weight (current and target), height, age, gender
   - Activity level (sedentary, moderate, active, very active)
   - Health goals (weight loss, weight gain, maintenance, muscle building, general wellness)
   - Medical conditions (diabetes, hypertension, cholesterol, thyroid)
   - Allergies and intolerances
   - Dietary preference (veg, non-veg, vegan, eggetarian, jain, keto, paleo)
   - Calorie target (auto-calculated or manual override)
   - Macronutrient split (auto or custom: protein/carb/fat ratio)
   - Meal frequency (3 meals, 4 meals, 5 meals, custom)
   - Budget per day/week

2. **AI Meal Plan Generation**
   - Generate 7-day meal plan based on profile
   - Calorie distribution across meals (25% breakfast, 35% lunch, 10% snack, 30% dinner)
   - Macronutrient balancing per meal
   - Variety: no repeat dish in 3 days
   - Restaurant variety: source from 3+ restaurants per week
   - Price optimization within daily budget
   - Seasonal ingredient awareness
   - Cuisine rotation based on preferences
   - LLM-powered nutritional reasoning and suggestions
   - Integration with user preference graph (Neo4j)

3. **Calendar UI**
   - Weekly calendar view with all meals
   - Each meal card: dish image, name, restaurant, calories, macros, price
   - Color-coded by meal type (breakfast=yellow, lunch=green, snack=orange, dinner=blue)
   - Day summary: total calories, macros, cost
   - Week summary: average calories, total cost, macro balance
   - Drag-drop to move meals between slots
   - Swipe to skip a meal
   - Tap to edit/replace a meal

4. **Meal Management**
   - Skip individual meal (with calorie redistribution option)
   - Skip entire day
   - Skip meal type across all days (e.g., skip all snacks)
   - Replace meal with alternatives (3 AI suggestions)
   - Custom dish search and replacement
   - Copy meal from one day to another
   - Lock meals (prevent AI from changing on regeneration)
   - Add notes per meal (special instructions)

5. **Address Management**
   - Different delivery address per meal type
   - Default address per meal (e.g., office for lunch, home for dinner)
   - Address schedule (Mon-Fri office lunch, Sat-Sun home lunch)
   - Address validation and geocoding
   - Delivery feasibility check per address per restaurant

6. **Order Scheduling**
   - Auto-schedule orders based on meal times
   - Order placement timing: T-60min for breakfast, T-45min for lunch/dinner
   - Batch ordering (combine same-restaurant meals)
   - Weekly auto-renewal with confirmation
   - Pause plan (1 day, 1 week, custom)
   - Resume plan
   - Plan modification (change any meal up to T-2h)

7. **Nutrition Tracking**
   - Daily calorie intake tracking
   - Macro tracking (protein, carbs, fats)
   - Weekly nutrition report
   - Progress toward health goals
   - Streak tracking (days following plan)
   - Cheat meal tracking
   - Integration with health apps (future: Apple Health, Google Fit)

8. **Plan Templates & History**
   - Save current plan as template
   - Load from templates
   - AI-generated templates: "Weight Loss 1500cal", "Muscle Building 2500cal"
   - Plan history with nutrition analytics
   - Favorite meals library

### Architecture

```
Diet Planner Flow:
Health Profile → LLM (meal plan generation) → Calendar Display
  → User Edits → Recalculate Nutrition → Confirm Week
  → Schedule Orders → Daily Temporal Workflows → Auto-Place Orders

Components:
├── DietPlannerService
│   ├── HealthProfileManager
│   ├── CalorieCalculator (Harris-Benedict / Mifflin-St Jeor)
│   ├── MacroCalculator
│   └── GoalTracker
├── MealPlanGenerator
│   ├── LLMMealPlanner (prompt + preference graph)
│   ├── NutritionBalancer
│   ├── VarietyEnforcer
│   ├── BudgetOptimizer
│   └── AvailabilityChecker
├── CalendarService
│   ├── WeeklyPlanManager
│   ├── MealSlotManager
│   ├── SkipHandler
│   ├── ReplaceHandler
│   └── LockManager
├── AddressScheduleService
│   ├── MealAddressMapper
│   ├── DeliveryFeasibilityChecker
│   └── AddressScheduleOptimizer
├── OrderSchedulerService
│   ├── MealOrderTimingCalculator
│   ├── BatchOrderOptimizer
│   ├── WeeklyAutoRenewal
│   ├── PlanPauseResumeManager
│   └── TemporalDietScheduler
├── NutritionTrackingService
│   ├── IntakeTracker
│   ├── MacroAnalyzer
│   ├── WeeklyReportGenerator
│   ├── StreakTracker
│   └── ProgressCalculator
└── Database Tables
    ├── diet_plans
    ├── diet_plan_meals (per day per meal_type)
    ├── health_profiles
    ├── nutrition_logs
    ├── meal_address_schedules
    └── diet_templates

API Endpoints:
POST   /api/v1/diet-plans                    - Create diet plan
GET    /api/v1/diet-plans                    - List user's plans
GET    /api/v1/diet-plans/:id               - Get plan with calendar
PUT    /api/v1/diet-plans/:id               - Update plan settings
DELETE /api/v1/diet-plans/:id               - Delete plan
POST   /api/v1/diet-plans/:id/generate      - Generate/regenerate meals
PUT    /api/v1/diet-plans/:id/meals/:mealId - Edit specific meal
POST   /api/v1/diet-plans/:id/meals/:mealId/skip - Skip meal
POST   /api/v1/diet-plans/:id/meals/:mealId/replace - Get replacements
POST   /api/v1/diet-plans/:id/confirm       - Confirm and schedule
POST   /api/v1/diet-plans/:id/pause         - Pause plan
POST   /api/v1/diet-plans/:id/resume        - Resume plan
GET    /api/v1/diet-plans/:id/nutrition      - Nutrition report
POST   /api/v1/health-profiles              - Create health profile
GET    /api/v1/health-profiles              - Get user health profile
PUT    /api/v1/health-profiles              - Update health profile

Temporal Workflows:
├── dietDailyScheduler.workflow.ts (runs daily per user)
│   ├── getMealsForToday
│   ├── validateAvailability
│   ├── placeBreakfastOrder (T-60min)
│   ├── placeLunchOrder (T-45min)
│   ├── placeSnackOrder (T-30min)
│   ├── placeDinnerOrder (T-45min)
│   └── updateNutritionLog
└── dietWeeklyRenewal.workflow.ts (runs weekly)
    ├── checkPlanActive
    ├── generateNextWeekMeals
    ├── notifyUserForConfirmation
    └── scheduleIfAutoConfirmed
```

### Frontend Components
```
DietPlanner/
├── HealthProfileSetup.tsx (wizard)
├── WeeklyCalendar.tsx (main calendar view)
├── MealCard.tsx (individual meal display)
├── DaySummary.tsx (daily totals)
├── WeekSummary.tsx (weekly totals)
├── MealEditor.tsx (edit/replace modal)
├── MealReplacements.tsx (AI suggestion cards)
├── NutritionDashboard.tsx (tracking charts)
├── AddressSchedule.tsx (per-meal address config)
├── PlanControls.tsx (pause, resume, regenerate)
├── TemplateSelector.tsx (template browser)
└── ProgressTracker.tsx (health goal progress)
```

### Acceptance Criteria
- [ ] Health profile setup with calorie auto-calculation
- [ ] 7-day meal plan generation via LLM
- [ ] Calendar UI with all meal types displayed
- [ ] Calorie and macro balancing per meal and per day
- [ ] Skip individual meals, days, or meal types
- [ ] Replace meals with AI suggestions
- [ ] Drag-drop meal rearrangement
- [ ] Different address per meal type with schedule
- [ ] Auto order scheduling with correct timing
- [ ] Batch ordering for same-restaurant meals
- [ ] Weekly auto-renewal with user confirmation
- [ ] Pause/resume plan functionality
- [ ] Nutrition tracking dashboard
- [ ] Plan templates (save/load)
- [ ] Performance: plan generation < 15 seconds
- [ ] 85%+ test coverage
- [ ] E2E: setup profile → generate plan → edit → confirm → track

### SDLC Process
1. **Plan**: API design, database schema, LLM prompt engineering, UI wireframes
2. **Code**: Backend services, frontend components, Temporal workflows, LLM integration
3. **Test**: Unit tests (services), integration tests (API), E2E tests (full flow)
4. **Fix**: Address test failures
5. **Code Review**: Architecture review, LLM prompt review, security review
6. **Fix**: Address review findings
7. **Code Analysis**: Complexity analysis, performance profiling, dependency check
8. **Fix**: Optimize hot paths
9. **Security Analysis**: Input validation, authorization, data access patterns
10. **Fix**: Address security findings

### Files to Create/Modify
**Backend:**
- `apps/gateway-api/src/diet-planner/diet-planner.module.ts`
- `apps/gateway-api/src/diet-planner/diet-planner.controller.ts`
- `apps/gateway-api/src/diet-planner/diet-planner.service.ts`
- `apps/gateway-api/src/diet-planner/meal-plan-generator.service.ts`
- `apps/gateway-api/src/diet-planner/nutrition-tracker.service.ts`
- `apps/gateway-api/src/diet-planner/calorie-calculator.service.ts`
- `apps/gateway-api/src/diet-planner/order-scheduler.service.ts`
- `apps/gateway-api/src/diet-planner/dto/*.ts`
- `apps/gateway-api/src/entities/diet-plan.entity.ts`
- `apps/gateway-api/src/entities/diet-plan-meal.entity.ts`
- `apps/gateway-api/src/entities/health-profile.entity.ts`
- `packages/workflows/src/workflows/dietDailyScheduler.workflow.ts`
- `packages/workflows/src/workflows/dietWeeklyRenewal.workflow.ts`
- `packages/workflows/src/activities/diet-activities.ts`

**Frontend:**
- `apps/customer-app/src/components/DietPlanner/*.tsx` (12 files)
- `apps/customer-app/src/services/diet-planner.service.ts`
- `apps/customer-app/src/store/dietPlannerSlice.ts`

**Tests:**
- `apps/gateway-api/src/diet-planner/__tests__/*.spec.ts`
- `apps/gateway-api/src/diet-planner/__tests__/*.e2e-spec.ts`
- `apps/customer-app/src/components/DietPlanner/__tests__/*.spec.tsx`
