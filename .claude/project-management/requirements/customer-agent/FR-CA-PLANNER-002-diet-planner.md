# FR-CA-PLANNER-002: Diet Planner

**ID**: `FR-CA-PLANNER-002`
**Created**: 2026-02-20
**Status**: 🟡 Pending
**Priority**: Medium
**Assigned To**: Customer Agent Team

---

## Description

Implement an AI-powered diet planning feature that helps users create personalized meal plans based on dietary goals, restrictions, and preferences. The system shall accept diet specifications (goals, calorie target, macros, restrictions), recommend suitable restaurants and dishes, track nutritional intake, and support recurring meal plans.

**Key Capabilities:**
- Accept dietary goals (weight loss, muscle gain, maintenance, specific diets)
- Track macros (protein, carbs, fats) and calories
- Filter dishes by dietary restrictions (keto, vegan, paleo, gluten-free, etc.)
- Recommend meal plans (daily/weekly)
- Track progress and adherence
- Support recurring orders for meal prep

---

## Acceptance Criteria

### Core Functionality
- [ ] Accept diet specifications (goals, calorie target, macro ratios, restrictions)
- [ ] Recommend dishes matching nutritional requirements
- [ ] Calculate daily/weekly meal plans
- [ ] Track calorie and macro intake
- [ ] Support dietary restrictions and allergies
- [ ] Enable recurring orders for consistency

### User Experience
- [ ] Conversational diet goal setting
- [ ] Visual nutritional breakdown (charts, progress bars)
- [ ] Meal plan calendar view
- [ ] Quick reorder from past meal plans
- [ ] Progress tracking and insights

### Integration
- [ ] Nutrition database integration (USDA, restaurant APIs)
- [ ] MCP integration for dish nutrition info
- [ ] LLM-powered meal recommendations
- [ ] Calendar integration for scheduling

---

## Technical Details

### Implementation Approach

**Diet Planning Workflow:**
```
1. Gather Diet Goals
   ├─ Primary goal (weight loss, muscle gain, maintenance)
   ├─ Calorie target (calculated or user-provided)
   ├─ Macro ratios (protein %, carbs %, fats %)
   ├─ Dietary restrictions (vegan, keto, paleo, etc.)
   ├─ Allergies and intolerances
   └─ Meal frequency (2, 3, 4, 5 meals/day)

2. Calculate Nutritional Requirements
   ├─ Basal Metabolic Rate (BMR)
   ├─ Total Daily Energy Expenditure (TDEE)
   ├─ Macro targets (grams)
   └─ Meal distribution

3. Recommend Dishes
   ├─ Filter by dietary restrictions
   ├─ Match nutritional requirements
   ├─ Balance meal types (breakfast, lunch, dinner, snacks)
   └─ Optimize for variety and user preferences

4. Create Meal Plan
   ├─ Daily meal schedule
   ├─ Weekly meal rotation
   ├─ Nutritional breakdown per meal
   └─ Total daily intake

5. Track Progress
   ├─ Log actual meals consumed
   ├─ Compare to plan
   ├─ Adjust recommendations based on adherence
   └─ Show progress toward goals
```

**Data Model:**
```typescript
interface DietPlan {
  id: string;
  userId: string;
  goal: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'performance';
  targets: {
    caloriesPerDay: number;
    proteinGrams: number;
    carbsGrams: number;
    fatsGrams: number;
  };
  dietaryRestrictions: string[];
  allergies: string[];
  mealFrequency: number; // Meals per day

  weeklyPlan: DailyMealPlan[];
  startDate: Date;
  endDate: Date;
  status: 'active' | 'paused' | 'completed';

  progress: {
    adherence: number; // Percentage
    avgCaloriesPerDay: number;
    weightChange?: number;
    lastUpdated: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}

interface DailyMealPlan {
  date: Date;
  meals: PlannedMeal[];
  totalNutrition: NutritionInfo;
}

interface PlannedMeal {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  restaurantId: string;
  restaurantName: string;
  dishId: string;
  dishName: string;
  servingSize: number;
  nutrition: NutritionInfo;
  isConsumed: boolean;
  consumedAt?: Date;
}

interface NutritionInfo {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fats: number; // grams
  fiber?: number; // grams
  sugar?: number; // grams
  sodium?: number; // mg
}
```

