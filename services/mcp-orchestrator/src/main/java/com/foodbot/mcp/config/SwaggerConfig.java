package com.foodbot.mcp.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Swagger/OpenAPI configuration for API documentation.
 * Accessible at /mcp/v1/swagger-ui.html when the application is running.
 */
@Configuration
public class SwaggerConfig {

    @Value("${server.port:8081}")
    private int serverPort;

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("MCP Orchestrator API")
                        .version("1.0.0")
                        .description("Model Context Protocol Orchestration Layer for FoodBot. "
                                + "Provides restaurant and dish search, filtering, and multi-provider orchestration.")
                        .contact(new Contact()
                                .name("FoodBot Team")
                                .email("support@foodbot.com")
                                .url("https://foodbot.com"))
                        .license(new License()
                                .name("Proprietary")
                                .url("https://foodbot.com/license")))
                .servers(List.of(
                        new Server()
                                .url("http://localhost:" + serverPort + "/mcp/v1")
                                .description("Local Development Server")
                ));
    }
}
