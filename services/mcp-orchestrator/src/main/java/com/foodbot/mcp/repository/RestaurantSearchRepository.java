package com.foodbot.mcp.repository;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.DistanceUnit;
import co.elastic.clients.elasticsearch._types.FieldValue;
import co.elastic.clients.elasticsearch._types.SortOrder;
import co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch.core.search.Hit;
import co.elastic.clients.json.JsonData;
import com.foodbot.mcp.exception.SearchException;
import com.foodbot.mcp.model.GeoLocation;
import com.foodbot.mcp.model.Restaurant;
import com.foodbot.mcp.model.SearchRequest;
import com.foodbot.mcp.model.SearchResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Elasticsearch repository for full-text restaurant search.
 * Provides search by query, location, cuisine, rating, and autocomplete suggestions.
 */
@Slf4j
@Repository
@RequiredArgsConstructor
public class RestaurantSearchRepository {

    private final ElasticsearchClient client;

    @Value("${elasticsearch.indices.restaurants.name:restaurants}")
    private String indexName;

    /**
     * Searches restaurants using full-text search with filters.
     *
     * @param request the search request with query, filters, and pagination
     * @return search response with matching restaurants
     */
    public SearchResponse search(SearchRequest request) {
        try {
            int page = request.getPage() != null ? request.getPage() : 1;
            int pageSize = request.getPageSize() != null ? request.getPageSize() : 20;
            int from = (page - 1) * pageSize;

            Query query = buildRestaurantQuery(request);
            String sortBy = request.getSortBy();
            String sortOrder = request.getSortOrder();
            GeoLocation location = request.getLocation();

            var searchResponse = client.search(s -> {
                s.index(indexName)
                        .from(from)
                        .size(pageSize)
                        .query(query);

                applySorting(s, sortBy, sortOrder, location);
                return s;
            }, Restaurant.class);

            List<Restaurant> restaurants = searchResponse.hits().hits().stream()
                    .map(Hit::source)
                    .collect(Collectors.toList());

            long totalResults = searchResponse.hits().total() != null
                    ? searchResponse.hits().total().value()
                    : 0;

            return SearchResponse.builder()
                    .restaurants(restaurants)
                    .totalResults(totalResults)
                    .page(page)
                    .pageSize(pageSize)
                    .totalPages((int) Math.ceil((double) totalResults / pageSize))
                    .provider("ELASTICSEARCH")
                    .build();

        } catch (IOException e) {
            log.error("Elasticsearch restaurant search failed", e);
            throw new SearchException("Restaurant search failed: " + e.getMessage(), e);
        }
    }

    /**
     * Searches restaurants by geo-location within a radius.
     *
     * @param lat      latitude of center point
     * @param lon      longitude of center point
     * @param radiusKm radius in kilometers
     * @param page     page number (1-based)
     * @param pageSize results per page
     * @return search response with nearby restaurants sorted by distance
     */
    public SearchResponse searchByLocation(double lat, double lon, double radiusKm,
                                           int page, int pageSize) {
        try {
            int from = (page - 1) * pageSize;

            var searchResponse = client.search(s -> s
                            .index(indexName)
                            .from(from)
                            .size(pageSize)
                            .query(q -> q.bool(b -> b
                                    .filter(f -> f.geoDistance(g -> g
                                            .field("location")
                                            .distance(radiusKm + "km")
                                            .location(loc -> loc.latlon(l -> l.lat(lat).lon(lon)))
                                    ))
                                    .filter(f -> f.term(t -> t.field("available").value(true)))
                            ))
                            .sort(so -> so.geoDistance(g -> g
                                    .field("location")
                                    .location(loc -> loc.latlon(l -> l.lat(lat).lon(lon)))
                                    .order(SortOrder.Asc)
                                    .unit(DistanceUnit.Kilometers)
                            )),
                    Restaurant.class
            );

            List<Restaurant> restaurants = searchResponse.hits().hits().stream()
                    .map(Hit::source)
                    .collect(Collectors.toList());

            long totalResults = searchResponse.hits().total() != null
                    ? searchResponse.hits().total().value()
                    : 0;

            return SearchResponse.builder()
                    .restaurants(restaurants)
                    .totalResults(totalResults)
                    .page(page)
                    .pageSize(pageSize)
                    .totalPages((int) Math.ceil((double) totalResults / pageSize))
                    .provider("ELASTICSEARCH_GEO")
                    .build();

        } catch (IOException e) {
            log.error("Elasticsearch geo search failed", e);
            throw new SearchException("Geo search failed: " + e.getMessage(), e);
        }
    }

