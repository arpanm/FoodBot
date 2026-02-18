package com.foodbot.mcp.providers.mock;

import com.foodbot.mcp.model.Dish;
import com.foodbot.mcp.model.Restaurant;
import com.foodbot.mcp.model.SearchRequest;
import com.foodbot.mcp.model.SearchResponse;
import com.foodbot.mcp.providers.MCPProviderClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * Mock MCP provider client implementation.
 * Provides pre-generated restaurant and dish data for development and testing.
 * Contains 54 restaurants across 10 cuisine categories and 500+ dishes.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MockMCPClient implements MCPProviderClient {

    private final MockMCPService mockMCPService;

    @Value("${mcp.providers.mock.enabled:true}")
    private boolean enabled;

    @Override
    public String getName() {
        return "mock";
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }

    @Override
    public boolean healthCheck() {
        try {
            // Mock provider is always healthy as long as data is loaded
            return !mockMCPService.getAllRestaurants().isEmpty();
        } catch (Exception e) {
            log.error("Mock provider health check failed", e);
            return false;
        }
    }

    @Override
    public SearchResponse searchRestaurants(SearchRequest request) {
        log.debug("Mock provider: searching restaurants with query='{}'", request.getQuery());
        return mockMCPService.searchRestaurants(request);
    }

    @Override
    public SearchResponse searchDishes(SearchRequest request) {
        log.debug("Mock provider: searching dishes with query='{}'", request.getQuery());
        return mockMCPService.searchDishes(request);
    }

    @Override
    public Optional<Restaurant> getRestaurantById(String id) {
        return mockMCPService.getRestaurantById(id);
    }

    @Override
    public Optional<Dish> getDishById(String id) {
        return mockMCPService.getDishById(id);
    }

    @Override
    public List<Dish> getDishesByRestaurantId(String restaurantId) {
        return mockMCPService.getMenuByRestaurantId(restaurantId);
    }

    @Override
    public List<Restaurant> getAllRestaurants() {
        return mockMCPService.getAllRestaurants();
    }

    @Override
    public List<Dish> getAllDishes() {
        return mockMCPService.getAllDishes();
    }
}
