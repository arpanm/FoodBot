package com.foodbot.mcp.model;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.List;

/**
 * Represents a search request with query parameters, filters, and pagination.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchRequest implements Serializable {

    private static final long serialVersionUID = 1L;

    private String query;

    private String cuisine;

    private List<String> cuisines;

    @Min(0)
    @Max(5)
    private Double minRating;

    @Min(1)
    @Max(4)
    private Integer priceRange;

    private GeoLocation location;

    @Builder.Default
    private Double radius = 5.0; // km

    private Double maxPrice;

    private List<String> dietaryTags;

    private String category;

    private String sortBy; // relevance, rating, distance, deliveryTime, price

    @Builder.Default
    private String sortOrder = "desc";

    @Builder.Default
    @Min(1)
    private Integer page = 1;

    @Builder.Default
    @Min(1)
    @Max(100)
    private Integer pageSize = 20;

    private Boolean availableOnly;

    private Integer maxDeliveryTime;

    /**
     * Generates a cache key for this search request.
     */
    public String cacheKey() {
        return String.format("search:%s:%s:%s:%s:%d:%d",
                nullSafe(query),
                nullSafe(cuisine),
                nullSafe(minRating),
                nullSafe(priceRange),
                page != null ? page : 1,
                pageSize != null ? pageSize : 20);
    }

    private String nullSafe(Object obj) {
        return obj != null ? obj.toString() : "null";
    }
}
