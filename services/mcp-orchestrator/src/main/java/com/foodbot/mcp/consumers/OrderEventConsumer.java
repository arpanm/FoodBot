package com.foodbot.mcp.consumers;

import com.foodbot.mcp.cache.CacheInvalidator;
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
 * Kafka consumer for order-related events.
 *
 * Handles:
 * - order.created         -> Triggers analytics indexing and notification dispatch
 * - order.status.changed  -> Updates caches and triggers notifications
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OrderEventConsumer {

    private final CacheInvalidator cacheInvalidator;

    /**
     * Handles order.created events.
     * Invalidates restaurant order-count caches and prepares analytics data.
     */
    @KafkaListener(
            topics = "${kafka.topics.order-created:order.created}",
            groupId = "mcp-indexer",
            autoStartup = "${spring.kafka.listener.auto-startup:false}"
    )
    public void handleOrderCreated(
            @Payload Map<String, Object> event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment
    ) {
        try {
            Map<String, Object> data = extractData(event);
            String orderId = (String) data.get("orderId");
            String restaurantId = (String) data.get("restaurantId");
            String userId = (String) data.get("userId");

            log.info("Received order.created event: orderId={}, restaurantId={}, userId={}",
                    orderId, restaurantId, userId);

            // Invalidate restaurant-level caches since order counts may have changed
            if (restaurantId != null) {
                cacheInvalidator.invalidateRestaurant(restaurantId);
            }

            if (acknowledgment != null) {
                acknowledgment.acknowledge();
            }

            log.info("Successfully processed order.created event: {}", orderId);
        } catch (Exception e) {
            log.error("Failed to process order.created event", e);
            // In production: send to DLQ via error handler
        }
    }

    /**
     * Handles order.status.changed events.
     * Updates caches and can trigger downstream notifications.
     */
    @KafkaListener(
            topics = "${kafka.topics.order-status-changed:order.status.changed}",
            groupId = "mcp-indexer",
            autoStartup = "${spring.kafka.listener.auto-startup:false}"
    )
    public void handleOrderStatusChanged(
            @Payload Map<String, Object> event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment
    ) {
        try {
            Map<String, Object> data = extractData(event);
            String orderId = (String) data.get("orderId");
            String oldStatus = (String) data.get("oldStatus");
            String newStatus = (String) data.get("newStatus");
            String restaurantId = (String) data.get("restaurantId");

            log.info("Received order.status.changed event: orderId={}, {} -> {}",
                    orderId, oldStatus, newStatus);

            // Invalidate caches affected by the order status transition
            if (restaurantId != null) {
                cacheInvalidator.invalidateRestaurant(restaurantId);
            }

            if (acknowledgment != null) {
                acknowledgment.acknowledge();
            }

            log.info("Successfully processed order.status.changed event: {}", orderId);
        } catch (Exception e) {
            log.error("Failed to process order.status.changed event", e);
        }
    }

    /**
     * Extract the nested "data" map from the event envelope.
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> extractData(Map<String, Object> event) {
        Object data = event.get("data");
        if (data instanceof Map) {
            return (Map<String, Object>) data;
        }
        // Fallback: treat the event itself as data (flat structure)
        return event;
    }
}
