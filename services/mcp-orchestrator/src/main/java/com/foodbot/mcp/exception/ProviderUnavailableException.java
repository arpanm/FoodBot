package com.foodbot.mcp.exception;

/**
 * Exception thrown when an MCP provider is unavailable or unhealthy.
 */
public class ProviderUnavailableException extends MCPException {

    private final String providerName;

    public ProviderUnavailableException(String message) {
        super("PROVIDER_UNAVAILABLE", message);
        this.providerName = "unknown";
    }

    public ProviderUnavailableException(String providerName, String message) {
        super("PROVIDER_UNAVAILABLE", message);
        this.providerName = providerName;
    }

    public ProviderUnavailableException(String providerName, String message, Throwable cause) {
        super("PROVIDER_UNAVAILABLE", message, cause);
        this.providerName = providerName;
    }

    public String getProviderName() {
        return providerName;
    }
}
