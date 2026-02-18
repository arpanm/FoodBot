package com.foodbot.mcp;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.info.License;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * MCP Orchestrator Application - Main entry point
 *
 * <p>This microservice provides orchestration layer for Model Context Protocol (MCP) providers
 * including Mock, Swiggy, and Zomato. It aggregates restaurant and dish data from multiple
 * providers, provides full-text search capabilities, and implements resilience patterns.
 *
 * <p>Key Features:
 * <ul>
 *   <li>Multi-provider orchestration with failover support</li>
 *   <li>Elasticsearch-based full-text search</li>
 *   <li>Redis caching for performance</li>
 *   <li>Kafka-based real-time indexing</li>
 *   <li>Circuit breaker, rate limiter, and bulkhead patterns</li>
 *   <li>Comprehensive monitoring and health checks</li>
 * </ul>
 *
 * @author FoodBot Team
 * @version 1.0.0
 * @since 2026-02-17
 */
@SpringBootApplication
@EnableCaching
@EnableKafka
@EnableAsync
@EnableScheduling
@OpenAPIDefinition(
    info = @Info(
        title = "MCP Orchestrator API",
        version = "1.0.0",
        description = "Model Context Protocol Orchestration Layer for FoodBot",
        contact = @Contact(
            name = "FoodBot Team",
            email = "support@foodbot.com",
            url = "https://foodbot.com"
        ),
        license = @License(
            name = "Proprietary",
            url = "https://foodbot.com/license"
        )
    )
)
public class MCPOrchestratorApplication {

    /**
     * Main method to start the MCP Orchestrator service.
     *
     * @param args command line arguments
     */
    public static void main(String[] args) {
        SpringApplication.run(MCPOrchestratorApplication.class, args);
    }
}
