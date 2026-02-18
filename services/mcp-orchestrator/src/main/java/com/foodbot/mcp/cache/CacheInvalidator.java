package com.foodbot.mcp.cache;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Component;


/**
 * Service for cache invalidation operations.
 * Handles targeted cache eviction for restaurants, dishes, menus, and filters.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CacheInvalidator {

    private final CacheManager cacheManager;

    /**
     * Invalidates cached data for a specific restaurant.
     */
    @CacheEvict(value = "restaurant-details", key = "#restaurantId")
    public void invalidateRestaurant(String restaurantId) {
        log.info("Invalidated cache for restaurant: {}", restaurantId);
        // Also invalidate the menu cache for this restaurant
        invalidateMenu(restaurantId);
    }

    /**
     * Invalidates cached menu for a specific restaurant.
     */
    @CacheEvict(value = "restaurant-menu", key = "#restaurantId")
    public void invalidateMenu(String restaurantId) {
        log.info("Invalidated menu cache for restaurant: {}", restaurantId);
    }

    /**
     * Invalidates cached data for a specific dish.
     */
    @CacheEvict(value = "dish-availability", key = "#dishId")
    public void invalidateDish(String dishId) {
        log.info("Invalidated cache for dish: {}", dishId);
    }

    /**
     * Invalidates all filter caches.
     */
    @CacheEvict(value = "filters", allEntries = true)
    public void invalidateFilters() {
        log.info("Invalidated all filter caches");
    }

    /**
     * Invalidates all search result caches.
     */
    @CacheEvict(value = "search-results", allEntries = true)
    public void invalidateSearchResults() {
        log.info("Invalidated all search result caches");
    }

    /**
     * Invalidates all caches across all cache names.
     */
    public void invalidateAll() {
        log.warn("Invalidating ALL caches");
        cacheManager.getCacheNames().forEach(name -> {
            var cache = cacheManager.getCache(name);
            if (cache != null) {
                cache.clear();
            }
        });
        log.info("All caches invalidated");
    }
}
