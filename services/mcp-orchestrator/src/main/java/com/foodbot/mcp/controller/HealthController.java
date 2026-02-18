package com.foodbot.mcp.controller;

import com.foodbot.mcp.cache.CacheService;
import com.foodbot.mcp.indexing.BulkIndexer;
import com.foodbot.mcp.model.ProviderHealth;
import com.foodbot.mcp.providers.mock.MockDataGenerator;
import com.foodbot.mcp.router.ProviderHealthMonitor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Health check controller for the MCP Orchestrator service.
 * Provides detailed health status of all components including providers,
 * cache, Elasticsearch, and Kafka.
 */
@Slf4j
@RestController
@RequestMapping("/health")
@RequiredArgsConstructor
@Tag(name = "Health", description = "Service health and monitoring endpoints")
public class HealthController {

    private final ProviderHealthMonitor healthMonitor;
    private final CacheService cacheService;
    private final BulkIndexer bulkIndexer;
    private final MockDataGenerator mockDataGenerator;

    @GetMapping
    @Operation(summary = "Service health check", description = "Returns overall service health status")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> health = new LinkedHashMap<>();
        health.put("status", "UP");
        health.put("timestamp", Instant.now().toString());
        health.put("service", "mcp-orchestrator");

        // Mock data status
        Map<String, Object> mockData = new LinkedHashMap<>();
        mockData.put("restaurants", mockDataGenerator.getRestaurants().size());
        mockData.put("dishes", mockDataGenerator.getDishes().size());
        health.put("mockData", mockData);

        // Provider health
        Map<String, ProviderHealth> providerHealth = healthMonitor.getAllHealthStatus();
        health.put("providers", providerHealth);

        // Cache status
        Map<String, Object> cacheStatus = new LinkedHashMap<>();
        cacheStatus.put("hitRate", String.format("%.2f%%", cacheService.getCacheHitRate() * 100));
        cacheStatus.put("hits", cacheService.getCacheHits());
        cacheStatus.put("misses", cacheService.getCacheMisses());
        health.put("cache", cacheStatus);

        // Indexer status
        Map<String, Object> indexerStatus = new LinkedHashMap<>();
        indexerStatus.put("restaurantQueueSize", bulkIndexer.getRestaurantQueueSize());
        indexerStatus.put("dishQueueSize", bulkIndexer.getDishQueueSize());
        health.put("indexer", indexerStatus);

        return ResponseEntity.ok(health);
    }

    @GetMapping("/providers")
    @Operation(summary = "Provider health status", description = "Returns health status of all MCP providers")
    public ResponseEntity<Map<String, ProviderHealth>> providerHealth() {
        return ResponseEntity.ok(healthMonitor.getAllHealthStatus());
    }

    @GetMapping("/ready")
    @Operation(summary = "Readiness check", description = "Returns whether the service is ready to accept traffic")
    public ResponseEntity<Map<String, Object>> readinessCheck() {
        Map<String, Object> readiness = new LinkedHashMap<>();
        boolean ready = !mockDataGenerator.getRestaurants().isEmpty();
        readiness.put("ready", ready);
        readiness.put("timestamp", Instant.now().toString());

        if (ready) {
            return ResponseEntity.ok(readiness);
        } else {
            return ResponseEntity.status(503).body(readiness);
        }
    }

    @GetMapping("/live")
    @Operation(summary = "Liveness check", description = "Returns whether the service is alive")
    public ResponseEntity<Map<String, Object>> livenessCheck() {
        return ResponseEntity.ok(Map.of(
                "alive", true,
                "timestamp", Instant.now().toString()
        ));
    }
}
