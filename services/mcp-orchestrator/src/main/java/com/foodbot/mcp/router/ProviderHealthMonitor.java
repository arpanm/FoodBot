package com.foodbot.mcp.router;

import com.foodbot.mcp.model.ProviderHealth;
import com.foodbot.mcp.providers.MCPProviderClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Monitors the health of MCP providers with periodic health checks.
 * Tracks consecutive failures and success rates to determine provider availability.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ProviderHealthMonitor {

    private final List<MCPProviderClient> providers;

    private final Map<String, ProviderHealth> healthStatus = new ConcurrentHashMap<>();
    private static final int MAX_CONSECUTIVE_FAILURES = 3;

    /**
     * Performs periodic health checks on all providers.
     * Runs every 60 seconds.
     */
    @Scheduled(fixedDelayString = "${mcp.health-check.interval:60000}")
    public void checkProviderHealth() {
        log.debug("Running provider health checks...");
        providers.forEach(provider -> {
            if (!provider.isEnabled()) return;

            long startTime = System.currentTimeMillis();
            try {
                boolean healthy = provider.healthCheck();
                long responseTime = System.currentTimeMillis() - startTime;

                ProviderHealth health = healthStatus.getOrDefault(provider.getName(),
                        ProviderHealth.builder()
                                .providerName(provider.getName())
                                .build());

                health.setHealthy(healthy);
                health.setLastChecked(Instant.now());
                health.setResponseTimeMs(responseTime);

                if (healthy) {
                    health.setConsecutiveFailures(0);
                    health.setLastError(null);
                } else {
                    health.setConsecutiveFailures(health.getConsecutiveFailures() + 1);
                }

                healthStatus.put(provider.getName(), health);

                log.debug("Health check for {}: healthy={}, responseTime={}ms",
                        provider.getName(), healthy, responseTime);
            } catch (Exception e) {
                long responseTime = System.currentTimeMillis() - startTime;
                recordFailure(provider.getName());

                ProviderHealth health = healthStatus.get(provider.getName());
                if (health != null) {
                    health.setResponseTimeMs(responseTime);
                    health.setLastError(e.getMessage());
                }

                log.warn("Health check failed for {}: {}", provider.getName(), e.getMessage());
            }
        });
    }

    /**
     * Checks whether a provider is currently healthy and available.
     */
    public boolean isHealthy(String providerName) {
        ProviderHealth health = healthStatus.get(providerName);
        if (health == null) {
            // Provider not yet checked - assume healthy if it's in the providers list
            return providers.stream()
                    .anyMatch(p -> p.getName().equals(providerName) && p.isEnabled());
        }
        return health.isAvailable();
    }

    /**
     * Records a failure for a provider.
     */
    public void recordFailure(String providerName) {
        ProviderHealth health = healthStatus.computeIfAbsent(providerName, name ->
                ProviderHealth.builder()
                        .providerName(name)
                        .healthy(true)
                        .build());

        health.setConsecutiveFailures(health.getConsecutiveFailures() + 1);
        health.setLastChecked(Instant.now());

        if (health.getConsecutiveFailures() >= MAX_CONSECUTIVE_FAILURES) {
            health.setHealthy(false);
            log.warn("Provider {} marked as unhealthy after {} consecutive failures",
                    providerName, health.getConsecutiveFailures());
        }
    }

    /**
     * Records a success for a provider, resetting its failure count.
     */
    public void recordSuccess(String providerName) {
        ProviderHealth health = healthStatus.get(providerName);
        if (health != null) {
            health.setConsecutiveFailures(0);
            health.setHealthy(true);
            health.setLastChecked(Instant.now());
        }
    }

    /**
     * Gets the health status of all providers.
     */
    public Map<String, ProviderHealth> getAllHealthStatus() {
        return Collections.unmodifiableMap(healthStatus);
    }

    /**
     * Gets the health status of a specific provider.
     */
    public Optional<ProviderHealth> getHealthStatus(String providerName) {
        return Optional.ofNullable(healthStatus.get(providerName));
    }
}
