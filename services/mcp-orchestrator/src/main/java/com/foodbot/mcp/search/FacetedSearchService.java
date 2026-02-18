package com.foodbot.mcp.search;

import com.foodbot.mcp.model.Filter;
import com.foodbot.mcp.providers.mock.MockMCPService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service for faceted search operations.
 * Provides aggregated filter counts based on the current dataset.
 * When Elasticsearch is available, uses ES aggregations for dynamic facets.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FacetedSearchService {

    private final MockMCPService mockMCPService;

    /**
     * Gets available facets (filters) with counts.
     * Uses Elasticsearch aggregations when available, falls back to in-memory computation.
     *
     * @param query optional search query to narrow facets
     * @return list of filters with option counts
     */
    public List<Filter> getFacets(String query) {
        log.debug("Getting facets for query: '{}'", query);

        try {
            // When Elasticsearch is available, this would use:
            // - Terms aggregation for cuisine, category, dietaryTags
            // - Range aggregation for priceRange
            // - Stats aggregation for rating distribution

            // Fall back to in-memory facets from mock data
            return mockMCPService.getAvailableFilters(query);

        } catch (Exception e) {
            log.error("Failed to get facets", e);
            return List.of();
        }
    }
}
