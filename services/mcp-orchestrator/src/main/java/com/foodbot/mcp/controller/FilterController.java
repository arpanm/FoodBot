package com.foodbot.mcp.controller;

import com.foodbot.mcp.model.Filter;
import com.foodbot.mcp.providers.mock.MockMCPService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for search filter operations.
 * Provides available filters with counts for the search UI.
 */
@Slf4j
@RestController
@RequestMapping("/filters")
@RequiredArgsConstructor
@Tag(name = "Filters", description = "Search filter and facet operations")
public class FilterController {

    private final MockMCPService mockMCPService;

    @GetMapping
    @Operation(summary = "Get available filters", description = "Returns available search filters with option counts")
    @Cacheable(value = "filters")
    public ResponseEntity<List<Filter>> getFilters(
            @Parameter(description = "Optional search query to narrow filters")
            @RequestParam(required = false) String query
    ) {
        log.info("Getting available filters for query: '{}'", query);
        List<Filter> filters = mockMCPService.getAvailableFilters(query);
        return ResponseEntity.ok(filters);
    }
}
