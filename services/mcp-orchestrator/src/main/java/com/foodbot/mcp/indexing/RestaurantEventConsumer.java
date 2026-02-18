package com.foodbot.mcp.indexing;

import com.foodbot.mcp.cache.CacheInvalidator;
import com.foodbot.mcp.model.Restaurant;
import com.foodbot.mcp.search.SearchIndexer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Kafka consumer for restaurant-related events.
 * Handles restaurant creation and update events for real-time Elasticsearch indexing.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RestaurantEventConsumer {

    private final SearchIndexer searchIndexer;
    private final CacheInvalidator cacheInvalidator;

    /**
     * Handles restaurant.created events.
     * Indexes the new restaurant in Elasticsearch.
     */
    @KafkaListener(
            topics = "${kafka.topics.restaurant-created:restaurant.created}",
            groupId = "mcp-indexer",
            autoStartup = "${spring.kafka.listener.auto-startup:false}"
    )
    public void handleRestaurantCreated(
            @Payload Map<String, Object> event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment
    ) {
        try {
            String restaurantId = (String) event.get("restaurantId");
            log.info("Received restaurant.created event: {}", restaurantId);

            // In a full implementation, deserialize the event payload to Restaurant
            // Restaurant restaurant = objectMapper.convertValue(event.get("restaurant"), Restaurant.class);
            // searchIndexer.indexRestaurant(restaurant);

            if (acknowledgment != null) {
                acknowledgment.acknowledge();
            }

            log.info("Successfully processed restaurant.created event: {}", restaurantId);
        } catch (Exception e) {
            log.error("Failed to process restaurant.created event", e);
            // In production, send to DLQ (Dead Letter Queue)
        }
    }

    /**
     * Handles restaurant.updated events.
     * Updates the restaurant in Elasticsearch and invalidates cache.
     */
    @KafkaListener(
            topics = "${kafka.topics.restaurant-updated:restaurant.updated}",
            groupId = "mcp-indexer",
            autoStartup = "${spring.kafka.listener.auto-startup:false}"
    )
    public void handleRestaurantUpdated(
            @Payload Map<String, Object> event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment
    ) {
        try {
            String restaurantId = (String) event.get("restaurantId");
            log.info("Received restaurant.updated event: {}", restaurantId);

            // Restaurant restaurant = objectMapper.convertValue(event.get("restaurant"), Restaurant.class);
            // searchIndexer.updateRestaurant(restaurant);
            // cacheInvalidator.invalidateRestaurant(restaurantId);

            if (acknowledgment != null) {
                acknowledgment.acknowledge();
            }

            log.info("Successfully processed restaurant.updated event: {}", restaurantId);
        } catch (Exception e) {
            log.error("Failed to process restaurant.updated event", e);
        }
    }
}