**Calorie Calculation (Mifflin-St Jeor Equation):**
```typescript
function calculateBMR(
  weight: number, // kg
  height: number, // cm
  age: number,
  gender: 'male' | 'female'
): number {
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
}

function calculateTDEE(
  bmr: number,
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
): number {
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
  };

  return bmr * activityMultipliers[activityLevel];
}

function calculateCalorieTarget(
  tdee: number,
  goal: 'weight_loss' | 'muscle_gain' | 'maintenance'
): number {
  const adjustments = {
    weight_loss: -500, // 500 calorie deficit
    muscle_gain: +300, // 300 calorie surplus
    maintenance: 0
  };

  return tdee + adjustments[goal];
}
```

**Macro Distribution:**
```typescript
function calculateMacros(
  calorieTarget: number,
  goal: 'weight_loss' | 'muscle_gain' | 'maintenance'
): { protein: number; carbs: number; fats: number } {
  // Macro ratios based on goal
  const macroRatios = {
    weight_loss: { protein: 0.35, carbs: 0.30, fats: 0.35 }, // High protein, moderate carb
    muscle_gain: { protein: 0.30, carbs: 0.45, fats: 0.25 }, // Moderate protein, high carb
    maintenance: { protein: 0.25, carbs: 0.45, fats: 0.30 }
  };

  const ratios = macroRatios[goal];

  return {
    protein: (calorieTarget * ratios.protein) / 4, // 4 cal/g
    carbs: (calorieTarget * ratios.carbs) / 4, // 4 cal/g
    fats: (calorieTarget * ratios.fats) / 9 // 9 cal/g
  };
}
```

### Dependencies
- **Depends on:**
  - FR-CA-SEARCH-002: Dish Search (filter by nutrition)
  - FR-MCP-PROVIDER-001: MCP Provider Configuration (nutrition data)
  - FR-LLM-001: LLM Router (meal recommendations)
  - Nutrition database (USDA FoodData Central or restaurant APIs)

- **Blocks:**
  - Advanced health tracking features

### Files Affected
- `/apps/gateway-api/src/services/DietPlannerService.ts` (new)
- `/apps/mobile-app/src/screens/DietPlannerScreen.tsx` (new)
- `/apps/mobile-app/src/components/DietPlanner/` (new directory)
- `/packages/nutrition-db/` (new package for nutrition data)
- `/services/mcp-adapter/src/nutrition/NutritionAdapter.ts` (new)

---

## Implementation Notes

### Progress Log
- 2026-02-20: Requirement created based on advanced feature analysis

### Design Decisions

**Nutrition Data Sources:**
1. **USDA FoodData Central** (free, comprehensive)
2. **Restaurant APIs** (when available via MCP)
3. **Manual entry** (for restaurants without nutrition data)

**Macro Ratios:**
- Based on evidence-based nutrition science
- Adjustable by user (custom ratios supported)
- Default ratios optimized for each goal type

### Challenges
- **Nutrition Data Accuracy:** Restaurant nutrition info often incomplete or outdated
- **User Adherence:** Hard to track actual consumption (rely on user honesty)
- **Variety:** Need sufficient dish variety to avoid meal plan monotony

### Decisions Made
- Start with calorie and macro tracking (simple, effective)
- Add micronutrients in later version (more complex)
- Support recurring orders for meal prep consistency

---

## Links

- Related Requirements:
  - [FR-CA-SEARCH-002: Dish Search](./CUSTOMER-REQ-002-restaurant-search.md)
  - [FR-LLM-001: LLM Router](../llm/search-requirements.md)

- Related Tasks:
  - `TASK-FRONTEND-016`: Build diet planner UI
  - `TASK-BACKEND-025`: Implement diet planning service
  - `TASK-BACKEND-026`: Nutrition database integration

---

**Last Updated**: 2026-02-20
**Updated By**: Claude (AI Agent - Requirement Analysis)
