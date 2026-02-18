package com.foodbot.mcp.providers.zomato;

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
 * Zomato MCP provider client stub.
 * This is a placeholder for future Zomato API integration.
 */
@Slf4j
@Component
public class ZomatoMCPClient implements MCPProviderClient {

    @Value("${mcp.providers.zomato.enabled:false}")
    private boolean enabled;

    @Value("${mcp.providers.zomato.base-url:https://api.zomato.com/mcp}")
    private String baseUrl;

    @Override
    public String getName() {
        return "zomato";
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }

    @Override
    public boolean healthCheck() {
        // Stub: always return false until Zomato integration is implemented
        log.debug("Zomato health check: not implemented");
        return false;
    }

    @Override
    public SearchResponse searchRestaurants(SearchRequest request) {
        log.warn("Zomato searchRestaurants not implemented");
        return SearchResponse.builder()
                .restaurants(Collections.emptyList())
                .provider("zomato")
                .error("Zomato integration not yet implemented")
                .build();
    }

    @Override
    public SearchResponse searchDishes(SearchRequest request) {
        log.warn("Zomato searchDishes not implemented");
        return SearchResponse.builder()
                .dishes(Collections.emptyList())
                .provider("zomato")
                .error("Zomato integration not yet implemented")
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
