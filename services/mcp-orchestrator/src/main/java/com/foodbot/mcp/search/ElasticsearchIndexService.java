package com.foodbot.mcp.search;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.BulkRequest;
import co.elastic.clients.elasticsearch.core.BulkResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.foodbot.mcp.model.Dish;
import com.foodbot.mcp.model.Restaurant;
import com.foodbot.mcp.providers.mock.MockDataGenerator;
import com.foodbot.mcp.repository.DishSearchRepository;
import com.foodbot.mcp.repository.RestaurantSearchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Service responsible for managing Elasticsearch indices and indexing documents.
 * Handles index creation, single/bulk indexing, deletion, and full reindex operations.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ElasticsearchIndexService {

    private final ElasticsearchClient client;
    private final RestaurantSearchRepository restaurantSearchRepository;
    private final DishSearchRepository dishSearchRepository;
    private final MockDataGenerator mockDataGenerator;
    private final ObjectMapper objectMapper;

    @Value("${elasticsearch.indices.restaurants.name:restaurants}")
    private String restaurantIndexName;

    @Value("${elasticsearch.indices.dishes.name:dishes}")
    private String dishIndexName;

    private final AtomicBoolean reindexInProgress = new AtomicBoolean(false);

    /**
     * Initializes Elasticsearch indices on application startup.
     * Creates indices with mappings if they do not exist, then performs initial indexing.
     */
    @PostConstruct
    public void initialize() {
        try {
            createIndexIfNotExists(restaurantIndexName, "elasticsearch/restaurant-mapping.json");
            createIndexIfNotExists(dishIndexName, "elasticsearch/dish-mapping.json");
            performInitialIndex();
        } catch (Exception e) {
            log.warn("Elasticsearch initialization failed (ES may not be available): {}",
                    e.getMessage());
        }
    }

    /**
     * Indexes a single restaurant document.
     *
     * @param restaurant the restaurant to index
     */
    public void indexRestaurant(Restaurant restaurant) {
        try {
            restaurantSearchRepository.index(restaurant);
            log.debug("Indexed restaurant: {} ({})", restaurant.getName(), restaurant.getId());
        } catch (IOException e) {
            log.error("Failed to index restaurant: {}", restaurant.getId(), e);
        }
    }

    /**
     * Indexes a single dish document.
     *
     * @param dish the dish to index
     */
    public void indexDish(Dish dish) {
        try {
            dishSearchRepository.index(dish);
            log.debug("Indexed dish: {} ({})", dish.getName(), dish.getId());
        } catch (IOException e) {
            log.error("Failed to index dish: {}", dish.getId(), e);
        }
    }

    /**
     * Bulk indexes a list of items (restaurants or dishes).
     * Uses the Elasticsearch Bulk API for efficient batch indexing.
     *
     * @param items list of items to index
     * @param <T>   the item type (Restaurant or Dish)
     */
    public <T> void bulkIndex(List<T> items) {
        if (items == null || items.isEmpty()) {
            return;
        }

        try {
            BulkRequest.Builder bulkBuilder = new BulkRequest.Builder();

            for (T item : items) {
                if (item instanceof Restaurant restaurant) {
                    bulkBuilder.operations(op -> op
                            .index(i -> i
                                    .index(restaurantIndexName)
                                    .id(restaurant.getId())
                                    .document(restaurant)
                            )
                    );
                } else if (item instanceof Dish dish) {
                    bulkBuilder.operations(op -> op
                            .index(i -> i
                                    .index(dishIndexName)
                                    .id(dish.getId())
                                    .document(dish)
                            )
                    );
                }
            }

            BulkResponse bulkResponse = client.bulk(bulkBuilder.build());

            if (bulkResponse.errors()) {
                long errorCount = bulkResponse.items().stream()
                        .filter(i -> i.error() != null)
                        .count();
                log.error("Bulk indexing completed with {} errors out of {} items",
                        errorCount, items.size());

                bulkResponse.items().stream()
                        .filter(i -> i.error() != null)
                        .forEach(i -> log.error("Bulk index error for id={}: {}",
                                i.id(), i.error().reason()));
            } else {
                log.info("Bulk indexed {} items successfully in {}ms",
                        items.size(), bulkResponse.took());
            }

        } catch (IOException e) {
            log.error("Bulk indexing failed for {} items", items.size(), e);
        }
    }

    /**
     * Deletes a document from the specified index.
     *
     * @param indexName the index name ("restaurants" or "dishes")
     * @param id       the document ID to delete
     */
    public void deleteIndex(String indexName, String id) {
        try {
            client.delete(d -> d.index(indexName).id(id));
            log.debug("Deleted document {} from index {}", id, indexName);
        } catch (IOException e) {
            log.error("Failed to delete document {} from index {}", id, indexName, e);
        }
    }

    /**
     * Deletes a restaurant from the index.
     *
     * @param restaurantId the restaurant ID
     */
    public void deleteRestaurant(String restaurantId) {
        deleteIndex(restaurantIndexName, restaurantId);
    }

    /**
     * Deletes a dish from the index.
     *
     * @param dishId the dish ID
     */
    public void deleteDish(String dishId) {
        deleteIndex(dishIndexName, dishId);
    }

    /**
     * Performs a full reindex of all data asynchronously.
     * Only one reindex operation can run at a time.
     */
    @Async
    public void reindexAll() {
        if (!reindexInProgress.compareAndSet(false, true)) {
            log.warn("Reindex already in progress, skipping");
            return;
        }

        try {
            log.info("Starting full reindex...");

            deleteAndRecreateIndex(restaurantIndexName, "elasticsearch/restaurant-mapping.json");
            deleteAndRecreateIndex(dishIndexName, "elasticsearch/dish-mapping.json");

            performInitialIndex();

            log.info("Full reindex completed successfully");
        } catch (Exception e) {
            log.error("Full reindex failed", e);
        } finally {
            reindexInProgress.set(false);
        }
    }

    /**
     * Returns whether a reindex operation is currently in progress.
     */
    public boolean isReindexInProgress() {
        return reindexInProgress.get();
    }

    /**
     * Performs initial indexing of mock data.
     */
    private void performInitialIndex() {
        try {
            List<Restaurant> restaurants = mockDataGenerator.getRestaurants();
            List<Dish> dishes = mockDataGenerator.getDishes();

            log.info("Indexing {} restaurants and {} dishes", restaurants.size(), dishes.size());

            if (!restaurants.isEmpty()) {
                bulkIndex(restaurants);
            }
            if (!dishes.isEmpty()) {
                bulkIndex(dishes);
            }

            log.info("Initial data indexing complete");
        } catch (Exception e) {
            log.warn("Initial indexing failed: {}", e.getMessage());
        }
    }

    /**
     * Creates an Elasticsearch index with mappings from a JSON resource file.
     */
    private void createIndexIfNotExists(String index, String mappingResource) {
        try {
            boolean exists = client.indices().exists(e -> e.index(index)).value();
            if (exists) {
                log.info("Index '{}' already exists", index);
                return;
            }

            InputStream mappingStream = new ClassPathResource(mappingResource).getInputStream();
            JsonNode mappingJson = objectMapper.readTree(mappingStream);
            byte[] mappingBytes = objectMapper.writeValueAsBytes(mappingJson);

            client.indices().create(c -> c
                    .index(index)
                    .withJson(new java.io.ByteArrayInputStream(mappingBytes))
            );

            log.info("Created index '{}' with mapping from {}", index, mappingResource);

        } catch (IOException e) {
            log.error("Failed to create index '{}': {}", index, e.getMessage());
        }
    }

    /**
     * Deletes an index and recreates it with fresh mappings.
     */
    private void deleteAndRecreateIndex(String index, String mappingResource) {
        try {
            boolean exists = client.indices().exists(e -> e.index(index)).value();
            if (exists) {
                client.indices().delete(d -> d.index(index));
                log.info("Deleted index '{}'", index);
            }

            createIndexIfNotExists(index, mappingResource);

        } catch (IOException e) {
            log.error("Failed to recreate index '{}': {}", index, e.getMessage());
        }
    }
}
