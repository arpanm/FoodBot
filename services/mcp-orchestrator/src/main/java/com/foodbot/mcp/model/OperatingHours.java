package com.foodbot.mcp.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalTime;

/**
 * Represents the operating hours for a restaurant.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OperatingHours implements Serializable {

    private static final long serialVersionUID = 1L;

    private String openTime;
    private String closeTime;
    private boolean is24Hours;
    private boolean mondayOpen;
    private boolean tuesdayOpen;
    private boolean wednesdayOpen;
    private boolean thursdayOpen;
    private boolean fridayOpen;
    private boolean saturdayOpen;
    private boolean sundayOpen;

    /**
     * Creates an all-day, every-day operating hours configuration.
     */
    public static OperatingHours allDay() {
        return OperatingHours.builder()
                .openTime("00:00")
                .closeTime("23:59")
                .is24Hours(true)
                .mondayOpen(true)
                .tuesdayOpen(true)
                .wednesdayOpen(true)
                .thursdayOpen(true)
                .fridayOpen(true)
                .saturdayOpen(true)
                .sundayOpen(true)
                .build();
    }

    /**
     * Creates standard lunch and dinner hours (11 AM - 11 PM).
     */
    public static OperatingHours lunchAndDinner() {
        return OperatingHours.builder()
                .openTime("11:00")
                .closeTime("23:00")
                .is24Hours(false)
                .mondayOpen(true)
                .tuesdayOpen(true)
                .wednesdayOpen(true)
                .thursdayOpen(true)
                .fridayOpen(true)
                .saturdayOpen(true)
                .sundayOpen(true)
                .build();
    }

    /**
     * Creates dinner-only hours (5 PM - 11 PM).
     */
    public static OperatingHours dinnerOnly() {
        return OperatingHours.builder()
                .openTime("17:00")
                .closeTime("23:00")
                .is24Hours(false)
                .mondayOpen(true)
                .tuesdayOpen(true)
                .wednesdayOpen(true)
                .thursdayOpen(true)
                .fridayOpen(true)
                .saturdayOpen(true)
                .sundayOpen(true)
                .build();
    }

    /**
     * Creates brunch and lunch hours (9 AM - 5 PM).
     */
    public static OperatingHours brunchAndLunch() {
        return OperatingHours.builder()
                .openTime("09:00")
                .closeTime("17:00")
                .is24Hours(false)
                .mondayOpen(true)
                .tuesdayOpen(true)
                .wednesdayOpen(true)
                .thursdayOpen(true)
                .fridayOpen(true)
                .saturdayOpen(true)
                .sundayOpen(true)
                .build();
    }

    /**
     * Checks if the restaurant is currently open based on operating hours.
     *
     * @return true if currently open
     */
    public boolean isCurrentlyOpen() {
        if (is24Hours) {
            return true;
        }
        try {
            LocalTime now = LocalTime.now();
            LocalTime open = LocalTime.parse(openTime);
            LocalTime close = LocalTime.parse(closeTime);
            return !now.isBefore(open) && !now.isAfter(close);
        } catch (Exception e) {
            return false;
        }
    }
}
