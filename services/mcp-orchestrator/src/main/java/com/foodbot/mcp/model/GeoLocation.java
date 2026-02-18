package com.foodbot.mcp.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * Represents a geographic location with latitude and longitude coordinates.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeoLocation implements Serializable {

    private static final long serialVersionUID = 1L;

    private double lat;
    private double lon;

    /**
     * Calculates the distance in kilometers between this location and another using the Haversine formula.
     *
     * @param other the other location
     * @return distance in kilometers
     */
    public double distanceTo(GeoLocation other) {
        final double R = 6371.0; // Earth radius in km
        double latDistance = Math.toRadians(other.lat - this.lat);
        double lonDistance = Math.toRadians(other.lon - this.lon);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(this.lat)) * Math.cos(Math.toRadians(other.lat))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Validates that the coordinates are within valid ranges.
     *
     * @return true if coordinates are valid
     */
    public boolean isValid() {
        return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
    }
}
