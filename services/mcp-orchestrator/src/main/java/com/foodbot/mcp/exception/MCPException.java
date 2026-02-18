package com.foodbot.mcp.exception;

/**
 * Base exception for all MCP-related errors.
 */
public class MCPException extends RuntimeException {

    private final String errorCode;

    public MCPException(String message) {
        super(message);
        this.errorCode = "MCP_ERROR";
    }

    public MCPException(String message, Throwable cause) {
        super(message, cause);
        this.errorCode = "MCP_ERROR";
    }

    public MCPException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public MCPException(String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
