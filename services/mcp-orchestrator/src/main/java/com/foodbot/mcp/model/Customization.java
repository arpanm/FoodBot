package com.foodbot.mcp.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.List;

/**
 * Represents a customization option for a dish (e.g., size, toppings, spice level).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Customization implements Serializable {

    private static final long serialVersionUID = 1L;

    private String name;
    private List<String> options;
    private double additionalPrice;
    private boolean required;

    /**
     * Convenience constructor for simple customizations without additional price.
     */
    public Customization(String name, List<String> options) {
        this.name = name;
        this.options = options;
        this.additionalPrice = 0.0;
        this.required = false;
    }
}
