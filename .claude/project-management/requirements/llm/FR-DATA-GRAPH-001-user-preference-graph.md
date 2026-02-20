# FR-DATA-GRAPH-001: User Preference Graph (Neo4j)

**ID**: `FR-DATA-GRAPH-001`
**Created**: 2026-02-20
**Status**: 🟡 Pending
**Priority**: High
**Assigned To**: Backend Team

---

## Description

Implement a graph database (Neo4j) to model user preferences as a hierarchical graph structure, enabling rich personalization and context enrichment for LLM prompts. The system shall learn user preferences from behavior, traverse the preference graph to provide recommendations, and continuously update preferences based on interactions.

**Key Capabilities:**
- Model user preferences as hierarchical graph (User → DayOfWeek → Hour → Category → Subcategory → Restaurant → Dish)
- Store preference scores, frequency, and recency for each node
- Traverse graph in <100ms for real-time context enrichment
- Update preference scores after each order/interaction
- Support complex queries (e.g., "What does user prefer on Friday evenings for Italian food?")

**Use Cases:**
- Personalized restaurant recommendations
- Context-aware dish suggestions
- Predictive ordering ("You usually order pizza on Friday nights")
- Preference-based filtering and ranking

---

## Acceptance Criteria

### Core Functionality
- [ ] Neo4j database deployed and accessible
- [ ] User preference graph schema implemented
- [ ] Graph creation on user registration
- [ ] Preference learning from user orders/interactions
- [ ] Real-time graph traversal for context loading (<100ms)
- [ ] Preference score calculation and updates

### Performance
- [ ] Graph traversal: <100ms (p95)
- [ ] Preference update: <50ms
- [ ] Query response time: <150ms
- [ ] Memory usage: <2GB per 10,000 users

### Integration
- [ ] LLM context enrichment integration
- [ ] Real-time preference updates on order completion
- [ ] Context compression for LLM token limits
- [ ] API endpoints for preference queries

---

## Technical Details

### Implementation Approach

**Graph Structure:**
```
(User)
  -[:PREFERS_ON]->(DayOfWeek: Monday, Tuesday, ...)
    -[:AT_HOUR]->(Hour: 08:00, 12:00, 18:00, 21:00, ...)
      -[:FOR_CATEGORY]->(Category: Italian, Chinese, Indian, ...)
        -[:IN_SUBCATEGORY]->(Subcategory: Pizza, Pasta, North Indian, ...)
          -[:AT_RESTAURANT]->(Restaurant)
            -[:DISH]->(Dish)
```

**Node Properties:**
```typescript
interface UserNode {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

interface PreferenceNode {
  id: string;
  name: string;
  score: number; // 0-100 (higher = more preferred)
  frequency: number; // Number of times ordered
  lastOrderedAt: Date;
  recency: number; // Days since last order (lower = more recent)
}

interface RestaurantNode extends PreferenceNode {
  restaurantId: string;
  rating: number;
  priceRange: number;
}

interface DishNode extends PreferenceNode {
  dishId: string;
  price: number;
  category: string;
  dietary: string[];
}
```

**Relationship Properties:**
```typescript
interface PreferenceRelationship {
  weight: number; // Strength of preference (0-1)
  count: number; // Number of times this path was taken
  lastUsed: Date;
}
```

**Cypher Queries:**

1. **Get User Preferences (Context Enrichment):**
```cypher
MATCH (u:User {id: $userId})
  -[r1:PREFERS_ON]->(dow:DayOfWeek {name: $dayOfWeek})
  -[r2:AT_HOUR]->(h:Hour)
  -[r3:FOR_CATEGORY]->(c:Category)
  -[r4:IN_SUBCATEGORY]->(sc:Subcategory)
  -[r5:AT_RESTAURANT]->(r:Restaurant)
  -[r6:DISH]->(d:Dish)
WHERE h.hour >= $currentHour - 1 AND h.hour <= $currentHour + 1
RETURN d.name, d.dishId, r.name AS restaurantName,
       d.score AS preferenceScore, d.frequency
ORDER BY d.score DESC, d.lastOrderedAt DESC
LIMIT 10
```

