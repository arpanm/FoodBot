package com.foodbot.mcp.search;

import com.foodbot.mcp.model.Dish;
import com.foodbot.mcp.model.Restaurant;
import com.foodbot.mcp.providers.mock.MockDataGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.List;

/**
 * Service responsible for indexing restaurant and dish data into Elasticsearch.
 * Performs initial data load and handles incremental updates.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SearchIndexer {

    private final ElasticsearchService elasticsearchService;
    private final MockDataGenerator mockDataGenerator;

    /**
     * Performs initial indexing of all mock data on application startup.
     */
    @PostConstruct
    public void performInitialIndex() {
        log.info("Starting initial data indexing...");
        try {
            List<Restaurant> restaurants = mockDataGenerator.getRestaurants();
            List<Dish> dishes = mockDataGenerator.getDishes();

            log.info("Indexing {} restaurants and {} dishes", restaurants.size(), dishes.size());

            elasticsearchService.bulkIndexRestaurants(restaurants);
            elasticsearchService.bulkIndexDishes(dishes);

            log.info("Initial data indexing complete");
        } catch (Exception e) {
            log.warn("Initial indexing failed (Elasticsearch may not be available): {}", e.getMessage());
        }
    }

    /**
     * Indexes a single restaurant.
     */
    public void indexRestaurant(Restaurant restaurant) {
        elasticsearchService.indexRestaurant(restaurant);
    }

    /**
     * Updates a restaurant in the index.
     */
    public void updateRestaurant(Restaurant restaurant) {
        elasticsearchService.indexRestaurant(restaurant);
    }

    /**
     * Indexes a single dish.
     */
    public void indexDish(Dish dish) {
        elasticsearchService.indexDish(dish);
    }

    /**
     * Bulk indexes dishes.
     */
    public void bulkIndexDishes(List<Dish> dishes) {
        elasticsearchService.bulkIndexDishes(dishes);
    }

    /**
     * Updates dish availability in the index.
     */
    public void updateDishAvailability(String dishId, boolean available) {
        elasticsearchService.updateDishAvailability(dishId, available);
    }

    /**
     * Deletes a restaurant from the index.
     */
    public void deleteRestaurant(String restaurantId) {
        elasticsearchService.deleteRestaurant(restaurantId);
    }

    /**
     * Reindexes all data asynchronously.
     */
    @Async
    public void reindexAll() {
        log.info("Starting full reindex...");
        performInitialIndex();
    }
}
