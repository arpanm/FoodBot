package com.foodbot.mcp.resilience;

import com.foodbot.mcp.cache.CacheService;
import com.foodbot.mcp.model.SearchRequest;
import com.foodbot.mcp.model.SearchResponse;
import com.foodbot.mcp.providers.MCPProviderClient;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Optional;

/**
 * Service that wraps provider calls with Resilience4j circuit breaker pattern.
 * Provides fallback methods that return cached results when providers are unavailable.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CircuitBreakerService {

    private final CacheService cacheService;

    /**
     * Executes a restaurant search with circuit breaker protection.
     *
     * @param provider the MCP provider client
     * @param request the search request
     * @return search response from the provider or fallback
     */
    @CircuitBreaker(name = "mock-mcp", fallbackMethod = "fallbackRestaurantSearch")
    public SearchResponse searchRestaurantsWithCircuitBreaker(MCPProviderClient provider, SearchRequest request) {
        return provider.searchRestaurants(request);
    }

    /**
     * Executes a dish search with circuit breaker protection.
     *
     * @param provider the MCP provider client
     * @param request the search request
     * @return search response from the provider or fallback
     */
    @CircuitBreaker(name = "mock-mcp", fallbackMethod = "fallbackDishSearch")
    public SearchResponse searchDishesWithCircuitBreaker(MCPProviderClient provider, SearchRequest request) {
        return provider.searchDishes(request);
    }

    /**
     * Fallback method for restaurant search when circuit breaker is open.
     */
    @SuppressWarnings("unused")
    private SearchResponse fallbackRestaurantSearch(MCPProviderClient provider, SearchRequest request, Throwable t) {
        log.error("Circuit breaker triggered for restaurant search on provider '{}': {}",
                provider.getName(), t.getMessage());

        Optional<SearchResponse> cached = cacheService.getCachedResults(request);
        if (cached.isPresent()) {
            log.info("Returning cached results for fallback");
            return cached.get();
        }

        return SearchResponse.builder()
                .restaurants(Collections.emptyList())
                .totalResults(0)
                .error("Service temporarily unavailable. Please try again later.")
                .provider(provider.getName())
                .build();
    }

    /**
     * Fallback method for dish search when circuit breaker is open.
     */
    @SuppressWarnings("unused")
    private SearchResponse fallbackDishSearch(MCPProviderClient provider, SearchRequest request, Throwable t) {
        log.error("Circuit breaker triggered for dish search on provider '{}': {}",
                provider.getName(), t.getMessage());

        return SearchResponse.builder()
                .dishes(Collections.emptyList())
                .totalResults(0)
                .error("Service temporarily unavailable. Please try again later.")
                .provider(provider.getName())
                .build();
    }
}