    /**
     * Searches restaurants by cuisine types.
     *
     * @param cuisines list of cuisine types to filter by
     * @param request  additional search filters and pagination
     * @return search response with matching restaurants
     */
    public SearchResponse searchByCuisine(List<String> cuisines, SearchRequest request) {
        try {
            int page = request.getPage() != null ? request.getPage() : 1;
            int pageSize = request.getPageSize() != null ? request.getPageSize() : 20;
            int from = (page - 1) * pageSize;
            Double minRating = request.getMinRating();

            var searchResponse = client.search(s -> s
                            .index(indexName)
                            .from(from)
                            .size(pageSize)
                            .query(q -> q.bool(b -> {
                                b.filter(f -> f.terms(t -> t
                                        .field("cuisine")
                                        .terms(tv -> tv.value(
                                                cuisines.stream()
                                                        .map(FieldValue::of)
                                                        .collect(Collectors.toList())
                                        ))
                                ));

                                if (minRating != null) {
                                    b.filter(f -> f.range(r -> r
                                            .field("rating")
                                            .gte(JsonData.of(minRating))
                                    ));
                                }

                                b.filter(f -> f.term(t -> t.field("available").value(true)));
                                return b;
                            }))
                            .sort(so -> so.field(f -> f.field("rating").order(SortOrder.Desc))),
                    Restaurant.class
            );

            List<Restaurant> restaurants = searchResponse.hits().hits().stream()
                    .map(Hit::source)
                    .collect(Collectors.toList());

            long totalResults = searchResponse.hits().total() != null
                    ? searchResponse.hits().total().value()
                    : 0;

            return SearchResponse.builder()
                    .restaurants(restaurants)
                    .totalResults(totalResults)
                    .page(page)
                    .pageSize(pageSize)
                    .totalPages((int) Math.ceil((double) totalResults / pageSize))
                    .provider("ELASTICSEARCH")
                    .build();

        } catch (IOException e) {
            log.error("Elasticsearch cuisine search failed", e);
            throw new SearchException("Cuisine search failed: " + e.getMessage(), e);
        }
    }

    /**
     * Searches restaurants by minimum rating.
     *
     * @param minRating minimum rating threshold
     * @param request   additional search filters and pagination
     * @return search response with matching restaurants
     */
    public SearchResponse searchByRating(double minRating, SearchRequest request) {
        try {
            int page = request.getPage() != null ? request.getPage() : 1;
            int pageSize = request.getPageSize() != null ? request.getPageSize() : 20;
            int from = (page - 1) * pageSize;

            var searchResponse = client.search(s -> s
                            .index(indexName)
                            .from(from)
                            .size(pageSize)
                            .query(q -> q.bool(b -> b
                                    .filter(f -> f.range(r -> r
                                            .field("rating")
                                            .gte(JsonData.of(minRating))
                                    ))
                                    .filter(f -> f.term(t -> t.field("available").value(true)))
                            ))
                            .sort(so -> so.field(f -> f.field("rating").order(SortOrder.Desc))),
                    Restaurant.class
            );

            List<Restaurant> restaurants = searchResponse.hits().hits().stream()
                    .map(Hit::source)
                    .collect(Collectors.toList());

            long totalResults = searchResponse.hits().total() != null
                    ? searchResponse.hits().total().value()
                    : 0;

            return SearchResponse.builder()
                    .restaurants(restaurants)
                    .totalResults(totalResults)
                    .page(page)
                    .pageSize(pageSize)
                    .totalPages((int) Math.ceil((double) totalResults / pageSize))
                    .provider("ELASTICSEARCH")
                    .build();

        } catch (IOException e) {
            log.error("Elasticsearch rating search failed", e);
            throw new SearchException("Rating search failed: " + e.getMessage(), e);
        }
    }

