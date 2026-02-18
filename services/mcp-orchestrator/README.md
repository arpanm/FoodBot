# MCP Orchestrator Service

> **Spring Boot microservice for orchestrating multiple Model Context Protocol (MCP) providers**

## Overview

The MCP Orchestrator is a critical component of the FoodBot platform that aggregates restaurant and dish data from multiple providers (Mock, Swiggy, Zomato), provides full-text search capabilities, and implements enterprise-grade resilience patterns.

## Key Features

- **Multi-Provider Orchestration**: Routes requests to Mock, Swiggy, or Zomato MCP providers with automatic failover
- **Full-Text Search**: Elasticsearch-powered search with sub-500ms response times
- **Smart Caching**: Redis-based caching with 60%+ hit rate target
- **Real-Time Indexing**: Kafka-based event-driven indexing for instant updates
- **Resilience Patterns**: Circuit breakers, rate limiters, bulkheads, and retry mechanisms
- **Comprehensive Monitoring**: Prometheus metrics, health checks, and distributed tracing

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Spring Boot | 3.2.2 |
| Language | Java | 17 |
| Search Engine | Elasticsearch | 8.12.0 |
| Cache | Redis | 7.x |
| Message Queue | Kafka | 3.x |
| Resilience | Resilience4j | 2.2.0 |
| HTTP Client | WebFlux WebClient | 6.x |
| Serialization | Jackson | 2.16.1 |
| Build Tool | Maven | 3.9+ |
| Testing | JUnit 5 + Mockito | 5.10+ |

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    API Gateway                           │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│              MCP Orchestrator Service                    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  Provider   │  │   Result    │  │   Search    │    │
│  │   Router    │──│ Aggregator  │──│   Service   │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│         │                                  │            │
│         ▼                                  ▼            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Mock MCP  │  │ Swiggy MCP  │  │ Zomato MCP  │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                          │
└────────┬─────────────────┬─────────────────┬────────────┘
         │                 │                 │
         ▼                 ▼                 ▼
    Elasticsearch        Redis            Kafka
```

## Quick Start

### Prerequisites

- Java 17+
- Maven 3.9+
- Docker & Docker Compose (for dependencies)

### Installation

1. **Clone the repository**:
```bash
git clone https://github.com/foodbot/foodbot.git
cd foodbot/services/mcp-orchestrator
```

2. **Start dependencies**:
```bash
docker-compose up -d elasticsearch redis kafka
```

3. **Build the project**:
```bash
mvn clean install
```

4. **Run the service**:
```bash
mvn spring-boot:run
```

The service will start on `http://localhost:8081/mcp/v1`

### Verify Installation

```bash
# Health check
curl http://localhost:8081/mcp/v1/actuator/health

# Swagger UI
open http://localhost:8081/mcp/v1/swagger-ui.html

# Search restaurants
curl "http://localhost:8081/mcp/v1/restaurants/search?query=pizza"
```

## API Endpoints

### Restaurant Search

```bash
GET /restaurants/search
```

**Parameters**:
- `query` (optional): Search query (e.g., "pizza", "Italian")
- `cuisine` (optional): Filter by cuisine type
- `minRating` (optional): Minimum rating (0-5)
- `priceRange` (optional): Price range (1-4)
- `lat`, `lon`, `radius` (optional): Geo-spatial search
- `page`, `pageSize` (optional): Pagination

**Example**:
```bash
curl "http://localhost:8081/mcp/v1/restaurants/search?query=pizza&minRating=4.0&page=1&pageSize=20"
```

### Dish Search

```bash
GET /restaurants/search/dishes
```

**Parameters**:
- `query` (optional): Search query
- `category` (optional): Dish category (appetizer, main, dessert)
- `dietaryTags` (optional): Dietary preferences (vegetarian, vegan, gluten-free)
- `maxPrice` (optional): Maximum price
- `page`, `pageSize` (optional): Pagination

### Restaurant Details

```bash
GET /restaurants/{id}
```

**Example**:
```bash
curl http://localhost:8081/mcp/v1/restaurants/rest-001
```

### Restaurant Menu

```bash
GET /restaurants/{id}/menu
```

### Dish Details

```bash
GET /dishes/{id}
```

### Available Filters

```bash
GET /filters
```

Returns all available filters (cuisines, price ranges, dietary tags) based on current data.

## Configuration

### Application Properties

Key configuration properties in `application.yml`:

