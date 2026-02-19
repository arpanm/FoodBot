package com.foodbot.mcp.repository;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.FieldValue;
import co.elastic.clients.elasticsearch._types.SortOrder;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch.core.search.Hit;
import co.elastic.clients.json.JsonData;
import com.foodbot.mcp.exception.SearchException;
import com.foodbot.mcp.model.Dish;
import com.foodbot.mcp.model.SearchRequest;
import com.foodbot.mcp.model.SearchResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Elasticsearch repository for dish search operations.
 * Provides full-text search, ingredient-based search, dietary restriction filtering,
 * and similar dish recommendations.
 */
@Slf4j
@Repository
@RequiredArgsConstructor
public class DishSearchRepository {

    private final ElasticsearchClient client;

    @Value("${elasticsearch.indices.dishes.name:dishes}")
    private String indexName;

    /**
     * Searches dishes using full-text search with filters.
     *
     * @param request the search request with query, filters, and pagination
     * @return search response with matching dishes
     */
    public SearchResponse search(SearchRequest request) {
        try {
            int page = request.getPage() != null ? request.getPage() : 1;
            int pageSize = request.getPageSize() != null ? request.getPageSize() : 20;
            int from = (page - 1) * pageSize;

            Query query = buildDishQuery(request);
            String sortBy = request.getSortBy();
            String sortOrder = request.getSortOrder();

            var searchResponse = client.search(s -> {
                s.index(indexName)
                        .from(from)
                        .size(pageSize)
                        .query(query);

                applySorting(s, sortBy, sortOrder);
                return s;
            }, Dish.class);

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
            log.error("Elasticsearch dish search failed", e);
            throw new SearchException("Dish search failed: " + e.getMessage(), e);
        }
    }

