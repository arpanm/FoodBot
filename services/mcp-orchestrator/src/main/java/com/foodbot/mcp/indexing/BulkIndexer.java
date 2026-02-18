package com.foodbot.mcp.indexing;

import com.foodbot.mcp.model.Dish;
import com.foodbot.mcp.model.Restaurant;
import com.foodbot.mcp.search.ElasticsearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedQueue;

/**
 * Bulk indexer for Elasticsearch documents.
 * Accumulates documents in a queue and flushes them in batches for better performance.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BulkIndexer {

    private final ElasticsearchService elasticsearchService;

    @Value("${elasticsearch.bulk.size:100}")
    private int bulkSize;

    private final ConcurrentLinkedQueue<Restaurant> restaurantQueue = new ConcurrentLinkedQueue<>();
    private final ConcurrentLinkedQueue<Dish> dishQueue = new ConcurrentLinkedQueue<>();

    /**
     * Adds a restaurant to the bulk indexing queue.
     */
    public void queueRestaurant(Restaurant restaurant) {
        restaurantQueue.add(restaurant);
        log.debug("Restaurant queued for bulk indexing: {}", restaurant.getId());

        if (restaurantQueue.size() >= bulkSize) {
            flushRestaurantQueue();
        }
    }

    /**
     * Adds a dish to the bulk indexing queue.
     */
    public void queueDish(Dish dish) {
        dishQueue.add(dish);
        log.debug("Dish queued for bulk indexing: {}", dish.getId());

        if (dishQueue.size() >= bulkSize) {
            flushDishQueue();
        }
    }

    /**
     * Periodically flushes the bulk indexing queues.
     * Runs every 5 seconds.
     */
    @Scheduled(fixedDelayString = "${elasticsearch.bulk.flush-interval:5000}")
    public void flushQueues() {
        if (!restaurantQueue.isEmpty()) {
            flushRestaurantQueue();
        }
        if (!dishQueue.isEmpty()) {
            flushDishQueue();
        }
    }

    /**
     * Flushes all queued restaurants to Elasticsearch.
     */
    private synchronized void flushRestaurantQueue() {
        if (restaurantQueue.isEmpty()) return;

        List<Restaurant> batch = new ArrayList<>();
        Restaurant restaurant;
        while ((restaurant = restaurantQueue.poll()) != null && batch.size() < bulkSize) {
            batch.add(restaurant);
        }

        if (!batch.isEmpty()) {
            try {
                log.info("Bulk indexing {} restaurants", batch.size());
                elasticsearchService.bulkIndexRestaurants(batch);
                log.info("Bulk indexed {} restaurants successfully", batch.size());
            } catch (Exception e) {
                log.error("Failed to bulk index {} restaurants", batch.size(), e);
                // Re-queue failed items
                restaurantQueue.addAll(batch);
            }
        }
    }

    /**
     * Flushes all queued dishes to Elasticsearch.
     */
    private synchronized void flushDishQueue() {
        if (dishQueue.isEmpty()) return;

        List<Dish> batch = new ArrayList<>();
        Dish dish;
        while ((dish = dishQueue.poll()) != null && batch.size() < bulkSize) {
            batch.add(dish);
        }

        if (!batch.isEmpty()) {
            try {
                log.info("Bulk indexing {} dishes", batch.size());
                elasticsearchService.bulkIndexDishes(batch);
                log.info("Bulk indexed {} dishes successfully", batch.size());
            } catch (Exception e) {
                log.error("Failed to bulk index {} dishes", batch.size(), e);
                // Re-queue failed items
                dishQueue.addAll(batch);
            }
        }
    }

    /**
     * Returns the current queue sizes.
     */
    public int getRestaurantQueueSize() {
        return restaurantQueue.size();
    }

    public int getDishQueueSize() {
        return dishQueue.size();
    }
}
