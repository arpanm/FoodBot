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
 * Kafka consumer for payment-related events.
 *
 * Handles:
 * - payment.completed -> Logs for analytics; can trigger order confirmation
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentEventConsumer {

    /**
     * Handles payment.completed events.
     * Logs the event for analytics and audit trail.
     */
    @KafkaListener(
            topics = "${kafka.topics.payment-completed:payment.completed}",
            groupId = "mcp-indexer",
            autoStartup = "${spring.kafka.listener.auto-startup:false}"
    )
    public void handlePaymentCompleted(
            @Payload Map<String, Object> event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment
    ) {
        try {
            Map<String, Object> data = extractData(event);
            String paymentId = (String) data.get("paymentId");
            String orderId = (String) data.get("orderId");
            Object amount = data.get("amount");

            log.info("Received payment.completed event: paymentId={}, orderId={}, amount={}",
                    paymentId, orderId, amount);

            // Analytics / audit logging would go here

            if (acknowledgment != null) {
                acknowledgment.acknowledge();
            }

            log.info("Successfully processed payment.completed event: {}", paymentId);
        } catch (Exception e) {
            log.error("Failed to process payment.completed event", e);
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
