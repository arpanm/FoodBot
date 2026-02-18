package com.foodbot.mcp.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

/**
 * Represents a search filter with available options and counts.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Filter implements Serializable {

    private static final long serialVersionUID = 1L;

    private String name;        // e.g., "cuisine", "priceRange", "dietaryTags"
    private String displayName; // e.g., "Cuisine", "Price Range", "Dietary Options"
    private String type;        // SINGLE_SELECT, MULTI_SELECT, RANGE, BOOLEAN

    @Builder.Default
    private List<FilterOption> options = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FilterOption implements Serializable {

        private static final long serialVersionUID = 1L;

        private String value;
        private String displayValue;
        private long count;
        private boolean selected;
    }
}
