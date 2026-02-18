package com.foodbot.mcp.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;

/**
 * Represents the health status of an MCP provider.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProviderHealth implements Serializable {

    private static final long serialVersionUID = 1L;

    private String providerName;
    private boolean healthy;
    private Instant lastChecked;
    private long responseTimeMs;
    private int consecutiveFailures;
    private String lastError;
    private double successRate;

    /**
     * Checks whether the provider should be considered available based on health metrics.
     *
     * @return true if the provider is healthy and responsive
     */
    public boolean isAvailable() {
        return healthy && consecutiveFailures < 3;
    }
}