2. **Update Preference on Order:**
```cypher
MATCH (u:User {id: $userId})
MERGE (u)-[r1:PREFERS_ON]->(dow:DayOfWeek {name: $dayOfWeek})
  ON CREATE SET r1.weight = 0.5, r1.count = 1
  ON MATCH SET r1.weight = r1.weight + 0.1, r1.count = r1.count + 1
MERGE (dow)-[r2:AT_HOUR]->(h:Hour {hour: $hour})
  ON CREATE SET r2.weight = 0.5, r2.count = 1
  ON MATCH SET r2.weight = r2.weight + 0.1, r2.count = r2.count + 1
MERGE (h)-[r3:FOR_CATEGORY]->(c:Category {name: $category})
  ON CREATE SET r3.weight = 0.5, r3.count = 1
  ON MATCH SET r3.weight = r3.weight + 0.1, r3.count = r3.count + 1
MERGE (c)-[r4:IN_SUBCATEGORY]->(sc:Subcategory {name: $subcategory})
MERGE (sc)-[r5:AT_RESTAURANT]->(r:Restaurant {restaurantId: $restaurantId})
  ON CREATE SET r.score = 50, r.frequency = 1, r.lastOrderedAt = datetime()
  ON MATCH SET r.score = r.score + 5, r.frequency = r.frequency + 1,
               r.lastOrderedAt = datetime()
MERGE (r)-[r6:DISH]->(d:Dish {dishId: $dishId})
  ON CREATE SET d.score = 50, d.frequency = 1, d.lastOrderedAt = datetime()
  ON MATCH SET d.score = d.score + 10, d.frequency = d.frequency + 1,
               d.lastOrderedAt = datetime()
```

3. **Get Top Restaurants by Category:**
```cypher
MATCH (u:User {id: $userId})
  -[:PREFERS_ON]->(:DayOfWeek)
  -[:AT_HOUR]->(:Hour)
  -[:FOR_CATEGORY]->(c:Category {name: $category})
  -[:IN_SUBCATEGORY]->(:Subcategory)
  -[:AT_RESTAURANT]->(r:Restaurant)
RETURN r.name, r.restaurantId, r.score, r.frequency
ORDER BY r.score DESC, r.lastOrderedAt DESC
LIMIT 5
```

**Preference Score Calculation:**
```typescript
function calculatePreferenceScore(
  frequency: number,
  recencyDays: number,
  baseScore: number = 50
): number {
  // Decay score based on recency (exponential decay)
  const recencyFactor = Math.exp(-recencyDays / 30); // Half-life: 30 days

  // Frequency boost (logarithmic to avoid over-weighting)
  const frequencyBoost = Math.log10(frequency + 1) * 10;

  return Math.min(100, baseScore + frequencyBoost * recencyFactor);
}
```

### Dependencies
- **Depends on:**
  - FR-LLM-CONTEXT-001: Context Management (integration point)
  - TR-DB-NEO4J-001: Neo4j Infrastructure
  - FR-CA-ORDER-002: Order Operations (trigger preference updates)

- **Blocks:**
  - FR-LLM-CONTEXT-002: Preference Learning (uses this graph)
  - FR-CA-DETAIL-003: Recommendations (personalized suggestions)

### Files Affected
- `/packages/graph-db/src/PreferenceGraph.ts` (new)
- `/packages/graph-db/src/PreferenceService.ts` (new)
- `/packages/graph-db/src/queries/` (Cypher queries)
- `/services/mcp-adapter/src/context/ContextEnricher.ts` (integrate graph)
- `/apps/gateway-api/src/services/PersonalizationService.ts` (new)
- `/infrastructure/docker-compose.yml` (add Neo4j service)

---

## Implementation Notes

### Progress Log
- 2026-02-20: Requirement created based on system architecture analysis

### Graph Design Decisions

**Hierarchical Structure:**
- **Why:** Enables flexible queries at different granularity levels
- **Example:** "What does user prefer?" vs "What does user prefer on Friday at 8pm for Italian food?"

**Preference Scores:**
- **Range:** 0-100 (easier to interpret than 0-1)
- **Base Score:** 50 (neutral starting point)
- **Boost:** +10 per order for dishes, +5 for restaurants
- **Decay:** Exponential decay based on recency (half-life: 30 days)

**Graph vs. Relational DB:**
- **Graph Advantage:** Fast traversal of complex relationships
- **Graph Disadvantage:** Less mature ecosystem, steeper learning curve
- **Decision:** Use Neo4j for preference graph, PostgreSQL for transactional data

### Challenges
- **Cold Start Problem:** New users have no preference data
  - **Solution:** Use general recommendations + category-based defaults
- **Data Sparsity:** Not all paths in the graph will have data
  - **Solution:** Fall back to higher-level preferences (e.g., category if no dishes)
