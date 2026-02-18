package com.foodbot.mcp.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;

/**
 * Kafka configuration for event-driven indexing.
 *
 * Note: Spring Boot auto-configures Kafka consumer and producer factories
 * using spring.kafka properties in application.yml. This class enables
 * Kafka listener support and can provide additional customization.
 *
 * Kafka topics consumed:
 * - restaurant.created: New restaurant events
 * - restaurant.updated: Restaurant update events
 * - menu.updated: Menu change events
 * - dish.availability.changed: Dish availability events
 */
@Slf4j
@Configuration
@EnableKafka
public class KafkaConfig {

    // Spring Boot auto-configures:
    // - ConsumerFactory with properties from application.yml
    // - ProducerFactory with properties from application.yml
    // - KafkaListenerContainerFactory for @KafkaListener methods
    //
    // Consumer group: mcp-indexer
    // Auto-offset-reset: earliest
    // Enable-auto-commit: false (manual acknowledgment)
    //
    // Custom consumer factories can be defined here if needed
    // for specific deserialization requirements per topic.
}
