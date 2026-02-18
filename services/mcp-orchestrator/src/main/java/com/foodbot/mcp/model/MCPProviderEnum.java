package com.foodbot.mcp.model;

/**
 * Enumeration of available MCP providers.
 */
public enum MCPProviderEnum {

    MOCK("mock", "Mock MCP Provider", 1),
    SWIGGY("swiggy", "Swiggy MCP Provider", 2),
    ZOMATO("zomato", "Zomato MCP Provider", 3);

    private final String code;
    private final String displayName;
    private final int priority; // Lower number = higher priority

    MCPProviderEnum(String code, String displayName, int priority) {
        this.code = code;
        this.displayName = displayName;
        this.priority = priority;
    }

    public String getCode() {
        return code;
    }

    public String getDisplayName() {
        return displayName;
    }

    public int getPriority() {
        return priority;
    }

    public static MCPProviderEnum fromCode(String code) {
        for (MCPProviderEnum provider : values()) {
            if (provider.code.equalsIgnoreCase(code)) {
                return provider;
            }
        }
        throw new IllegalArgumentException("Unknown provider code: " + code);
    }
}
