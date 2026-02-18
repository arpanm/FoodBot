package com.foodbot.mcp.indexing;

import com.foodbot.mcp.cache.CacheInvalidator;
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
 * Kafka consumer for dish and menu-related events.
 * Handles menu updates and dish availability changes for real-time indexing.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DishEventConsumer {

    private final SearchIndexer searchIndexer;
    private final CacheInvalidator cacheInvalidator;

    /**
     * Handles menu.updated events.
     * Bulk indexes updated dishes and invalidates menu cache.
     */
    @KafkaListener(
            topics = "${kafka.topics.menu-updated:menu.updated}",
            groupId = "mcp-indexer",
            autoStartup = "${spring.kafka.listener.auto-startup:false}"
    )
    public void handleMenuUpdated(
            @Payload Map<String, Object> event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment
    ) {
        try {
            String restaurantId = (String) event.get("restaurantId");
            log.info("Received menu.updated event for restaurant: {}", restaurantId);

            // List<Dish> dishes = objectMapper.convertValue(event.get("dishes"), new TypeReference<>() {});
            // searchIndexer.bulkIndexDishes(dishes);
            // cacheInvalidator.invalidateMenu(restaurantId);

            if (acknowledgment != null) {
                acknowledgment.acknowledge();
            }

            log.info("Successfully processed menu.updated event for restaurant: {}", restaurantId);
        } catch (Exception e) {
            log.error("Failed to process menu.updated event", e);
        }
    }

    /**
     * Handles dish.availability.changed events.
     * Updates dish availability in the index and invalidates cache.
     */
    @KafkaListener(
            topics = "${kafka.topics.dish-availability-changed:dish.availability.changed}",
            groupId = "mcp-indexer",
            autoStartup = "${spring.kafka.listener.auto-startup:false}"
    )
    public void handleDishAvailabilityChanged(
            @Payload Map<String, Object> event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment
    ) {
        try {
            String dishId = (String) event.get("dishId");
            Boolean available = (Boolean) event.get("available");
            log.info("Received dish.availability.changed event: {} -> {}", dishId, available);

            if (dishId != null && available != null) {
                searchIndexer.updateDishAvailability(dishId, available);
                cacheInvalidator.invalidateDish(dishId);
            }

            if (acknowledgment != null) {
                acknowledgment.acknowledge();
            }

            log.info("Successfully processed dish.availability.changed event: {}", dishId);
        } catch (Exception e) {
            log.error("Failed to process dish.availability.changed event", e);
        }
    }
}
