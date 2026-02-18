package com.foodbot.mcp.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Represents the search response containing restaurants, dishes, filters, and metadata.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SearchResponse implements Serializable {

    private static final long serialVersionUID = 1L;

    @Builder.Default
    private List<Restaurant> restaurants = new ArrayList<>();

    @Builder.Default
    private List<Dish> dishes = new ArrayList<>();

    @Builder.Default
    private List<Filter> filters = new ArrayList<>();

    private long totalResults;

    private int page;

    private int pageSize;

    private int totalPages;

    private long queryTimeMs;

    private String provider;

    @Builder.Default
    private Map<String, Object> metadata = new HashMap<>();

    private String error;

    private boolean cached;

    /**
     * Checks whether the search response contains any results.
     */
    public boolean hasResults() {
        return (restaurants != null && !restaurants.isEmpty())
                || (dishes != null && !dishes.isEmpty());
    }

    /**
     * Calculates the total number of pages based on total results and page size.
     */
    public int calculateTotalPages() {
        if (pageSize <= 0) return 0;
        return (int) Math.ceil((double) totalResults / pageSize);
    }
}
