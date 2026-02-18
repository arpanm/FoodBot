package com.foodbot.mcp.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Represents a restaurant with all its details including location, menu, ratings, and operating hours.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class Restaurant implements Serializable {

    private static final long serialVersionUID = 1L;

    private String id;

    @NotBlank(message = "Restaurant name is required")
    private String name;

    private String description;

    @Builder.Default
    private List<String> cuisine = new ArrayList<>();

    @Min(0)
    @Max(5)
    private double rating;

    private int reviewCount;

    @Min(1)
    @Max(4)
    private int priceRange; // 1=$, 2=$$, 3=$$$, 4=$$$$

    private GeoLocation location;

    private int deliveryTime; // minutes

    private double minimumOrder;

    private double deliveryFee;

    private OperatingHours operatingHours;

    @Builder.Default
    private boolean available = true;

    private String imageUrl;

    private String address;

    private String phone;

    private String provider; // MOCK, SWIGGY, ZOMATO

    @Builder.Default
    private List<String> tags = new ArrayList<>();

    @Builder.Default
    private List<String> features = new ArrayList<>(); // e.g., "Free Delivery", "Pure Veg"

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Instant createdAt;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Instant updatedAt;

    /**
     * Returns the price range as a human-readable string.
     */
    public String getPriceRangeLabel() {
        return switch (priceRange) {
            case 1 -> "$";
            case 2 -> "$$";
            case 3 -> "$$$";
            case 4 -> "$$$$";
            default -> "$";
        };
    }

    /**
     * Checks whether the restaurant is currently accepting orders.
     */
    public boolean isAcceptingOrders() {
        return available && (operatingHours == null || operatingHours.isCurrentlyOpen());
    }
}
