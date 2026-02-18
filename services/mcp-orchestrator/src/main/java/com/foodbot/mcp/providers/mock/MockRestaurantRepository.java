package com.foodbot.mcp.providers.mock;

import com.foodbot.mcp.model.Restaurant;
import com.foodbot.mcp.model.SearchRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.stream.Collectors;

/**
 * In-memory repository for mock restaurant data.
 * Supports searching, filtering, and pagination.
 */
@Slf4j
@Repository
@RequiredArgsConstructor
public class MockRestaurantRepository {

    private final MockDataGenerator dataGenerator;

    public Optional<Restaurant> findById(String id) {
        return dataGenerator.getRestaurants().stream()
                .filter(r -> r.getId().equals(id))
                .findFirst();
    }

    public List<Restaurant> findAll() {
        return dataGenerator.getRestaurants();
    }

    public List<Restaurant> search(SearchRequest request) {
        List<Restaurant> results = dataGenerator.getRestaurants().stream()
                .filter(r -> matchesQuery(r, request.getQuery()))
                .filter(r -> matchesCuisine(r, request.getCuisine(), request.getCuisines()))
                .filter(r -> matchesRating(r, request.getMinRating()))
                .filter(r -> matchesPriceRange(r, request.getPriceRange()))
                .filter(r -> matchesAvailability(r, request.getAvailableOnly()))
                .filter(r -> matchesDeliveryTime(r, request.getMaxDeliveryTime()))
                .filter(r -> matchesLocation(r, request))
                .collect(Collectors.toList());

        // Sort results
        results = sortResults(results, request.getSortBy(), request.getSortOrder());

        return results;
    }

    public long count(SearchRequest request) {
        return search(request).size();
    }

    public List<String> getDistinctCuisines() {
        return dataGenerator.getRestaurants().stream()
                .flatMap(r -> r.getCuisine().stream())
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }

    public Map<String, Long> getCuisineCounts() {
        return dataGenerator.getRestaurants().stream()
                .flatMap(r -> r.getCuisine().stream())
                .collect(Collectors.groupingBy(c -> c, Collectors.counting()));
    }

    public Map<Integer, Long> getPriceRangeCounts() {
        return dataGenerator.getRestaurants().stream()
                .collect(Collectors.groupingBy(Restaurant::getPriceRange, Collectors.counting()));
    }

    private boolean matchesQuery(Restaurant restaurant, String query) {
        if (query == null || query.isBlank()) return true;
        String lowerQuery = query.toLowerCase();
        return restaurant.getName().toLowerCase().contains(lowerQuery)
                || (restaurant.getDescription() != null && restaurant.getDescription().toLowerCase().contains(lowerQuery))
                || restaurant.getCuisine().stream().anyMatch(c -> c.toLowerCase().contains(lowerQuery))
                || (restaurant.getTags() != null && restaurant.getTags().stream().anyMatch(t -> t.toLowerCase().contains(lowerQuery)));
    }

    private boolean matchesCuisine(Restaurant restaurant, String cuisine, List<String> cuisines) {
        if ((cuisine == null || cuisine.isBlank()) && (cuisines == null || cuisines.isEmpty())) return true;

        if (cuisine != null && !cuisine.isBlank()) {
            return restaurant.getCuisine().stream()
                    .anyMatch(c -> c.equalsIgnoreCase(cuisine));
        }

        if (cuisines != null && !cuisines.isEmpty()) {
            return restaurant.getCuisine().stream()
                    .anyMatch(c -> cuisines.stream().anyMatch(fc -> fc.equalsIgnoreCase(c)));
        }

        return true;
    }

    private boolean matchesRating(Restaurant restaurant, Double minRating) {
        if (minRating == null) return true;
        return restaurant.getRating() >= minRating;
    }

    private boolean matchesPriceRange(Restaurant restaurant, Integer priceRange) {
        if (priceRange == null) return true;
        return restaurant.getPriceRange() == priceRange;
    }

    private boolean matchesAvailability(Restaurant restaurant, Boolean availableOnly) {
        if (availableOnly == null || !availableOnly) return true;
        return restaurant.isAvailable();
    }

    private boolean matchesDeliveryTime(Restaurant restaurant, Integer maxDeliveryTime) {
        if (maxDeliveryTime == null) return true;
        return restaurant.getDeliveryTime() <= maxDeliveryTime;
    }

    private boolean matchesLocation(Restaurant restaurant, SearchRequest request) {
        if (request.getLocation() == null || restaurant.getLocation() == null) return true;
        double distance = request.getLocation().distanceTo(restaurant.getLocation());
        double radius = request.getRadius() != null ? request.getRadius() : 5.0;
        return distance <= radius;
    }

    private List<Restaurant> sortResults(List<Restaurant> results, String sortBy, String sortOrder) {
        if (sortBy == null || sortBy.isBlank()) sortBy = "relevance";

        Comparator<Restaurant> comparator = switch (sortBy.toLowerCase()) {
            case "rating" -> Comparator.comparingDouble(Restaurant::getRating);
            case "deliverytime", "delivery_time" -> Comparator.comparingInt(Restaurant::getDeliveryTime);
            case "price", "pricerange" -> Comparator.comparingInt(Restaurant::getPriceRange);
            case "reviews", "popularity" -> Comparator.comparingInt(Restaurant::getReviewCount);
            default -> Comparator.comparingDouble(Restaurant::getRating); // default: by rating
        };

        if ("desc".equalsIgnoreCase(sortOrder) || sortOrder == null) {
            comparator = comparator.reversed();
        }

        return results.stream().sorted(comparator).collect(Collectors.toList());
    }
}
