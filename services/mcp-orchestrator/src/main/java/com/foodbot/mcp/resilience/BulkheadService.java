package com.foodbot.mcp.resilience;

import com.foodbot.mcp.model.SearchRequest;
import com.foodbot.mcp.model.SearchResponse;
import com.foodbot.mcp.providers.MCPProviderClient;
import io.github.resilience4j.bulkhead.annotation.Bulkhead;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Service that wraps provider calls with Resilience4j bulkhead pattern.
 * Limits concurrent calls to 10 per provider to isolate resources and prevent cascading failures.
 */
@Slf4j
@Service
public class BulkheadService {

    /**
     * Executes a restaurant search with bulkhead protection.
     *
     * @param provider the MCP provider client
     * @param request the search request
     * @return search response
     */
    @Bulkhead(name = "mock-mcp")
    public SearchResponse searchRestaurantsWithBulkhead(MCPProviderClient provider, SearchRequest request) {
        log.debug("Executing bulkhead-protected restaurant search for provider: {}", provider.getName());
        return provider.searchRestaurants(request);
    }

    /**
     * Executes a dish search with bulkhead protection.
     *
     * @param provider the MCP provider client
     * @param request the search request
     * @return search response
     */
    @Bulkhead(name = "mock-mcp")
    public SearchResponse searchDishesWithBulkhead(MCPProviderClient provider, SearchRequest request) {
        log.debug("Executing bulkhead-protected dish search for provider: {}", provider.getName());
        return provider.searchDishes(request);
    }
}
