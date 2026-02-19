package com.foodbot.mcp.search;

import com.foodbot.mcp.model.SearchRequest;
import com.foodbot.mcp.model.SearchResponse;
import com.foodbot.mcp.repository.DishSearchRepository;
import com.foodbot.mcp.repository.RestaurantSearchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Builds and executes Elasticsearch queries for restaurant and dish searches.
 * Delegates to the specialized search repositories.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SearchQueryBuilder {

    private final RestaurantSearchRepository restaurantSearchRepository;
    private final DishSearchRepository dishSearchRepository;

    /**
     * Builds and executes a restaurant search query in Elasticsearch.
     *
     * @param request the search request
     * @return search response
     */
    public SearchResponse buildAndExecuteRestaurantSearch(SearchRequest request) {
        log.debug("Building restaurant search query: query='{}', cuisine='{}', minRating={}",
                request.getQuery(), request.getCuisine(), request.getMinRating());

        return restaurantSearchRepository.search(request);
    }

    /**
     * Builds and executes a dish search query in Elasticsearch.
     *
     * @param request the search request
     * @return search response
     */
    public SearchResponse buildAndExecuteDishSearch(SearchRequest request) {
        log.debug("Building dish search query: query='{}', category='{}', maxPrice={}",
                request.getQuery(), request.getCategory(), request.getMaxPrice());

        return dishSearchRepository.search(request);
    }
}
