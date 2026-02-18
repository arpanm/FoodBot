package com.foodbot.mcp.exception;

/**
 * Exception thrown when a search operation fails.
 */
public class SearchException extends MCPException {

    public SearchException(String message) {
        super("SEARCH_ERROR", message);
    }

    public SearchException(String message, Throwable cause) {
        super("SEARCH_ERROR", message, cause);
    }
}
