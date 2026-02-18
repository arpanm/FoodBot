package com.foodbot.mcp.resilience;

import com.foodbot.mcp.model.SearchRequest;
import com.foodbot.mcp.model.SearchResponse;
import com.foodbot.mcp.providers.MCPProviderClient;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Service that wraps provider calls with Resilience4j rate limiter pattern.
 * Limits requests to 100/second per provider to prevent overloading.
 */
@Slf4j
@Service
public class RateLimiterService {

    /**
     * Executes a restaurant search with rate limiting.
     *
     * @param provider the MCP provider client
     * @param request the search request
     * @return search response
     */
    @RateLimiter(name = "mock-mcp")
    public SearchResponse searchRestaurantsWithRateLimit(MCPProviderClient provider, SearchRequest request) {
        log.debug("Executing rate-limited restaurant search for provider: {}", provider.getName());
        return provider.searchRestaurants(request);
    }

    /**
     * Executes a dish search with rate limiting.
     *
     * @param provider the MCP provider client
     * @param request the search request
     * @return search response
     */
    @RateLimiter(name = "mock-mcp")
    public SearchResponse searchDishesWithRateLimit(MCPProviderClient provider, SearchRequest request) {
        log.debug("Executing rate-limited dish search for provider: {}", provider.getName());
        return provider.searchDishes(request);
    }
}
