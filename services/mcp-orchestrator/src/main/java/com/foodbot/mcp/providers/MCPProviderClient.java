package com.foodbot.mcp.providers;

import com.foodbot.mcp.model.Dish;
import com.foodbot.mcp.model.Restaurant;
import com.foodbot.mcp.model.SearchRequest;
import com.foodbot.mcp.model.SearchResponse;

import java.util.List;
import java.util.Optional;

/**
 * Interface for MCP provider clients.
 * All providers (Mock, Swiggy, Zomato) must implement this interface.
 */
public interface MCPProviderClient {

    /**
     * Returns the provider name.
     */
    String getName();

    /**
     * Checks whether this provider is enabled.
     */
    boolean isEnabled();

    /**
     * Performs a health check on this provider.
     *
     * @return true if the provider is healthy
     */
    boolean healthCheck();

    /**
     * Searches for restaurants based on the search request.
     *
     * @param request the search request
     * @return search response containing matching restaurants
     */
    SearchResponse searchRestaurants(SearchRequest request);

    /**
     * Searches for dishes based on the search request.
     *
     * @param request the search request
     * @return search response containing matching dishes
     */
    SearchResponse searchDishes(SearchRequest request);

    /**
     * Gets a restaurant by its ID.
     *
     * @param id the restaurant ID
     * @return the restaurant if found
     */
    Optional<Restaurant> getRestaurantById(String id);

    /**
     * Gets a dish by its ID.
     *
     * @param id the dish ID
     * @return the dish if found
     */
    Optional<Dish> getDishById(String id);

    /**
     * Gets all dishes for a restaurant.
     *
     * @param restaurantId the restaurant ID
     * @return list of dishes
     */
    List<Dish> getDishesByRestaurantId(String restaurantId);

    /**
     * Gets all restaurants.
     *
     * @return list of all restaurants
     */
    List<Restaurant> getAllRestaurants();

    /**
     * Gets all dishes.
     *
     * @return list of all dishes
     */
    List<Dish> getAllDishes();
}
