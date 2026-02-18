package com.foodbot.mcp.router;

import com.foodbot.mcp.exception.ProviderUnavailableException;
import com.foodbot.mcp.model.SearchRequest;
import com.foodbot.mcp.model.SearchResponse;
import com.foodbot.mcp.providers.MCPProviderClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Routes search requests to appropriate MCP providers based on health status and priority.
 * Implements failover logic: Mock -> Swiggy -> Zomato.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProviderRouter {

    private final List<MCPProviderClient> providers;
    private final ProviderHealthMonitor healthMonitor;
    private final FailoverManager failoverManager;

    /**
     * Selects the best available provider based on health status and priority.
     * Priority order: Mock (1) -> Swiggy (2) -> Zomato (3).
     *
     * @param request the search request
     * @return the selected provider client
     * @throws ProviderUnavailableException if no providers are available
     */
    public MCPProviderClient selectProvider(SearchRequest request) {
        for (MCPProviderClient provider : providers) {
            if (provider.isEnabled() && healthMonitor.isHealthy(provider.getName())) {
                log.debug("Selected provider: {}", provider.getName());
                return provider;
            }
        }

        throw new ProviderUnavailableException("All providers are unavailable");
    }

    /**
     * Searches restaurants using the best available provider with failover support.
     *
     * @param request the search request
     * @return search response from the first successful provider
     */
    public SearchResponse searchRestaurants(SearchRequest request) {
        List<String> attemptedProviders = new ArrayList<>();

        for (MCPProviderClient provider : providers) {
            if (!provider.isEnabled()) continue;
            if (!healthMonitor.isHealthy(provider.getName())) continue;

            try {
                attemptedProviders.add(provider.getName());
                log.info("Routing restaurant search to provider: {}", provider.getName());
                SearchResponse response = provider.searchRestaurants(request);
                response.setProvider(provider.getName());
                return response;
            } catch (Exception e) {
                log.warn("Provider {} failed for restaurant search: {}", provider.getName(), e.getMessage());
                healthMonitor.recordFailure(provider.getName());
                failoverManager.handleProviderFailure(provider.getName(), e);
            }
        }

        log.error("All providers failed for restaurant search. Attempted: {}", attemptedProviders);
        throw new ProviderUnavailableException(
                "All providers failed. Attempted: " + String.join(", ", attemptedProviders));
    }

    /**
     * Searches dishes using the best available provider with failover support.
     *
     * @param request the search request
     * @return search response from the first successful provider
     */
    public SearchResponse searchDishes(SearchRequest request) {
        List<String> attemptedProviders = new ArrayList<>();

        for (MCPProviderClient provider : providers) {
            if (!provider.isEnabled()) continue;
            if (!healthMonitor.isHealthy(provider.getName())) continue;

            try {
                attemptedProviders.add(provider.getName());
                log.info("Routing dish search to provider: {}", provider.getName());
                SearchResponse response = provider.searchDishes(request);
                response.setProvider(provider.getName());
                return response;
            } catch (Exception e) {
                log.warn("Provider {} failed for dish search: {}", provider.getName(), e.getMessage());
                healthMonitor.recordFailure(provider.getName());
                failoverManager.handleProviderFailure(provider.getName(), e);
            }
        }

        log.error("All providers failed for dish search. Attempted: {}", attemptedProviders);
        throw new ProviderUnavailableException(
                "All providers failed. Attempted: " + String.join(", ", attemptedProviders));
    }

    /**
     * Gets the list of available providers and their health status.
     */
    public List<String> getAvailableProviders() {
        return providers.stream()
                .filter(MCPProviderClient::isEnabled)
                .filter(p -> healthMonitor.isHealthy(p.getName()))
                .map(MCPProviderClient::getName)
                .toList();
    }
}
