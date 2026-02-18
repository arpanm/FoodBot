package com.foodbot.mcp.search;

import com.foodbot.mcp.model.GeoLocation;
import com.foodbot.mcp.model.Restaurant;
import com.foodbot.mcp.model.SearchResponse;
import com.foodbot.mcp.providers.mock.MockDataGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for geo-spatial search operations.
 * Provides location-based restaurant search using geo-distance queries.
 * Falls back to in-memory Haversine distance calculation when Elasticsearch is unavailable.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GeoSearchService {

    private final MockDataGenerator mockDataGenerator;

    /**
     * Searches for restaurants near a given location within a specified radius.
     *
     * @param center the center location
     * @param radiusKm search radius in kilometers
     * @param page page number (1-based)
     * @param pageSize results per page
     * @return search response with nearby restaurants sorted by distance
     */
    public SearchResponse searchNearby(GeoLocation center, double radiusKm, int page, int pageSize) {
        long startTime = System.currentTimeMillis();

        if (center == null || !center.isValid()) {
            throw new IllegalArgumentException("Invalid location coordinates");
        }

        if (radiusKm <= 0 || radiusKm > 100) {
            throw new IllegalArgumentException("Radius must be between 0 and 100 km");
        }

        log.debug("Geo search: center=({}, {}), radius={}km", center.getLat(), center.getLon(), radiusKm);

        try {
            // When Elasticsearch is available, use geo_distance query:
            // boolQuery.filter(f -> f.geoDistance(g -> g
            //     .field("location")
            //     .distance(radiusKm + "km")
            //     .location(loc -> loc.latlon(l -> l.lat(lat).lon(lon)))
            // ))

            // Fall back to in-memory Haversine distance calculation
            List<Restaurant> nearbyRestaurants = mockDataGenerator.getRestaurants().stream()
                    .filter(r -> r.getLocation() != null)
                    .filter(r -> center.distanceTo(r.getLocation()) <= radiusKm)
                    .sorted(Comparator.comparingDouble(r -> center.distanceTo(r.getLocation())))
                    .collect(Collectors.toList());

            long totalResults = nearbyRestaurants.size();

            // Paginate
            int fromIndex = (page - 1) * pageSize;
            int toIndex = Math.min(fromIndex + pageSize, nearbyRestaurants.size());
            List<Restaurant> paginatedResults = fromIndex < nearbyRestaurants.size()
                    ? nearbyRestaurants.subList(fromIndex, toIndex)
                    : Collections.emptyList();

            long queryTimeMs = System.currentTimeMillis() - startTime;

            log.info("Geo search completed: {} results in {}ms", totalResults, queryTimeMs);

            return SearchResponse.builder()
                    .restaurants(paginatedResults)
                    .totalResults(totalResults)
                    .page(page)
                    .pageSize(pageSize)
                    .totalPages((int) Math.ceil((double) totalResults / pageSize))
                    .queryTimeMs(queryTimeMs)
                    .provider("GEO_SEARCH")
                    .build();

        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Geo search failed", e);
            return SearchResponse.builder()
                    .restaurants(Collections.emptyList())
                    .totalResults(0)
                    .error("Geo search failed: " + e.getMessage())
                    .build();
        }
    }
}
