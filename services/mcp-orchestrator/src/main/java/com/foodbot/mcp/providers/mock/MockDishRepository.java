package com.foodbot.mcp.providers.mock;

import com.foodbot.mcp.model.Dish;
import com.foodbot.mcp.model.SearchRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.stream.Collectors;

/**
 * In-memory repository for mock dish data.
 * Supports searching, filtering, and pagination.
 */
@Slf4j
@Repository
@RequiredArgsConstructor
public class MockDishRepository {

    private final MockDataGenerator dataGenerator;

    public Optional<Dish> findById(String id) {
        return dataGenerator.getDishes().stream()
                .filter(d -> d.getId().equals(id))
                .findFirst();
    }

    public List<Dish> findAll() {
        return dataGenerator.getDishes();
    }

    public List<Dish> findByRestaurantId(String restaurantId) {
        return dataGenerator.getDishes().stream()
                .filter(d -> d.getRestaurantId().equals(restaurantId))
                .collect(Collectors.toList());
    }

    public List<Dish> search(SearchRequest request) {
        List<Dish> results = dataGenerator.getDishes().stream()
                .filter(d -> matchesQuery(d, request.getQuery()))
                .filter(d -> matchesCategory(d, request.getCategory()))
                .filter(d -> matchesDietaryTags(d, request.getDietaryTags()))
                .filter(d -> matchesMaxPrice(d, request.getMaxPrice()))
                .filter(d -> matchesAvailability(d, request.getAvailableOnly()))
                .collect(Collectors.toList());

        // Sort results
        results = sortResults(results, request.getSortBy(), request.getSortOrder());

        return results;
    }

    public long count(SearchRequest request) {
        return search(request).size();
    }

    public List<String> getDistinctCategories() {
        return dataGenerator.getDishes().stream()
                .map(Dish::getCategory)
                .filter(Objects::nonNull)
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }

    public List<String> getDistinctDietaryTags() {
        return dataGenerator.getDishes().stream()
                .flatMap(d -> d.getDietaryTags().stream())
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }

    public Map<String, Long> getCategoryCounts() {
        return dataGenerator.getDishes().stream()
                .filter(d -> d.getCategory() != null)
                .collect(Collectors.groupingBy(Dish::getCategory, Collectors.counting()));
    }

    public Map<String, Long> getDietaryTagCounts() {
        return dataGenerator.getDishes().stream()
                .flatMap(d -> d.getDietaryTags().stream())
                .collect(Collectors.groupingBy(t -> t, Collectors.counting()));
    }

    public boolean isAvailable(String dishId) {
        return findById(dishId).map(Dish::isAvailable).orElse(false);
    }

    private boolean matchesQuery(Dish dish, String query) {
        if (query == null || query.isBlank()) return true;
        String lowerQuery = query.toLowerCase();
        return dish.getName().toLowerCase().contains(lowerQuery)
                || (dish.getDescription() != null && dish.getDescription().toLowerCase().contains(lowerQuery))
                || (dish.getCategory() != null && dish.getCategory().toLowerCase().contains(lowerQuery))
                || (dish.getSubcategory() != null && dish.getSubcategory().toLowerCase().contains(lowerQuery))
                || dish.getIngredients().stream().anyMatch(i -> i.toLowerCase().contains(lowerQuery));
    }

    private boolean matchesCategory(Dish dish, String category) {
        if (category == null || category.isBlank()) return true;
        return category.equalsIgnoreCase(dish.getCategory())
                || category.equalsIgnoreCase(dish.getSubcategory());
    }

    private boolean matchesDietaryTags(Dish dish, List<String> dietaryTags) {
        if (dietaryTags == null || dietaryTags.isEmpty()) return true;
        return dietaryTags.stream().allMatch(
                tag -> dish.getDietaryTags().stream().anyMatch(dt -> dt.equalsIgnoreCase(tag))
        );
    }

    private boolean matchesMaxPrice(Dish dish, Double maxPrice) {
        if (maxPrice == null) return true;
        return dish.getPrice() <= maxPrice;
    }

    private boolean matchesAvailability(Dish dish, Boolean availableOnly) {
        if (availableOnly == null || !availableOnly) return true;
        return dish.isAvailable();
    }

    private List<Dish> sortResults(List<Dish> results, String sortBy, String sortOrder) {
        if (sortBy == null || sortBy.isBlank()) sortBy = "relevance";

        Comparator<Dish> comparator = switch (sortBy.toLowerCase()) {
            case "price" -> Comparator.comparingDouble(Dish::getPrice);
            case "rating" -> Comparator.comparingDouble(Dish::getRating);
            case "popularity", "reviews" -> Comparator.comparingInt(Dish::getReviewCount);
            case "preparation_time", "preparationtime" -> Comparator.comparingInt(Dish::getPreparationTime);
            default -> Comparator.comparingDouble(Dish::getRating); // default: by rating
        };

        if ("desc".equalsIgnoreCase(sortOrder) || sortOrder == null) {
            comparator = comparator.reversed();
        }

        return results.stream().sorted(comparator).collect(Collectors.toList());
    }
}
