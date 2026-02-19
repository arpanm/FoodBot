package com.foodbot.mcp.repository;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.FieldValue;
import co.elastic.clients.elasticsearch._types.SortOrder;
import co.elastic.clients.elasticsearch._types.aggregations.StringTermsBucket;
import co.elastic.clients.elasticsearch.core.search.Hit;
import co.elastic.clients.json.JsonData;
import com.foodbot.mcp.exception.SearchException;
import com.foodbot.mcp.model.Dish;
import com.foodbot.mcp.model.Filter;
import com.foodbot.mcp.model.SearchResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Elasticsearch repository for menu item search operations.
 * Provides restaurant-scoped menu search with category aggregations and faceted filtering.
 */
@Slf4j
@Repository
@RequiredArgsConstructor
public class MenuSearchRepository {

    private static final String FIELD_RESTAURANT_ID = "restaurantId";
    private static final String FIELD_AVAILABLE = "available";
    private static final String FIELD_CATEGORY = "category";
    private static final String FIELD_RATING = "rating";
    private static final String AGG_CATEGORIES = "categories";
    private static final String AGG_DIETARY = "dietary_tags";

    private final ElasticsearchClient client;

    @Value("${elasticsearch.indices.dishes.name:dishes}")
    private String indexName;

    /**
     * Searches menu items for a specific restaurant.
     *
     * @param restaurantId the restaurant ID to scope the search
     * @param query        optional text query
     * @param category     optional category filter
     * @param page         page number (1-based)
     * @param pageSize     results per page
     * @return search response with matching menu items
     */
    public SearchResponse searchMenu(String restaurantId, String query,
                                     String category, int page, int pageSize) {
        try {
            int from = (page - 1) * pageSize;

            var searchResponse = client.search(s -> s
                            .index(indexName)
                            .from(from)
                            .size(pageSize)
                            .query(q -> q.bool(b -> {
                                b.filter(f -> f.term(t -> t
                                        .field(FIELD_RESTAURANT_ID)
                                        .value(restaurantId)
                                ));
                                b.filter(f -> f.term(t -> t
                                        .field(FIELD_AVAILABLE)
                                        .value(true)
                                ));

                                if (query != null && !query.isEmpty()) {
                                    b.should(sh -> sh.match(m -> m
                                            .field("name")
                                            .query(query)
                                            .boost(2.0f)
                                    ));
                                    b.should(sh -> sh.match(m -> m
                                            .field("description")
                                            .query(query)
                                    ));
                                    b.minimumShouldMatch("1");
                                }

                                if (category != null && !category.isEmpty()) {
                                    b.filter(f -> f.term(t -> t
                                            .field(FIELD_CATEGORY)
                                            .value(category)
                                    ));
                                }

                                return b;
                            }))
                            .sort(so -> so.field(f -> f.field(FIELD_CATEGORY).order(SortOrder.Asc)))
                            .sort(so -> so.field(f -> f.field(FIELD_RATING).order(SortOrder.Desc))),
                    Dish.class
            );

            List<Dish> dishes = searchResponse.hits().hits().stream()
                    .map(Hit::source)
                    .collect(Collectors.toList());

            long totalResults = searchResponse.hits().total() != null
                    ? searchResponse.hits().total().value()
                    : 0;

            return SearchResponse.builder()
                    .dishes(dishes)
                    .totalResults(totalResults)
                    .page(page)
                    .pageSize(pageSize)
                    .totalPages((int) Math.ceil((double) totalResults / pageSize))
                    .provider("ELASTICSEARCH")
                    .build();

        } catch (IOException e) {
            log.error("Elasticsearch menu search failed for restaurant={}", restaurantId, e);
            throw new SearchException("Menu search failed: " + e.getMessage(), e);
        }
    }

    /**
     * Gets menu category aggregations for a restaurant.
     * Returns category names with document counts for faceted navigation.
     *
     * @param restaurantId the restaurant ID
     * @return list of filters with category counts
     */
    public List<Filter> getMenuCategories(String restaurantId) {
        try {
            var searchResponse = client.search(s -> s
                            .index(indexName)
                            .size(0)
                            .query(q -> q.bool(b -> b
                                    .filter(f -> f.term(t -> t
                                            .field(FIELD_RESTAURANT_ID)
                                            .value(restaurantId)
                                    ))
                                    .filter(f -> f.term(t -> t
                                            .field(FIELD_AVAILABLE)
                                            .value(true)
                                    ))
                            ))
                            .aggregations(AGG_CATEGORIES, a -> a
                                    .terms(t -> t.field(FIELD_CATEGORY).size(50))
                            )
                            .aggregations(AGG_DIETARY, a -> a
                                    .terms(t -> t.field("dietaryTags").size(20))
                            ),
                    Dish.class
            );

            List<Filter> filters = new ArrayList<>();

            var categoryAgg = searchResponse.aggregations().get(AGG_CATEGORIES);
            if (categoryAgg != null && categoryAgg.isSterms()) {
                List<Filter.FilterOption> categoryOptions = categoryAgg.sterms().buckets()
                        .array().stream()
                        .map(bucket -> Filter.FilterOption.builder()
                                .value(bucket.key().stringValue())
                                .displayValue(bucket.key().stringValue())
                                .count(bucket.docCount())
                                .build()
                        )
                        .collect(Collectors.toList());

                filters.add(Filter.builder()
                        .name("category")
                        .displayName("Category")
                        .type("SINGLE_SELECT")
                        .options(categoryOptions)
                        .build()
                );
            }

            var dietaryAgg = searchResponse.aggregations().get(AGG_DIETARY);
            if (dietaryAgg != null && dietaryAgg.isSterms()) {
                List<Filter.FilterOption> dietaryOptions = dietaryAgg.sterms().buckets()
                        .array().stream()
                        .map(bucket -> Filter.FilterOption.builder()
                                .value(bucket.key().stringValue())
                                .displayValue(bucket.key().stringValue())
                                .count(bucket.docCount())
                                .build()
                        )
                        .collect(Collectors.toList());

                filters.add(Filter.builder()
                        .name("dietaryTags")
                        .displayName("Dietary Options")
                        .type("MULTI_SELECT")
                        .options(dietaryOptions)
                        .build()
                );
            }

            return filters;

        } catch (IOException e) {
            log.error("Failed to get menu categories for restaurant={}", restaurantId, e);
            return List.of();
        }
    }

    /**
     * Gets the best-selling dishes for a restaurant.
     *
     * @param restaurantId the restaurant ID
     * @param limit        maximum number of dishes
     * @return list of best-selling dishes
     */
    public List<Dish> getBestSellers(String restaurantId, int limit) {
        try {
            var searchResponse = client.search(s -> s
                            .index(indexName)
                            .size(limit)
                            .query(q -> q.bool(b -> b
                                    .filter(f -> f.term(t -> t
                                            .field(FIELD_RESTAURANT_ID)
                                            .value(restaurantId)
                                    ))
                                    .filter(f -> f.term(t -> t
                                            .field(FIELD_AVAILABLE)
                                            .value(true)
                                    ))
                                    .filter(f -> f.term(t -> t
                                            .field("bestSeller")
                                            .value(true)
                                    ))
                            ))
                            .sort(so -> so.field(f -> f.field(FIELD_RATING).order(SortOrder.Desc))),
                    Dish.class
            );

            return searchResponse.hits().hits().stream()
                    .map(Hit::source)
                    .collect(Collectors.toList());

        } catch (IOException e) {
            log.error("Failed to get best sellers for restaurant={}", restaurantId, e);
            return List.of();
        }
    }
}