    /**
     * Searches dishes by ingredients.
     *
     * @param ingredients list of ingredients to search for
     * @param page        page number (1-based)
     * @param pageSize    results per page
     * @return search response with matching dishes
     */
    public SearchResponse searchByIngredients(List<String> ingredients, int page, int pageSize) {
        try {
            int from = (page - 1) * pageSize;

            var searchResponse = client.search(s -> s
                            .index(indexName)
                            .from(from)
                            .size(pageSize)
                            .query(q -> q.bool(b -> {
                                for (String ingredient : ingredients) {
                                    b.should(sh -> sh.match(m -> m
                                            .field("ingredients")
                                            .query(ingredient)
                                    ));
                                }
                                b.minimumShouldMatch("1");
                                b.filter(f -> f.term(t -> t.field("available").value(true)));
                                return b;
                            }))
                            .sort(so -> so.score(sc -> sc.order(SortOrder.Desc))),
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
            log.error("Elasticsearch ingredient search failed", e);
            throw new SearchException("Ingredient search failed: " + e.getMessage(), e);
        }
    }

    /**
     * Searches dishes by dietary restriction tags.
     *
     * @param restrictions list of dietary restriction tags (e.g., Vegetarian, Vegan)
     * @param page         page number (1-based)
     * @param pageSize     results per page
     * @return search response with matching dishes
     */
    public SearchResponse searchByDietaryRestrictions(List<String> restrictions,
                                                      int page, int pageSize) {
        try {
            int from = (page - 1) * pageSize;

            var searchResponse = client.search(s -> s
                            .index(indexName)
                            .from(from)
                            .size(pageSize)
                            .query(q -> q.bool(b -> {
                                b.filter(f -> f.terms(t -> t
                                        .field("dietaryTags")
                                        .terms(tv -> tv.value(
                                                restrictions.stream()
                                                        .map(FieldValue::of)
                                                        .collect(Collectors.toList())
                                        ))
                                ));
                                b.filter(f -> f.term(t -> t.field("available").value(true)));
                                return b;
                            }))
                            .sort(so -> so.field(f -> f.field("rating").order(SortOrder.Desc))),
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
            log.error("Elasticsearch dietary restriction search failed", e);
            throw new SearchException("Dietary restriction search failed: " + e.getMessage(), e);
        }
    }

    /**
     * Finds dishes similar to a given dish using more-like-this query.
     *
     * @param dishId   the reference dish ID
     * @param limit    maximum number of similar dishes to return
     * @return search response with similar dishes
     */
    public SearchResponse findSimilarDishes(String dishId, int limit) {
        try {
            var searchResponse = client.search(s -> s
                            .index(indexName)
                            .size(limit)
                            .query(q -> q.moreLikeThis(mlt -> mlt
                                    .fields("name", "description", "ingredients", "category")
                                    .like(l -> l.document(d -> d
                                            .index(indexName)
                                            .id(dishId)
                                    ))
                                    .minTermFreq(1)
                                    .maxQueryTerms(12)
                                    .minDocFreq(1)
                            )),
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
                    .page(1)
                    .pageSize(limit)
                    .totalPages(1)
                    .provider("ELASTICSEARCH_MLT")
                    .build();

        } catch (IOException e) {
            log.error("Elasticsearch similar dishes search failed for dishId={}", dishId, e);
            throw new SearchException("Similar dishes search failed: " + e.getMessage(), e);
        }
    }

    /**
     * Indexes a dish document.
     */
    public void index(Dish dish) throws IOException {
        client.index(i -> i
                .index(indexName)
                .id(dish.getId())
                .document(dish)
        );
    }

    /**
     * Deletes a dish document from the index.
     */
    public void delete(String dishId) throws IOException {
        client.delete(d -> d
                .index(indexName)
                .id(dishId)
        );
    }

    /**
     * Updates the availability field for a dish.
     */
    public void updateAvailability(String dishId, boolean available) throws IOException {
        client.update(u -> u
                        .index(indexName)
                        .id(dishId)
                        .doc(java.util.Map.of("available", available)),
                Dish.class
        );
    }

    /**
     * Checks whether the dish index exists.
     */
    public boolean indexExists() throws IOException {
        return client.indices().exists(e -> e.index(indexName)).value();
    }

    /**
     * Builds a bool query from the search request parameters.
     */
    private Query buildDishQuery(SearchRequest request) {
        return Query.of(q -> q.bool(b -> {
            if (request.getQuery() != null && !request.getQuery().isEmpty()) {
                b.should(sh -> sh.match(m -> m
                        .field("name")
                        .query(request.getQuery())
                        .boost(2.0f)
                ));
                b.should(sh -> sh.match(m -> m
                        .field("description")
                        .query(request.getQuery())
                ));
                b.should(sh -> sh.match(m -> m
                        .field("ingredients")
                        .query(request.getQuery())
                ));
                b.minimumShouldMatch("1");
            }

            if (request.getCategory() != null && !request.getCategory().isEmpty()) {
                b.filter(f -> f.term(t -> t.field("category").value(request.getCategory())));
            }

            if (request.getDietaryTags() != null && !request.getDietaryTags().isEmpty()) {
                List<String> tags = request.getDietaryTags();
                b.filter(f -> f.terms(t -> t
                        .field("dietaryTags")
                        .terms(tv -> tv.value(
                                tags.stream()
                                        .map(FieldValue::of)
                                        .collect(Collectors.toList())
                        ))
                ));
            }

            if (request.getMaxPrice() != null) {
                Double maxPrice = request.getMaxPrice();
                b.filter(f -> f.range(r -> r
                        .field("price")
                        .lte(JsonData.of(maxPrice))
                ));
            }

            if (request.getAvailableOnly() != null && request.getAvailableOnly()) {
                b.filter(f -> f.term(t -> t.field("available").value(true)));
            }

            return b;
        }));
    }

    /**
     * Applies sorting to the Elasticsearch search request builder.
     */
    private void applySorting(
            co.elastic.clients.elasticsearch.core.SearchRequest.Builder s,
            String sortBy,
            String sortOrder
    ) {
        SortOrder order = "asc".equalsIgnoreCase(sortOrder) ? SortOrder.Asc : SortOrder.Desc;

        if (sortBy != null) {
            switch (sortBy) {
                case "price":
                    s.sort(so -> so.field(f -> f.field("price").order(order)));
                    break;
                case "rating":
                    s.sort(so -> so.field(f -> f.field("rating").order(order)));
                    break;
                case "popularity":
                    s.sort(so -> so.field(f -> f.field("reviewCount").order(SortOrder.Desc)));
                    break;
                default:
                    s.sort(so -> so.score(sc -> sc.order(SortOrder.Desc)));
            }
        } else {
            s.sort(so -> so.score(sc -> sc.order(SortOrder.Desc)));
        }
    }
}
