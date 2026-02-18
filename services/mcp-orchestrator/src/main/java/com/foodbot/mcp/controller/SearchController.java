package com.foodbot.mcp.controller;

import com.foodbot.mcp.model.GeoLocation;
import com.foodbot.mcp.model.SearchRequest;
import com.foodbot.mcp.model.SearchResponse;
import com.foodbot.mcp.providers.mock.MockMCPService;
import com.foodbot.mcp.router.ProviderRouter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for restaurant and dish search operations.
 * Provides full-text search with filters, pagination, and geo-spatial queries.
 */
@Slf4j
@RestController
@RequestMapping("/restaurants/search")
@RequiredArgsConstructor
@Tag(name = "Search", description = "Restaurant and dish search operations")
public class SearchController {

    private final MockMCPService mockMCPService;
    private final ProviderRouter providerRouter;

    @GetMapping
    @Operation(summary = "Search restaurants", description = "Full-text search for restaurants with filters and pagination")
    public ResponseEntity<SearchResponse> searchRestaurants(
            @Parameter(description = "Search query text")
            @RequestParam(required = false) String query,
            @Parameter(description = "Filter by cuisine type")
            @RequestParam(required = false) String cuisine,
            @Parameter(description = "Minimum restaurant rating (0-5)")
            @RequestParam(required = false) Double minRating,
            @Parameter(description = "Price range filter (1-4)")
            @RequestParam(required = false) Integer priceRange,
            @Parameter(description = "Latitude for geo-search")
            @RequestParam(required = false) Double lat,
            @Parameter(description = "Longitude for geo-search")
            @RequestParam(required = false) Double lon,
            @Parameter(description = "Search radius in km (default: 5)")
            @RequestParam(required = false, defaultValue = "5") Double radius,
            @Parameter(description = "Maximum delivery time in minutes")
            @RequestParam(required = false) Integer maxDeliveryTime,
            @Parameter(description = "Sort by field (relevance, rating, deliveryTime, price)")
            @RequestParam(required = false) String sortBy,
            @Parameter(description = "Page number (1-based)")
            @RequestParam(required = false, defaultValue = "1") Integer page,
            @Parameter(description = "Results per page (max 100)")
            @RequestParam(required = false, defaultValue = "20") Integer pageSize
    ) {
        SearchRequest request = SearchRequest.builder()
                .query(query)
                .cuisine(cuisine)
                .minRating(minRating)
                .priceRange(priceRange)
                .location(lat != null && lon != null ? new GeoLocation(lat, lon) : null)
                .radius(radius)
                .maxDeliveryTime(maxDeliveryTime)
                .sortBy(sortBy)
                .page(page)
                .pageSize(pageSize)
                .build();

        log.info("Restaurant search: query='{}', cuisine='{}', minRating={}, page={}", query, cuisine, minRating, page);

        // Use mock service directly for reliable results
        SearchResponse response = mockMCPService.searchRestaurants(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/dishes")
    @Operation(summary = "Search dishes", description = "Search dishes by name, category, dietary tags, or ingredients")
    public ResponseEntity<SearchResponse> searchDishes(
            @Parameter(description = "Search query text")
            @RequestParam(required = false) String query,
            @Parameter(description = "Filter by category (Appetizer, Main Course, Dessert, Beverage, Side)")
            @RequestParam(required = false) String category,
            @Parameter(description = "Filter by dietary tags (Vegetarian, Vegan, Gluten-Free, Halal, Kosher)")
            @RequestParam(required = false) List<String> dietaryTags,
            @Parameter(description = "Maximum price")
            @RequestParam(required = false) Double maxPrice,
            @Parameter(description = "Sort by field (relevance, price, rating, popularity)")
            @RequestParam(required = false) String sortBy,
            @Parameter(description = "Page number (1-based)")
            @RequestParam(required = false, defaultValue = "1") Integer page,
            @Parameter(description = "Results per page (max 100)")
            @RequestParam(required = false, defaultValue = "20") Integer pageSize
    ) {
        SearchRequest request = SearchRequest.builder()
                .query(query)
                .category(category)
                .dietaryTags(dietaryTags)
                .maxPrice(maxPrice)
                .sortBy(sortBy)
                .page(page)
                .pageSize(pageSize)
                .build();

        log.info("Dish search: query='{}', category='{}', dietaryTags={}, page={}", query, category, dietaryTags, page);

        SearchResponse response = mockMCPService.searchDishes(request);
        return ResponseEntity.ok(response);
    }
}
