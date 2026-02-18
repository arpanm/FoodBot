package com.foodbot.mcp.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/**
 * Elasticsearch configuration.
 * Configures ElasticsearchClient and ElasticsearchOperations for search operations.
 *
 * Note: Spring Boot auto-configures the Elasticsearch client using
 * spring.data.elasticsearch properties. This class provides additional
 * customization when needed.
 */
@Slf4j
@Configuration
public class ElasticsearchConfig {

    @Value("${spring.data.elasticsearch.uris:http://localhost:9200}")
    private String elasticsearchUri;

    /**
     * When Elasticsearch is available, the Spring Boot auto-configuration
     * creates ElasticsearchClient and ElasticsearchOperations beans automatically
     * based on the spring.data.elasticsearch properties in application.yml.
     *
     * Custom bean definitions can be added here if additional configuration
     * is needed beyond what auto-configuration provides, such as:
     * - Custom analyzers
     * - Index templates
     * - Snapshot/restore configuration
     */
}
