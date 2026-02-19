package com.foodbot.mcp.controller;

import com.foodbot.mcp.model.GeoLocation;
import com.foodbot.mcp.model.SearchRequest;
import com.foodbot.mcp.model.SearchResponse;
import com.foodbot.mcp.search.RestaurantSearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for restaurant search operations.
 * Provides full-text search, geo-spatial search, cuisine filtering,
 * rating filtering, and autocomplete suggestions.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/search/restaurants")
@RequiredArgsConstructor
@Tag(name = "Restaurant Search", description = "Advanced restaurant search with Elasticsearch")
public class RestaurantSearchController {

    private final RestaurantSearchService restaurantSearchService;

    @GetMapping
    @Operation(
            summary = "Search restaurants",
            description = "Full-text search for restaurants with filters, geo-location, and pagination"
    )
    public ResponseEntity<SearchResponse> searchRestaurants(
            @Parameter(description = "Search query text")
            @RequestParam(required = false) String q,
            @Parameter(description = "Filter by cuisine type")
            @RequestParam(required = false) String cuisine,
            @Parameter(description = "Latitude for geo-search")
            @RequestParam(required = false) Double lat,
            @Parameter(description = "Longitude for geo-search")
            @RequestParam(required = false) Double lon,
            @Parameter(description = "Search radius in km (default: 5)")
            @RequestParam(required = false, defaultValue = "5") Double radius,
            @Parameter(description = "Minimum rating (0-5)")
            @RequestParam(required = false) Double minRating,
            @Parameter(description = "Price range (1-4)")
            @RequestParam(required = false) Integer priceRange,
            @Parameter(description = "Maximum delivery time in minutes")
            @RequestParam(required = false) Integer maxDeliveryTime,
            @Parameter(description = "Sort by (relevance, rating, distance, deliveryTime, price)")
            @RequestParam(required = false) String sortBy,
            @Parameter(description = "Page number (1-based)")
            @RequestParam(required = false, defaultValue = "1") Integer page,
            @Parameter(description = "Results per page (max 100)")
            @RequestParam(required = false, defaultValue = "20") Integer pageSize
    ) {
        log.info("Restaurant search: q='{}', cuisine='{}', lat={}, lon={}, radius={}, page={}",
                q, cuisine, lat, lon, radius, page);

        SearchRequest filters = SearchRequest.builder()
                .cuisine(cuisine)
                .minRating(minRating)
                .priceRange(priceRange)
                .location(lat != null && lon != null ? new GeoLocation(lat, lon) : null)
                .radius(radius)
                .maxDeliveryTime(maxDeliveryTime)
                .availableOnly(true)
                .sortBy(sortBy)
                .build();

        SearchResponse response = restaurantSearchService.searchRestaurants(
                q, filters, page, pageSize);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/suggestions")
    @Operation(
            summary = "Autocomplete suggestions",
            description = "Get restaurant name suggestions based on input prefix"
    )
    public ResponseEntity<List<String>> getSuggestions(
            @Parameter(description = "Text prefix for autocomplete")
            @RequestParam String prefix
    ) {
        log.info("Autocomplete suggestions: prefix='{}'", prefix);

        List<String> suggestions = restaurantSearchService.autocompleteSuggestions(prefix);
        return ResponseEntity.ok(suggestions);
    }

    @GetMapping("/nearby")
    @Operation(
            summary = "Search nearby restaurants",
            description = "Find restaurants near a geographic location within a radius"
    )
    public ResponseEntity<SearchResponse> searchNearby(
            @Parameter(description = "Latitude", required = true)
            @RequestParam Double lat,
            @Parameter(description = "Longitude", required = true)
            @RequestParam Double lon,
            @Parameter(description = "Search radius in km (default: 5, max: 100)")
            @RequestParam(required = false, defaultValue = "5") Double radius,
            @Parameter(description = "Page number (1-based)")
            @RequestParam(required = false, defaultValue = "1") Integer page,
            @Parameter(description = "Results per page")
            @RequestParam(required = false, defaultValue = "20") Integer pageSize
    ) {
        log.info("Nearby search: lat={}, lon={}, radius={}km, page={}", lat, lon, radius, page);

        SearchResponse response = restaurantSearchService.searchByLocation(
                lat, lon, radius, page, pageSize);

        return ResponseEntity.ok(response);
    }
}