    /**
     * Provides autocomplete suggestions for restaurant names.
     *
     * @param prefix the input prefix to match against
     * @param limit  maximum number of suggestions
     * @return list of restaurant name suggestions
     */
    public List<String> autocompleteSuggestions(String prefix, int limit) {
        try {
            var searchResponse = client.search(s -> s
                            .index(indexName)
                            .size(limit)
                            .query(q -> q.bool(b -> b
                                    .should(sh -> sh.match(m -> m
                                            .field("name.autocomplete")
                                            .query(prefix)
                                    ))
                                    .filter(f -> f.term(t -> t.field("available").value(true)))
                            )),
                    Restaurant.class
            );

            return searchResponse.hits().hits().stream()
                    .map(Hit::source)
                    .filter(r -> r != null)
                    .map(Restaurant::getName)
                    .collect(Collectors.toList());

        } catch (IOException e) {
            log.error("Elasticsearch autocomplete failed", e);
            return Collections.emptyList();
        }
    }

    /**
     * Indexes a restaurant document.
     */
    public void index(Restaurant restaurant) throws IOException {
        client.index(i -> i
                .index(indexName)
                .id(restaurant.getId())
                .document(restaurant)
        );
    }

    /**
     * Deletes a restaurant document from the index.
     */
    public void delete(String restaurantId) throws IOException {
        client.delete(d -> d
                .index(indexName)
                .id(restaurantId)
        );
    }

    /**
     * Checks whether the restaurant index exists.
     */
    public boolean indexExists() throws IOException {
        return client.indices().exists(e -> e.index(indexName)).value();
    }

    /**
     * Builds a bool query from the search request parameters.
     */
    private Query buildRestaurantQuery(SearchRequest request) {
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
                        .field("tags")
                        .query(request.getQuery())
                ));
                b.minimumShouldMatch("1");
            }

            if (request.getCuisine() != null && !request.getCuisine().isEmpty()) {
                b.filter(f -> f.term(t -> t.field("cuisine").value(request.getCuisine())));
            }

            if (request.getCuisines() != null && !request.getCuisines().isEmpty()) {
                b.filter(f -> f.terms(t -> t
                        .field("cuisine")
                        .terms(tv -> tv.value(
                                request.getCuisines().stream()
                                        .map(FieldValue::of)
                                        .collect(Collectors.toList())
                        ))
                ));
            }

            if (request.getMinRating() != null) {
                Double minRating = request.getMinRating();
                b.filter(f -> f.range(r -> r
                        .field("rating")
                        .gte(JsonData.of(minRating))
                ));
            }

            if (request.getPriceRange() != null) {
                Integer priceRange = request.getPriceRange();
                b.filter(f -> f.term(t -> t
                        .field("priceRange")
                        .value(priceRange)
                ));
            }

            if (request.getLocation() != null && request.getRadius() != null) {
                GeoLocation loc = request.getLocation();
                Double radius = request.getRadius();
                b.filter(f -> f.geoDistance(g -> g
                        .field("location")
                        .distance(radius + "km")
                        .location(l -> l.latlon(ll -> ll.lat(loc.getLat()).lon(loc.getLon())))
                ));
            }

            if (request.getMaxDeliveryTime() != null) {
                Integer maxDelivery = request.getMaxDeliveryTime();
                b.filter(f -> f.range(r -> r
                        .field("deliveryTime")
                        .lte(JsonData.of(maxDelivery))
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
     * Uses the ES client's SearchRequest.Builder (not our model's SearchRequest).
     */
    private void applySorting(
            co.elastic.clients.elasticsearch.core.SearchRequest.Builder s,
            String sortBy,
            String sortOrder,
            GeoLocation location
    ) {
        SortOrder order = "asc".equalsIgnoreCase(sortOrder) ? SortOrder.Asc : SortOrder.Desc;

        if (sortBy != null) {
            switch (sortBy) {
                case "rating":
                    s.sort(so -> so.field(f -> f.field("rating").order(order)));
                    break;
                case "deliveryTime":
                    s.sort(so -> so.field(f -> f.field("deliveryTime").order(SortOrder.Asc)));
                    break;
                case "price":
                    s.sort(so -> so.field(f -> f.field("priceRange").order(order)));
                    break;
                case "distance":
                    if (location != null) {
                        s.sort(so -> so.geoDistance(g -> g
                                .field("location")
                                .location(l -> l.latlon(ll -> ll.lat(location.getLat()).lon(location.getLon())))
                                .order(SortOrder.Asc)
                                .unit(DistanceUnit.Kilometers)
                        ));
                    }
                    break;
                default:
                    s.sort(so -> so.score(sc -> sc.order(SortOrder.Desc)));
            }
        } else {
            s.sort(so -> so.score(sc -> sc.order(SortOrder.Desc)));
        }
    }
}
