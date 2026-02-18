package com.foodbot.mcp.aggregator;

import com.foodbot.mcp.model.Restaurant;
import com.foodbot.mcp.model.SearchRequest;
import com.foodbot.mcp.model.SearchResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Aggregates search results from multiple MCP providers.
 * Merges, deduplicates, normalizes, and ranks results before returning.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ResultAggregator {

    private final DuplicationRemover duplicationRemover;
    private final ResultNormalizer resultNormalizer;
    private final ResultRanker resultRanker;

    /**
     * Aggregates results from multiple provider responses.
     *
     * @param responses list of search responses from different providers
     * @param request the original search request
     * @return aggregated and ranked search response
     */
    public SearchResponse aggregateResults(List<SearchResponse> responses, SearchRequest request) {
        long startTime = System.currentTimeMillis();

        // 1. Merge all restaurants from all responses
        List<Restaurant> allRestaurants = responses.stream()
                .filter(r -> r.getRestaurants() != null)
                .flatMap(r -> r.getRestaurants().stream())
                .collect(Collectors.toList());

        log.debug("Aggregating {} restaurants from {} providers",
                allRestaurants.size(), responses.size());

        // 2. Remove duplicates (by name + location proximity)
        List<Restaurant> uniqueRestaurants = duplicationRemover.removeDuplicates(allRestaurants);
        log.debug("After deduplication: {} restaurants", uniqueRestaurants.size());

        // 3. Normalize data formats
        List<Restaurant> normalizedRestaurants = resultNormalizer.normalize(uniqueRestaurants);

        // 4. Rank by relevance
        List<Restaurant> rankedRestaurants = resultRanker.rank(normalizedRestaurants, request);

        // 5. Paginate
        int page = request.getPage() != null ? request.getPage() : 1;
        int pageSize = request.getPageSize() != null ? request.getPageSize() : 20;
        long totalResults = rankedRestaurants.size();
        int fromIndex = (page - 1) * pageSize;
        int toIndex = Math.min(fromIndex + pageSize, rankedRestaurants.size());

        List<Restaurant> paginatedResults = fromIndex < rankedRestaurants.size()
                ? rankedRestaurants.subList(fromIndex, toIndex)
                : new ArrayList<>();

        long queryTimeMs = System.currentTimeMillis() - startTime;

        // Collect provider names
        String providers = responses.stream()
                .filter(r -> r.getProvider() != null)
                .map(SearchResponse::getProvider)
                .distinct()
                .collect(Collectors.joining(", "));

        log.info("Aggregation complete: {} total results, page {}/{}, {}ms",
                totalResults, page, (int) Math.ceil((double) totalResults / pageSize), queryTimeMs);

        return SearchResponse.builder()
                .restaurants(paginatedResults)
                .totalResults(totalResults)
                .page(page)
                .pageSize(pageSize)
                .totalPages((int) Math.ceil((double) totalResults / pageSize))
                .queryTimeMs(queryTimeMs)
                .provider(providers)
                .build();
    }
}
