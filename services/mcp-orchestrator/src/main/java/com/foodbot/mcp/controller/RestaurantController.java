package com.foodbot.mcp.controller;

import com.foodbot.mcp.model.Dish;
import com.foodbot.mcp.model.Restaurant;
import com.foodbot.mcp.providers.mock.MockMCPService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for restaurant detail operations.
 * Provides restaurant details, menus, and listing endpoints.
 */
@Slf4j
@RestController
@RequestMapping("/restaurants")
@RequiredArgsConstructor
@Tag(name = "Restaurants", description = "Restaurant detail and menu operations")
public class RestaurantController {

    private final MockMCPService mockMCPService;

    @GetMapping
    @Operation(summary = "List all restaurants", description = "Returns all available restaurants")
    public ResponseEntity<List<Restaurant>> getAllRestaurants() {
        List<Restaurant> restaurants = mockMCPService.getAllRestaurants();
        log.info("Returning {} restaurants", restaurants.size());
        return ResponseEntity.ok(restaurants);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get restaurant details", description = "Returns detailed information about a restaurant")
    @Cacheable(value = "restaurant-details", key = "#id")
    public ResponseEntity<Restaurant> getRestaurant(
            @Parameter(description = "Restaurant ID") @PathVariable String id
    ) {
        log.info("Getting restaurant details: {}", id);
        return mockMCPService.getRestaurantById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/menu")
    @Operation(summary = "Get restaurant menu", description = "Returns all dishes for a restaurant")
    @Cacheable(value = "restaurant-menu", key = "#id")
    public ResponseEntity<List<Dish>> getMenu(
            @Parameter(description = "Restaurant ID") @PathVariable String id
    ) {
        log.info("Getting menu for restaurant: {}", id);

        // Verify restaurant exists
        if (mockMCPService.getRestaurantById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        List<Dish> menu = mockMCPService.getMenuByRestaurantId(id);
        return ResponseEntity.ok(menu);
    }
}
