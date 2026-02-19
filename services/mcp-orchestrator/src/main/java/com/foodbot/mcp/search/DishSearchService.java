package com.foodbot.mcp.search;

import com.foodbot.mcp.exception.SearchException;
import com.foodbot.mcp.model.SearchRequest;
import com.foodbot.mcp.model.SearchResponse;
import com.foodbot.mcp.providers.mock.MockMCPService;
import com.foodbot.mcp.repository.DishSearchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

/**
 * Service for dish search operations.
 * Delegates to Elasticsearch repository with fallback to mock data when ES is unavailable.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DishSearchService {

    private final DishSearchRepository dishSearchRepository;
    private final MockMCPService mockMCPService;

    /**
     * Searches dishes using full-text search with filters and pagination.
     *
     * @param query    search text
     * @param filters  search request containing all filter parameters
     * @return search response with matching dishes
     */
    public SearchResponse searchDishes(String query, SearchRequest filters) {
        long startTime = System.currentTimeMillis();

        SearchRequest request = SearchRequest.builder()
                .query(query)
                .category(filters.getCategory())
                .dietaryTags(filters.getDietaryTags())
                .maxPrice(filters.getMaxPrice())
                .availableOnly(filters.getAvailableOnly())
                .sortBy(filters.getSortBy())
                .sortOrder(filters.getSortOrder())
                .page(filters.getPage() != null ? filters.getPage() : 1)
                .pageSize(filters.getPageSize() != null ? filters.getPageSize() : 20)
                .build();

        try {
            SearchResponse response = dishSearchRepository.search(request);
            response.setQueryTimeMs(System.currentTimeMillis() - startTime);

            log.info("Dish search completed in {}ms: query='{}', results={}",
                    response.getQueryTimeMs(), query, response.getTotalResults());

            return response;

        } catch (SearchException e) {
            log.warn("Elasticsearch dish search failed, falling back to mock: {}",
                    e.getMessage());
            return fallbackSearch(request, startTime);
        }
    }

    /**
     * Searches dishes by ingredient names.
     *
     * @param ingredients list of ingredients to search for
     * @return search response with matching dishes
     */
    public SearchResponse searchByIngredients(List<String> ingredients) {
        long startTime = System.currentTimeMillis();

        if (ingredients == null || ingredients.isEmpty()) {
            return emptyResponse(1, 20, startTime);
        }

        try {
            SearchResponse response = dishSearchRepository.searchByIngredients(
                    ingredients, 1, 20);
            response.setQueryTimeMs(System.currentTimeMillis() - startTime);

            log.info("Ingredient search completed in {}ms: ingredients={}, results={}",
                    response.getQueryTimeMs(), ingredients, response.getTotalResults());

            return response;

        } catch (SearchException e) {
            log.warn("Elasticsearch ingredient search failed: {}", e.getMessage());
            return emptyResponse(1, 20, startTime);
        }
    }

    /**
     * Searches dishes by dietary restriction tags.
     *
     * @param restrictions list of dietary restriction tags
     * @return search response with matching dishes
     */
    public SearchResponse searchByDietaryRestrictions(List<String> restrictions) {
        long startTime = System.currentTimeMillis();

        if (restrictions == null || restrictions.isEmpty()) {
            return emptyResponse(1, 20, startTime);
        }

        try {
            SearchResponse response = dishSearchRepository.searchByDietaryRestrictions(
                    restrictions, 1, 20);
            response.setQueryTimeMs(System.currentTimeMillis() - startTime);

            log.info("Dietary restriction search completed in {}ms: restrictions={}, results={}",
                    response.getQueryTimeMs(), restrictions, response.getTotalResults());

            return response;

        } catch (SearchException e) {
            log.warn("Elasticsearch dietary restriction search failed: {}", e.getMessage());
            return emptyResponse(1, 20, startTime);
        }
    }

    /**
     * Finds dishes similar to a given dish using more-like-this query.
     *
     * @param dishId the reference dish ID
     * @return search response with similar dishes
     */
    public SearchResponse similarDishes(String dishId) {
        long startTime = System.currentTimeMillis();

        if (dishId == null || dishId.isEmpty()) {
            return emptyResponse(1, 10, startTime);
        }

        try {
            SearchResponse response = dishSearchRepository.findSimilarDishes(dishId, 10);
            response.setQueryTimeMs(System.currentTimeMillis() - startTime);

            log.info("Similar dishes search completed in {}ms: dishId={}, results={}",
                    response.getQueryTimeMs(), dishId, response.getTotalResults());

            return response;

        } catch (SearchException e) {
            log.warn("Elasticsearch similar dishes search failed: {}", e.getMessage());
            return emptyResponse(1, 10, startTime);
        }
    }

    private SearchResponse fallbackSearch(SearchRequest request, long startTime) {
        try {
            SearchResponse response = mockMCPService.searchDishes(request);
            response.setQueryTimeMs(System.currentTimeMillis() - startTime);
            response.setProvider("MOCK_FALLBACK");
            return response;
        } catch (Exception fallbackError) {
            log.error("Fallback dish search also failed", fallbackError);
            return emptyResponse(
                    request.getPage() != null ? request.getPage() : 1,
                    request.getPageSize() != null ? request.getPageSize() : 20,
                    startTime
            );
        }
    }

    private SearchResponse emptyResponse(int page, int pageSize, long startTime) {
        return SearchResponse.builder()
                .dishes(Collections.emptyList())
                .totalResults(0)
                .page(page)
                .pageSize(pageSize)
                .totalPages(0)
                .queryTimeMs(System.currentTimeMillis() - startTime)
                .provider("NONE")
                .build();
    }
}
