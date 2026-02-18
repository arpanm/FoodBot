package com.foodbot.mcp.providers.swiggy;

import com.foodbot.mcp.model.Dish;
import com.foodbot.mcp.model.Restaurant;
import com.foodbot.mcp.model.SearchRequest;
import com.foodbot.mcp.model.SearchResponse;
import com.foodbot.mcp.providers.MCPProviderClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

/**
 * Swiggy MCP provider client stub.
 * This is a placeholder for future Swiggy API integration.
 */
@Slf4j
@Component
public class SwiggyMCPClient implements MCPProviderClient {

    @Value("${mcp.providers.swiggy.enabled:false}")
    private boolean enabled;

    @Value("${mcp.providers.swiggy.base-url:https://api.swiggy.com/mcp}")
    private String baseUrl;

    @Override
    public String getName() {
        return "swiggy";
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }

    @Override
    public boolean healthCheck() {
        // Stub: always return false until Swiggy integration is implemented
        log.debug("Swiggy health check: not implemented");
        return false;
    }

    @Override
    public SearchResponse searchRestaurants(SearchRequest request) {
        log.warn("Swiggy searchRestaurants not implemented");
        return SearchResponse.builder()
                .restaurants(Collections.emptyList())
                .provider("swiggy")
                .error("Swiggy integration not yet implemented")
                .build();
    }

    @Override
    public SearchResponse searchDishes(SearchRequest request) {
        log.warn("Swiggy searchDishes not implemented");
        return SearchResponse.builder()
                .dishes(Collections.emptyList())
                .provider("swiggy")
                .error("Swiggy integration not yet implemented")
                .build();
    }

    @Override
    public Optional<Restaurant> getRestaurantById(String id) {
        return Optional.empty();
    }

    @Override
    public Optional<Dish> getDishById(String id) {
        return Optional.empty();
    }

    @Override
    public List<Dish> getDishesByRestaurantId(String restaurantId) {
        return Collections.emptyList();
    }

    @Override
    public List<Restaurant> getAllRestaurants() {
        return Collections.emptyList();
    }

    @Override
    public List<Dish> getAllDishes() {
        return Collections.emptyList();
    }
}
