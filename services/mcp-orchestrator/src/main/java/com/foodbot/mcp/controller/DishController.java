package com.foodbot.mcp.controller;

import com.foodbot.mcp.model.Dish;
import com.foodbot.mcp.providers.mock.MockMCPService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for dish operations.
 * Provides dish details, availability checks, and listing endpoints.
 */
@Slf4j
@RestController
@RequestMapping("/dishes")
@RequiredArgsConstructor
@Tag(name = "Dishes", description = "Dish detail and availability operations")
public class DishController {

    private final MockMCPService mockMCPService;

    @GetMapping
    @Operation(summary = "List all dishes", description = "Returns all available dishes")
    public ResponseEntity<List<Dish>> getAllDishes() {
        List<Dish> dishes = mockMCPService.getAllDishes();
        log.info("Returning {} dishes", dishes.size());
        return ResponseEntity.ok(dishes);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get dish details", description = "Returns detailed information about a dish")
    public ResponseEntity<Dish> getDish(
            @Parameter(description = "Dish ID") @PathVariable String id
    ) {
        log.info("Getting dish details: {}", id);
        return mockMCPService.getDishById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/availability")
    @Operation(summary = "Check dish availability", description = "Checks whether a dish is currently available for order")
    public ResponseEntity<Map<String, Object>> checkAvailability(
            @Parameter(description = "Dish ID") @PathVariable String id
    ) {
        log.info("Checking availability for dish: {}", id);

        if (mockMCPService.getDishById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        boolean available = mockMCPService.isDishAvailable(id);
        return ResponseEntity.ok(Map.of(
                "dishId", id,
                "available", available
        ));
    }
}
