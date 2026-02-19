package com.foodbot.mcp.consumers;

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
 * Kafka consumer for user-related events.
 *
 * Handles:
 * - user.registered -> Analytics and optional welcome-flow triggers
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UserEventConsumer {

    /**
     * Handles user.registered events.
     */
    @KafkaListener(
            topics = "${kafka.topics.user-registered:user.registered}",
            groupId = "mcp-indexer",
            autoStartup = "${spring.kafka.listener.auto-startup:false}"
    )
    public void handleUserRegistered(
            @Payload Map<String, Object> event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment
    ) {
        try {
            Map<String, Object> data = extractData(event);
            String userId = (String) data.get("userId");
            String email = (String) data.get("email");
            String role = (String) data.get("role");

            log.info("Received user.registered event: userId={}, email={}, role={}",
                    userId, email, role);

            if (acknowledgment != null) {
                acknowledgment.acknowledge();
            }

            log.info("Successfully processed user.registered event: {}", userId);
        } catch (Exception e) {
            log.error("Failed to process user.registered event", e);
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractData(Map<String, Object> event) {
        Object data = event.get("data");
        if (data instanceof Map) {
            return (Map<String, Object>) data;
        }
        return event;
    }
}