- **Real-Time Updates:** Preference updates must be fast
  - **Solution:** Async updates with eventual consistency (acceptable lag: <5 seconds)
- **Memory Management:** Large graphs can consume significant memory
  - **Solution:** Pagination, lazy loading, and regular pruning of old data

### Decisions Made
- Exponential decay for recency (30-day half-life)
- Logarithmic scaling for frequency (avoid over-weighting frequent orders)
- Async preference updates (eventual consistency)
- Graph pruning: Remove nodes with score <10 and last order >90 days ago

---

## Testing

### Unit Tests
- [ ] Preference score calculation tests
- [ ] Graph node creation tests
- [ ] Relationship update tests
- [ ] Cypher query syntax validation
- [ ] Decay function tests

### Integration Tests
- [ ] End-to-end preference learning (order → graph update)
- [ ] Context enrichment (query graph → return preferences)
- [ ] Multiple concurrent updates (race conditions)
- [ ] Graph traversal performance (<100ms)

### E2E Tests
- [ ] New user registration → empty graph creation
- [ ] User places order → preference graph updated
- [ ] User queries recommendations → preferences returned
- [ ] Preference decay over time (mock time progression)
- [ ] Cold start handling (new user recommendations)

### Performance Tests
- [ ] 1000 concurrent graph traversals under 100ms (p95)
- [ ] 1000 preference updates under 50ms (p95)
- [ ] Graph size scaling (10K, 100K, 1M users)
- [ ] Memory usage per user (<200KB)

---

## Example Scenarios

### Scenario 1: New User (Cold Start)
```typescript
// User registers
createUserPreferenceGraph(userId);

// User places first order: Pizza from Domino's on Friday at 8pm
updatePreferences({
  userId,
  dayOfWeek: 'Friday',
  hour: 20,
  category: 'Italian',
  subcategory: 'Pizza',
  restaurantId: 'dominos-123',
  dishId: 'margherita-456'
});

// Graph now has: User → Friday → 20:00 → Italian → Pizza → Domino's → Margherita
```

### Scenario 2: Returning User (Context Enrichment)
```typescript
// Current context: Friday, 8pm
const preferences = await getUserPreferences({
  userId,
  dayOfWeek: 'Friday',
  hour: 20
});

// Returns: [
//   { dish: 'Margherita Pizza', restaurant: 'Domino\'s', score: 85 },
//   { dish: 'Pepperoni Pizza', restaurant: 'Pizza Hut', score: 72 },
//   { dish: 'Pasta Alfredo', restaurant: 'Olive Garden', score: 68 }
// ]
```

### Scenario 3: Recommendation Query
```typescript
// User asks: "What should I order for dinner?"
const context = {
  userId,
  dayOfWeek: getCurrentDayOfWeek(),
  hour: getCurrentHour(),
  mealType: 'dinner'
};

const recommendations = await getTopRecommendations(context);

// LLM prompt enrichment:
// "The user typically orders Italian food on Friday evenings,
//  particularly Pizza from Domino's. Last order: Margherita Pizza (3 days ago)."
```

---

## Links

- Related Requirements:
  - [FR-LLM-CONTEXT-001: Context Management](../llm-orchestration/FR-LLM-CONTEXT-001-context-management.md)
  - [FR-LLM-CONTEXT-002: Preference Learning](../llm-orchestration/FR-LLM-CONTEXT-002-preference-learning.md)
  - [FR-CA-DETAIL-003: Recommendations](../customer-agent/FR-CA-DETAIL-003-recommendations.md)
  - [TR-DB-NEO4J-001: Neo4j Infrastructure](../technical-requirements.md#43-neo4j-graph-database)

- Related Tasks:
  - `TASK-BACKEND-018`: Setup Neo4j database
  - `TASK-BACKEND-019`: Implement preference graph schema
  - `TASK-BACKEND-020`: Build preference learning service
  - `TASK-BACKEND-021`: Integrate with LLM context enrichment

- Documentation:
  - [Neo4j Documentation](https://neo4j.com/docs/)
  - [Cypher Query Language](https://neo4j.com/docs/cypher-manual/current/)
  - [Graph Database Design Patterns](https://neo4j.com/developer/graph-db-vs-rdbms/)

- Pull Requests:
  - (To be created)

---

**Last Updated**: 2026-02-20
**Updated By**: Claude (AI Agent - Requirement Analysis)
