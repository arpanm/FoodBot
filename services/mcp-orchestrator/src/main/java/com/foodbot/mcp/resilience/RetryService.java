package com.foodbot.mcp.resilience;

import com.foodbot.mcp.model.SearchRequest;
import com.foodbot.mcp.model.SearchResponse;
import com.foodbot.mcp.providers.MCPProviderClient;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Service that wraps provider calls with Resilience4j retry pattern.
 * Retries failed calls up to 3 times with exponential backoff (1s, 2s, 4s).
 */
@Slf4j
@Service
public class RetryService {

    /**
     * Executes a restaurant search with retry support.
     *
     * @param provider the MCP provider client
     * @param request the search request
     * @return search response
     */
    @Retry(name = "mock-mcp")
    public SearchResponse searchRestaurantsWithRetry(MCPProviderClient provider, SearchRequest request) {
        log.debug("Executing restaurant search with retry for provider: {}", provider.getName());
        return provider.searchRestaurants(request);
    }

    /**
     * Executes a dish search with retry support.
     *
     * @param provider the MCP provider client
     * @param request the search request
     * @return search response
     */
    @Retry(name = "mock-mcp")
    public SearchResponse searchDishesWithRetry(MCPProviderClient provider, SearchRequest request) {
        log.debug("Executing dish search with retry for provider: {}", provider.getName());
        return provider.searchDishes(request);
    }
}
