package com.foodbot.mcp.aggregator;

import com.foodbot.mcp.model.Restaurant;
import com.foodbot.mcp.model.SearchRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Ranks search results based on multiple weighted factors.
 *
 * Ranking factors:
 * - Relevance score (50%): keyword match quality
 * - Rating (20%): restaurant rating
 * - Popularity (15%): number of reviews
 * - Distance (10%): proximity to user (if location provided)
 * - Delivery time (5%): faster delivery preferred
 */
@Slf4j
@Component
public class ResultRanker {

    private static final double RELEVANCE_WEIGHT = 0.50;
    private static final double RATING_WEIGHT = 0.20;
    private static final double POPULARITY_WEIGHT = 0.15;
    private static final double DISTANCE_WEIGHT = 0.10;
    private static final double DELIVERY_TIME_WEIGHT = 0.05;

    /**
     * Ranks restaurants based on the weighted scoring algorithm.
     *
     * @param restaurants list of restaurants to rank
     * @param request the search request (used for relevance and distance scoring)
     * @return ranked list of restaurants (highest score first)
     */
    public List<Restaurant> rank(List<Restaurant> restaurants, SearchRequest request) {
        return restaurants.stream()
                .sorted(Comparator.comparingDouble(
                        (Restaurant r) -> calculateScore(r, request)).reversed())
                .collect(Collectors.toList());
    }

    /**
     * Calculates the overall ranking score for a restaurant.
     *
     * @param restaurant the restaurant to score
     * @param request the search request
     * @return composite score between 0 and 1
     */
    private double calculateScore(Restaurant restaurant, SearchRequest request) {
        double relevanceScore = calculateRelevanceScore(restaurant, request);
        double ratingScore = calculateRatingScore(restaurant);
        double popularityScore = calculatePopularityScore(restaurant);
        double distanceScore = calculateDistanceScore(restaurant, request);
        double deliveryTimeScore = calculateDeliveryTimeScore(restaurant);

        return (relevanceScore * RELEVANCE_WEIGHT)
                + (ratingScore * RATING_WEIGHT)
                + (popularityScore * POPULARITY_WEIGHT)
                + (distanceScore * DISTANCE_WEIGHT)
                + (deliveryTimeScore * DELIVERY_TIME_WEIGHT);
    }

    /**
     * Calculates relevance score based on query keyword match.
     * Returns 1.0 for exact name match, 0.8 for partial match, 0.5 for cuisine/tag match.
     */
    private double calculateRelevanceScore(Restaurant restaurant, SearchRequest request) {
        if (request.getQuery() == null || request.getQuery().isBlank()) {
            return 0.5; // Neutral score when no query
        }

        String query = request.getQuery().toLowerCase();
        String name = restaurant.getName().toLowerCase();
        String description = restaurant.getDescription() != null
                ? restaurant.getDescription().toLowerCase() : "";

        if (name.equals(query)) return 1.0;
        if (name.contains(query)) return 0.8;
        if (description.contains(query)) return 0.6;

        // Check cuisine match
        if (restaurant.getCuisine() != null &&
                restaurant.getCuisine().stream().anyMatch(c -> c.toLowerCase().contains(query))) {
            return 0.5;
        }

        return 0.2; // Low relevance
    }

    /**
     * Calculates rating score normalized to 0-1 range.
     * Rating of 5.0 = 1.0, Rating of 0.0 = 0.0.
     */
    private double calculateRatingScore(Restaurant restaurant) {
        return restaurant.getRating() / 5.0;
    }

    /**
     * Calculates popularity score based on review count.
     * Uses logarithmic scaling to prevent extremely popular restaurants from dominating.
     */
    private double calculatePopularityScore(Restaurant restaurant) {
        if (restaurant.getReviewCount() <= 0) return 0.0;
        // Log scale: 1000 reviews = ~1.0, 100 reviews = ~0.67, 10 reviews = ~0.33
        return Math.min(1.0, Math.log10(restaurant.getReviewCount()) / 3.0);
    }

    /**
     * Calculates distance score (closer = higher score).
     * Returns 1.0 if no location is provided in the request.
     */
    private double calculateDistanceScore(Restaurant restaurant, SearchRequest request) {
        if (request.getLocation() == null || restaurant.getLocation() == null) {
            return 0.5; // Neutral score when no location
        }

        double distance = request.getLocation().distanceTo(restaurant.getLocation());
        double maxDistance = request.getRadius() != null ? request.getRadius() : 5.0;

        if (distance <= 0) return 1.0;
        if (distance >= maxDistance) return 0.0;

        return 1.0 - (distance / maxDistance);
    }

    /**
     * Calculates delivery time score (faster = higher score).
     * 20 min = 1.0, 60 min = 0.0.
     */
    private double calculateDeliveryTimeScore(Restaurant restaurant) {
        int deliveryTime = restaurant.getDeliveryTime();
        if (deliveryTime <= 20) return 1.0;
        if (deliveryTime >= 60) return 0.0;
        return 1.0 - ((double) (deliveryTime - 20) / 40.0);
    }
}
