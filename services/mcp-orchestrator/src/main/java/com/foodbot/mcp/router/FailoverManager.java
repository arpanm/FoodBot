package com.foodbot.mcp.router;

import com.foodbot.mcp.cache.CacheService;
import com.foodbot.mcp.model.SearchRequest;
import com.foodbot.mcp.model.SearchResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Manages failover logic when providers become unavailable.
 * Tracks failure counts and provides fallback responses using cached data.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FailoverManager {

    private final CacheService cacheService;

    private final Map<String, AtomicInteger> failureCounts = new ConcurrentHashMap<>();

    /**
     * Handles a provider failure event.
     * Logs the failure and increments the failure counter.
     *
     * @param providerName the name of the failed provider
     * @param cause the cause of the failure
     */
    public void handleProviderFailure(String providerName, Throwable cause) {
        int count = failureCounts
                .computeIfAbsent(providerName, k -> new AtomicInteger(0))
                .incrementAndGet();

        log.warn("Provider {} failure #{}: {}", providerName, count, cause.getMessage());

        if (count >= 5) {
            log.error("Provider {} has failed {} times. Consider circuit breaker intervention.",
                    providerName, count);
        }
    }

    /**
     * Attempts to provide a fallback response when all providers fail.
     * First tries cached results, then returns an empty response with error message.
     *
     * @param request the original search request
     * @return fallback search response
     */
    public SearchResponse getFallbackResponse(SearchRequest request) {
        log.info("Attempting to provide fallback response for query: {}", request.getQuery());

        // Try to return cached results
        Optional<SearchResponse> cached = cacheService.getCachedResults(request);
        if (cached.isPresent()) {
            log.info("Returning cached fallback results");
            SearchResponse response = cached.get();
            response.setCached(true);
            response.getMetadata().put("fallback", true);
            return response;
        }

        // No cached results available - return empty response with error
        log.warn("No cached results available for fallback");
        return SearchResponse.builder()
                .restaurants(Collections.emptyList())
                .dishes(Collections.emptyList())
                .totalResults(0)
                .page(1)
                .pageSize(request.getPageSize() != null ? request.getPageSize() : 20)
                .totalPages(0)
                .error("Service temporarily unavailable. Please try again later.")
                .build();
    }

    /**
     * Resets the failure count for a provider after successful recovery.
     */
    public void resetFailureCount(String providerName) {
        failureCounts.computeIfAbsent(providerName, k -> new AtomicInteger(0)).set(0);
        log.info("Reset failure count for provider: {}", providerName);
    }

    /**
     * Gets the current failure count for a provider.
     */
    public int getFailureCount(String providerName) {
        AtomicInteger count = failureCounts.get(providerName);
        return count != null ? count.get() : 0;
    }
}
