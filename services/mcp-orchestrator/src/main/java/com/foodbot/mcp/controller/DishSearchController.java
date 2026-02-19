package com.foodbot.mcp.controller;

import com.foodbot.mcp.model.SearchRequest;
import com.foodbot.mcp.model.SearchResponse;
import com.foodbot.mcp.search.DishSearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for dish search operations.
 * Provides full-text search, dietary restriction filtering,
 * ingredient-based search, and similar dish recommendations.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/search/dishes")
@RequiredArgsConstructor
@Tag(name = "Dish Search", description = "Advanced dish search with Elasticsearch")
public class DishSearchController {

    private final DishSearchService dishSearchService;

    @GetMapping
    @Operation(
            summary = "Search dishes",
            description = "Full-text search for dishes with dietary filters and pagination"
    )
    public ResponseEntity<SearchResponse> searchDishes(
            @Parameter(description = "Search query text")
            @RequestParam(required = false) String q,
            @Parameter(description = "Filter by dietary restrictions (Vegetarian, Vegan, Gluten-Free, Halal)")
            @RequestParam(required = false) List<String> dietary,
            @Parameter(description = "Filter by category (Appetizer, Main Course, Dessert, Beverage)")
            @RequestParam(required = false) String category,
            @Parameter(description = "Maximum price")
            @RequestParam(required = false) Double maxPrice,
            @Parameter(description = "Sort by (relevance, price, rating, popularity)")
            @RequestParam(required = false) String sortBy,
            @Parameter(description = "Page number (1-based)")
            @RequestParam(required = false, defaultValue = "1") Integer page,
            @Parameter(description = "Results per page (max 100)")
            @RequestParam(required = false, defaultValue = "20") Integer pageSize
    ) {
        log.info("Dish search: q='{}', dietary={}, category='{}', maxPrice={}, page={}",
                q, dietary, category, maxPrice, page);

        SearchRequest filters = SearchRequest.builder()
                .category(category)
                .dietaryTags(dietary)
                .maxPrice(maxPrice)
                .availableOnly(true)
                .sortBy(sortBy)
                .page(page)
                .pageSize(pageSize)
                .build();

        SearchResponse response = dishSearchService.searchDishes(q, filters);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/similar/{id}")
    @Operation(
            summary = "Find similar dishes",
            description = "Get dishes similar to a given dish based on name, description, and ingredients"
    )
    public ResponseEntity<SearchResponse> findSimilarDishes(
            @Parameter(description = "Dish ID to find similar dishes for", required = true)
            @PathVariable String id
    ) {
        log.info("Similar dishes: dishId={}", id);

        SearchResponse response = dishSearchService.similarDishes(id);
        return ResponseEntity.ok(response);
    }
}