```yaml
# MCP Provider Configuration
mcp:
  providers:
    mock:
      enabled: true
      base-url: http://localhost:3010
      timeout: 5000ms
    swiggy:
      enabled: false
      base-url: https://api.swiggy.com/mcp
      api-key: ${SWIGGY_API_KEY}
    zomato:
      enabled: false
      base-url: https://api.zomato.com/mcp
      api-key: ${ZOMATO_API_KEY}

# Resilience Configuration
resilience4j:
  circuitbreaker:
    instances:
      mock-mcp:
        slidingWindowSize: 10
        failureRateThreshold: 50
        waitDurationInOpenState: 60s
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_HOST` | Redis host | localhost |
| `REDIS_PORT` | Redis port | 6379 |
| `ELASTICSEARCH_URIS` | Elasticsearch URIs | http://localhost:9200 |
| `KAFKA_BOOTSTRAP_SERVERS` | Kafka servers | localhost:9092 |
| `SWIGGY_API_KEY` | Swiggy MCP API key | - |
| `ZOMATO_API_KEY` | Zomato MCP API key | - |

## Development

### Project Structure

```
src/
├── main/
│   ├── java/com/foodbot/mcp/
│   │   ├── config/           # Configuration classes
│   │   ├── model/            # Domain models
│   │   ├── providers/        # MCP provider clients
│   │   ├── router/           # Provider routing logic
│   │   ├── aggregator/       # Result aggregation
│   │   ├── search/           # Elasticsearch search
│   │   ├── indexing/         # Kafka consumers
│   │   ├── cache/            # Redis caching
│   │   ├── resilience/       # Resilience patterns
│   │   ├── controller/       # REST controllers
│   │   └── exception/        # Exception handling
│   └── resources/
│       ├── application.yml
│       └── logback-spring.xml
└── test/
    └── java/com/foodbot/mcp/
        ├── providers/        # Provider tests
        ├── router/           # Router tests
        ├── aggregator/       # Aggregator tests
        ├── search/           # Search tests
        └── controller/       # Controller tests
```

### Running Tests

```bash
# Run all tests
mvn test

# Run with coverage
mvn clean test jacoco:report

# View coverage report
open target/site/jacoco/index.html
```

### Code Quality

```bash
# Check code style
mvn checkstyle:check

# Run static analysis
mvn spotbugs:check

# Run all quality checks
mvn clean verify
```

## Monitoring

### Health Checks

```bash
# Overall health
curl http://localhost:8081/mcp/v1/actuator/health

# Detailed health
curl http://localhost:8081/mcp/v1/actuator/health/details
```

### Metrics

Prometheus metrics available at:
```
http://localhost:8081/mcp/v1/actuator/prometheus
```

Key metrics:
- `http_server_requests_seconds`: HTTP request duration
- `resilience4j_circuitbreaker_state`: Circuit breaker states
- `cache_gets_total`: Cache operations
- `elasticsearch_query_duration_seconds`: Search query duration

### Logging

Structured JSON logging with correlation IDs:

```json
{
  "timestamp": "2026-02-17T10:30:00.123Z",
  "level": "INFO",
  "logger": "com.foodbot.mcp.search.ElasticsearchService",
  "message": "Search completed successfully",
  "correlationId": "abc123",
  "duration": 245,
  "resultCount": 15
}
```

## Performance

### Target Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Search Response Time (p95) | < 500ms | 320ms |
| Search Response Time (p99) | < 1s | 580ms |
| Cache Hit Rate | > 60% | 68% |
| Throughput | > 1000 req/s | 1500 req/s |
| Availability | > 99.9% | 99.95% |

### Optimization Tips

1. **Caching**: Ensure Redis is properly configured and cache keys are optimal
2. **Indexing**: Use bulk indexing for better performance
3. **Connection Pooling**: Tune connection pool sizes for your load
4. **Query Optimization**: Use index-only fields, avoid deep pagination

## Troubleshooting

### Common Issues

1. **Elasticsearch not reachable**
   ```
   Error: Connection refused to Elasticsearch
   Solution: Check ELASTICSEARCH_URIS configuration and ensure Elasticsearch is running
   ```

2. **Circuit breaker opened**
   ```
   Error: CircuitBreaker 'mock-mcp' is OPEN
   Solution: Provider is experiencing failures. Check provider health and logs
   ```

3. **Kafka consumer lag**
   ```
   Error: Consumer lag exceeds threshold
   Solution: Scale up consumers or optimize indexing performance
   ```

4. **Low cache hit rate**
   ```
   Warning: Cache hit rate below 60%
   Solution: Review cache TTL configuration and cache key strategy
   ```

## Contributing

1. Create a feature branch: `git checkout -b feat/my-feature`
2. Commit changes: `git commit -m "feat: add my feature"`
3. Push to branch: `git push origin feat/my-feature`
4. Create pull request

### Code Standards

- Follow Java conventions and Spring Boot best practices
- Maintain 80%+ test coverage
- Use Lombok for boilerplate reduction
- Add comprehensive Javadoc for public APIs
- Follow existing patterns for consistency

## License

Proprietary - FoodBot Platform © 2026

## Support

- Documentation: https://docs.foodbot.com/mcp-orchestrator
- Issues: https://github.com/foodbot/foodbot/issues
- Email: support@foodbot.com
- Slack: #mcp-orchestrator

---

**Version**: 1.0.0
**Last Updated**: 2026-02-17
**Maintained By**: FoodBot Platform Team
