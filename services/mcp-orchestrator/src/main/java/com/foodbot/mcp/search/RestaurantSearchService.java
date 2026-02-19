package com.foodbot.mcp.search;

import com.foodbot.mcp.exception.SearchException;
import com.foodbot.mcp.model.SearchRequest;
import com.foodbot.mcp.model.SearchResponse;
import com.foodbot.mcp.providers.mock.MockMCPService;
import com.foodbot.mcp.repository.RestaurantSearchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

/**
 * Service for restaurant search operations.
 * Delegates to Elasticsearch repository with fallback to mock data when ES is unavailable.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RestaurantSearchService {

    private final RestaurantSearchRepository restaurantSearchRepository;
    private final MockMCPService mockMCPService;

    /**
     * Searches restaurants using full-text search with filters and pagination.
     *
     * @param query          search text
     * @param filters        search request containing all filter parameters
     * @param page           page number (1-based)
     * @param pageSize       results per page
     * @return search response with matching restaurants
     */
    public SearchResponse searchRestaurants(String query, SearchRequest filters,
                                            int page, int pageSize) {
        long startTime = System.currentTimeMillis();

        SearchRequest request = SearchRequest.builder()
                .query(query)
                .cuisine(filters.getCuisine())
                .cuisines(filters.getCuisines())
                .minRating(filters.getMinRating())
                .priceRange(filters.getPriceRange())
                .location(filters.getLocation())
                .radius(filters.getRadius())
                .maxDeliveryTime(filters.getMaxDeliveryTime())
                .availableOnly(filters.getAvailableOnly())
                .sortBy(filters.getSortBy())
                .sortOrder(filters.getSortOrder())
                .page(page)
                .pageSize(pageSize)
                .build();

        try {
            SearchResponse response = restaurantSearchRepository.search(request);
            response.setQueryTimeMs(System.currentTimeMillis() - startTime);

            log.info("Restaurant search completed in {}ms: query='{}', results={}",
                    response.getQueryTimeMs(), query, response.getTotalResults());

            return response;

        } catch (SearchException e) {
            log.warn("Elasticsearch search failed, falling back to mock service: {}",
                    e.getMessage());
            return fallbackSearch(request, startTime);
        }
    }

    /**
     * Searches restaurants by geographic location within a radius.
     *
     * @param lat      latitude
     * @param lon      longitude
     * @param radiusKm search radius in kilometers
     * @param page     page number (1-based)
     * @param pageSize results per page
     * @return search response with nearby restaurants sorted by distance
     */
    public SearchResponse searchByLocation(double lat, double lon, double radiusKm,
                                           int page, int pageSize) {
        long startTime = System.currentTimeMillis();

        validateCoordinates(lat, lon);
        validateRadius(radiusKm);

        try {
            SearchResponse response = restaurantSearchRepository.searchByLocation(
                    lat, lon, radiusKm, page, pageSize);
            response.setQueryTimeMs(System.currentTimeMillis() - startTime);

            log.info("Geo search completed in {}ms: ({}, {}), radius={}km, results={}",
                    response.getQueryTimeMs(), lat, lon, radiusKm, response.getTotalResults());

            return response;

        } catch (SearchException e) {
            log.warn("Elasticsearch geo search failed: {}", e.getMessage());
            return emptyResponse(page, pageSize, startTime);
        }
    }

    /**
     * Searches restaurants by cuisine types.
     *
     * @param cuisines list of cuisine types to filter by
     * @param filters  additional search filters
     * @return search response with matching restaurants
     */
    public SearchResponse searchByCuisine(List<String> cuisines, SearchRequest filters) {
        long startTime = System.currentTimeMillis();

        if (cuisines == null || cuisines.isEmpty()) {
            return emptyResponse(1, 20, startTime);
        }

        try {
            SearchResponse response = restaurantSearchRepository.searchByCuisine(cuisines, filters);
            response.setQueryTimeMs(System.currentTimeMillis() - startTime);

            log.info("Cuisine search completed in {}ms: cuisines={}, results={}",
                    response.getQueryTimeMs(), cuisines, response.getTotalResults());

            return response;

        } catch (SearchException e) {
            log.warn("Elasticsearch cuisine search failed: {}", e.getMessage());
            return emptyResponse(
                    filters.getPage() != null ? filters.getPage() : 1,
                    filters.getPageSize() != null ? filters.getPageSize() : 20,
                    startTime
            );
        }
    }

    /**
     * Searches restaurants by minimum rating.
     *
     * @param minRating minimum rating threshold (0-5)
     * @param filters   additional search filters
     * @return search response with matching restaurants
     */
    public SearchResponse searchByRating(double minRating, SearchRequest filters) {
        long startTime = System.currentTimeMillis();

        if (minRating < 0 || minRating > 5) {
            throw new IllegalArgumentException("Rating must be between 0 and 5");
        }

        try {
            SearchResponse response = restaurantSearchRepository.searchByRating(minRating, filters);
            response.setQueryTimeMs(System.currentTimeMillis() - startTime);

            log.info("Rating search completed in {}ms: minRating={}, results={}",
                    response.getQueryTimeMs(), minRating, response.getTotalResults());

            return response;

        } catch (SearchException e) {
            log.warn("Elasticsearch rating search failed: {}", e.getMessage());
            return emptyResponse(
                    filters.getPage() != null ? filters.getPage() : 1,
                    filters.getPageSize() != null ? filters.getPageSize() : 20,
                    startTime
            );
        }
    }

    /**
     * Provides autocomplete suggestions for restaurant name input.
     *
     * @param prefix the input prefix text
     * @return list of suggested restaurant names
     */
    public List<String> autocompleteSuggestions(String prefix) {
        if (prefix == null || prefix.length() < 2) {
            return Collections.emptyList();
        }

        try {
            return restaurantSearchRepository.autocompleteSuggestions(prefix, 10);
        } catch (Exception e) {
            log.warn("Autocomplete suggestions failed: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private SearchResponse fallbackSearch(SearchRequest request, long startTime) {
        try {
            SearchResponse response = mockMCPService.searchRestaurants(request);
            response.setQueryTimeMs(System.currentTimeMillis() - startTime);
            response.setProvider("MOCK_FALLBACK");
            return response;
        } catch (Exception fallbackError) {
            log.error("Fallback search also failed", fallbackError);
            return emptyResponse(
                    request.getPage() != null ? request.getPage() : 1,
                    request.getPageSize() != null ? request.getPageSize() : 20,
                    startTime
            );
        }
    }

    private SearchResponse emptyResponse(int page, int pageSize, long startTime) {
        return SearchResponse.builder()
                .restaurants(Collections.emptyList())
                .totalResults(0)
                .page(page)
                .pageSize(pageSize)
                .totalPages(0)
                .queryTimeMs(System.currentTimeMillis() - startTime)
                .provider("NONE")
                .build();
    }

    private void validateCoordinates(double lat, double lon) {
        if (lat < -90 || lat > 90) {
            throw new IllegalArgumentException("Latitude must be between -90 and 90");
        }
        if (lon < -180 || lon > 180) {
            throw new IllegalArgumentException("Longitude must be between -180 and 180");
        }
    }

    private void validateRadius(double radiusKm) {
        if (radiusKm <= 0 || radiusKm > 100) {
            throw new IllegalArgumentException("Radius must be between 0 and 100 km");
        }
    }
}
