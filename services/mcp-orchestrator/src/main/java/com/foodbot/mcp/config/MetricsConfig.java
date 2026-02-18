package com.foodbot.mcp.config;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.actuate.autoconfigure.metrics.MeterRegistryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Metrics configuration for Prometheus monitoring.
 * Configures custom meters, timers, and counters for the MCP Orchestrator service.
 *
 * Metrics exposed:
 * - mcp.search.requests: Total search request count
 * - mcp.search.duration: Search request duration
 * - mcp.provider.health: Provider health status
 * - mcp.cache.hit_rate: Cache hit rate
 * - mcp.indexer.queue_size: Bulk indexer queue size
 */
@Slf4j
@Configuration
public class MetricsConfig {

    @Bean
    public MeterRegistryCustomizer<MeterRegistry> commonTags() {
        return registry -> registry.config()
                .commonTags("application", "mcp-orchestrator");
    }

    @Bean
    public Timer searchTimer(MeterRegistry registry) {
        return Timer.builder("mcp.search.duration")
                .description("Time taken for search operations")
                .tag("type", "restaurant")
                .register(registry);
    }
}
