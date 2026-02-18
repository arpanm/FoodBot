package com.foodbot.mcp.config;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.json.jackson.JacksonJsonpMapper;
import co.elastic.clients.transport.ElasticsearchTransport;
import co.elastic.clients.transport.rest_client.RestClientTransport;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.extern.slf4j.Slf4j;
import org.apache.http.HttpHost;
import org.apache.http.auth.AuthScope;
import org.apache.http.auth.UsernamePasswordCredentials;
import org.apache.http.impl.client.BasicCredentialsProvider;
import org.elasticsearch.client.RestClient;
import org.elasticsearch.client.RestClientBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

import jakarta.annotation.PreDestroy;
import java.io.IOException;

/**
 * Elasticsearch configuration with connection pooling, health checks,
 * and support for both local development and production environments.
 */
@Slf4j
@Configuration
@EnableScheduling
public class ElasticsearchConfig {

    @Value("${spring.data.elasticsearch.uris:http://localhost:9200}")
    private String elasticsearchUri;

    @Value("${spring.data.elasticsearch.username:}")
    private String username;

    @Value("${spring.data.elasticsearch.password:}")
    private String password;

    @Value("${spring.data.elasticsearch.connection-timeout:5s}")
    private String connectionTimeout;

    @Value("${spring.data.elasticsearch.socket-timeout:30s}")
    private String socketTimeout;

    @Value("${elasticsearch.pool.max-connections:20}")
    private int maxConnections;

    @Value("${elasticsearch.pool.max-connections-per-route:10}")
    private int maxConnectionsPerRoute;

    private RestClient restClient;

    /**
     * Creates the low-level REST client with connection pooling and timeouts.
     */
    @Bean
    public RestClient elasticsearchRestClient() {
        String[] uris = elasticsearchUri.split(",");
        HttpHost[] hosts = new HttpHost[uris.length];

        for (int i = 0; i < uris.length; i++) {
            String uri = uris[i].trim();
            hosts[i] = HttpHost.create(uri);
        }

        RestClientBuilder builder = RestClient.builder(hosts)
                .setRequestConfigCallback(requestConfigBuilder ->
                        requestConfigBuilder
                                .setConnectTimeout(parseTimeout(connectionTimeout))
                                .setSocketTimeout(parseTimeout(socketTimeout))
                                .setConnectionRequestTimeout(parseTimeout(connectionTimeout))
                )
                .setHttpClientConfigCallback(httpClientBuilder -> {
                    httpClientBuilder
                            .setMaxConnTotal(maxConnections)
                            .setMaxConnPerRoute(maxConnectionsPerRoute);

                    if (username != null && !username.isEmpty()) {
                        BasicCredentialsProvider credentialsProvider = new BasicCredentialsProvider();
                        credentialsProvider.setCredentials(
                                AuthScope.ANY,
                                new UsernamePasswordCredentials(username, password)
                        );
                        httpClientBuilder.setDefaultCredentialsProvider(credentialsProvider);
                    }

                    return httpClientBuilder;
                });

        this.restClient = builder.build();
        log.info("Elasticsearch REST client configured: hosts={}, maxConnections={}, maxPerRoute={}",
                elasticsearchUri, maxConnections, maxConnectionsPerRoute);

        return this.restClient;
    }

    /**
     * Creates the high-level Elasticsearch Java client.
     */
    @Bean
    public ElasticsearchClient elasticsearchClient(RestClient restClient) {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        ElasticsearchTransport transport = new RestClientTransport(
                restClient,
                new JacksonJsonpMapper(objectMapper)
        );

        log.info("Elasticsearch Java client initialized");
        return new ElasticsearchClient(transport);
    }

    /**
     * Health indicator for Elasticsearch connectivity.
     * Reports UP/DOWN status based on cluster health.
     */
    @Bean
    public HealthIndicator elasticsearchHealthIndicator(ElasticsearchClient client) {
        return () -> {
            try {
                var healthResponse = client.cluster().health();
                String status = healthResponse.status().jsonValue();
                int numberOfNodes = healthResponse.numberOfNodes();
                int activeShards = healthResponse.activeShards();

                if ("red".equals(status)) {
                    return Health.down()
                            .withDetail("status", status)
                            .withDetail("numberOfNodes", numberOfNodes)
                            .withDetail("activeShards", activeShards)
                            .build();
                }

                return Health.up()
                        .withDetail("status", status)
                        .withDetail("clusterName", healthResponse.clusterName())
                        .withDetail("numberOfNodes", numberOfNodes)
                        .withDetail("activeShards", activeShards)
                        .withDetail("activePrimaryShards", healthResponse.activePrimaryShards())
                        .build();
            } catch (IOException e) {
                log.warn("Elasticsearch health check failed: {}", e.getMessage());
                return Health.down()
                        .withDetail("error", e.getMessage())
                        .build();
            }
        };
    }

    @PreDestroy
    public void cleanup() {
        if (restClient != null) {
            try {
                restClient.close();
                log.info("Elasticsearch REST client closed");
            } catch (IOException e) {
                log.error("Error closing Elasticsearch REST client", e);
            }
        }
    }

    /**
     * Parses a duration string (e.g., "5s", "30s") into milliseconds.
     */
    private int parseTimeout(String timeout) {
        if (timeout == null || timeout.isEmpty()) {
            return 5000;
        }
        String value = timeout.replaceAll("[^0-9]", "");
        int seconds = Integer.parseInt(value);
        if (timeout.endsWith("ms")) {
            return seconds;
        }
        return seconds * 1000;
    }
}
