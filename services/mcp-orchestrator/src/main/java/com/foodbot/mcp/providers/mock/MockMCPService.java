package com.foodbot.mcp.providers.mock;

import com.foodbot.mcp.model.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service layer for Mock MCP provider operations.
 * Provides search, filtering, and data retrieval with pagination support.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MockMCPService {

    private final MockRestaurantRepository restaurantRepository;
    private final MockDishRepository dishRepository;

    /**
     * Searches for restaurants based on the search request.
     */
    public SearchResponse searchRestaurants(SearchRequest request) {
        long startTime = System.currentTimeMillis();

        List<Restaurant> results = restaurantRepository.search(request);
        long totalResults = results.size();

        // Paginate
        int page = request.getPage() != null ? request.getPage() : 1;
        int pageSize = request.getPageSize() != null ? request.getPageSize() : 20;
        int fromIndex = (page - 1) * pageSize;
        int toIndex = Math.min(fromIndex + pageSize, results.size());

        List<Restaurant> paginatedResults = fromIndex < results.size()
                ? results.subList(fromIndex, toIndex)
                : Collections.emptyList();

        long queryTimeMs = System.currentTimeMillis() - startTime;

        log.info("Restaurant search completed: query='{}', results={}, time={}ms",
                request.getQuery(), totalResults, queryTimeMs);

        return SearchResponse.builder()
                .restaurants(paginatedResults)
                .totalResults(totalResults)
                .page(page)
                .pageSize(pageSize)
                .totalPages((int) Math.ceil((double) totalResults / pageSize))
                .queryTimeMs(queryTimeMs)
                .provider("MOCK")
                .build();
    }

    /**
     * Searches for dishes based on the search request.
     */
    public SearchResponse searchDishes(SearchRequest request) {
        long startTime = System.currentTimeMillis();

        List<Dish> results = dishRepository.search(request);
        long totalResults = results.size();

        // Paginate
        int page = request.getPage() != null ? request.getPage() : 1;
        int pageSize = request.getPageSize() != null ? request.getPageSize() : 20;
        int fromIndex = (page - 1) * pageSize;
        int toIndex = Math.min(fromIndex + pageSize, results.size());

        List<Dish> paginatedResults = fromIndex < results.size()
                ? results.subList(fromIndex, toIndex)
                : Collections.emptyList();

        long queryTimeMs = System.currentTimeMillis() - startTime;

        log.info("Dish search completed: query='{}', results={}, time={}ms",
                request.getQuery(), totalResults, queryTimeMs);

        return SearchResponse.builder()
                .dishes(paginatedResults)
                .totalResults(totalResults)
                .page(page)
                .pageSize(pageSize)
                .totalPages((int) Math.ceil((double) totalResults / pageSize))
                .queryTimeMs(queryTimeMs)
                .provider("MOCK")
                .build();
    }

    /**
     * Gets a restaurant by ID.
     */
    public Optional<Restaurant> getRestaurantById(String id) {
        return restaurantRepository.findById(id);
    }

    /**
     * Gets a dish by ID.
     */
    public Optional<Dish> getDishById(String id) {
        return dishRepository.findById(id);
    }

    /**
     * Gets all dishes for a restaurant (menu).
     */
    public List<Dish> getMenuByRestaurantId(String restaurantId) {
        return dishRepository.findByRestaurantId(restaurantId);
    }

    /**
     * Gets all restaurants.
     */
    public List<Restaurant> getAllRestaurants() {
        return restaurantRepository.findAll();
    }

    /**
     * Gets all dishes.
     */
    public List<Dish> getAllDishes() {
        return dishRepository.findAll();
    }

    /**
     * Checks dish availability.
     */
    public boolean isDishAvailable(String dishId) {
        return dishRepository.isAvailable(dishId);
    }

    /**
     * Gets available search filters based on the current dataset.
     */
    public List<Filter> getAvailableFilters(String query) {
        List<Filter> filters = new ArrayList<>();

        // Cuisine filter
        Map<String, Long> cuisineCounts = restaurantRepository.getCuisineCounts();
        Filter cuisineFilter = Filter.builder()
                .name("cuisine")
                .displayName("Cuisine")
                .type("MULTI_SELECT")
                .options(cuisineCounts.entrySet().stream()
                        .map(e -> Filter.FilterOption.builder()
                                .value(e.getKey())
                                .displayValue(e.getKey())
                                .count(e.getValue())
                                .build())
                        .sorted(Comparator.comparing(Filter.FilterOption::getCount).reversed())
                        .collect(Collectors.toList()))
                .build();
        filters.add(cuisineFilter);

        // Price Range filter
        Map<Integer, Long> priceRangeCounts = restaurantRepository.getPriceRangeCounts();
        Filter priceRangeFilter = Filter.builder()
                .name("priceRange")
                .displayName("Price Range")
                .type("SINGLE_SELECT")
                .options(priceRangeCounts.entrySet().stream()
                        .map(e -> Filter.FilterOption.builder()
                                .value(String.valueOf(e.getKey()))
                                .displayValue("$".repeat(e.getKey()))
                                .count(e.getValue())
                                .build())
                        .sorted(Comparator.comparing(o -> Integer.parseInt(o.getValue())))
                        .collect(Collectors.toList()))
                .build();
        filters.add(priceRangeFilter);

        // Dietary Tags filter
        Map<String, Long> dietaryTagCounts = dishRepository.getDietaryTagCounts();
        Filter dietaryFilter = Filter.builder()
                .name("dietaryTags")
                .displayName("Dietary Options")
                .type("MULTI_SELECT")
                .options(dietaryTagCounts.entrySet().stream()
                        .map(e -> Filter.FilterOption.builder()
                                .value(e.getKey())
                                .displayValue(e.getKey())
                                .count(e.getValue())
                                .build())
                        .sorted(Comparator.comparing(Filter.FilterOption::getCount).reversed())
                        .collect(Collectors.toList()))
                .build();
        filters.add(dietaryFilter);

        // Category filter
        Map<String, Long> categoryCounts = dishRepository.getCategoryCounts();
        Filter categoryFilter = Filter.builder()
                .name("category")
                .displayName("Category")
                .type("MULTI_SELECT")
                .options(categoryCounts.entrySet().stream()
                        .map(e -> Filter.FilterOption.builder()
                                .value(e.getKey())
                                .displayValue(e.getKey())
                                .count(e.getValue())
                                .build())
                        .sorted(Comparator.comparing(Filter.FilterOption::getCount).reversed())
                        .collect(Collectors.toList()))
                .build();
        filters.add(categoryFilter);

        // Rating filter
        Filter ratingFilter = Filter.builder()
                .name("minRating")
                .displayName("Minimum Rating")
                .type("SINGLE_SELECT")
                .options(List.of(
                        Filter.FilterOption.builder().value("4.5").displayValue("4.5+ Stars").count(0).build(),
                        Filter.FilterOption.builder().value("4.0").displayValue("4.0+ Stars").count(0).build(),
                        Filter.FilterOption.builder().value("3.5").displayValue("3.5+ Stars").count(0).build(),
                        Filter.FilterOption.builder().value("3.0").displayValue("3.0+ Stars").count(0).build()
                ))
                .build();
        filters.add(ratingFilter);

        return filters;
    }
}
