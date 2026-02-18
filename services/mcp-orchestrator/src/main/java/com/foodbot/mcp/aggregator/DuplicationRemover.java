package com.foodbot.mcp.aggregator;

import com.foodbot.mcp.model.Restaurant;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Removes duplicate restaurants from aggregated results.
 * Uses fuzzy name matching and geographic proximity to identify duplicates.
 */
@Slf4j
@Component
public class DuplicationRemover {

    private static final double LOCATION_THRESHOLD_KM = 0.1; // 100 meters
    private static final int NAME_DISTANCE_THRESHOLD = 3; // Levenshtein distance

    /**
     * Removes duplicate restaurants from the list.
     * Two restaurants are considered duplicates if:
     * - Their names are similar (Levenshtein distance < 3), AND
     * - Their locations are within 100 meters of each other
     *
     * When duplicates are found, the one with the higher rating is kept.
     *
     * @param restaurants list of restaurants that may contain duplicates
     * @return deduplicated list of restaurants
     */
    public List<Restaurant> removeDuplicates(List<Restaurant> restaurants) {
        if (restaurants == null || restaurants.size() <= 1) {
            return restaurants != null ? restaurants : Collections.emptyList();
        }

        List<Restaurant> unique = new ArrayList<>();
        Set<Integer> removedIndices = new HashSet<>();

        for (int i = 0; i < restaurants.size(); i++) {
            if (removedIndices.contains(i)) continue;

            Restaurant current = restaurants.get(i);
            boolean isDuplicate = false;

            for (int j = 0; j < unique.size(); j++) {
                Restaurant existing = unique.get(j);
                if (areDuplicates(current, existing)) {
                    // Keep the one with higher rating / more reviews
                    if (current.getRating() > existing.getRating() ||
                            (current.getRating() == existing.getRating() &&
                                    current.getReviewCount() > existing.getReviewCount())) {
                        unique.set(j, mergeRestaurants(current, existing));
                    } else {
                        unique.set(j, mergeRestaurants(existing, current));
                    }
                    isDuplicate = true;
                    break;
                }
            }

            if (!isDuplicate) {
                unique.add(current);
            }
        }

        int removed = restaurants.size() - unique.size();
        if (removed > 0) {
            log.info("Removed {} duplicate restaurants", removed);
        }

        return unique;
    }

    /**
     * Checks if two restaurants are duplicates.
     */
    private boolean areDuplicates(Restaurant a, Restaurant b) {
        // Check name similarity
        if (!areNamesSimilar(a.getName(), b.getName())) {
            return false;
        }

        // Check location proximity if both have locations
        if (a.getLocation() != null && b.getLocation() != null) {
            double distance = a.getLocation().distanceTo(b.getLocation());
            return distance <= LOCATION_THRESHOLD_KM;
        }

        // If same name but no location data, consider them duplicates
        return a.getName().equalsIgnoreCase(b.getName());
    }

    /**
     * Checks if two restaurant names are similar using Levenshtein distance.
     */
    private boolean areNamesSimilar(String name1, String name2) {
        if (name1 == null || name2 == null) return false;
        String n1 = name1.toLowerCase().trim();
        String n2 = name2.toLowerCase().trim();

        if (n1.equals(n2)) return true;

        return levenshteinDistance(n1, n2) <= NAME_DISTANCE_THRESHOLD;
    }

    /**
     * Merges two duplicate restaurant entries, keeping the primary's data
     * and supplementing with secondary's data where primary is missing.
     */
    private Restaurant mergeRestaurants(Restaurant primary, Restaurant secondary) {
        // Take the higher review count and rating
        if (secondary.getReviewCount() > primary.getReviewCount()) {
            primary.setReviewCount(secondary.getReviewCount());
        }

        // Merge cuisine lists
        Set<String> cuisines = new LinkedHashSet<>(primary.getCuisine());
        cuisines.addAll(secondary.getCuisine());
        primary.setCuisine(new ArrayList<>(cuisines));

        // Merge features
        if (primary.getFeatures() != null && secondary.getFeatures() != null) {
            Set<String> features = new LinkedHashSet<>(primary.getFeatures());
            features.addAll(secondary.getFeatures());
            primary.setFeatures(new ArrayList<>(features));
        }

        return primary;
    }

    /**
     * Calculates the Levenshtein distance between two strings.
     */
    private int levenshteinDistance(String s1, String s2) {
        int[][] dp = new int[s1.length() + 1][s2.length() + 1];

        for (int i = 0; i <= s1.length(); i++) dp[i][0] = i;
        for (int j = 0; j <= s2.length(); j++) dp[0][j] = j;

        for (int i = 1; i <= s1.length(); i++) {
            for (int j = 1; j <= s2.length(); j++) {
                int cost = s1.charAt(i - 1) == s2.charAt(j - 1) ? 0 : 1;
                dp[i][j] = Math.min(Math.min(
                        dp[i - 1][j] + 1,
                        dp[i][j - 1] + 1),
                        dp[i - 1][j - 1] + cost);
            }
        }

        return dp[s1.length()][s2.length()];
    }
}
