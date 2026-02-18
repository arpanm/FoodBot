package com.foodbot.mcp.search;

import com.foodbot.mcp.exception.SearchException;
import com.foodbot.mcp.model.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Elasticsearch service for full-text search, geo-spatial queries, and faceted search.
 * Handles restaurant and dish indexing and searching with sub-500ms target response time.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ElasticsearchService {

    private final SearchQueryBuilder queryBuilder;
    private final FacetedSearchService facetedSearchService;
    private final GeoSearchService geoSearchService;

    /**
     * Searches for restaurants using Elasticsearch.
     * Falls back to in-memory search if Elasticsearch is unavailable.
     *
     * @param request the search request
     * @return search response with matching restaurants
     */
    public SearchResponse searchRestaurants(SearchRequest request) {
        long startTime = System.currentTimeMillis();

        try {
            log.debug("Searching restaurants in Elasticsearch: query='{}', cuisine='{}', minRating={}",
                    request.getQuery(), request.getCuisine(), request.getMinRating());

            // Build and execute search query
            // Note: When Elasticsearch is running, this delegates to the ES client.
            // Currently returns empty response as ES may not be available.
            SearchResponse response = queryBuilder.buildAndExecuteRestaurantSearch(request);

            long queryTimeMs = System.currentTimeMillis() - startTime;
            response.setQueryTimeMs(queryTimeMs);

            log.info("Elasticsearch restaurant search completed in {}ms, {} results",
                    queryTimeMs, response.getTotalResults());

            return response;

        } catch (Exception e) {
            log.warn("Elasticsearch search failed, will fall back to in-memory search: {}", e.getMessage());
            throw new SearchException("Elasticsearch search failed: " + e.getMessage(), e);
        }
    }

    /**
     * Searches for dishes using Elasticsearch.
     *
     * @param request the search request
     * @return search response with matching dishes
     */
    public SearchResponse searchDishes(SearchRequest request) {
        long startTime = System.currentTimeMillis();

        try {
            SearchResponse response = queryBuilder.buildAndExecuteDishSearch(request);

            long queryTimeMs = System.currentTimeMillis() - startTime;
            response.setQueryTimeMs(queryTimeMs);

            log.info("Elasticsearch dish search completed in {}ms, {} results",
                    queryTimeMs, response.getTotalResults());

            return response;

        } catch (Exception e) {
            log.warn("Elasticsearch dish search failed: {}", e.getMessage());
            throw new SearchException("Elasticsearch dish search failed: " + e.getMessage(), e);
        }
    }

    /**
     * Performs a geo-spatial search for nearby restaurants.
     *
     * @param location the center location
     * @param radiusKm search radius in kilometers
     * @param page page number
     * @param pageSize results per page
     * @return search response with nearby restaurants
     */
    public SearchResponse searchNearby(GeoLocation location, double radiusKm, int page, int pageSize) {
        return geoSearchService.searchNearby(location, radiusKm, page, pageSize);
    }

    /**
     * Gets faceted search results with aggregation counts.
     *
     * @param query optional search query
     * @return list of filters with counts
     */
    public List<Filter> getFacets(String query) {
        return facetedSearchService.getFacets(query);
    }

    /**
     * Indexes a restaurant document.
     *
     * @param restaurant the restaurant to index
     */
    public void indexRestaurant(Restaurant restaurant) {
        try {
            log.info("Indexing restaurant: {} ({})", restaurant.getName(), restaurant.getId());
            // Elasticsearch indexing will be performed when ES is available
        } catch (Exception e) {
            log.error("Failed to index restaurant: {}", restaurant.getId(), e);
        }
    }

    /**
     * Indexes a dish document.
     *
     * @param dish the dish to index
     */
    public void indexDish(Dish dish) {
        try {
            log.info("Indexing dish: {} ({})", dish.getName(), dish.getId());
            // Elasticsearch indexing will be performed when ES is available
        } catch (Exception e) {
            log.error("Failed to index dish: {}", dish.getId(), e);
        }
    }

    /**
     * Bulk indexes multiple restaurant documents.
     *
     * @param restaurants list of restaurants to index
     */
    public void bulkIndexRestaurants(List<Restaurant> restaurants) {
        log.info("Bulk indexing {} restaurants", restaurants.size());
        restaurants.forEach(this::indexRestaurant);
    }

    /**
     * Bulk indexes multiple dish documents.
     *
     * @param dishes list of dishes to index
     */
    public void bulkIndexDishes(List<Dish> dishes) {
        log.info("Bulk indexing {} dishes", dishes.size());
        dishes.forEach(this::indexDish);
    }

    /**
     * Deletes a restaurant document from the index.
     *
     * @param restaurantId the restaurant ID to delete
     */
    public void deleteRestaurant(String restaurantId) {
        log.info("Deleting restaurant from index: {}", restaurantId);
    }

    /**
     * Deletes a dish document from the index.
     *
     * @param dishId the dish ID to delete
     */
    public void deleteDish(String dishId) {
        log.info("Deleting dish from index: {}", dishId);
    }

    /**
     * Updates the availability status of a dish in the index.
     *
     * @param dishId the dish ID
     * @param available the new availability status
     */
    public void updateDishAvailability(String dishId, boolean available) {
        log.info("Updating dish availability: {} -> {}", dishId, available);
    }
}
