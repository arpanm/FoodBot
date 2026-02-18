package com.foodbot.mcp.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
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
 * Represents a dish (menu item) with all its details including pricing, ingredients, and dietary tags.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class Dish implements Serializable {

    private static final long serialVersionUID = 1L;

    private String id;

    @NotBlank(message = "Restaurant ID is required")
    private String restaurantId;

    @NotBlank(message = "Dish name is required")
    private String name;

    private String description;

    private String category;      // Appetizer, Main Course, Dessert, Beverage, Side

    private String subcategory;   // Pizza, Burger, Sushi, etc.

    @Min(0)
    private double price;

    private String portionSize;   // e.g., "12 inch", "250g", "Regular"

    @Builder.Default
    private List<String> ingredients = new ArrayList<>();

    @Builder.Default
    private List<String> dietaryTags = new ArrayList<>(); // Vegetarian, Vegan, Gluten-free, Halal, Kosher

    @Builder.Default
    private List<Customization> customizations = new ArrayList<>();

    private NutritionalInfo nutritionalInfo;

    private int preparationTime; // minutes

    @Builder.Default
    private boolean available = true;

    private double rating;

    private int reviewCount;

    private String imageUrl;

    private boolean spicy;

    private int spiceLevel; // 0-5

    private boolean bestSeller;

    private boolean newItem;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Instant createdAt;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Instant updatedAt;
}
