package com.foodbot.mcp.aggregator;

import com.foodbot.mcp.model.Restaurant;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Normalizes restaurant data from different providers to a consistent format.
 * Ensures data quality by trimming strings, validating ranges, and filling defaults.
 */
@Slf4j
@Component
public class ResultNormalizer {

    /**
     * Normalizes a list of restaurants to ensure consistent data format.
     *
     * @param restaurants list of restaurants to normalize
     * @return normalized list of restaurants
     */
    public List<Restaurant> normalize(List<Restaurant> restaurants) {
        return restaurants.stream()
                .map(this::normalizeRestaurant)
                .collect(Collectors.toList());
    }

    /**
     * Normalizes a single restaurant entry.
     */
    private Restaurant normalizeRestaurant(Restaurant restaurant) {
        // Trim strings
        if (restaurant.getName() != null) {
            restaurant.setName(restaurant.getName().trim());
        }
        if (restaurant.getDescription() != null) {
            restaurant.setDescription(restaurant.getDescription().trim());
        }
        if (restaurant.getAddress() != null) {
            restaurant.setAddress(restaurant.getAddress().trim());
        }

        // Validate and clamp rating to 0-5 range
        if (restaurant.getRating() < 0) {
            restaurant.setRating(0);
        } else if (restaurant.getRating() > 5) {
            restaurant.setRating(5.0);
        }

        // Validate price range (1-4)
        if (restaurant.getPriceRange() < 1) {
            restaurant.setPriceRange(1);
        } else if (restaurant.getPriceRange() > 4) {
            restaurant.setPriceRange(4);
        }

        // Ensure non-negative values
        if (restaurant.getDeliveryTime() < 0) {
            restaurant.setDeliveryTime(0);
        }
        if (restaurant.getMinimumOrder() < 0) {
            restaurant.setMinimumOrder(0);
        }
        if (restaurant.getDeliveryFee() < 0) {
            restaurant.setDeliveryFee(0);
        }
        if (restaurant.getReviewCount() < 0) {
            restaurant.setReviewCount(0);
        }

        // Normalize cuisine names (capitalize first letter)
        if (restaurant.getCuisine() != null) {
            restaurant.setCuisine(
                    restaurant.getCuisine().stream()
                            .map(this::capitalizeCuisine)
                            .collect(Collectors.toList())
            );
        }

        return restaurant;
    }

    /**
     * Capitalizes the first letter of a cuisine name.
     */
    private String capitalizeCuisine(String cuisine) {
        if (cuisine == null || cuisine.isBlank()) return cuisine;
        return cuisine.substring(0, 1).toUpperCase() + cuisine.substring(1);
    }
}
