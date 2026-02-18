package com.foodbot.mcp.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * Represents nutritional information for a dish.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NutritionalInfo implements Serializable {

    private static final long serialVersionUID = 1L;

    private int calories;
    private double protein;     // grams
    private double carbs;       // grams
    private double fat;         // grams
    private double fiber;       // grams
    private double sugar;       // grams
    private double sodium;      // milligrams
    private String servingSize;
}
