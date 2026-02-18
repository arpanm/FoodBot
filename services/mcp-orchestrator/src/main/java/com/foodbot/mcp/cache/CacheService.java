package com.foodbot.mcp.cache;

import com.foodbot.mcp.model.SearchRequest;
import com.foodbot.mcp.model.SearchResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Redis-based caching service for search results, restaurant details, and dish data.
 * Targets 60%+ cache hit rate with TTL-based expiration.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CacheService {

    private final CacheKeyGenerator cacheKeyGenerator;

    private final AtomicLong cacheHits = new AtomicLong(0);
    private final AtomicLong cacheMisses = new AtomicLong(0);

    /**
     * Gets cached search results for a given request.
     *
     * @param request the search request
     * @return cached response if available
     */
    @Cacheable(value = "search-results", key = "#request.cacheKey()", unless = "#result == null")
    public SearchResponse getCachedSearchResults(SearchRequest request) {
        cacheMisses.incrementAndGet();
        log.debug("Cache miss for search: {}", request.cacheKey());
        return null; // Return null to indicate cache miss - caller should fetch from provider
    }

    /**
     * Puts search results into the cache.
     *
     * @param request the search request
     * @param response the search response to cache
     * @return the cached response
     */
    @CachePut(value = "search-results", key = "#request.cacheKey()")
    public SearchResponse cacheSearchResults(SearchRequest request, SearchResponse response) {
        cacheHits.incrementAndGet();
        log.debug("Caching search results for: {}", request.cacheKey());
        response.setCached(true);
        return response;
    }

    /**
     * Gets cached results if available.
     *
     * @param request the search request
     * @return optional containing cached response
     */
    public Optional<SearchResponse> getCachedResults(SearchRequest request) {
        try {
            SearchResponse cached = getCachedSearchResults(request);
            if (cached != null) {
                cacheHits.incrementAndGet();
                cached.setCached(true);
                return Optional.of(cached);
            }
        } catch (Exception e) {
            log.warn("Failed to get cached results: {}", e.getMessage());
        }
        return Optional.empty();
    }

    /**
     * Evicts all search result caches.
     */
    @CacheEvict(value = "search-results", allEntries = true)
    public void evictAllSearchResults() {
        log.info("Evicted all search result caches");
    }

    /**
     * Returns the current cache hit rate as a percentage.
     */
    public double getCacheHitRate() {
        long hits = cacheHits.get();
        long misses = cacheMisses.get();
        long total = hits + misses;
        if (total == 0) return 0.0;
        return (double) hits / total;
    }

    /**
     * Resets cache statistics.
     */
    public void resetStats() {
        cacheHits.set(0);
        cacheMisses.set(0);
    }

    public long getCacheHits() {
        return cacheHits.get();
    }

    public long getCacheMisses() {
        return cacheMisses.get();
    }
}
