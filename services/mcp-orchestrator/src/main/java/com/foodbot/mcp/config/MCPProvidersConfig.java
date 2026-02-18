package com.foodbot.mcp.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * Configuration properties for MCP providers.
 * Maps properties from the mcp.providers section of application.yml.
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "mcp.providers")
public class MCPProvidersConfig {

    private MockProviderConfig mock = new MockProviderConfig();
    private SwiggyProviderConfig swiggy = new SwiggyProviderConfig();
    private ZomatoProviderConfig zomato = new ZomatoProviderConfig();

    @Data
    public static class MockProviderConfig {
        private boolean enabled = true;
        private String baseUrl = "http://localhost:3010";
        private Duration timeout = Duration.ofMillis(5000);
        private RetryConfig retry = new RetryConfig();
    }

    @Data
    public static class SwiggyProviderConfig {
        private boolean enabled = false;
        private String baseUrl = "https://api.swiggy.com/mcp";
        private String apiKey = "";
        private Duration timeout = Duration.ofMillis(10000);
        private RetryConfig retry = new RetryConfig();
    }

    @Data
    public static class ZomatoProviderConfig {
        private boolean enabled = false;
        private String baseUrl = "https://api.zomato.com/mcp";
        private String apiKey = "";
        private Duration timeout = Duration.ofMillis(10000);
        private RetryConfig retry = new RetryConfig();
    }

    @Data
    public static class RetryConfig {
        private int maxAttempts = 3;
        private Duration waitDuration = Duration.ofSeconds(1);
        private double exponentialBackoffMultiplier = 2.0;
    }
}
